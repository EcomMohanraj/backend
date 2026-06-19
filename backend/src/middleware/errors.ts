import { Request, Response, NextFunction } from "express";

export function globalErrorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error("Unhandled API Error:", err);
  
  const status = err.statusCode || err.status || 500;
  const message = err.message || "An unexpected error occurred on the server.";
  
  res.status(status).json({
    success: false,
    error: message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack
  });
}

export function responseStandardizer(req: Request, res: Response, next: NextFunction) {
  // standard helper methods
  res.success = (data: any, status = 200) => {
    return res.status(status).json({ success: true, data });
  };
  
  res.failure = (message: string, status = 400) => {
    return res.status(status).json({ success: false, error: message });
  };
  
  next();
}

// Extend global express namespace for standard helpers
declare global {
  namespace Express {
    interface Response {
      success(data: any, status?: number): Response;
      failure(message: string, status?: number): Response;
    }
  }
}
