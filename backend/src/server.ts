import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma";
import apiRouter from "./routes/api";
import { secureHeaders, rateLimiter, inputSanitizer, csrfProtection } from "./middleware/security";
import { globalErrorHandler, responseStandardizer } from "./middleware/errors";

const app = express();
const PORT = process.env.PORT || 5000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Cookie", "X-CSRF-Token", "X-Requested-With"],
  optionsSuccessStatus: 200
};

// Security headers
app.use(secureHeaders);

// Configure CORS to support cookie credentials from frontend
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight checks globally

// Global rate limiter (max 300 requests per 15 minutes)
app.use(rateLimiter(15 * 60 * 1000, 300));

// Global parsing middleware
app.use(express.json());
app.use(cookieParser());

// Standardize response payload format
app.use(responseStandardizer);

// Escape HTML characters to protect against XSS
app.use(inputSanitizer);

// CSRF validation on mutation requests
app.use(csrfProtection);

// Health Check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date() });
});

// Mount all API routes on /api
app.use("/api", apiRouter);

// Centralized error boundary
app.use(globalErrorHandler);

// Database check and server launch
prisma
  .$connect()
  .then(() => {
    console.log("PostgreSQL database connected successfully via Prisma.");
    app.listen(PORT, () => {
      console.log(`Server is running in dev mode on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Critical: Database connection failed on startup!", err);
    process.exit(1);
  });
