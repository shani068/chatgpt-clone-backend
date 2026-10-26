import { fromNodeHeaders } from "better-auth/node";

import { auth, type User } from "@/config/auth.config";

import { ApiError } from "../utils/ApiError";
import { asyncHandler } from "../utils/asyncHandler";

import type { Request, Response, NextFunction } from "express";

// asyncHandler forwards a getSession failure to the error handler; Express 4 would leave the request hanging.
export const protect = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return next(new ApiError(401, "Unauthorized: Please log in to access this resource"));
    }

    req.user = session.user;
    next();
  }
);

/** The signed-in user on a route behind `protect`. */
export const requireUser = (req: Request): User => {
  if (!req.user) {
    throw new ApiError(401, "Unauthorized: Please log in to access this resource");
  }
  return req.user;
};
