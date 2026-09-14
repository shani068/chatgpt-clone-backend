import prisma from "../../config/database.config";
import { ApiError } from "../../utils/ApiError";

interface CreateConversationInput {
  title?: string;
  model?: string;
  systemPrompt?: string;
}

interface UpdateConversationInput {
  title?: string;
  model?: string | null;
  systemPrompt?: string | null;
  isPinned?: boolean;
  isArchived?: boolean;
}

const getOwnedOrThrow = async (id: string, userId: string) => {
  const conversation = await prisma.conversation.findUnique({ where: { id } });

  if (!conversation) {
    throw new ApiError(404, "Conversation not found");
  }

  if (conversation.userId !== userId) {
    throw new ApiError(403, "Forbidden: You do not have access to this conversation");
  }

  return conversation;
};

export const create = async (userId: string, data: CreateConversationInput) => {
  return prisma.conversation.create({
    data: {
      userId,
      title: data.title,
      model: data.model,
      systemPrompt: data.systemPrompt,
    },
  });
};

export const list = async (userId: string) => {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: [{ isPinned: "desc" }, { lastMessageAt: "desc" }],
  });
};

export const getById = async (id: string, userId: string) => {
  return getOwnedOrThrow(id, userId);
};

export const update = async (id: string, userId: string, data: UpdateConversationInput) => {
  await getOwnedOrThrow(id, userId);

  return prisma.conversation.update({
    where: { id },
    data,
  });
};

export const remove = async (id: string, userId: string) => {
  await getOwnedOrThrow(id, userId);
  await prisma.conversation.delete({ where: { id } });
};
