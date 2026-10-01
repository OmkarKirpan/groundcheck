import { describe, expect, it } from 'vitest';
import type { FinalAnswer } from '../../src/agent/final.ts';
import { JUDGE_MODELS, judgeCase, judgeMessages, parseJudgeReply, type JudgeRequest } from '../../src/judge/judge.ts';
import type { Case } from '../../src/runner/cases.ts';

const kase: Case = {
  id: 'c1',
  role: 'employee',
  question: 'How much leave?',
  category: 'single-doc',
  goldAnswer: '24 days.',
  goldDocIds: ['pol-leave-v2'],
  mustRefuse: false,
  forbiddenDocIds: [],
};
const answer: FinalAnswer = { kind: 'answer', answer: 'You get 24 days.', citations: [{ docId: 'pol-leave-v2', quote: 'receive 24 days' }] };
const RUBRIC = 'RUBRIC TEXT';

describe('judgeMessages', () => {
  it('puts the rubric in the system message and the case in the user message', () => {
    const [system, user] = judgeMessages(kase, answer, RUBRIC);
    expect(system).toEqual({ role: 'system', content: RUBRIC });
    expect(user!.content).toContain('How much leave?');
    expect(user!.content).toContain('Expected answer: 24 days.');
    expect(user!.content).toContain('You get 24 days.');
    expect(user!.content).toContain('[pol-leave-v2] "receive 24 days"');
  });

  it('shows a refusal as a refusal', () => {
    const [, user] = judgeMessages(kase, { kind: 'refusal', reason: 'not found' }, RUBRIC);
    expect(user!.content).toContain('Refusal. Reason: not found');
  });
});

describe('parseJudgeReply', () => {
  it('parses plain JSON', () => {
    expect(parseJudgeReply('{"faithfulness": 4, "correctness": 3, "rationale": "ok"}')).toEqual({
      ok: true,
      value: { faithfulness: 4, correctness: 3, rationale: 'ok' },
    });
  });

  it('finds the JSON inside a code fence or extra text', () => {
    const reply = 'Here you go:\n```json\n{"faithfulness": 2, "correctness": 1, "rationale": "no"}\n```';
    expect(parseJudgeReply(reply)).toMatchObject({ ok: true, value: { faithfulness: 2, correctness: 1 } });
  });

  it('rejects a score outside 1 to 4', () => {
    expect(parseJudgeReply('{"faithfulness": 5, "correctness": 3, "rationale": ""}')).toMatchObject({ ok: false });
  });

  it('rejects a reply with no JSON', () => {
    expect(parseJudgeReply('I think it is fine.')).toMatchObject({ ok: false });
  });
});

describe('judgeCase', () => {
  const reply = (content: string) => ({ content, tokensIn: 300, tokensOut: 40 });

  it('asks the primary model at temperature 0 and returns its scores', async () => {
    const seen: JudgeRequest[] = [];
    const score = await judgeCase(kase, answer, RUBRIC, async (req) => {
      seen.push(req);
      return reply('{"faithfulness": 4, "correctness": 4, "rationale": "fine"}');
    });
    expect(seen.map((r) => [r.model, r.temperature])).toEqual([[JUDGE_MODELS[0], 0]]);
    expect(score).toEqual({ faithfulness: 4, correctness: 4, rationale: 'fine', model: JUDGE_MODELS[0] });
  });

  it('falls back to the second model when the first one errors', async () => {
    const score = await judgeCase(kase, answer, RUBRIC, async (req) => {
      if (req.model === JUDGE_MODELS[0]) throw new Error('429 rate limited');
      return reply('{"faithfulness": 3, "correctness": 2, "rationale": "x"}');
    });
    expect(score.model).toBe(JUDGE_MODELS[1]);
  });

  it('falls back when the first model replies with something unparseable', async () => {
    const score = await judgeCase(kase, answer, RUBRIC, async (req) =>
      reply(req.model === JUDGE_MODELS[0] ? 'no json here' : '{"faithfulness": 3, "correctness": 3, "rationale": "x"}'),
    );
    expect(score.model).toBe(JUDGE_MODELS[1]);
  });

  it('throws with every model\'s error when all of them fail', async () => {
    await expect(judgeCase(kase, answer, RUBRIC, async () => { throw new Error('down'); })).rejects.toThrow(/down.*down/s);
  });
});
