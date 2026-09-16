import { Router } from "express";

import { protect } from "../../middleware/auth.middleware";
import { validateChatBody } from "./chat.validator";
import { streamChat } from "./chat.handler";

const router = Router();

router.post("/", protect, validateChatBody, streamChat);

export default router;
