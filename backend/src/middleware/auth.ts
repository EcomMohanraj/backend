import { Request, Response, NextFunction } from "express";
import { verifySupabaseToken, decryptSession, SessionPayload } from "../lib/session";
import { prisma } from "../lib/prisma";

export interface AuthenticatedRequest extends Request {
  user?: SessionPayload;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    let token = "";
    // Check Authorization header first, then fall back to cookies
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else {
      token = req.cookies.milky_access_token || req.cookies.milky_session || req.cookies["sb-access-token"] || "";
    }

    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized: No session token provided" });
    }

    // Try decrypting as a local session token first
    const localSession = await decryptSession(token);
    if (localSession) {
      // Fetch user from DB to verify blocking / soft delete
      const user = await prisma.user.findUnique({
        where: { id: localSession.userId }
      });

      if (!user) {
        return res.status(401).json({ success: false, error: "Unauthorized: User not found in database" });
      }

      if (user.blocked) {
        return res.status(403).json({ success: false, error: "Access Denied: Your account has been suspended by an administrator." });
      }

      if (user.deletedAt) {
        return res.status(401).json({ success: false, error: "Unauthorized: User account has been deactivated." });
      }

      req.user = {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: user.name
      };
      return next();
    }

    // Fallback: Verify as a Supabase JWT Token
    const decoded = await verifySupabaseToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid or expired session token" });
    }

    // Query user profile in local database
    let user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: { customer: true }
    });

    // Auto-sync profile to database if it doesn't exist yet
    if (!user) {
      const email = decoded.email;
      const name = decoded.user_metadata?.name || email.split("@")[0];

      // Check if user with this email already exists in local DB
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
        include: { customer: true }
      });

      if (existingUserByEmail) {
        // Upgrade existing user ID to match Supabase sub UUID
        user = await prisma.$transaction(async (tx) => {
          if (existingUserByEmail.customer) {
            await tx.customer.update({
              where: { id: existingUserByEmail.customer.id },
              data: { userId: null }
            });
          }
          await tx.user.delete({
            where: { id: existingUserByEmail.id }
          });
          const newUser = await tx.user.create({
            data: {
              id: decoded.sub,
              name: existingUserByEmail.name || name,
              email,
              role: existingUserByEmail.role || "customer",
              passwordHash: "supabase"
            },
            include: { customer: true }
          });
          if (existingUserByEmail.customer) {
            await tx.customer.update({
              where: { id: existingUserByEmail.customer.id },
              data: { userId: newUser.id }
            });
          } else {
            await tx.customer.create({
              data: {
                userId: newUser.id,
                name: newUser.name,
                email: newUser.email
              }
            });
          }
          return newUser;
        }) as any;
      } else {
        // Create brand new user and customer
        user = await prisma.$transaction(async (tx) => {
          const newUser = await tx.user.create({
            data: {
              id: decoded.sub,
              name,
              email,
              role: "customer",
              passwordHash: "supabase"
            }
          });

          await tx.customer.create({
            data: {
              userId: newUser.id,
              name,
              email
            }
          });

          return tx.user.findUnique({
            where: { id: newUser.id },
            include: { customer: true }
          });
        }) as any;
      }
    }

    if (!user) {
      return res.status(500).json({ success: false, error: "Authentication profile sync failed." });
    }

    if (user.blocked) {
      return res.status(403).json({ success: false, error: "Access Denied: Your account has been suspended by an administrator." });
    }

    if (user.deletedAt) {
      return res.status(401).json({ success: false, error: "Unauthorized: User account has been deactivated." });
    }

    // Set local request user matching old session schema for API compatibility
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name
    };

    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
}

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== "admin" && req.user.role !== "super-admin")) {
    return res.status(403).json({ success: false, error: "Forbidden: Admin access required" });
  }
  next();
}

export function superAdminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "super-admin") {
    return res.status(403).json({ success: false, error: "Forbidden: Super Admin access required" });
  }
  next();
}
