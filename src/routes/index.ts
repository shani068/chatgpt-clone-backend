// import authRoutes from "../modules/auth/auth.routes";
import chatRoutes from "../modules/chat/chat.routes";
import conversationRoutes from "../modules/conversation/conversation.routes";
import documentRoutes from "../modules/documents/document.routes";
import imageRoutes from "../modules/images/image.routes";
import messageRoutes from "../modules/messages/message.routes";
import userRoutes from "../modules/users/user.routes";

import type { Application } from "express";

export const registerRoutes = (app: Application): void => {
  // app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/conversations", conversationRoutes);
  app.use("/api/v1/messages", messageRoutes);
  app.use("/api/v1/documents", documentRoutes);
  app.use("/api/v1/images", imageRoutes);
  app.use("/api/chat", chatRoutes);
};
