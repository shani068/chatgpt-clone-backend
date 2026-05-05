import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { auth } from "@/config/auth.config";
import { fromNodeHeaders } from "better-auth/node";

export const protect = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  })
  
  if(!session) {
    return next(new ApiError(401, "Unauthorized: Please log in to access this resource"));
  }

  req.user = session.user;
  next();
};
