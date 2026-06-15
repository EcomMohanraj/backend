import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { encryptSession } from "../lib/session";
import { AuthenticatedRequest } from "../middleware/auth";

export const authController = {
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email and password are required." });
      }

      const user = await prisma.user.findUnique({
        where: { email },
        include: { customer: true }
      });

      if (!user) {
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }

      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      const token = await encryptSession(payload);

      // Set cookie
      res.cookie("milky_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

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
      console.error("Login error:", err);
      return res.status(500).json({ success: false, error: "An unexpected error occurred during login." });
    }
  },

  async register(req: Request, res: Response) {
    try {
      const { name, email, phone, password } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Name, email, and password are required." });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, error: "Email is already in use." });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Run in transaction to create User and Customer models together
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            name,
            email,
            passwordHash,
            role: "customer"
          }
        });

        const customer = await tx.customer.create({
          data: {
            userId: user.id,
            name,
            email,
            phone: phone || null
          }
        });

        return { user, customer };
      });

      const payload = {
        userId: result.user.id,
        email: result.user.email,
        role: result.user.role,
        name: result.user.name
      };

      const token = await encryptSession(payload);

      // Set cookie
      res.cookie("milky_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.status(201).json({
        success: true,
        user: {
          id: result.user.id,
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          phone: result.customer.phone || undefined,
          created_at: result.user.createdAt.toISOString()
        }
      });
    } catch (err) {
      console.error("Registration error:", err);
      return res.status(500).json({ success: false, error: "An unexpected error occurred during registration." });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      res.cookie("milky_session", "", {
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
        return res.status(404).json({ success: false, error: "User not found." });
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
