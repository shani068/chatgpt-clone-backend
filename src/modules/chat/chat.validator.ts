import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

import { ApiError } from "../../utils/ApiError";

const uiMessagePartSchema = z
  .object({
    type: z.string().min(1),
  })
  .passthrough();

const uiMessageSchema = z.object({
  id: z.string().min(1, "message.id is required"),
  role: z.enum(["user", "assistant", "system"]),
  parts: z.array(uiMessagePartSchema).min(1, "message.parts must not be empty"),
  metadata: z.unknown().optional(),
});

const chatBodySchema = z.object({
  id: z.string().min(1, "Conversation id is required"),
  message: uiMessageSchema,
});

export type ChatRequestBody = z.infer<typeof chatBodySchema>;

export const validateChatBody = (req: Request, _res: Response, next: NextFunction): void => {
  const result = chatBodySchema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors.map((error) => error.message).join(", ");
    next(new ApiError(400, message));
    return;
  }

  req.body = result.data;
  next();
};
