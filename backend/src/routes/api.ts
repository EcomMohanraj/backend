import { Router } from "express";
import { authController } from "../controllers/auth.controller";
import { productController } from "../controllers/product.controller";
import { reviewController } from "../controllers/review.controller";
import { blogController } from "../controllers/blog.controller";
import { addressController } from "../controllers/address.controller";
import { orderController } from "../controllers/order.controller";
import { customerController } from "../controllers/customer.controller";
import { analyticsController } from "../controllers/analytics.controller";
import { settingsController } from "../controllers/settings.controller";
import { reportsController } from "../controllers/reports.controller";
import { authMiddleware, adminMiddleware } from "../middleware/auth";

const router = Router();

// Auth routes
router.post("/auth/login", authController.login);
router.post("/auth/register", authController.register);
router.post("/auth/logout", authController.logout);
router.post("/auth/refresh", authController.refresh);
router.post("/auth/logout-all", authMiddleware, authController.logoutAll);
router.get("/auth/session", authMiddleware, authController.getSession);
router.put("/auth/session", authMiddleware, authController.updateProfile);

// Products routes
router.get("/products", productController.list);
router.get("/products/:slug", productController.getBySlug);
router.post("/products", authMiddleware, adminMiddleware, productController.create);
router.put("/products/:id", authMiddleware, productController.update);
router.delete("/products/:id", authMiddleware, adminMiddleware, productController.delete);

// Reviews routes
router.get("/reviews", reviewController.list);
router.post("/reviews", authMiddleware, reviewController.create);

// Blog routes
router.get("/blogs", blogController.list);
router.get("/blogs/:slug", blogController.getBySlug);
router.post("/blogs", authMiddleware, adminMiddleware, blogController.create);
router.delete("/blogs/:id", authMiddleware, adminMiddleware, blogController.delete);

// Address routes
router.get("/addresses", authMiddleware, addressController.list);
router.post("/addresses", authMiddleware, addressController.create);
router.delete("/addresses/:id", authMiddleware, addressController.delete);

// Order routes
router.get("/orders/track/:id", orderController.track); // Public track endpoint
router.get("/orders/:id/invoice", authMiddleware, orderController.getInvoice);
router.get("/orders", authMiddleware, orderController.list);
router.post("/orders", authMiddleware, orderController.create);
router.put("/orders/:id", authMiddleware, orderController.update);

// Customer routes (admin only)
router.get("/customers", authMiddleware, adminMiddleware, customerController.list);
router.get("/customers/:id", authMiddleware, adminMiddleware, customerController.getById);
router.put("/customers/:id/toggle-block", authMiddleware, adminMiddleware, customerController.toggleBlock);
router.put("/customers/:id/reset-password", authMiddleware, adminMiddleware, customerController.resetPassword);

// Analytics routes (admin only)
router.get("/analytics", authMiddleware, adminMiddleware, analyticsController.getSummary);

// Store Settings routes
router.get("/settings", settingsController.get);
router.put("/settings", authMiddleware, adminMiddleware, settingsController.update);

// Export CSV reports routes (admin only)
router.get("/reports/sales/csv", authMiddleware, adminMiddleware, reportsController.exportSales);
router.get("/reports/inventory/csv", authMiddleware, adminMiddleware, reportsController.exportInventory);
router.get("/reports/revenue/csv", authMiddleware, adminMiddleware, reportsController.exportRevenue);

export default router;
