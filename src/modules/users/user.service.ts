import prisma from "../../config/database.config";
import { ApiError } from "../../utils/ApiError";

export const getById = async (id: string) => {
  const user = await prisma.user.findUnique({
    where:  { id },
    select: { id: true, name: true, email: true, createdAt: true },
  });
  if (!user) throw new ApiError(404, "User not found");
  return user;
};

export const update = async (id: string, data: { name?: string }) => {
  return prisma.user.update({
    where:  { id },
    data,
    select: { id: true, name: true, email: true },
  });
};
