import { Router } from "express";

import { protect } from "../../middleware/auth.middleware";

import { getProfile, updateProfile } from "./user.handler";

const router = Router();

router.get("/me", protect, getProfile);
router.put("/me", protect, updateProfile);

export default router;
