import type { Request, Response, NextFunction } from "express";
import * as UserService from "./user.service";
import { ApiResponse } from "../../utils/ApiResponse";

export const getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await UserService.getById(req.user!.id);
    res.status(200).json(new ApiResponse(200, user));
  } catch (err) {
    next(err);
  }
};

export const updateProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Only `name` is user-editable — email/emailVerified must never come from the
    // client, or a user could claim someone else's email before they sign in with Google.
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : undefined;
    const user = await UserService.update(req.user!.id, { name });
    res.status(200).json(new ApiResponse(200, user, "Profile updated"));
  } catch (err) {
    next(err);
  }
};
