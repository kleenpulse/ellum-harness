import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModelV4, LanguageModelV4StreamPart } from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";

// Omni rather than Ultra: computer use needs a model that can see screenshots.
const MODEL_ID = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning";

// NVIDIA's API is OpenAI-compatible.
const nvidia = createOpenAICompatible({
  name: "nvidia",
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1",
});

const openrouter = process.env.OPENROUTER_API_KEY
  ? createOpenAICompatible({
      name: "openrouter",
      apiKey: process.env.OPENROUTER_API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
    })
  : undefined;

// NVIDIA's free tier queues and rate-limits ("ResourceExhausted … 16/16");
// a step that hasn't started answering by then goes to OpenRouter instead.
const FIRST_CHUNK_TIMEOUT_MS = 20_000;
// After NVIDIA fails, skip it for a while so every step doesn't pay the timeout again.
const COOLDOWN_MS = 2 * 60_000;

// Parts that arrive before the model has actually produced anything.
const PREAMBLE = new Set<LanguageModelV4StreamPart["type"]>(["stream-start", "response-metadata", "raw"]);

type Params = Parameters<LanguageModelV4["doStream"]>[0];
type StreamResult = Awaited<ReturnType<LanguageModelV4["doStream"]>>;

/**
 * Starts NVIDIA's stream and waits for its first real part. Returns null if it
 * errored or stalled first; a failure after content has streamed is passed
 * through, since replaying the step elsewhere would duplicate output.
 */
async function tryPrimary(model: LanguageModelV4, params: Params): Promise<StreamResult | null> {
  const abort = new AbortController();
  const signal = params.abortSignal ? AbortSignal.any([params.abortSignal, abort.signal]) : abort.signal;
  const timer = setTimeout(() => abort.abort(new Error("NVIDIA didn't start answering in time.")), FIRST_CHUNK_TIMEOUT_MS);

  try {
    const result = await model.doStream({ ...params, abortSignal: signal });
    const reader = result.stream.getReader();
    const buffered: LanguageModelV4StreamPart[] = [];

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.type === "error") {
        void reader.cancel();
        return null;
      }
      buffered.push(value);
      if (!PREAMBLE.has(value.type)) break;
    }
    clearTimeout(timer);

    const stream = new ReadableStream<LanguageModelV4StreamPart>({
      start(controller) {
        for (const part of buffered) controller.enqueue(part);
      },
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) controller.close();
        else controller.enqueue(value);
      },
      cancel: (reason) => reader.cancel(reason),
    });
    return { ...result, stream };
  } catch (error) {
    // The user pressed Stop: don't answer anyway from another provider.
    if (params.abortSignal?.aborted) throw error;
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** `primary`, switching to `fallback` when it errors or stalls before answering. */
export function withFallback(primary: LanguageModelV4, fallback: LanguageModelV4 | undefined) {
  if (!fallback) return primary;
  let cooldownUntil = 0;
  return wrapLanguageModel({
    model: primary,
    middleware: {
      specificationVersion: "v4",
      wrapStream: async ({ params, model }) => {
        if (Date.now() < cooldownUntil) return fallback.doStream(params);

        const result = await tryPrimary(model, params);
        if (result) return result;
        cooldownUntil = Date.now() + COOLDOWN_MS;
        console.warn(`${model.provider} failed or stalled; falling back to ${fallback.provider}.`);
        return fallback.doStream(params);
      },
    },
  });
}

// Best free vision + tools model on OpenRouter for this job: in a click test on a
// real sandbox screenshot it was the only one to hit its targets (Nano Omni's
// :free twin missed every one; Gemma 4 was rate-limited; Inkling is gated).
const FALLBACK_MODEL_ID = "dots-studio/dots-3-note-preview:free";

export const chatModel = withFallback(nvidia(MODEL_ID), openrouter?.(FALLBACK_MODEL_ID));
