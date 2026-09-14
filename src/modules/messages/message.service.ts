import prisma from "../../config/database.config";
import { ApiError } from "../../utils/ApiError";
import type { MessageRole, MessageStatus } from "../../generated/prisma/enums";
import { Prisma } from "../../generated/prisma/client";

interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  status?: MessageStatus;
  parts?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  parentId?: string;
}

interface UpdateMessageInput {
  content?: string;
  status?: MessageStatus;
  parts?: Prisma.InputJsonValue | null;
  metadata?: Prisma.InputJsonValue | null;
}

const assertConversationOwned = async (conversationId: string, userId: string) => {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, userId: true },
  });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (conversation.userId !== userId) {
    throw new ApiError(403, "Forbidden: You do not have access to this conversation");
  }

  return conversation;
};

const getOwnedMessageOrThrow = async (id: string, userId: string) => {
  const message = await prisma.message.findUnique({
    where: { id },
    include: { conversation: { select: { userId: true } } },
  });

  if (!message) {
    throw new ApiError(404, "Message not found");
  }

  if (message.conversation.userId !== userId) {
    throw new ApiError(403, "Forbidden: You do not have access to this message");
  }

  const { conversation: _conversation, ...rest } = message;
  return rest;
};

export const create = async (userId: string, data: CreateMessageInput) => {
  await assertConversationOwned(data.conversationId, userId);

  if (data.parentId) {
    const parent = await prisma.message.findUnique({
      where: { id: data.parentId },
      select: { id: true, conversationId: true },
    });

    if (!parent) {
      throw new ApiError(404, "Parent message not found");
    }

    if (parent.conversationId !== data.conversationId) {
      throw new ApiError(400, "Parent message must belong to the same conversation");
    }
  }

  const now = new Date();

  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        conversationId: data.conversationId,
        role: data.role,
        content: data.content,
        status: data.status,
        parts: data.parts,
        metadata: data.metadata,
        parentId: data.parentId,
      },
    }),
    prisma.conversation.update({
      where: { id: data.conversationId },
      data: { lastMessageAt: now },
    }),
  ]);

  return message;
};

export const list = async (userId: string, conversationId: string) => {
  await assertConversationOwned(conversationId, userId);

  return prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  });
};

export const getById = async (id: string, userId: string) => {
  return getOwnedMessageOrThrow(id, userId);
};

export const update = async (id: string, userId: string, data: UpdateMessageInput) => {
  await getOwnedMessageOrThrow(id, userId);

  return prisma.message.update({
    where: { id },
    data: {
      content: data.content,
      status: data.status,
      parts: data.parts === null ? Prisma.DbNull : data.parts,
      metadata: data.metadata === null ? Prisma.DbNull : data.metadata,
    },
  });
};

export const remove = async (id: string, userId: string) => {
  await getOwnedMessageOrThrow(id, userId);
  await prisma.message.delete({ where: { id } });
};
