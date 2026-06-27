import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

export const settingsController = {
  async get(req: Request, res: Response) {
    try {
      let settings = await prisma.storeSettings.findUnique({
        where: { id: "default" }
      });
      if (!settings) {
        settings = await prisma.storeSettings.create({
          data: {
            id: "default",
            storeName: "Milky Mushrooms",
            contactNumber: "+91 99887 76655",
            email: "contact@milkymushroom.in",
            deliveryCharges: 50.0,
            taxPercentage: 5.0
          }
        });
      }
      return res.json(settings);
    } catch (err) {
      console.error("Get settings error:", err);
      return res.status(500).json({ success: false, error: "Failed to get store settings." });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { storeName, contactNumber, email, deliveryCharges, taxPercentage } = req.body;
      const updated = await prisma.storeSettings.upsert({
        where: { id: "default" },
        update: {
          storeName,
          contactNumber,
          email,
          deliveryCharges: Number(deliveryCharges),
          taxPercentage: Number(taxPercentage)
        },
        create: {
          id: "default",
          storeName: storeName || "Milky Mushrooms",
          contactNumber: contactNumber || "+91 99887 76655",
          email: email || "contact@milkymushroom.in",
          deliveryCharges: Number(deliveryCharges) || 50.0,
          taxPercentage: Number(taxPercentage) || 5.0
        }
      });
      return res.json(updated);
    } catch (err) {
      console.error("Update settings error:", err);
      return res.status(500).json({ success: false, error: "Failed to update store settings." });
    }
  }
};
