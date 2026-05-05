import type { Application } from "express";
// import authRoutes from "../modules/auth/auth.routes";
import userRoutes from "../modules/users/user.routes";

export const registerRoutes = (app: Application): void => {
  // app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
};