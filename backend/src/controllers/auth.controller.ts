import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const authController = {
  // Since authentication is now fully managed by Supabase, frontend handles login directly.
  async login(req: Request, res: Response) {
    return res.status(400).json({
      success: false,
      error: "Login must be performed via Supabase authentication on the frontend."
    });
  },

  async register(req: Request, res: Response) {
    return res.status(400).json({
      success: false,
      error: "Registration must be performed via Supabase authentication on the frontend."
    });
  },

  async logout(req: Request, res: Response) {
    try {
      res.cookie("milky_session", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0
      });
      res.cookie("sb-access-token", "", {
        httpOnly: true,
        path: "/",
        maxAge: 0
      });
      return res.json({ success: true });
    } catch (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ success: false, error: "An unexpected error occurred during logout." });
    }
  },

  async getSession(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Not logged in." });
      }

      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        include: { customer: true }
      });

      if (!user) {
        return res.status(404).json({ success: false, error: "User profile not found in local database." });
      }

      return res.json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.customer?.phone || undefined,
          created_at: user.createdAt.toISOString()
        }
      });
    } catch (err) {
      console.error("Get session error:", err);
      return res.status(500).json({ success: false, error: "An unexpected error occurred." });
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Not logged in." });
      }

      const { name, phone } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, error: "Name is required." });
      }

      await prisma.user.update({
        where: { id: req.user.userId },
        data: { name }
      });

      // Update customer record if it exists
      const customer = await prisma.customer.findUnique({
        where: { userId: req.user.userId }
      });

      if (customer) {
        await prisma.customer.update({
          where: { id: customer.id },
          data: { name, phone: phone || null }
        });
      }

      return res.json({ success: true });
    } catch (err) {
      console.error("Update profile error:", err);
      return res.status(500).json({ success: false, error: "An unexpected error occurred while updating profile." });
    }
  }
};
