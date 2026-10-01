import { describe, expect, it } from 'vitest';
import type { Metrics } from '../../src/graders/metrics.ts';
import { reportDiff } from '../../src/runner/compare.ts';
import type { CaseOutcome, Report } from '../../src/runner/run.ts';

const outcome = (caseId: string, extra: Partial<CaseOutcome> = {}): CaseOutcome => ({
  caseId,
  role: 'employee',
  category: 'single-doc',
  question: 'q',
  mustRefuse: false,
  goldDocIds: ['d'],
  run: { final: { kind: 'answer', answer: 'a', citations: [{ docId: 'd', quote: 'q' }] }, stopReason: 'final_answer', trace: [] },
  grades: [{ id: 'G1', verdict: 'pass' }],
  ...extra,
});

const report = (extra: Partial<Report> = {}): Report => ({
  runId: 'r1',
  createdAt: '2026-10-01T00:00:00Z',
  agent: { model: 'm', promptVersion: 'agent-v1' },
  metrics: { groundedRate: 100 } as Metrics,
  cases: [outcome('c1'), outcome('c2')],
  judge: {
    promptVersion: 'judge-v2',
    judged: 2,
    j1Mean: 4,
    j2Mean: 4,
    scores: {
      c1: { faithfulness: 4, correctness: 4, rationale: 'r', model: 'x' },
      c2: { faithfulness: 4, correctness: 4, rationale: 'r', model: 'x' },
    },
  },
  ...extra,
});

describe('reportDiff', () => {
  it('finds no difference between a report and its faithful replay, whatever the timestamp', () => {
    expect(reportDiff(report(), report({ createdAt: '2027-01-01T00:00:00Z' }))).toEqual([]);
  });

  it('names a metric that changed', () => {
    expect(reportDiff(report(), report({ metrics: { groundedRate: 95 } as Metrics }))).toEqual(['metrics.groundedRate: 100 → 95']);
  });

  it('names a case whose grade changed', () => {
    const replayed = report({ cases: [outcome('c1', { grades: [{ id: 'G1', verdict: 'fail', detail: 'x' }] }), outcome('c2')] });
    expect(reportDiff(report(), replayed)).toEqual(['c1: G1 pass → fail']);
  });

  it('names a case whose final answer changed', () => {
    const replayed = report({
      cases: [outcome('c1'), outcome('c2', { run: { final: { kind: 'refusal', reason: '' }, stopReason: 'final_answer', trace: [] } })],
    });
    expect(reportDiff(report(), replayed)).toEqual(['c2: final answer differs']);
  });

  it('names a judge score that changed', () => {
    const base = report();
    const replayed = report({
      judge: { ...base.judge!, scores: { ...base.judge!.scores, c2: { faithfulness: 4, correctness: 2, rationale: 'r', model: 'x' } } },
    });
    expect(reportDiff(base, replayed)).toEqual(['c2: judge 4/4 → 4/2']);
  });

  it('notices a judge section that appeared or disappeared', () => {
    expect(reportDiff(report(), report({ judge: undefined }))).toEqual(['judge: present → missing']);
  });
});
