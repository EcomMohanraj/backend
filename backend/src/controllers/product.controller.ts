import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

function serializeProduct(p: any) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    image: p.image,
    price: p.price,
    stock: p.stock,
    category: p.category?.name || "Uncategorized",
    categoryId: p.categoryId,
    nutrition: p.nutrition || {},
    created_at: p.createdAt.toISOString()
  };
}

export const productController = {
  async list(req: Request, res: Response) {
    try {
      const products = await prisma.product.findMany({
        include: { category: true },
        orderBy: { createdAt: "desc" }
      });
      return res.json(products.map(serializeProduct));
    } catch (err) {
      console.error("List products error:", err);
      return res.status(500).json({ success: false, error: "Failed to list products." });
    }
  },

  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const product = await prisma.product.findUnique({
        where: { slug },
        include: { category: true }
      });

      if (!product) {
        return res.status(404).json({ success: false, error: "Product not found." });
      }

      return res.json(serializeProduct(product));
    } catch (err) {
      console.error("Get product error:", err);
      return res.status(500).json({ success: false, error: "Failed to get product." });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { name, slug, description, image, price, stock, category, categoryId, nutrition } = req.body;
      if (!name || !slug || !description || !image || price === undefined || stock === undefined) {
        return res.status(400).json({ success: false, error: "All required fields must be provided." });
      }

      // Resolve category relation
      let resolvedCategoryId = categoryId;
      if (!resolvedCategoryId && category) {
        let catRecord = await prisma.category.findUnique({ where: { name: category } });
        if (!catRecord) {
          // Auto create category if not exists
          catRecord = await prisma.category.create({
            data: {
              name: category,
              slug: category.toLowerCase().replace(/[^a-z0-9]/g, "-")
            }
          });
        }
        resolvedCategoryId = catRecord.id;
      }

      if (!resolvedCategoryId) {
        return res.status(400).json({ success: false, error: "Product category is required." });
      }

      const existing = await prisma.product.findUnique({ where: { slug } });
      if (existing) {
        return res.status(400).json({ success: false, error: "Slug must be unique." });
      }

      const product = await prisma.product.create({
        data: {
          name,
          slug,
          description,
          image,
          price: Number(price),
          stock: Number(stock),
          categoryId: resolvedCategoryId,
          nutrition: nutrition || {}
        },
        include: { category: true }
      });

      return res.status(201).json(serializeProduct(product));
    } catch (err) {
      console.error("Create product error:", err);
      return res.status(500).json({ success: false, error: "Failed to create product." });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { name, slug, description, image, price, stock, category, categoryId, nutrition } = req.body;

      const current = await prisma.product.findUnique({ where: { id } });
      if (!current) {
        return res.status(404).json({ success: false, error: "Product not found." });
      }

      const data: any = {};
      if (name !== undefined) data.name = name;
      if (slug !== undefined) data.slug = slug;
      if (description !== undefined) data.description = description;
      if (image !== undefined) data.image = image;
      if (price !== undefined) data.price = Number(price);
      if (stock !== undefined) data.stock = Number(stock);
      if (nutrition !== undefined) data.nutrition = nutrition;

      // Resolve category if updating
      if (categoryId !== undefined) {
        data.categoryId = categoryId;
      } else if (category !== undefined) {
        let catRecord = await prisma.category.findUnique({ where: { name: category } });
        if (!catRecord) {
          catRecord = await prisma.category.create({
            data: {
              name: category,
              slug: category.toLowerCase().replace(/[^a-z0-9]/g, "-")
            }
          });
        }
        data.categoryId = catRecord.id;
      }

      const updated = await prisma.product.update({
        where: { id },
        data,
        include: { category: true }
      });

      return res.json(serializeProduct(updated));
    } catch (err) {
      console.error("Update product error:", err);
      return res.status(500).json({ success: false, error: "Failed to update product." });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { id },
            { slug: id }
          ]
        }
      });

      if (!product) {
        return res.status(404).json({ success: false, error: "Product not found." });
      }

      await prisma.product.delete({
        where: { id: product.id }
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("Delete product error:", err);
      return res.status(500).json({ success: false, error: "Failed to delete product." });
    }
  }
};
