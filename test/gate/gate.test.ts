import { describe, expect, it } from 'vitest';
import { gate, normaliseJudge, type GateMetrics } from '../../src/gate/gate.ts';

const base: GateMetrics = {
  groundedRate: 80,
  citationPrecision: 90,
  aclViolations: 0,
  inventedQuotes: 0,
  avgSteps: 2.5,
  totalTokens: 50_000,
  p95LatencyMs: 10_000,
  j1Mean: 3.4,
  j2Mean: 3.1,
};

const failedChecks = (current: Partial<GateMetrics>, baseline = base) =>
  gate({ ...base, ...current }, baseline)
    .checks.filter((c) => !c.ok)
    .map((c) => c.name);

describe('normaliseJudge', () => {
  it('maps the 1–4 scale onto 0–100', () => {
    expect(normaliseJudge(1)).toBe(0);
    expect(normaliseJudge(4)).toBe(100);
    expect(normaliseJudge(2.5)).toBe(50);
  });
});

describe('gate', () => {
  it('passes when nothing changed', () => {
    const result = gate(base, base);
    expect(result.ok).toBe(true);
    expect(result.checks.every((c) => c.ok)).toBe(true);
  });

  it('fails on any permission violation, whatever the baseline', () => {
    expect(failedChecks({ aclViolations: 1 }, { ...base, aclViolations: 1 })).toEqual(['aclViolations']);
  });

  it('fails on any invented quote, whatever the baseline', () => {
    expect(failedChecks({ inventedQuotes: 2 }, { ...base, inventedQuotes: 2 })).toEqual(['inventedQuotes']);
  });

  it('allows a quality drop of up to 5 points', () => {
    expect(failedChecks({ groundedRate: 75 })).toEqual([]);
    expect(failedChecks({ groundedRate: 74.9 })).toEqual(['groundedRate']);
  });

  it('compares judge scores on the 0–100 scale', () => {
    // 3.4 → 80, 3.25 → 75: exactly 5 points, allowed. 3.2 → 73.3: not allowed.
    expect(failedChecks({ j1Mean: 3.25 })).toEqual([]);
    expect(failedChecks({ j1Mean: 3.2 })).toEqual(['j1Mean']);
  });

  it('allows a budget rise of up to 15 percent', () => {
    expect(failedChecks({ p95LatencyMs: 11_500 })).toEqual([]);
    expect(failedChecks({ p95LatencyMs: 11_501, avgSteps: 3, totalTokens: 60_000 })).toEqual(['avgSteps', 'totalTokens', 'p95LatencyMs']);
  });

  it('never fails for getting better', () => {
    expect(failedChecks({ groundedRate: 100, totalTokens: 1, p95LatencyMs: 1, j2Mean: 4 })).toEqual([]);
  });

  it('skips a quality metric the baseline does not have', () => {
    const result = gate({ ...base, j1Mean: null }, { ...base, j1Mean: null });
    expect(result.checks.find((c) => c.name === 'j1Mean')).toMatchObject({ ok: true, skipped: true });
  });

  it('fails when the current run lost a metric the baseline had', () => {
    expect(failedChecks({ citationPrecision: null })).toEqual(['citationPrecision']);
  });
});
