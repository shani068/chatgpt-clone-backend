import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { validateCreate, validateUpdate } from "./conversation.validator";
import {
  createConversation,
  listConversations,
  getConversation,
  updateConversation,
  deleteConversation,
} from "./conversation.handler";

const router = Router();

router.post("/", protect, validateCreate, createConversation);
router.get("/", protect, listConversations);
router.get("/:id", protect, getConversation);
router.put("/:id", protect, validateUpdate, updateConversation);
router.delete("/:id", protect, deleteConversation);

export default router;
