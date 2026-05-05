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
    const user = await UserService.update(req.user!.id, req.body);
    res.status(200).json(new ApiResponse(200, user, "Profile updated"));
  } catch (err) {
    next(err);
  }
};
