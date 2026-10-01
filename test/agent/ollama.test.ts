import { describe, expect, it } from 'vitest';
import { fromOllama } from '../../src/agent/ollama.ts';

describe('fromOllama', () => {
  it('maps an /api/chat reply to a ChatResponse, keeping only role, content and tool_calls', () => {
    const raw = {
      model: 'gemma4:e2b',
      message: {
        role: 'assistant',
        content: '',
        thinking: 'hmm',
        tool_calls: [{ id: 'call_1', function: { index: 0, name: 'search_docs', arguments: { query: 'leave' } } }],
      },
      done: true,
      prompt_eval_count: 148,
      eval_count: 22,
    };
    expect(fromOllama(raw, 123)).toEqual({
      message: {
        role: 'assistant',
        content: '',
        tool_calls: [{ id: 'call_1', function: { index: 0, name: 'search_docs', arguments: { query: 'leave' } } }],
      },
      tokensIn: 148,
      tokensOut: 22,
      latencyMs: 123,
    });
  });

  it('treats missing counts and content as zero and empty', () => {
    expect(fromOllama({ message: { role: 'assistant' } }, 5)).toEqual({
      message: { role: 'assistant', content: '' },
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: 5,
    });
  });
});
