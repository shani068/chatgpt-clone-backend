import { Router } from "express";
import { protect } from "../../middleware/auth.middleware";
import { validateCreate, validateUpdate } from "./message.validator";
import {
  createMessage,
  listMessages,
  getMessage,
  updateMessage,
  deleteMessage,
} from "./message.handler";

const router = Router();

router.post("/", protect, validateCreate, createMessage);
router.get("/", protect, listMessages);
router.get("/:id", protect, getMessage);
router.put("/:id", protect, validateUpdate, updateMessage);
router.delete("/:id", protect, deleteMessage);

export default router;
