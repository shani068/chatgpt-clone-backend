import { z } from "zod";
import type { Request, Response, NextFunction } from "express";

import { ApiError } from "../../utils/ApiError";

const MAX_IMAGES_PER_MESSAGE = 5;

const imagePartSchema = z.object({
  type: z.literal("data-image"),
  data: z.object({
    imageId: z.string().min(1),
    name: z.string().optional(),
    size: z.number().optional(),
    mediaType: z.string().optional(),
  }),
});

export type ImagePartData = z.infer<typeof imagePartSchema>["data"];

const uiMessagePartSchema = z
  .object({
    type: z.string().min(1),
  })
  .passthrough()
  .superRefine((part, ctx) => {
    if (part.type === "data-image" && !imagePartSchema.safeParse(part).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid image attachment" });
    }
  });

const uiMessageSchema = z.object({
  id: z.string().min(1, "message.id is required"),
  role: z.enum(["user", "assistant", "system"]),
  parts: z
    .array(uiMessagePartSchema)
    .min(1, "message.parts must not be empty")
    .refine(
      (parts) => parts.filter((part) => part.type === "data-image").length <= MAX_IMAGES_PER_MESSAGE,
      `Up to ${MAX_IMAGES_PER_MESSAGE} images per message`,
    ),
  metadata: z.unknown().optional(),
});

const chatBodySchema = z.object({
  id: z.string().min(1, "Conversation id is required"),
  message: uiMessageSchema,
});

export type ChatRequestBody = z.infer<typeof chatBodySchema>;

/** Ids referenced by `data-image` parts (stored or incoming messages). */
export function imageIdsOf(parts: ReadonlyArray<{ type: string }>): string[] {
  return parts.flatMap((part) => {
    const parsed = imagePartSchema.safeParse(part);
    return parsed.success ? [parsed.data.data.imageId] : [];
  });
}

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
