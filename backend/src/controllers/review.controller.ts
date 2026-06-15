import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const reviewController = {
  async list(req: Request, res: Response) {
    try {
      const { productId } = req.query;
      if (!productId) {
        return res.status(400).json({ success: false, error: "productId is required." });
      }

      const reviews = await prisma.review.findMany({
        where: { productId: String(productId) },
        include: {
          customer: true
        },
        orderBy: { createdAt: "desc" }
      });

      const formatted = reviews.map((r) => ({
        id: r.id,
        product_id: r.productId,
        user_id: r.customer?.userId || "",
        rating: r.rating,
        comment: r.comment || "",
        created_at: r.createdAt.toISOString(),
        user_name: r.customer?.name || "Anonymous"
      }));

      return res.json(formatted);
    } catch (err) {
      console.error("List reviews error:", err);
      return res.status(500).json({ success: false, error: "Failed to list reviews." });
    }
  },

  async create(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized." });
      }

      const { product_id, rating, comment } = req.body;
      if (!product_id || rating === undefined) {
        return res.status(400).json({ success: false, error: "product_id and rating are required." });
      }

      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId }
      });

      if (!customer) {
        return res.status(400).json({ success: false, error: "Customer profile not found." });
      }

      const review = await prisma.review.create({
        data: {
          productId: product_id,
          customerId: customer.id,
          rating: Number(rating),
          comment: comment || null
        },
        include: {
          customer: true
        }
      });

      const formatted = {
        id: review.id,
        product_id: review.productId,
        user_id: customer.userId || "",
        rating: review.rating,
        comment: review.comment || "",
        created_at: review.createdAt.toISOString(),
        user_name: customer.name
      };

      return res.status(201).json(formatted);
    } catch (err) {
      console.error("Create review error:", err);
      return res.status(500).json({ success: false, error: "Failed to create review." });
    }
  }
};
