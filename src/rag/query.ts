import { MultiQueryRetriever } from "@langchain/classic/retrievers/multi_query";
import { ChatOpenAI } from "@langchain/openai";
import { QdrantVectorStore } from "@langchain/qdrant";

import { env } from "../config/env.config";

import { COLLECTION_NAME, embeddings } from "./indexing";

export const RAG_SYSTEM_PROMPT = `You answer questions about the user's uploaded PDF documents using the excerpts in the context below.
- Answer from the context. The document may use different wording than the question (for example "encryption at rest" for "unencrypted data"), so use related or partial information and explain what the document says about the topic.
- Mention the relevant section, priority, or phase when it helps.
- If nothing in the context relates to the question, say the document does not cover it.
- Do not invent facts about the document.
- If the user attached images, also use what you see in them; the context only covers the PDFs.

Context:
{context}`;

const llm = new ChatOpenAI({ apiKey: env.OPENAI_API_KEY, model: "gpt-4o-mini" });

/**
 * Returns the chunks most relevant to the question, limited to this user's given documents.
 * MultiQueryRetriever rephrases the question a few ways and merges the top 5 hits of each,
 * so a passage worded differently from the question is still found.
 */
export async function retrieveContext(question: string, documentIds: string[], userId: string) {
  const vectorStore = await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: env.QDRANT_URL,
    collectionName: COLLECTION_NAME,
  });

  const retriever = MultiQueryRetriever.fromLLM({
    llm,
    retriever: vectorStore.asRetriever({
      k: 5,
      filter: {
        must: [
          { key: "metadata.userId", match: { value: userId } },
          { key: "metadata.documentId", match: { any: documentIds } },
        ],
      },
    }),
  });

  const results = await retriever.invoke(question);
  return results.map((doc) => doc.pageContent).join("\n\n---\n\n");
}
