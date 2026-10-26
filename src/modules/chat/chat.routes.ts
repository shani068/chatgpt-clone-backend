import { Router } from "express";

import { protect } from "../../middleware/auth.middleware";

import { streamChat } from "./chat.handler";
import { validateChatBody } from "./chat.validator";

const router = Router();

router.post("/", protect, validateChatBody, streamChat);

export default router;
