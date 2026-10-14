import { randomUUID } from "node:crypto";

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { OpenAIEmbeddings } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

import { env } from "../config/env.config";

// New name because the large model's vectors (3072 dims) don't fit the old 1536-dim collection.
export const COLLECTION_NAME = "pdf_documents";

// The large model copes much better when the question's wording differs from the PDF's.
export const embeddings = new OpenAIEmbeddings({
  apiKey: env.OPENAI_API_KEY,
  model: "text-embedding-3-large",
});

/** Indexes a PDF and returns its documentId, which scopes later searches. */
export async function indexPdf(pdf: Blob, userId: string) {
  const documentId = randomUUID();

  const docs = await new PDFLoader(pdf).load();

  const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
  const chunks = await splitter.splitDocuments(docs);

  for (const chunk of chunks) {
    chunk.metadata = { ...chunk.metadata, documentId, userId };
  }

  await QdrantVectorStore.fromDocuments(chunks, embeddings, {
    url: env.QDRANT_URL,
    collectionName: COLLECTION_NAME,
  });

  return documentId;
}
