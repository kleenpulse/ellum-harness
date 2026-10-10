import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { chat } from "@trigger.dev/sdk/ai";

// NVIDIA's API is OpenAI-compatible.
const nvidia = createOpenAICompatible({
  name: "nvidia",
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

// No `storage`: the platform's default transcript storage keeps each conversation, keyed by chatId.
export const chatAgent = chat.agent({
  id: "chat",
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: nvidia("nvidia/nemotron-3-ultra-550b-a55b"),
      messages,
      abortSignal: signal,
    }),
});
