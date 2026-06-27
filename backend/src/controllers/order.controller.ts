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
  },

  async getInvoice(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }

      const { id } = req.params;

      const order = await prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          customer: true
        }
      });

      if (!order) {
        return res.status(404).send("<h1>Order not found</h1>");
      }

      // Check access permission: admins or the customer themselves
      if (req.user.role !== "admin" && req.user.role !== "super-admin") {
        if (order.customer?.userId !== req.user.userId) {
          return res.status(403).send("<h1>Access Denied: You do not have permission to view this invoice.</h1>");
        }
      }

      const settings = await prisma.storeSettings.findUnique({
        where: { id: "default" }
      }) || {
        storeName: "Milky Mushrooms",
        contactNumber: "+91 99887 76655",
        email: "contact@milkymushroom.in",
        deliveryCharges: 50,
        taxPercentage: 5
      };

      const dateStr = order.createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      const taxAmount = (order.amount * settings.taxPercentage) / (100 + settings.taxPercentage);
      const subtotal = order.amount - taxAmount;

      const itemsRows = order.items.map(item => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 0.95rem;">${item.product?.name || "Deleted Product"}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: center; font-size: 0.95rem;">${item.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 0.95rem;">₹${item.price.toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; text-align: right; font-size: 0.95rem; font-weight: 600;">₹${(item.price * item.quantity).toFixed(2)}</td>
        </tr>
      `).join("");

      const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Invoice #${order.id.slice(0, 8)}</title>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; background-color: #f8fafc; padding: 40px 20px; line-height: 1.5; }
          .invoice-container { max-width: 850px; margin: 0 auto; background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); overflow: hidden; padding: 40px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 32px; }
          .logo { font-size: 1.8rem; font-weight: 800; color: #10b981; }
          .subtitle { font-size: 0.85rem; color: #64748b; margin-top: 4px; }
          .inv-title { text-align: right; }
          .inv-title h1 { font-size: 2.2rem; color: #0f172a; font-weight: 700; letter-spacing: -0.03em; }
          .inv-meta { font-size: 0.9rem; color: #64748b; margin-top: 8px; line-height: 1.6; }
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .details-card { background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9; padding: 20px; font-size: 0.9rem; line-height: 1.6; }
          .details-card h3 { font-size: 0.95rem; color: #0f172a; margin-bottom: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          th { background-color: #f1f5f9; color: #475569; font-weight: 700; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px; text-align: left; border-bottom: 2px solid #cbd5e1; }
          .totals-wrapper { display: flex; justify-content: flex-end; }
          .totals-table { width: 320px; font-size: 0.95rem; }
          .totals-table td { padding: 8px 12px; }
          .grand-total { font-weight: 700; font-size: 1.25rem; color: #10b981; border-top: 2px solid #10b981; padding-top: 12px !important; }
          .footer { text-align: center; margin-top: 60px; font-size: 0.85rem; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 24px; line-height: 1.6; }
          .actions { max-width: 850px; margin: 0 auto 20px auto; display: flex; justify-content: flex-end; gap: 12px; }
          .btn { display: inline-flex; align-items: center; justify-content: center; background-color: #10b981; color: white; padding: 10px 24px; border-radius: 8px; font-size: 0.95rem; font-weight: 600; text-decoration: none; border: none; cursor: pointer; transition: background-color 0.2s; }
          .btn:hover { background-color: #059669; }
          .btn-secondary { background-color: #fff; color: #475569; border: 1px solid #cbd5e1; }
          .btn-secondary:hover { background-color: #f1f5f9; }
          @media print {
            body { background: white; padding: 0; }
            .invoice-container { border: none; box-shadow: none; padding: 0; }
            .actions { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="actions">
          <button class="btn btn-secondary" onclick="window.close()">Close Window</button>
          <button class="btn" onclick="window.print()">Print / Save PDF</button>
        </div>
        <div class="invoice-container">
          <div class="header">
            <div>
              <div class="logo">${settings.storeName}</div>
              <div class="subtitle">E-Commerce Cultivation & Substrate Logistics</div>
            </div>
            <div class="inv-title">
              <h1>INVOICE</h1>
              <div class="inv-meta">
                <strong>Invoice No:</strong> INV-${order.id.slice(0, 8).toUpperCase()}<br>
                <strong>Date:</strong> ${dateStr}<br>
                <strong>Payment ID:</strong> ${order.paymentId || "COD / Pending"}
              </div>
            </div>
          </div>

          <div class="details-grid">
            <div class="details-card">
              <h3>Billed To</h3>
              <strong>${order.customer?.name || "Customer"}</strong><br>
              Email: ${order.customer?.email || ""}<br>
              Phone: ${order.customer?.phone || ""}<br><br>
              <strong>Shipping Address:</strong><br>
              ${order.address}
            </div>
            <div class="details-card">
              <h3>Billed From</h3>
              <strong>${settings.storeName}</strong><br>
              Email: ${settings.email}<br>
              Support Phone: ${settings.contactNumber}<br><br>
              <strong>Store Address:</strong><br>
              Main Cultivation Hub, Palani Foothills,<br>
              Tamil Nadu, India
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Item Details</th>
                <th style="text-align: center; width: 10%;">Qty</th>
                <th style="text-align: right; width: 20%;">Price</th>
                <th style="text-align: right; width: 20%;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="totals-wrapper">
            <table class="totals-table">
              <tr>
                <td style="color: #64748b;">Subtotal:</td>
                <td style="text-align: right; font-weight: 500;">₹${subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Taxes (${settings.taxPercentage}% included):</td>
                <td style="text-align: right; font-weight: 500;">₹${taxAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="color: #64748b;">Delivery Fee:</td>
                <td style="text-align: right; font-weight: 500;">₹0.00</td>
              </tr>
              <tr class="grand-total">
                <td>Grand Total:</td>
                <td style="text-align: right;">₹${order.amount.toFixed(2)}</td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <p>This invoice is electronically generated. Thank you for supporting organic farming!</p>
            <p style="margin-top: 4px; font-weight: 600;">© ${new Date().getFullYear()} ${settings.storeName}. All Rights Reserved.</p>
          </div>
        </div>
      </body>
      </html>
      `;

      res.setHeader("Content-Type", "text/html");
      return res.send(html);
    } catch (err) {
      console.error("Generate invoice error:", err);
      return res.status(500).send("<h1>Failed to generate invoice</h1>");
    }
  }
};
