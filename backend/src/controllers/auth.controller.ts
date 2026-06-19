import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { generateAccessToken, generateRefreshToken, decryptSession } from "../lib/session";
import { AuthenticatedRequest } from "../middleware/auth";

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("milky_access_token", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000 // 15 minutes
  });

  res.cookie("milky_session", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
}

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

      if (!user || user.deletedAt) {
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }

      if (user.blocked) {
        return res.status(403).json({ success: false, error: "Access Denied: Your account has been suspended by an administrator." });
      }

      if (user.passwordHash === "supabase") {
        return res.status(400).json({
          success: false,
          error: "This account was created via Supabase. Please log in using Supabase."
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.passwordHash || "");
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: "Invalid credentials." });
      }

      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      const accessToken = await generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(payload);

      // Save refresh token in DB
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      setAuthCookies(res, accessToken, refreshToken);

      return res.json({
        success: true,
        accessToken,
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

      const accessToken = await generateAccessToken(payload);
      const refreshToken = await generateRefreshToken(payload);

      // Save refresh token in DB
      await prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: result.user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      });

      setAuthCookies(res, accessToken, refreshToken);

      return res.status(201).json({
        success: true,
        accessToken,
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

  async refresh(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.milky_session || req.body.refreshToken;
      if (!refreshToken) {
        return res.status(401).json({ success: false, error: "Unauthorized: Session cookie missing" });
      }

      const decoded = await decryptSession(refreshToken);
      if (!decoded) {
        return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired session refresh token" });
      }

      // Check DB for active token
      const dbToken = await prisma.refreshToken.findUnique({
        where: { token: refreshToken }
      });

      if (!dbToken) {
        // REPLAY ATTACK DETECTION: Token is valid but not in DB (must have been rotated/revoked)
        // Revoke all refresh tokens for this user
        await prisma.refreshToken.deleteMany({
          where: { userId: decoded.userId }
        });

        res.clearCookie("milky_access_token", { path: "/" });
        res.clearCookie("milky_session", { path: "/" });

        return res.status(401).json({
          success: false,
          error: "Security Warning: Session reuse detected. All login sessions have been revoked. Please log in again."
        });
      }

      // Check token expiration
      if (new Date() > dbToken.expiresAt) {
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });
        return res.status(401).json({ success: false, error: "Session expired. Please log in again." });
      }

      // Check if user is blocked or deleted
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId }
      });

      if (!user || user.deletedAt) {
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });
        return res.status(401).json({ success: false, error: "Account no longer exists." });
      }

      if (user.blocked) {
        await prisma.refreshToken.delete({ where: { id: dbToken.id } });
        return res.status(403).json({ success: false, error: "Access Denied: Account has been suspended." });
      }

      // Rotate tokens
      const payload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };

      const newAccessToken = await generateAccessToken(payload);
      const newRefreshToken = await generateRefreshToken(payload);

      await prisma.$transaction([
        prisma.refreshToken.delete({ where: { id: dbToken.id } }),
        prisma.refreshToken.create({
          data: {
            token: newRefreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        })
      ]);

      setAuthCookies(res, newAccessToken, newRefreshToken);

      return res.json({
        success: true,
        accessToken: newAccessToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error("Refresh token error:", err);
      return res.status(500).json({ success: false, error: "Token rotation process failed." });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const refreshToken = req.cookies.milky_session || req.body.refreshToken;
      if (refreshToken) {
        await prisma.refreshToken.delete({
          where: { token: refreshToken }
        }).catch(() => {});
      }

      res.clearCookie("milky_access_token", { path: "/" });
      res.clearCookie("milky_session", { path: "/" });

      return res.json({ success: true });
    } catch (err) {
      console.error("Logout error:", err);
      return res.status(500).json({ success: false, error: "An unexpected error occurred during logout." });
    }
  },

  async logoutAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      await prisma.refreshToken.deleteMany({
        where: { userId: req.user.userId }
      });

      res.clearCookie("milky_access_token", { path: "/" });
      res.clearCookie("milky_session", { path: "/" });

      return res.json({ success: true, message: "Successfully logged out from all devices." });
    } catch (err) {
      console.error("Logout all devices error:", err);
      return res.status(500).json({ success: false, error: "Failed to log out from all devices." });
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

      if (!user || user.deletedAt) {
        return res.status(404).json({ success: false, error: "User profile not found in database." });
      }

      if (user.blocked) {
        return res.status(403).json({ success: false, error: "Access Denied: Account suspended." });
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
