import { Router } from "express";
import multer from "multer";

import { protect } from "../../middleware/auth.middleware";
import { ApiError } from "../../utils/ApiError";
import { uploadDocument } from "./document.handler";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new ApiError(400, "Only PDF files are supported"));
  },
});

const router = Router();

router.post("/", protect, upload.single("file"), uploadDocument);

export default router;
