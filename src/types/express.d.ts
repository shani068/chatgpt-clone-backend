import { User } from "@/config/auth.config";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
