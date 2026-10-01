import { describe, expect, it } from 'vitest';
import type { AgentRun, TraceStep } from '../../src/agent/loop.ts';
import type { Grade, GraderId, Verdict } from '../../src/graders/graders.ts';
import { computeMetrics, p95, type CaseResult } from '../../src/graders/metrics.ts';

const step = (latencyMs: number, tokensIn = 100, tokensOut = 10): TraceStep => ({
  step: 1,
  tool: 'search_docs',
  args: {},
  result: '',
  tokensIn,
  tokensOut,
  latencyMs,
});

const grades = (overrides: Partial<Record<GraderId, [Verdict, number?]>> = {}): Grade[] =>
  (['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7'] as const).map((id) => {
    const [verdict, count] = overrides[id] ?? ['pass'];
    return count === undefined ? { id, verdict } : { id, verdict, count };
  });

const answer = (docIds: string[], trace = [step(100)]): AgentRun => ({
  final: { kind: 'answer', answer: 'x', citations: docIds.map((docId) => ({ docId, quote: 'q' })) },
  stopReason: 'final_answer',
  trace,
});
const refusal = (trace = [step(100)]): AgentRun => ({ final: { kind: 'refusal', reason: '' }, stopReason: 'final_answer', trace });

const result = (run: AgentRun, extra: Partial<CaseResult> = {}): CaseResult => ({
  caseId: 'c',
  mustRefuse: false,
  goldDocIds: ['a'],
  run,
  grades: grades(),
  ...extra,
});

describe('p95', () => {
  it('uses the nearest-rank method', () => {
    expect(p95(Array.from({ length: 20 }, (_, i) => i + 1))).toBe(19);
    expect(p95([5])).toBe(5);
    expect(p95([])).toBe(0);
  });
});

describe('computeMetrics', () => {
  it('counts an answer as grounded only when G1 to G4 all pass', () => {
    const m = computeMetrics([
      result(answer(['a'])),
      result(answer(['a']), { grades: grades({ G2: ['fail', 1] }) }),
      result(answer(['a']), { grades: grades({ G4: ['fail'] }) }),
      result(refusal()),
    ]);
    expect(m.groundedRate).toBe(25);
  });

  it('leaves must-refuse cases out of the grounded rate', () => {
    const m = computeMetrics([result(answer(['a'])), result(refusal(), { mustRefuse: true, goldDocIds: [] })]);
    expect(m.groundedRate).toBe(100);
  });

  it('measures citation precision over unique cited docs per case', () => {
    const m = computeMetrics([result(answer(['a', 'a', 'b'])), result(answer(['a']))]);
    // case 1 cites {a, b}: 1 of 2 in gold; case 2 cites {a}: 1 of 1. Total 2 of 3.
    expect(m.citationPrecision).toBeCloseTo(66.67, 1);
  });

  it('reports citation precision as null when nothing was cited', () => {
    expect(computeMetrics([result(refusal())]).citationPrecision).toBeNull();
  });

  it('takes refusal accuracy from G5', () => {
    const m = computeMetrics([result(refusal()), result(refusal(), { grades: grades({ G5: ['fail'] }) })]);
    expect(m.refusalAccuracy).toBe(50);
  });

  it('sums ACL violations and invented quotes from the G3 and G2 counts', () => {
    const m = computeMetrics([
      result(answer(['a']), { grades: grades({ G2: ['fail', 2], G3: ['fail', 1] }) }),
      result(answer(['a']), { grades: grades({ G2: ['fail', 1] }) }),
    ]);
    expect(m).toMatchObject({ inventedQuotes: 3, aclViolations: 1 });
  });

  it('measures steps, tokens and p95 latency per case', () => {
    const m = computeMetrics([
      result(answer(['a'], [step(100, 50, 5), step(200, 60, 6)])),
      result(answer(['a'], [step(1000, 70, 7)])),
    ]);
    expect(m).toMatchObject({ avgSteps: 1.5, totalTokens: 198, p95LatencyMs: 1000 });
  });

  it('counts each grader\'s passes and fails', () => {
    const m = computeMetrics([result(answer(['a'])), result(refusal(), { grades: grades({ G1: ['n/a'], G7: ['fail'] }) })]);
    expect(m.graders.G1).toEqual({ pass: 1, fail: 0, na: 1 });
    expect(m.graders.G7).toEqual({ pass: 1, fail: 1, na: 0 });
  });
});
