import type { Request, Response } from "express";

import { asyncHandler } from "../../utils/asyncHandler";
import { ApiError } from "../../utils/ApiError";
import { ApiResponse } from "../../utils/ApiResponse";
import { indexPdf } from "../../rag/indexing";

export const uploadDocument = asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) {
    throw new ApiError(400, "A PDF file is required");
  }

  const documentId = await indexPdf(new Blob([req.file.buffer]), req.user!.id);
  res.status(201).json(new ApiResponse(201, { documentId }, "Document indexed"));
});
