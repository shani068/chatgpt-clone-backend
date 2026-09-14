import type { Request, Response } from "express";
import * as MessageService from "./message.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";

export const createMessage = asyncHandler(async (req: Request, res: Response) => {
  const message = await MessageService.create(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(201, message, "Message created"));
});

export const listMessages = asyncHandler(async (req: Request, res: Response) => {
  const conversationId =
    typeof req.query.conversationId === "string" ? req.query.conversationId : undefined;

  if (!conversationId) {
    throw new ApiError(400, "conversationId query parameter is required");
  }

  const messages = await MessageService.list(req.user!.id, conversationId);
  res.status(200).json(new ApiResponse(200, messages));
});

export const getMessage = asyncHandler(async (req: Request, res: Response) => {
  const message = await MessageService.getById(req.params.id, req.user!.id);
  res.status(200).json(new ApiResponse(200, message));
});

export const updateMessage = asyncHandler(async (req: Request, res: Response) => {
  const message = await MessageService.update(req.params.id, req.user!.id, req.body);
  res.status(200).json(new ApiResponse(200, message, "Message updated"));
});

export const deleteMessage = asyncHandler(async (req: Request, res: Response) => {
  await MessageService.remove(req.params.id, req.user!.id);
  res.status(200).json(new ApiResponse(200, null, "Message deleted"));
});
