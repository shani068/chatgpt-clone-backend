import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

import { env } from "../../config/env.config";

const DEFAULT_MODEL_ID = "gpt-4o-mini";

const openai = createOpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Returns an AI SDK OpenAI language model.
 * Keep provider/model wiring here so the chat route stays provider-agnostic.
 */
export function getChatModel(modelId?: string | null): LanguageModel {
  const id = modelId?.trim() || DEFAULT_MODEL_ID;
  return openai.chat(id);
}

export { DEFAULT_MODEL_ID };
