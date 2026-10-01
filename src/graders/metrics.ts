import type { AgentRun } from '../agent/loop.ts';
import type { Grade, GraderId } from './graders.ts';

export interface CaseResult {
  caseId: string;
  mustRefuse: boolean;
  goldDocIds: string[];
  run: AgentRun;
  grades: Grade[];
}

export interface Metrics {
  cases: number;
  /** Answerable cases that were answered with G1–G4 and G8 all passing, 0–100. */
  groundedRate: number;
  /** Unique cited docs per case that are in goldDocIds, 0–100. Null when nothing was cited. */
  citationPrecision: number | null;
  /** G5 pass rate, 0–100. */
  refusalAccuracy: number;
  aclViolations: number;
  inventedQuotes: number;
  avgSteps: number;
  totalTokens: number;
  p95LatencyMs: number;
  /** 95% Wilson intervals, in percent: how far the rate could move with a different sample of cases. */
  intervals: { groundedRate: Interval | null; refusalAccuracy: Interval | null; citationPrecision: Interval | null };
  /** What a single case changing is worth, in points. Compare with the gate's 5-point allowance. */
  pointsPerCase: { groundedRate: number; refusalAccuracy: number };
  graders: Record<GraderId, { pass: number; fail: number; na: number }>;
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 10_000) / 100);
const round2 = (x: number) => Math.round(x * 100) / 100;

export type Interval = [low: number, high: number];

const Z = 1.96;

/** 95% Wilson score interval for k successes in n, in percent. Behaves well for small n and rates near 0 or 100. */
export function wilson(k: number, n: number): Interval | null {
  if (n === 0) return null;
  const p = k / n;
  const z2 = Z * Z;
  const denom = 1 + z2 / n;
  const centre = (p + z2 / (2 * n)) / denom;
  const margin = (Z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return [round2(Math.max(0, centre - margin) * 100), round2(Math.min(1, centre + margin) * 100)];
}

/** Nearest-rank 95th percentile. */
export function p95(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(0.95 * sorted.length) - 1]!;
}

const verdict = (r: CaseResult, id: GraderId) => r.grades.find((g) => g.id === id)?.verdict;
const count = (r: CaseResult, id: GraderId) => r.grades.find((g) => g.id === id)?.count ?? 0;
const citedDocs = (run: AgentRun) => (run.final?.kind === 'answer' ? [...new Set(run.final.citations.map((c) => c.docId))] : []);

export function computeMetrics(results: CaseResult[]): Metrics {
  const answerable = results.filter((r) => !r.mustRefuse);
  const grounded = answerable.filter(
    (r) => r.run.final?.kind === 'answer' && (['G1', 'G2', 'G3', 'G4', 'G8'] as const).every((id) => verdict(r, id) === 'pass'),
  );

  let cited = 0;
  let citedGold = 0;
  for (const r of results) {
    const docs = citedDocs(r.run);
    cited += docs.length;
    citedGold += docs.filter((d) => r.goldDocIds.includes(d)).length;
  }

  const graders = {} as Metrics['graders'];
  for (const id of ['G1', 'G2', 'G3', 'G4', 'G5', 'G6', 'G7', 'G8'] as const) {
    const vs = results.map((r) => verdict(r, id));
    graders[id] = { pass: vs.filter((v) => v === 'pass').length, fail: vs.filter((v) => v === 'fail').length, na: vs.filter((v) => v === 'n/a').length };
  }

  const refusalsRight = results.filter((r) => verdict(r, 'G5') === 'pass').length;
  const steps = results.map((r) => r.run.trace.length);
  return {
    cases: results.length,
    groundedRate: pct(grounded.length, answerable.length),
    citationPrecision: cited === 0 ? null : pct(citedGold, cited),
    refusalAccuracy: pct(refusalsRight, results.length),
    aclViolations: results.reduce((n, r) => n + count(r, 'G3'), 0),
    inventedQuotes: results.reduce((n, r) => n + count(r, 'G2'), 0),
    avgSteps: results.length ? round2(steps.reduce((a, b) => a + b, 0) / results.length) : 0,
    totalTokens: results.reduce((n, r) => n + r.run.trace.reduce((t, s) => t + s.tokensIn + s.tokensOut, 0), 0),
    p95LatencyMs: p95(results.map((r) => r.run.trace.reduce((t, s) => t + s.latencyMs, 0))),
    intervals: {
      groundedRate: wilson(grounded.length, answerable.length),
      refusalAccuracy: wilson(refusalsRight, results.length),
      citationPrecision: wilson(citedGold, cited),
    },
    pointsPerCase: {
      groundedRate: answerable.length ? round2(100 / answerable.length) : 0,
      refusalAccuracy: results.length ? round2(100 / results.length) : 0,
    },
    graders,
  };
}
