import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

export function validateRequest(schema: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message
        }));
        return res.status(400).json({
          success: false,
          error: "Invalid request data. Please check parameters.",
          details: formattedErrors
        });
      }
      next(error);
    }
  };
}
