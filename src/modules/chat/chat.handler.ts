import type { Request, Response } from "express";
import {
  convertToModelMessages,
  createIdGenerator,
  pipeUIMessageStreamToResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import logger from "../../config/logger.config";
import prisma from "../../config/database.config";
import { getChatModel } from "../ai/model";
import { loadChatMessages, saveChatMessages } from "./chat.persistence";
import type { ChatRequestBody } from "./chat.validator";

const DEFAULT_SYSTEM_PROMPT = `You are ChatGPT, a professional AI assistant built to help people get accurate, useful answers.

Follow these principles in every reply:
- Understand the user's intent before answering. If something is ambiguous, state your assumption briefly and proceed with the most likely interpretation.
- Lead with the direct answer, then add concise explanation, steps, or examples when they help.
- Be clear, well-structured, and easy to scan. Use short paragraphs, bullet lists, or numbered steps when the topic benefits from structure.
- Prefer practical, actionable guidance over vague advice. When relevant, include code, formulas, checklists, or concrete examples.
- Match depth to the question: keep simple questions short; go deeper for complex or technical topics.
- Be honest about uncertainty. If you lack enough information, say what is missing and ask a focused follow-up.
- Correct mistakes politely when you notice them. Never invent facts, citations, APIs, or file paths.
- Write in a natural, professional tone—warm and confident, never robotic, condescending, or overly casual.
- Adapt language and complexity to the user. Default to clear English unless the user writes in another language.
- For coding questions: provide working solutions, explain key decisions briefly, and call out edge cases or pitfalls when important.
- For sensitive topics (medical, legal, financial): give general information only and remind the user to consult a qualified professional for personal advice.
- Do not refuse reasonable requests. When a request cannot be fulfilled, explain why and offer the closest helpful alternative.

Your goal is that after one reply, the user feels the question was fully understood and properly answered.`;

const CHAT_TIMEOUT_MS = 55_000;

const generateAssistantMessageId = createIdGenerator({
  prefix: "msg",
  size: 16,
});

export const streamChat = asyncHandler(async (req: Request, res: Response) => {
  const { id: conversationId, message } = req.body as ChatRequestBody;
  const userId = req.user!.id;

  req.setTimeout(CHAT_TIMEOUT_MS);
  res.setTimeout(CHAT_TIMEOUT_MS);

  // Disable buffering so SSE chunks flush immediately (see vercel/ai#12233).
  res.socket?.setNoDelay(true);
  res.setHeader("Content-Encoding", "none");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");

  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: {
      id: true,
      model: true,
      systemPrompt: true,
    },
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  const previousMessages = await loadChatMessages(conversationId);
  const alreadyExists = previousMessages.some((entry) => entry.id === message.id);
  const incomingMessage = message as UIMessage;

  // Keep history in memory only — do not block the stream on a DB write.
  const uiMessages: UIMessage[] = alreadyExists
    ? previousMessages
    : [...previousMessages, incomingMessage];

  const modelMessages = await convertToModelMessages(uiMessages);

  const result = streamText({
    model: getChatModel(conversation.model),
    system: conversation.systemPrompt?.trim() || DEFAULT_SYSTEM_PROMPT,
    messages: modelMessages,
  });

  // Keep generating even if the client disconnects mid-stream.
  result.consumeStream();

  // Prefer standalone helpers — result.pipeUIMessageStreamToResponse is deprecated in AI SDK 7.
  // Docs: https://ai-sdk.dev/docs/reference/ai-sdk-ui/pipe-ui-message-stream-to-response
  const stream = toUIMessageStream({
    stream: result.stream,
    originalMessages: uiMessages,
    generateMessageId: generateAssistantMessageId,
    onFinish: async ({ responseMessage }) => {
      try {
        // Persist after the model finishes so the client sees tokens first.
        const toSave: UIMessage[] = alreadyExists
          ? [responseMessage]
          : [incomingMessage, responseMessage];

        await saveChatMessages(conversationId, toSave, {
          updateTitle: !alreadyExists,
        });
      } catch (error) {
        logger.error("Failed to persist chat messages after stream", {
          conversationId,
          messageId: responseMessage.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    },
  });

  await pipeUIMessageStreamToResponse({
    response: res,
    stream,
    headers: {
      "Content-Encoding": "none",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
});
