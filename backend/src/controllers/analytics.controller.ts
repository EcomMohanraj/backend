import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const analyticsController = {
  async getSummary(req: AuthenticatedRequest, res: Response) {
    try {
      // Fetch all core counts and records
      const [allOrders, allCustomers, allProducts] = await Promise.all([
        prisma.order.findMany({
          include: {
            items: { include: { product: { include: { category: true } } } },
            customer: true
          },
          orderBy: { createdAt: "asc" }
        }),
        prisma.customer.findMany({
          orderBy: { createdAt: "asc" }
        }),
        prisma.product.findMany({
          include: { category: true }
        })
      ]);

      // Filter successful orders
      const successfulStatuses = ["paid", "confirmed", "processing", "packed", "shipped", "delivered"];
      const successfulOrders = allOrders.filter(o => successfulStatuses.includes(o.status.toLowerCase()));

      const totalRevenue = successfulOrders.reduce((sum, o) => sum + o.amount, 0);
      const totalOrders = allOrders.length;
      const totalCustomers = allCustomers.length;
      const totalProducts = allProducts.length;

      // Filter low stock
      const lowStockProducts = allProducts.filter(p => p.stock < 10).map(p => ({
        id: p.id,
        name: p.name,
        stock: p.stock,
        category: p.category?.name || "Uncategorized"
      }));

      // Calculate Orders Today and Orders This Month
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const ordersToday = allOrders.filter(o => new Date(o.createdAt) >= startOfToday).length;
      const ordersThisMonth = allOrders.filter(o => new Date(o.createdAt) >= startOfMonth).length;

      // Daily Sales Timeline (Last 30 Days)
      const dailyTimeline: Record<string, number> = {};
      // Initialize last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        dailyTimeline[key] = 0;
      }
      successfulOrders.forEach(o => {
        const key = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (dailyTimeline[key] !== undefined) {
          dailyTimeline[key] += o.amount;
        }
      });
      const dailySales = Object.entries(dailyTimeline).map(([date, sales]) => ({ date, sales }));

      // Monthly Revenue (Last 12 Months)
      const monthlyTimeline: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        monthlyTimeline[key] = 0;
      }
      successfulOrders.forEach(o => {
        const key = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (monthlyTimeline[key] !== undefined) {
          monthlyTimeline[key] += o.amount;
        }
      });
      const monthlyRevenue = Object.entries(monthlyTimeline).map(([month, revenue]) => ({ month, revenue }));

      // Top Selling Products
      const productSalesMap: Record<string, { name: string, quantity: number, revenue: number, category: string }> = {};
      successfulOrders.forEach(o => {
        o.items.forEach(item => {
          const prodId = item.productId;
          if (!productSalesMap[prodId]) {
            productSalesMap[prodId] = {
              name: item.product?.name || "Deleted Product",
              quantity: 0,
              revenue: 0,
              category: item.product?.category?.name || "Uncategorized"
            };
          }
          productSalesMap[prodId].quantity += item.quantity;
          productSalesMap[prodId].revenue += item.quantity * item.price;
        });
      });
      const topSellingProducts = Object.values(productSalesMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Customer Growth Rate (by month)
      const customerTimeline: Record<string, number> = {};
      for (let i = 11; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const key = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        customerTimeline[key] = 0;
      }
      allCustomers.forEach(c => {
        const key = new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" });
        if (customerTimeline[key] !== undefined) {
          customerTimeline[key] += 1;
        }
      });
      let totalCountSoFar = allCustomers.length - Object.values(customerTimeline).reduce((a, b) => a + b, 0);
      const customerGrowth = Object.entries(customerTimeline).map(([month, count]) => {
        totalCountSoFar += count;
        return { month, count: totalCountSoFar };
      });

      // Top Customers by Spending
      const customerSpendMap: Record<string, { name: string, email: string, phone: string, orderCount: number, totalSpent: number }> = {};
      successfulOrders.forEach(o => {
        if (o.customer) {
          const custId = o.customer.id;
          if (!customerSpendMap[custId]) {
            customerSpendMap[custId] = {
              name: o.customer.name,
              email: o.customer.email,
              phone: o.customer.phone || "—",
              orderCount: 0,
              totalSpent: 0
            };
          }
          customerSpendMap[custId].orderCount += 1;
          customerSpendMap[custId].totalSpent += o.amount;
        }
      });
      const topCustomers = Object.values(customerSpendMap)
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5);

      return res.json({
        metrics: {
          totalRevenue,
          totalOrders,
          totalCustomers,
          totalProducts,
          ordersToday,
          ordersThisMonth,
          lowStockCount: lowStockProducts.length
        },
        lowStockProducts,
        dailySales,
        monthlyRevenue,
        topSellingProducts,
        customerGrowth,
        topCustomers
      });
    } catch (err) {
      console.error("Get analytics summary error:", err);
      return res.status(500).json({ success: false, error: "Failed to load dashboard metrics." });
    }
  }
};
