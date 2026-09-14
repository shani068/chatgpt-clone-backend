import { z } from "zod";
import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../../utils/ApiError";
import { MessageRole, MessageStatus } from "../../generated/prisma/enums";

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

const jsonValue = z.union([z.record(z.unknown()), z.array(z.unknown())]);

const createSchema = z.object({
  conversationId: z.string().min(1, "conversationId is required"),
  role: z.nativeEnum(MessageRole, { errorMap: () => ({ message: "Invalid message role" }) }),
  content: z.string().min(1, "Content must not be empty"),
  status: z
    .nativeEnum(MessageStatus, { errorMap: () => ({ message: "Invalid message status" }) })
    .optional(),
  parts: jsonValue.optional(),
  metadata: jsonValue.optional(),
  parentId: z.string().min(1).optional(),
});

const updateSchema = z
  .object({
    content: z.string().min(1, "Content must not be empty").optional(),
    status: z
      .nativeEnum(MessageStatus, { errorMap: () => ({ message: "Invalid message status" }) })
      .optional(),
    parts: jsonValue.nullable().optional(),
    metadata: jsonValue.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required to update",
  });

export const validateCreate = validate(createSchema);
export const validateUpdate = validate(updateSchema);
