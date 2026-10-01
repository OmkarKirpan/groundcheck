import { describe, expect, it } from 'vitest';
import { runAgent } from '../../src/agent/loop.ts';
import type { ChatRequest, ChatResponse, ModelClient, ToolCall } from '../../src/agent/types.ts';
import type { Doc, Role } from '../../src/retrieval/corpus.ts';

const doc = (id: string, body: string, rolesAllowed: Role[]): Doc => ({
  id,
  title: id,
  type: 'policy',
  version: 1,
  effectiveDate: '2026-01-01',
  supersedes: null,
  status: 'current',
  rolesAllowed,
  body,
});
const corpus = [
  doc('pol-leave', 'Annual leave is 24 days per year.', ['employee', 'manager', 'hr_admin']),
  doc('hr-comp-bands', 'The L3 salary band is 72k to 90k.', ['hr_admin']),
];

const call = (name: string, args: Record<string, unknown>): ToolCall => ({ function: { name, arguments: args } });
const reply = (toolCalls: ToolCall[], content = ''): ChatResponse => ({
  message: { role: 'assistant', content, tool_calls: toolCalls },
  tokensIn: 100,
  tokensOut: 10,
  latencyMs: 50,
});

/** Plays back fixed replies and keeps a copy of every request it was sent. */
function scripted(replies: ChatResponse[]): ModelClient & { requests: ChatRequest[] } {
  const requests: ChatRequest[] = [];
  return {
    requests,
    async chat(req) {
      requests.push(structuredClone(req));
      const next = replies[requests.length - 1];
      if (!next) throw new Error('script ran out');
      return next;
    },
  };
}

const finalAnswer = call('final_answer', {
  answer: '24 days.',
  citations: [{ docId: 'pol-leave', quote: 'Annual leave is 24 days per year.' }],
});
const run = (client: ModelClient, role: Role = 'employee') =>
  runAgent({ question: 'How much leave?', role, corpus, client });

describe('runAgent', () => {
  it('runs search then final_answer and returns the parsed answer', async () => {
    const result = await run(scripted([reply([call('search_docs', { query: 'annual leave' })]), reply([finalAnswer])]));
    expect(result.stopReason).toBe('final_answer');
    expect(result.final).toEqual({
      kind: 'answer',
      answer: '24 days.',
      citations: [{ docId: 'pol-leave', quote: 'Annual leave is 24 days per year.' }],
    });
    expect(result.trace.map((s) => [s.step, s.tool])).toEqual([
      [1, 'search_docs'],
      [2, 'final_answer'],
    ]);
  });

  it('sends the system prompt and question first, then feeds tool results back', async () => {
    const client = scripted([reply([call('search_docs', { query: 'annual leave' })]), reply([finalAnswer])]);
    await run(client);
    const [first, second] = client.requests;
    expect(first!.messages.map((m) => m.role)).toEqual(['system', 'user']);
    expect(first!.messages[1]!.content).toBe('How much leave?');
    const toolMsg = second!.messages.at(-1)!;
    expect(toolMsg).toMatchObject({ role: 'tool', tool_name: 'search_docs' });
    expect(JSON.parse(toolMsg.content)[0].docId).toBe('pol-leave');
  });

  it('runs tools as the case role, so restricted docs never reach the model', async () => {
    const client = scripted([
      reply([call('search_docs', { query: 'L3 salary band' })]),
      reply([call('open_doc', { docId: 'hr-comp-bands' })]),
      reply([call('final_answer', { refusal: true, reason: 'restricted' })]),
    ]);
    const result = await run(client, 'employee');
    expect(result.trace[0]!.result).toBe('[]');
    expect(result.trace[1]!.result).toBe('{"error":"forbidden"}');
    expect(result.final).toEqual({ kind: 'refusal', reason: 'restricted' });
  });

  it('stops after 5 steps without a final answer', async () => {
    const client = scripted(Array.from({ length: 9 }, (_, i) => reply([call('search_docs', { query: `q${i}` })])));
    const result = await run(client);
    expect(result.stopReason).toBe('step_limit');
    expect(result.final).toBeNull();
    expect(client.requests).toHaveLength(5);
    expect(result.trace).toHaveLength(5);
  });

  it('returns a malformed final_answer to the model as an error and keeps going', async () => {
    const client = scripted([reply([call('final_answer', { answer: 'x', citations: [] })]), reply([finalAnswer])]);
    const result = await run(client);
    expect(result.trace[0]!.result).toMatch(/error.*citation/);
    expect(result.stopReason).toBe('final_answer');
  });

  it('nudges the model when it replies with text instead of a tool call', async () => {
    const client = scripted([reply([], 'It is 24 days.'), reply([finalAnswer])]);
    const result = await run(client);
    expect(result.trace[0]).toMatchObject({ step: 1, tool: null, result: 'It is 24 days.' });
    expect(client.requests[1]!.messages.at(-1)).toMatchObject({ role: 'user' });
    expect(result.stopReason).toBe('final_answer');
  });

  it('reports an unknown tool back to the model', async () => {
    const result = await run(scripted([reply([call('delete_docs', {})]), reply([finalAnswer])]));
    expect(result.trace[0]!.result).toMatch(/unknown tool/);
  });

  it('records tokens and latency per step', async () => {
    const result = await run(scripted([reply([finalAnswer])]));
    expect(result.trace[0]).toMatchObject({ tokensIn: 100, tokensOut: 10, latencyMs: 50 });
  });

  it('truncates long tool results in the trace but not in what the model sees', async () => {
    const long = doc('long', 'word '.repeat(400), ['employee']);
    const client = scripted([reply([call('open_doc', { docId: 'long' })]), reply([finalAnswer])]);
    const result = await runAgent({ question: 'q', role: 'employee', corpus: [...corpus, long], client });
    expect(result.trace[0]!.result.length).toBeLessThanOrEqual(501);
    expect(client.requests[1]!.messages.at(-1)!.content.length).toBeGreaterThan(1000);
  });

  it('stops with an error when the model call fails', async () => {
    const failing: ModelClient = {
      chat: async () => {
        throw new Error('connection refused');
      },
    };
    expect(await run(failing)).toMatchObject({ stopReason: 'error', final: null, error: 'connection refused' });
  });
});
