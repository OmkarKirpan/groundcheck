import { describe, expect, it } from 'vitest';
import type { ChatRequest, ChatResponse, ModelClient } from '../../src/agent/types.ts';
import type { Doc } from '../../src/retrieval/corpus.ts';
import type { Case } from '../../src/runner/cases.ts';
import { buildReport, renderMarkdown, runEval } from '../../src/runner/run.ts';

const doc: Doc = {
  id: 'pol-leave',
  title: 'Leave Policy',
  type: 'policy',
  version: 1,
  effectiveDate: '2026-01-01',
  supersedes: null,
  status: 'current',
  rolesAllowed: ['employee', 'manager', 'hr_admin'],
  body: 'Annual leave is 24 days per year.',
};

const kase = (id: string, question: string, extra: Partial<Case> = {}): Case => ({
  id,
  role: 'employee',
  question,
  category: 'single-doc',
  goldAnswer: '24 days',
  goldDocIds: ['pol-leave'],
  mustRefuse: false,
  forbiddenDocIds: [],
  ...extra,
});

const final = (args: Record<string, unknown>): ChatResponse => ({
  message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'final_answer', arguments: args } }] },
  tokensIn: 100,
  tokensOut: 20,
  latencyMs: 400,
});

/** Answers "leave" questions with a real quote and invents one for "bad" questions. */
const fakeAgent: ModelClient = {
  async chat(req: ChatRequest) {
    const q = req.messages[1]!.content;
    if (q.includes('leave')) return final({ answer: '24 days', citations: [{ docId: 'pol-leave', quote: 'Annual leave is 24 days per year.' }] });
    if (q.includes('bad')) return final({ answer: '30 days', citations: [{ docId: 'pol-leave', quote: 'Leave is 30 days.' }] });
    return final({ refusal: true, reason: 'not in the documents' });
  },
};

const cases = [
  kase('c1', 'How much leave?'),
  kase('c2', 'A bad question?'),
  kase('c3', 'Who is the CEO?', { category: 'unanswerable', mustRefuse: true, goldDocIds: [] }),
];

describe('runEval', () => {
  it('runs and grades every case', async () => {
    const results = await runEval({ cases, corpus: [doc], client: fakeAgent });
    expect(results.map((r) => [r.caseId, r.run.final?.kind])).toEqual([
      ['c1', 'answer'],
      ['c2', 'answer'],
      ['c3', 'refusal'],
    ]);
    expect(results[1]!.grades.find((g) => g.id === 'G2')).toMatchObject({ verdict: 'fail', count: 1 });
  });
});

describe('buildReport and renderMarkdown', () => {
  it('summarises metrics and lists failing graders per case', async () => {
    const results = await runEval({ cases, corpus: [doc], client: fakeAgent });
    const report = buildReport({ runId: 'r1', createdAt: '2026-10-01T00:00:00Z', results });
    expect(report.metrics).toMatchObject({ cases: 3, inventedQuotes: 1, groundedRate: 50, refusalAccuracy: 100 });

    const md = renderMarkdown(report);
    expect(md).toContain('# Eval run r1');
    expect(md).toMatch(/Invented quotes \(hard gate\) \| 1 \|/);
    expect(md).toMatch(/\| c2 \|.*G2/);
    expect(md).not.toMatch(/\| c1 \|.*G2/);
  });
});
