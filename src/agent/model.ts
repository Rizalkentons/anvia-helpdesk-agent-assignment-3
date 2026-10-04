import type {
  CompletionModel,
  CompletionModelControls,
  CompletionModelStreamEvent,
  CompletionRequest,
  CompletionResponse,
  ModelCallOptions,
} from "@anvia/core";
import { OpenAIClient } from "@anvia/openai";
import { config } from "../config.js";

const client = new OpenAIClient(config.provider);

/**
 * The configured gateway sends a `usage` object on *every* streamed
 * chat-completions chunk. `@anvia/openai` treats any chunk carrying `usage` as
 * the terminal chunk, so the following chunk aborts the run with
 * `CompletionProviderOutputError: invalid-tool-call`. Anvia Studio streams by
 * default, which made every Studio run fail.
 *
 * This wrapper keeps the model's non-streaming call (correct, and what
 * `generate()` already uses) and replays its result as synthetic stream events,
 * so streaming clients receive real `text_delta` / `tool_call` events instead of
 * a provider stream the adapter cannot parse. Trade-off: one model call's content
 * arrives as a single chunk rather than token by token.
 */

type StreamPart = Exclude<CompletionModelStreamEvent<unknown>, { type: "final" } | { type: "error" }>;

/** A completion model that can stream events as they are produced. */
export interface StreamingModel<RawResponse, Controls extends CompletionModelControls>
  extends CompletionModel<RawResponse, Controls> {
  streamCompletion(
    request: CompletionRequest,
    options?: ModelCallOptions,
  ): AsyncIterable<CompletionModelStreamEvent<RawResponse>>;
}

/** Stream parts that rebuild `response.choice` exactly, or undefined when a part cannot be replayed. */
function streamPartsFor(response: CompletionResponse<unknown>): StreamPart[] | undefined {
  const parts: StreamPart[] = [];

  for (const part of response.choice) {
    if (part.type === "text") {
      parts.push({ type: "text_delta", delta: part.text });
      continue;
    }

    if (part.type === "reasoning") {
      const { id, details } = part;

      if (details === undefined) {
        if (id === undefined) return undefined;
        parts.push({ type: "reasoning_delta", delta: part.text, id });
        continue;
      }

      // The runtime rebuilds reasoning text by concatenating its text/summary details.
      const textFromDetails = details
        .filter((detail) => detail.type === "text" || detail.type === "summary")
        .map((detail) => detail.text)
        .join("");

      if (textFromDetails !== part.text) return undefined;

      for (const detail of details) {
        const identity = id === undefined ? {} : { id };

        if (detail.type === "text") {
          parts.push({
            type: "reasoning_delta",
            delta: detail.text,
            contentType: "text",
            ...identity,
            ...(detail.signature === undefined ? {} : { signature: detail.signature }),
          });
        } else if (detail.type === "summary") {
          parts.push({ type: "reasoning_delta", delta: detail.text, contentType: "summary", ...identity });
        } else {
          parts.push({ type: "reasoning_delta", delta: detail.data, contentType: detail.type, ...identity });
        }
      }

      continue;
    }

    if (part.type === "tool-call") {
      parts.push({ type: "tool_call", toolCall: part });
      continue;
    }

    // Image and file parts have no stream representation.
    return undefined;
  }

  return parts;
}

function createStreamSafeModel<RawResponse, Controls extends CompletionModelControls>(
  model: StreamingModel<RawResponse, Controls>,
): StreamingModel<RawResponse, Controls> {
  return {
    provider: model.provider,
    modelId: model.modelId,
    capabilities: model.capabilities,
    controls: model.controls,
    contextLimits: model.contextLimits,
    traceRequest: (request, options) => model.traceRequest?.(request, options),
    completion: (request, options) => model.completion(request, options),

    async *streamCompletion(
      request: CompletionRequest,
      options?: ModelCallOptions,
    ): AsyncIterable<CompletionModelStreamEvent<RawResponse>> {
      const response = await model.completion(request, options);
      const parts = streamPartsFor(response);

      if (response.messageId !== undefined) {
        yield { type: "message_id", id: response.messageId };
      }

      if (parts === undefined) {
        yield { type: "final", response };
        return;
      }

      for (const part of parts) {
        yield part;
      }

      const hasToolCalls = response.choice.some((part) => part.type === "tool-call");

      yield {
        type: "final",
        response: {
          ...response,
          choice: [],
          finishReason: response.finishReason ?? (hasToolCalls ? "tool-calls" : "stop"),
        },
      };
    },
  };
}

/** The provider client, wrapped so streaming clients receive replayable events. */
export function getModel(modelId: string = config.model.id) {
  return createStreamSafeModel(
    client.completionModel({
      modelId,
    }),
  );
}
