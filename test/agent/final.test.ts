import { describe, expect, it } from 'vitest';
import { parseFinalAnswer } from '../../src/agent/final.ts';

describe('parseFinalAnswer', () => {
  it('parses an answer with citations', () => {
    expect(
      parseFinalAnswer({ answer: '24 days.', citations: [{ docId: 'pol-leave-v2', quote: 'receive 24 days' }] }),
    ).toEqual({
      ok: true,
      value: { kind: 'answer', answer: '24 days.', citations: [{ docId: 'pol-leave-v2', quote: 'receive 24 days' }] },
    });
  });

  it('parses a refusal', () => {
    expect(parseFinalAnswer({ refusal: true, reason: 'Not in the documents.' })).toEqual({
      ok: true,
      value: { kind: 'refusal', reason: 'Not in the documents.' },
    });
  });

  it('accepts a refusal without a reason', () => {
    expect(parseFinalAnswer({ refusal: true })).toEqual({ ok: true, value: { kind: 'refusal', reason: '' } });
  });

  it('uses the answer text as the reason when a refusal puts it there (seen from gemma4:e2b)', () => {
    expect(parseFinalAnswer({ refusal: true, answer: 'Not in my documents.' })).toEqual({
      ok: true,
      value: { kind: 'refusal', reason: 'Not in my documents.' },
    });
  });

  it('accepts citations sent as a JSON string, which small models often do', () => {
    expect(parseFinalAnswer({ answer: 'x', citations: '[{"docId":"a","quote":"q"}]' })).toEqual({
      ok: true,
      value: { kind: 'answer', answer: 'x', citations: [{ docId: 'a', quote: 'q' }] },
    });
  });

  it('rejects an answer with no citations', () => {
    expect(parseFinalAnswer({ answer: 'x', citations: [] })).toEqual({
      ok: false,
      error: expect.stringMatching(/citation/),
    });
  });

  it('rejects a citation without a quote', () => {
    expect(parseFinalAnswer({ answer: 'x', citations: [{ docId: 'a' }] })).toEqual({
      ok: false,
      error: expect.stringMatching(/quote/),
    });
  });

  it('rejects a missing answer', () => {
    expect(parseFinalAnswer({ citations: [{ docId: 'a', quote: 'q' }] })).toEqual({
      ok: false,
      error: expect.stringMatching(/answer/),
    });
  });
});
