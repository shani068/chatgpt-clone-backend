import { z } from "zod";

import { ApiError } from "../../utils/ApiError";

import type { Request, Response, NextFunction } from "express";

const validate =
  (schema: z.ZodType<unknown>) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.errors.map((e) => e.message).join(", ");
      return next(new ApiError(400, message));
    }
    req.body = result.data;
    next();
  };

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

export const validateRegister = validate(registerSchema);
export const validateLogin = validate(loginSchema);
