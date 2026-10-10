import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { auth } from "@clerk/nextjs/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";

// NVIDIA's API is OpenAI-compatible.
const nvidia = createOpenAICompatible({
  name: "nvidia",
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

export async function POST(req: Request) {
  // The proxy doesn't guard /api, and this spends the NVIDIA key.
  await auth.protect();

  const { messages }: { messages: UIMessage[] } = await req.json();

  const result = streamText({
    model: nvidia("nvidia/nemotron-3-ultra-550b-a55b"),
    messages: await convertToModelMessages(messages),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({ stream: result.stream }),
  });
}
