import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/ApiError";

const validate =
  (schema: z.ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      return next(new ApiError(400, message));
    }
    req.body = result.data;
    next();
  };

const createSchema = z.object({
  title: z.string().trim().min(1, "Title must not be empty").optional(),
  model: z.string().trim().min(1, "Model must not be empty").optional(),
  systemPrompt: z.string().optional(),
});

const updateSchema = z
  .object({
    title: z.string().trim().min(1, "Title must not be empty").optional(),
    model: z.string().trim().min(1, "Model must not be empty").nullable().optional(),
    systemPrompt: z.string().nullable().optional(),
    isPinned: z.boolean().optional(),
    isArchived: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one field is required to update" }
  );

export const validateCreate = validate(createSchema);
export const validateUpdate = validate(updateSchema);
