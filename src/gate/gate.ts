import type { Metrics } from '../graders/metrics.ts';

export const MAX_QUALITY_DROP_POINTS = 5;
export const MAX_BUDGET_RISE = 0.15;

export type GateMetrics = Pick<
  Metrics,
  'groundedRate' | 'citationPrecision' | 'aclViolations' | 'inventedQuotes' | 'avgSteps' | 'totalTokens' | 'p95LatencyMs'
> & {
  /** Judge means on the 1–4 scale; null when the judge didn't run. */
  j1Mean: number | null;
  j2Mean: number | null;
};

export interface GateCheck {
  name: keyof GateMetrics;
  rule: string;
  baseline: number | null;
  current: number | null;
  ok: boolean;
  skipped?: boolean;
}

/** 1–4 judge scale onto 0–100, so judge scores use the same 5-point rule as the rates. */
export const normaliseJudge = (mean: number) => ((mean - 1) / 3) * 100;

const QUALITY = ['groundedRate', 'citationPrecision', 'j1Mean', 'j2Mean'] as const;
const BUDGET = ['avgSteps', 'totalTokens', 'p95LatencyMs'] as const;
// Floating point: 3.4 → 3.25 is exactly 5 points but computes as 5.000000000000007.
const EPSILON = 1e-9;

export function gate(current: GateMetrics, baseline: GateMetrics): { ok: boolean; checks: GateCheck[] } {
  const checks: GateCheck[] = [];

  for (const name of ['aclViolations', 'inventedQuotes'] as const) {
    checks.push({ name, rule: 'must be 0 (hard gate)', baseline: baseline[name], current: current[name], ok: current[name] === 0 });
  }

  for (const name of QUALITY) {
    const scale = name === 'j1Mean' || name === 'j2Mean' ? normaliseJudge : (x: number) => x;
    const rule = `may drop at most ${MAX_QUALITY_DROP_POINTS} points`;
    const [b, c] = [baseline[name], current[name]];
    if (b === null) {
      checks.push({ name, rule, baseline: b, current: c, ok: true, skipped: true });
      continue;
    }
    const ok = c !== null && scale(b) - scale(c) <= MAX_QUALITY_DROP_POINTS + EPSILON;
    checks.push({ name, rule, baseline: b, current: c, ok });
  }

  for (const name of BUDGET) {
    const [b, c] = [baseline[name], current[name]];
    const rule = `may rise at most ${MAX_BUDGET_RISE * 100}%`;
    if (b === 0) {
      checks.push({ name, rule, baseline: b, current: c, ok: true, skipped: true });
      continue;
    }
    checks.push({ name, rule, baseline: b, current: c, ok: c <= b * (1 + MAX_BUDGET_RISE) + EPSILON });
  }

  return { ok: checks.every((c) => c.ok), checks };
}
