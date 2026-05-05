import { Router } from "express";
import { getProfile, updateProfile } from "./user.handler";
import { protect } from "../../middleware/auth.middleware";

const router = Router();

router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);

export default router;
