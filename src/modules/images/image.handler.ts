import prisma from "../../config/database.config";
import { requireUser } from "../../middleware/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";

import { detectImageType } from "./image.service";

import type { Request, Response } from "express";

const NAME_MAX_LENGTH = 200;

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, "An image file is required");
  }

  const data = new Uint8Array(req.file.buffer);
  const mimeType = detectImageType(data);
  if (!mimeType) {
    throw new ApiError(400, "Only PNG, JPEG, WebP, or GIF images are supported");
  }

  const image = await prisma.chatImage.create({
    data: {
      userId: requireUser(req).id,
      name: (req.file.originalname || "image").slice(0, NAME_MAX_LENGTH),
      mimeType,
      size: data.byteLength,
      data,
    },
    select: { id: true, mimeType: true, size: true },
  });

  res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { imageId: image.id, mediaType: image.mimeType, size: image.size },
        "Image uploaded"
      )
    );
});

export const getImage = asyncHandler(async (req: Request, res: Response) => {
  // Scoped by owner: another user's id is indistinguishable from a missing one.
  const image = await prisma.chatImage.findFirst({
    where: { id: req.params.id, userId: requireUser(req).id },
    select: { mimeType: true, data: true },
  });

  if (!image) {
    throw new ApiError(404, "Image not found");
  }

  res.setHeader("Content-Type", image.mimeType);
  res.setHeader("Content-Disposition", "inline");
  // Images are immutable per id; "private" keeps shared caches from storing them.
  res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
  res.send(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength));
});
