import { requireUser } from "../../middleware/auth.middleware";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";

import * as UserService from "./user.service";

import type { Request, Response } from "express";

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await UserService.getById(requireUser(req).id);
  res.status(200).json(new ApiResponse(200, user));
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  // Only `name` is user-editable — email/emailVerified must never come from the
  // client, or a user could claim someone else's email before they sign in with Google.
  const { name } = (req.body ?? {}) as { name?: unknown };
  const user = await UserService.update(requireUser(req).id, {
    name: typeof name === "string" ? name.trim() : undefined,
  });
  res.status(200).json(new ApiResponse(200, user, "Profile updated"));
});
