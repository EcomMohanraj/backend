import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const customerController = {
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      const customers = await prisma.customer.findMany({
        include: {
          orders: true
        },
        orderBy: { createdAt: "desc" }
      });

      const formatted = customers.map((c) => {
        const orderCount = c.orders.length;
        const totalSpent = c.orders.reduce((sum, o) => sum + o.amount, 0);
        return {
          id: c.id,
          name: c.name,
          email: c.email,
          phone: c.phone || undefined,
          createdAt: c.createdAt.toISOString(),
          orderCount,
          totalSpent
        };
      });

      return res.json(formatted);
    } catch (err) {
      console.error("List customers error:", err);
      return res.status(500).json({ success: false, error: "Failed to list customers." });
    }
  },

  async getById(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { id },
        include: {
          addresses: true,
          orders: {
            include: {
              items: {
                include: {
                  product: true
                }
              }
            },
            orderBy: { createdAt: "desc" }
          }
        }
      });

      if (!customer) {
        return res.status(404).json({ success: false, error: "Customer not found." });
      }

      const orderCount = customer.orders.length;
      const totalSpent = customer.orders.reduce((sum, o) => sum + o.amount, 0);

      const formatted = {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: customer.phone || undefined,
        createdAt: customer.createdAt.toISOString(),
        orderCount,
        totalSpent,
        addresses: customer.addresses.map((a) => ({
          id: a.id,
          address: a.address,
          city: a.city,
          pincode: a.pincode,
          isDefault: a.isDefault
        })),
        orders: customer.orders.map((o) => ({
          id: o.id,
          amount: o.amount,
          status: o.status,
          address: o.address,
          createdAt: o.createdAt.toISOString(),
          items: o.items.map((i) => ({
            id: i.id,
            quantity: i.quantity,
            price: i.price,
            product: i.product ? {
              name: i.product.name,
              image: i.product.image
            } : undefined
          }))
        }))
      };

      return res.json(formatted);
    } catch (err) {
      console.error("Get customer by id error:", err);
      return res.status(500).json({ success: false, error: "Failed to fetch customer profile details." });
    }
  },

  async toggleBlock(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const customer = await prisma.customer.findUnique({
        where: { id },
        include: { user: true }
      });

      if (!customer || !customer.userId) {
        return res.status(404).json({ success: false, error: "Customer or user profile not found." });
      }

      // Prevent self blocking
      if (customer.userId === req.user?.userId) {
        return res.status(400).json({ success: false, error: "You cannot block your own admin account." });
      }

      const updatedUser = await prisma.user.update({
        where: { id: customer.userId },
        data: { blocked: !customer.user?.blocked }
      });

      // Revoke all refresh tokens for this user if blocked
      if (updatedUser.blocked) {
        await prisma.refreshToken.deleteMany({
          where: { userId: updatedUser.id }
        });
      }

      return res.json({ success: true, blocked: updatedUser.blocked });
    } catch (err) {
      console.error("Toggle block customer error:", err);
      return res.status(500).json({ success: false, error: "Failed to toggle block status." });
    }
  },

  async resetPassword(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;
      if (!newPassword) {
        return res.status(400).json({ success: false, error: "New password is required." });
      }

      const customer = await prisma.customer.findUnique({
        where: { id }
      });

      if (!customer || !customer.userId) {
        return res.status(404).json({ success: false, error: "Customer not found." });
      }

      const bcrypt = require("bcryptjs");
      const passwordHash = await bcrypt.hash(newPassword, 10);

      await prisma.user.update({
        where: { id: customer.userId },
        data: { passwordHash }
      });

      // Revoke all sessions for security to force relogin with new password
      await prisma.refreshToken.deleteMany({
        where: { userId: customer.userId }
      });

      return res.json({ success: true, message: "Customer password reset successfully." });
    } catch (err) {
      console.error("Reset password customer error:", err);
      return res.status(500).json({ success: false, error: "Failed to reset customer password." });
    }
  }
};
