import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import logger from "@/config/logger.config";
import { env } from "@/config/env.config";

interface PrismaError extends Error {
  code?: string;
}

export const errorHandler = (
  err: PrismaError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = err instanceof ApiError ? err.statusCode : 500;
  let message = err.message || "Internal Server Error";

  if (err.code === "P2002") {
    statusCode = 409;
    message = "Resource already exists";
  }
  if (err.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
  }

  // ✅ Use Winston  — not console.error
  if (statusCode >= 500) {
    logger.error(message, {
      statusCode,
      stack: err.stack,
      code: err.code,
    });
  } else {
    logger.warn(message, { statusCode });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(env.NODE_ENV === "development" && { stack: err.stack }),
  });
};
