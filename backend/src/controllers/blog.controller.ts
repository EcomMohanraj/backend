import { Request, Response } from "express";
import { prisma } from "../lib/prisma";

function serializeBlog(b: any) {
  return {
    id: b.id,
    title: b.title,
    slug: b.slug,
    content: b.content,
    image: b.image,
    created_at: b.createdAt.toISOString()
  };
}

export const blogController = {
  async list(req: Request, res: Response) {
    try {
      const blogs = await prisma.blogPost.findMany({
        orderBy: { createdAt: "desc" }
      });
      return res.json(blogs.map(serializeBlog));
    } catch (err) {
      console.error("List blogs error:", err);
      return res.status(500).json({ success: false, error: "Failed to list blogs." });
    }
  },

  async getBySlug(req: Request, res: Response) {
    try {
      const { slug } = req.params;
      const blog = await prisma.blogPost.findUnique({
        where: { slug }
      });

      if (!blog) {
        return res.status(404).json({ success: false, error: "Article not found." });
      }

      return res.json(serializeBlog(blog));
    } catch (err) {
      console.error("Get blog error:", err);
      return res.status(500).json({ success: false, error: "Failed to get article." });
    }
  },

  async create(req: Request, res: Response) {
    try {
      const { title, slug, content, image } = req.body;
      if (!title || !slug || !content || !image) {
        return res.status(400).json({ success: false, error: "All required fields must be provided." });
      }

      const existing = await prisma.blogPost.findUnique({ where: { slug } });
      if (existing) {
        return res.status(400).json({ success: false, error: "Slug must be unique." });
      }

      const blog = await prisma.blogPost.create({
        data: { title, slug, content, image }
      });

      return res.status(201).json(serializeBlog(blog));
    } catch (err) {
      console.error("Create blog error:", err);
      return res.status(500).json({ success: false, error: "Failed to create article." });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      // Note: check by ID or Slug polymorphic lookup
      const blog = await prisma.blogPost.findFirst({
        where: {
          OR: [
            { id },
            { slug: id }
          ]
        }
      });

      if (!blog) {
        return res.status(404).json({ success: false, error: "Article not found." });
      }

      await prisma.blogPost.delete({
        where: { id: blog.id }
      });

      return res.json({ success: true });
    } catch (err) {
      console.error("Delete blog error:", err);
      return res.status(500).json({ success: false, error: "Failed to delete article." });
    }
  }
};
