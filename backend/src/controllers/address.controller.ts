import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const addressController = {
  async list(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId }
      });
      if (!customer) {
        return res.json([]);
      }
      const addresses = await prisma.address.findMany({
        where: { customerId: customer.id },
        orderBy: { createdAt: "desc" }
      });

      const formatted = addresses.map((a) => ({
        id: a.id,
        user_id: req.user?.userId || "",
        address: a.address,
        city: a.city,
        pincode: a.pincode,
        is_default: a.isDefault,
        created_at: a.createdAt.toISOString()
      }));

      return res.json(formatted);
    } catch (err) {
      console.error("List addresses error:", err);
      return res.status(500).json({ success: false, error: "Failed to list addresses." });
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }

      const { address, city, pincode, is_default } = req.body;
      if (!address || !city || !pincode) {
        return res.status(400).json({ success: false, error: "Address, city, and pincode are required." });
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId }
      });

      if (!customer) {
        return res.status(400).json({ success: false, error: "Customer profile not found." });
      }

      // If this address is set to default, unset all others
      if (is_default) {
        await prisma.address.updateMany({
          where: { customerId: customer.id },
          data: { isDefault: false }
        });
      }

      const created = await prisma.address.create({
        data: {
          customerId: customer.id,
          address,
          city,
          pincode,
          isDefault: !!is_default
        }
      });

      return res.status(201).json({
        id: created.id,
        user_id: req.user.userId,
        address: created.address,
        city: created.city,
        pincode: created.pincode,
        is_default: created.isDefault,
        created_at: created.createdAt.toISOString()
      });
    } catch (err) {
      console.error("Create address error:", err);
      return res.status(500).json({ success: false, error: "Failed to create address." });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }

      const { id } = req.params;

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId }
      });

      if (!customer) {
        return res.status(400).json({ success: false, error: "Customer profile not found." });
      }

      const addr = await prisma.address.findUnique({
        where: { id }
      });

      if (!addr || addr.customerId !== customer.id) {
        return res.status(404).json({ success: false, error: "Address not found or unauthorized." });
      }

      await prisma.address.delete({
        where: { id }
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("Delete address error:", err);
      return res.status(500).json({ success: false, error: "Failed to delete address." });
    }
  }
};
