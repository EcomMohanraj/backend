import { Response } from "express";
import { prisma } from "../lib/prisma";
import { AuthenticatedRequest } from "../middleware/auth";

export const reportsController = {
  async exportSales(req: AuthenticatedRequest, res: Response) {
    try {
      const orders = await prisma.order.findMany({
        include: {
          items: { include: { product: true } },
          customer: true
        },
        orderBy: { createdAt: "desc" }
      });

      let csv = "\uFEFFOrder ID,Customer Name,Customer Email,Amount,Status,Payment ID,Date,Items Count\n";
      orders.forEach(o => {
        const id = o.id;
        const name = o.customer?.name || "N/A";
        const email = o.customer?.email || "N/A";
        const amount = o.amount;
        const status = o.status;
        const paymentId = o.paymentId || "N/A";
        const date = o.createdAt.toLocaleDateString();
        const itemCount = o.items.reduce((sum, item) => sum + item.quantity, 0);

        csv += `"${id}","${name}","${email}",${amount},"${status}","${paymentId}","${date}",${itemCount}\n`;
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=sales_report.csv");
      return res.status(200).send(csv);
    } catch (err) {
      console.error("Export sales report error:", err);
      return res.status(500).json({ success: false, error: "Failed to export sales report." });
    }
  },

  async exportInventory(req: AuthenticatedRequest, res: Response) {
    try {
      const products = await prisma.product.findMany({
        where: { deletedAt: null },
        include: { category: true },
        orderBy: { stock: "asc" }
      });

      let csv = "\uFEFFProduct ID,Product Name,Slug,Category,Price,Current Stock,Nutrition Data\n";
      products.forEach(p => {
        const id = p.id;
        const name = p.name;
        const slug = p.slug;
        const cat = p.category?.name || "Uncategorized";
        const price = p.price;
        const stock = p.stock;
        const nutrition = JSON.stringify(p.nutrition || {}).replace(/"/g, '""');

        csv += `"${id}","${name}","${slug}","${cat}",${price},${stock},"${nutrition}"\n`;
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=inventory_report.csv");
      return res.status(200).send(csv);
    } catch (err) {
      console.error("Export inventory report error:", err);
      return res.status(500).json({ success: false, error: "Failed to export inventory report." });
    }
  },

  async exportRevenue(req: AuthenticatedRequest, res: Response) {
    try {
      const successfulStatuses = ["paid", "confirmed", "processing", "packed", "shipped", "delivered"];
      const orders = await prisma.order.findMany({
        where: {
          status: { in: successfulStatuses }
        },
        orderBy: { createdAt: "asc" }
      });

      const dailyRevenue: Record<string, number> = {};
      orders.forEach(o => {
        const key = o.createdAt.toISOString().slice(0, 10); // YYYY-MM-DD
        dailyRevenue[key] = (dailyRevenue[key] || 0) + o.amount;
      });

      let csv = "\uFEFFDate,Revenue (INR)\n";
      Object.entries(dailyRevenue).forEach(([date, amount]) => {
        csv += `"${date}",${amount.toFixed(2)}\n`;
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", "attachment; filename=revenue_report.csv");
      return res.status(200).send(csv);
    } catch (err) {
      console.error("Export revenue report error:", err);
      return res.status(500).json({ success: false, error: "Failed to export revenue report." });
    }
  }
};
