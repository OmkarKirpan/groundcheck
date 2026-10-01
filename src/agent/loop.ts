import type { Doc, Role } from '../retrieval/corpus.ts';
import { openDoc, searchDocs } from '../tools/tools.ts';
import { parseFinalAnswer, type FinalAnswer } from './final.ts';
import { AGENT_MODEL, AGENT_OPTIONS, MAX_STEPS, NUDGE, SYSTEM_PROMPT, TOOL_DEFS } from './prompt.ts';
import type { Message, ModelClient } from './types.ts';

const TRACE_RESULT_CHARS = 500;

export interface TraceStep {
  step: number;
  /** null when the model replied with text instead of a tool call. */
  tool: string | null;
  args: unknown;
  /** Truncated; the model itself sees the full result. */
  result: string;
  tokensIn: number;
  tokensOut: number;
  latencyMs: number;
}

export interface AgentRun {
  final: FinalAnswer | null;
  stopReason: 'final_answer' | 'step_limit' | 'error';
  trace: TraceStep[];
  error?: string;
}

const truncate = (s: string) => (s.length > TRACE_RESULT_CHARS ? `${s.slice(0, TRACE_RESULT_CHARS)}…` : s);

function toArgs(raw: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof raw !== 'string') return raw ?? {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function runTool(name: string, args: Record<string, unknown>, corpus: readonly Doc[], role: Role): unknown {
  switch (name) {
    case 'search_docs':
      return typeof args.query === 'string' ? searchDocs(corpus, role, args.query) : { error: 'query must be a string' };
    case 'open_doc':
      return typeof args.docId === 'string' ? openDoc(corpus, role, args.docId) : { error: 'docId must be a string' };
    default:
      return { error: `unknown tool: ${name}` };
  }
}

/** One step = one tool call (or one text-only reply). The run ends at final_answer or after MAX_STEPS. */
export async function runAgent(input: {
  question: string;
  role: Role;
  corpus: readonly Doc[];
  client: ModelClient;
}): Promise<AgentRun> {
  const { question, role, corpus, client } = input;
  const messages: Message[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: question },
  ];
  const trace: TraceStep[] = [];

  while (trace.length < MAX_STEPS) {
    let res;
    try {
      res = await client.chat({ model: AGENT_MODEL, messages: [...messages], tools: TOOL_DEFS, options: AGENT_OPTIONS, think: false });
    } catch (e) {
      return { final: null, stopReason: 'error', trace, error: (e as Error).message };
    }
    messages.push(res.message);
    const usage = { tokensIn: res.tokensIn, tokensOut: res.tokensOut, latencyMs: res.latencyMs };
    const calls = res.message.tool_calls ?? [];

    if (calls.length === 0) {
      trace.push({ step: trace.length + 1, tool: null, args: null, result: truncate(res.message.content), ...usage });
      messages.push({ role: 'user', content: NUDGE });
      continue;
    }

    for (const [i, call] of calls.entries()) {
      if (trace.length >= MAX_STEPS) break;
      // A turn's tokens and latency are counted once, on its first call.
      const cost = i === 0 ? usage : { tokensIn: 0, tokensOut: 0, latencyMs: 0 };
      const name = call.function.name;
      const args = toArgs(call.function.arguments);
      const step = trace.length + 1;

      if (name === 'final_answer') {
        const parsed = parseFinalAnswer(args);
        if (parsed.ok) {
          trace.push({ step, tool: name, args, result: truncate(JSON.stringify(parsed.value)), ...cost });
          return { final: parsed.value, stopReason: 'final_answer', trace };
        }
        const output = JSON.stringify({ error: `invalid final_answer: ${parsed.error}` });
        trace.push({ step, tool: name, args, result: output, ...cost });
        messages.push({ role: 'tool', tool_name: name, content: output });
        continue;
      }

      const output = JSON.stringify(runTool(name, args, corpus, role));
      trace.push({ step, tool: name, args, result: truncate(output), ...cost });
      messages.push({ role: 'tool', tool_name: name, content: output });
    }
  }

  return { final: null, stopReason: 'step_limit', trace };
}
