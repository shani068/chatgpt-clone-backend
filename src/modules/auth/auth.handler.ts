// import type { Request, Response, NextFunction } from "express";
// import * as AuthService from "./auth.service";
// import { ApiResponse } from "../../utils/ApiResponse";

// export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const result = await AuthService.register(req.body);
//     res.status(201).json(new ApiResponse(201, result, "User registered successfully"));
//   } catch (err) {
//     next(err);
//   }
// };

// export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
//   try {
//     const result = await AuthService.login(req.body);
//     res.status(200).json(new ApiResponse(200, result, "Login successful"));
//   } catch (err) {
//     next(err);
//   }
// };
