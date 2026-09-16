import type { Application } from "express";
// import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";
import conversationRoutes from "../modules/conversation/conversation.routes";
import messageRoutes from "../modules/messages/message.routes";
import chatRoutes from "../modules/chat/chat.routes";

export const registerRoutes = (app: Application): void => {
  // app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/conversations", conversationRoutes);
  app.use("/api/v1/messages", messageRoutes);
  app.use("/api/chat", chatRoutes);
};