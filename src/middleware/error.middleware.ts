import { MulterError } from "multer";

import { env } from "@/config/env.config";
import logger from "@/config/logger.config";

import { ApiError } from "../utils/ApiError";

import type { Request, Response, NextFunction } from "express";

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
  // Upload limits (file too large, too many files) are client errors, not server faults.
  if (err instanceof MulterError) {
    statusCode = 400;
    message = err.code === "LIMIT_FILE_SIZE" ? "File is too large" : err.message;
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
