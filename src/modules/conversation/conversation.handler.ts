import type { Request, Response } from "express";
import * as ConversationService from "./conversation.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { ApiResponse } from "../../utils/ApiResponse";

export const createConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await ConversationService.create(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(201, conversation, "Conversation created"));
});

export const listConversations = asyncHandler(async (req: Request, res: Response) => {
  const conversations = await ConversationService.list(req.user!.id);
  res.status(200).json(new ApiResponse(200, conversations));
});

export const getConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await ConversationService.getById(req.params.id, req.user!.id);
  res.status(200).json(new ApiResponse(200, conversation));
});

export const updateConversation = asyncHandler(async (req: Request, res: Response) => {
  const conversation = await ConversationService.update(req.params.id, req.user!.id, req.body);
  res.status(200).json(new ApiResponse(200, conversation, "Conversation updated"));
});

export const deleteConversation = asyncHandler(async (req: Request, res: Response) => {
  await ConversationService.remove(req.params.id, req.user!.id);
  res.status(200).json(new ApiResponse(200, null, "Conversation deleted"));
});
