import { Router } from "express";
import multer from "multer";

import { protect } from "../../middleware/auth.middleware";
import { ApiError } from "../../utils/ApiError";

import { getImage, uploadImage } from "./image.handler";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "./image.service";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
  // Cheap early reject; the handler re-checks the actual bytes.
  fileFilter: (_req, file, cb) => {
    if ((ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.mimetype)) return cb(null, true);
    cb(new ApiError(400, "Only PNG, JPEG, WebP, or GIF images are supported"));
  },
});

const router = Router();

router.post("/", protect, upload.single("file"), uploadImage);
router.get("/:id", protect, getImage);

export default router;
