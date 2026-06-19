import { Request, Response, NextFunction } from "express";

// Secure Headers Middleware
export function secureHeaders(req: Request, res: Response, next: NextFunction) {
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;");
  
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
  next();
}

// Memory-based Rate Limiter
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

export function rateLimiter(windowMs: number, maxRequests: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Bypass for dev testing if necessary, but keep active
    const ip = (req.headers["x-forwarded-for"] as string) || req.ip || req.socket.remoteAddress || "unknown-ip";
    const now = Date.now();
    
    let record = rateLimitStore.get(ip);
    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(ip, record);
      return next();
    }
    
    record.count++;
    if (record.count > maxRequests) {
      return res.status(429).json({
        success: false,
        error: "Too many requests from this IP, please try again later."
      });
    }
    
    next();
  };
}

// Recursive Input Sanitization
function sanitizeValue(value: any): any {
  if (typeof value === "string") {
    // Avoid double encoding if already escaped
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === "object") {
    const sanitized: Record<string, any> = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = sanitizeValue(value[key]);
      }
    }
    return sanitized;
  }
  return value;
}

export function inputSanitizer(req: Request, res: Response, next: NextFunction) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
}

// CSRF Header Protection
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  const csrfHeader = req.headers["x-csrf-token"] || req.headers["x-requested-with"];
  const origin = req.headers.origin;

  const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:3000",
    "http://localhost:3000",
    "http://localhost:5000"
  ];

  if (origin && !allowedOrigins.includes(origin)) {
    return res.status(403).json({
      success: false,
      error: `CSRF check failed: Request origin '${origin}' is not authorized.`
    });
  }

  // Expect custom header presence for state-modifying requests
  if (!csrfHeader) {
    return res.status(403).json({
      success: false,
      error: "CSRF check failed: State-modifying requests require 'x-csrf-token' or 'x-requested-with' header."
    });
  }

  next();
}
