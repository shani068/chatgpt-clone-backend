import type { UIMessage } from "ai";

import prisma from "../../config/database.config";
import { Prisma } from "../../generated/prisma/client";
import { MessageRole, MessageStatus } from "../../generated/prisma/enums";

const DEFAULT_TITLE = "New Chat";
const TITLE_MAX_LENGTH = 48;

interface SaveChatMessagesOptions {
  updateTitle?: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textFromParts(parts: UIMessage["parts"]): string {
  return parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}

function toUiRole(role: MessageRole): UIMessage["role"] | null {
  if (role === MessageRole.USER) return "user";
  if (role === MessageRole.ASSISTANT) return "assistant";
  if (role === MessageRole.SYSTEM) return "system";
  return null;
}

function toDbRole(role: UIMessage["role"]): MessageRole | null {
  if (role === "user") return MessageRole.USER;
  if (role === "assistant") return MessageRole.ASSISTANT;
  if (role === "system") return MessageRole.SYSTEM;
  return null;
}

function partsFromRow(parts: Prisma.JsonValue | null, content: string): UIMessage["parts"] {
  if (Array.isArray(parts)) {
    return parts as UIMessage["parts"];
  }

  if (isRecord(parts) && Array.isArray(parts.parts)) {
    return parts.parts as UIMessage["parts"];
  }

  return [{ type: "text", text: content }];
}

/** Load conversation messages as AI SDK UIMessages (oldest first). */
export async function loadChatMessages(conversationId: string): Promise<UIMessage[]> {
  const rows = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });

  const messages: UIMessage[] = [];

  for (const row of rows) {
    const role = toUiRole(row.role);
    if (!role || role === "system") continue;

    messages.push({
      id: row.id,
      role,
      parts: partsFromRow(row.parts, row.content),
    });
  }

  return messages;
}

/**
 * Upsert UIMessages by id inside a single transaction.
 * Skips system messages. Optionally auto-titles a "New Chat" conversation.
 */
export async function saveChatMessages(
  conversationId: string,
  messages: UIMessage[],
  options: SaveChatMessagesOptions = {},
): Promise<void> {
  const { updateTitle = true } = options;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const message of messages) {
      if (message.role === "system") continue;

      const role = toDbRole(message.role);
      if (!role || role === MessageRole.SYSTEM) continue;

      const content = textFromParts(message.parts);
      const parts = message.parts as unknown as Prisma.InputJsonValue;

      await tx.message.upsert({
        where: { id: message.id },
        create: {
          id: message.id,
          conversationId,
          role,
          status: MessageStatus.COMPLETE,
          content,
          parts,
        },
        update: {
          role,
          status: MessageStatus.COMPLETE,
          content,
          parts,
        },
      });
    }

    const conversation = await tx.conversation.findUnique({
      where: { id: conversationId },
      select: { title: true },
    });

    let nextTitle: string | undefined;
    if (updateTitle && conversation?.title === DEFAULT_TITLE) {
      const firstUser = messages.find((message) => message.role === "user");
      if (firstUser) {
        const text = textFromParts(firstUser.parts).replace(/\s+/g, " ").trim();
        if (text) {
          nextTitle = text.slice(0, TITLE_MAX_LENGTH);
        }
      }
    }

    await tx.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: now,
        ...(nextTitle ? { title: nextTitle } : {}),
      },
    });
  });
}
