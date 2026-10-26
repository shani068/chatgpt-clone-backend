import { requireUser } from "../../middleware/auth.middleware";
import { indexPdf } from "../../rag/indexing";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { asyncHandler } from "../../utils/asyncHandler";

import type { Request, Response } from "express";

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, "A PDF file is required");
  }

  const documentId = await indexPdf(new Blob([req.file.buffer]), requireUser(req).id);
  res.status(201).json(new ApiResponse(201, { documentId }, "Document indexed"));
});
