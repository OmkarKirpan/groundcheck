import type { AssistantMessage, ChatResponse, ModelClient, ToolCall } from './types.ts';

const TIMEOUT_MS = 300_000;

interface OllamaChatReply {
  message?: { role?: string; content?: string; tool_calls?: ToolCall[] };
  prompt_eval_count?: number;
  eval_count?: number;
}

/** Keeps only what goes back into the conversation; drops `thinking` and timing noise. */
export function fromOllama(raw: OllamaChatReply, latencyMs: number): ChatResponse {
  const message: AssistantMessage = { role: 'assistant', content: raw.message?.content ?? '' };
  if (raw.message?.tool_calls?.length) message.tool_calls = raw.message.tool_calls;
  return { message, tokensIn: raw.prompt_eval_count ?? 0, tokensOut: raw.eval_count ?? 0, latencyMs };
}

export function ollamaClient(host = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434'): ModelClient {
  return {
    async chat(req) {
      const started = performance.now();
      const res = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...req, stream: false }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
      const raw = (await res.json()) as OllamaChatReply;
      return fromOllama(raw, Math.round(performance.now() - started));
    },
  };
}
