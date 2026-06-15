import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

function serializeOrder(o: any) {
  return {
    id: o.id,
    user_id: o.customer?.userId || undefined,
    amount: o.amount,
    status: o.status,
    payment_id: o.paymentId || undefined,
    address: o.address,
    created_at: o.createdAt.toISOString(),
    items: o.items.map((item: any) => ({
      id: item.id,
      order_id: item.orderId,
      product_id: item.productId,
      quantity: item.quantity,
      price: item.price,
      product: item.product ? {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        description: item.product.description,
        image: item.product.image,
        price: item.product.price,
        stock: item.product.stock,
        category: item.product.category?.name || "Uncategorized",
        nutrition: item.product.nutrition || {},
        created_at: item.product.createdAt.toISOString()
      } : undefined
    })),
    customer: o.customer ? {
      id: o.customer.id,
      name: o.customer.name,
      email: o.customer.email,
      phone: o.customer.phone || undefined
    } : undefined
  };
}

export const orderController = {
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }

      let orders;
      if (req.user.role === "admin") {
        orders = await prisma.order.findMany({
          include: {
            items: { include: { product: { include: { category: true } } } },
            customer: true
          },
          orderBy: { createdAt: "desc" }
        });
      } else {
        const customer = await prisma.customer.findUnique({
          where: { userId: req.user.userId }
        });

        if (!customer) {
          return res.json([]);
        }

        orders = await prisma.order.findMany({
          where: { customerId: customer.id },
          include: {
            items: { include: { product: { include: { category: true } } } },
            customer: true
          },
          orderBy: { createdAt: "desc" }
        });
      }

      return res.json(orders.map(serializeOrder));
    } catch (err) {
      console.error("List orders error:", err);
      return res.status(500).json({ success: false, error: "Failed to list orders." });
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }

      const { amount, address, payment_id, status, items } = req.body;
      if (!amount || !address || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, error: "Amount, address, and items are required." });
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId }
      });

      if (!customer) {
        return res.status(400).json({ success: false, error: "Customer profile not found." });
      }

      // Run transactional update to check stock, subtract stock and create order
      const newOrder = await prisma.$transaction(async (tx) => {
        // Validate stock for all products first
        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.product_id }
          });
          if (!product) {
            throw new Error(`Product with ID ${item.product_id} not found.`);
          }
          if (product.stock < item.quantity) {
            throw new Error(`Insufficient stock for product: ${product.name}. Only ${product.stock} left.`);
          }

          // Decrement stock
          await tx.product.update({
            where: { id: item.product_id },
            data: { stock: product.stock - item.quantity }
          });
        }

        // Create the order
        const createdOrder = await tx.order.create({
          data: {
            customerId: customer.id,
            amount: Number(amount),
            address,
            paymentId: payment_id || null,
            status: status || "pending",
            items: {
              create: items.map((item: any) => ({
                productId: item.product_id,
                quantity: Number(item.quantity),
                price: Number(item.price)
              }))
            }
          },
          include: {
            items: { include: { product: { include: { category: true } } } },
            customer: true
          }
        });

        // Create payment record if payment_id is provided
        if (payment_id) {
          await tx.payment.create({
            data: {
              orderId: createdOrder.id,
              amount: Number(amount),
              status: status === "paid" || status === "confirmed" || status === "delivered" ? "success" : "pending",
              transactionId: payment_id
            }
          });
        }

        return createdOrder;
      });

      return res.status(201).json(serializeOrder(newOrder));
    } catch (err: any) {
      console.error("Create order error:", err);
      return res.status(400).json({ success: false, error: err.message || "Failed to create order." });
    }
  },

  async update(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }

      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, error: "Status is required." });
      }

      const order = await prisma.order.findUnique({
        where: { id },
        include: { customer: true }
      });

      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found." });
      }

      // Customers can only cancel their own pending orders. Admins can update any status.
      if (req.user.role !== "admin") {
        if (order.customer?.userId !== req.user.userId) {
          return res.status(403).json({ success: false, error: "Forbidden: Unauthorized to update this order." });
        }
        if (status !== "cancelled") {
          return res.status(400).json({ success: false, error: "Customers can only cancel orders." });
        }
        if (order.status !== "pending") {
          return res.status(400).json({ success: false, error: "Only pending orders can be cancelled." });
        }
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status },
        include: {
          items: { include: { product: { include: { category: true } } } },
          customer: true
        }
      });

      // Return stock back to inventory if cancelled
      if (status === "cancelled") {
        await prisma.$transaction(async (tx) => {
          const orderItems = await tx.orderItem.findMany({
            where: { orderId: id }
          });
          for (const item of orderItems) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } }
            });
          }
        });
      }

      return res.json(serializeOrder(updated));
    } catch (err) {
      console.error("Update order error:", err);
      return res.status(500).json({ success: false, error: "Failed to update order." });
    }
  },

  async track(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: true
            }
          }
        }
      });

      if (!order) {
        return res.status(404).json({ success: false, error: "Order not found." });
      }

      // Return secure tracking state (exclude sensitive user data)
      return res.json({
        id: order.id,
        status: order.status,
        amount: order.amount,
        created_at: order.createdAt.toISOString(),
        items: order.items.map((i) => ({
          name: i.product?.name || "Product",
          quantity: i.quantity
        }))
      });
    } catch (err) {
      console.error("Track order error:", err);
      return res.status(500).json({ success: false, error: "Failed to query order tracking status." });
    }
  }
};
