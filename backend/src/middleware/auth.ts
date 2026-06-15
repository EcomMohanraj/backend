import { Request, Response, NextFunction } from "express";
import { decryptSession, SessionPayload } from "../lib/session";

export interface AuthenticatedRequest extends Request {
  user?: SessionPayload;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token = req.cookies.milky_session;
    if (!token) {
      return res.status(401).json({ success: false, error: "Unauthorized: No session token provided" });
    }
    const session = await decryptSession(token);
    if (!session) {
      return res.status(401).json({ success: false, error: "Unauthorized: Invalid session token" });
    }
    req.user = session;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ success: false, error: "Unauthorized" });
  }
}

export function adminMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Forbidden: Admin access required" });
  }
  next();
}
