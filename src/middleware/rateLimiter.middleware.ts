import rateLimit from "express-rate-limit";
import { appConfig } from "../config/app.config";

export const limiter = rateLimit({
  windowMs:       appConfig.rateLimit.windowMs,
  max:            appConfig.rateLimit.max,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, message: "Too many requests, please try again later." },
});
