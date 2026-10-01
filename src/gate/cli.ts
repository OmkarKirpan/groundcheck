// npm run gate [report.json]          compare a report (default results/replay.json) with results/baseline.json
// npm run baseline -- <runId>         make results/<runId>.json the baseline
import { readFileSync, writeFileSync } from 'node:fs';
import type { Report } from '../runner/run.ts';
import { gate, type GateMetrics } from './gate.ts';

const BASELINE = 'results/baseline.json';

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

export function gateMetrics(report: Report): GateMetrics {
  const m = report.metrics;
  return {
    groundedRate: m.groundedRate,
    citationPrecision: m.citationPrecision,
    aclViolations: m.aclViolations,
    inventedQuotes: m.inventedQuotes,
    avgSteps: m.avgSteps,
    totalTokens: m.totalTokens,
    p95LatencyMs: m.p95LatencyMs,
    j1Mean: report.judge?.j1Mean ?? null,
    j2Mean: report.judge?.j2Mean ?? null,
  };
}

const [first, second] = process.argv.slice(2);

if (first === 'set') {
  if (!second) throw new Error('usage: npm run baseline -- <runId>');
  const report = readJson<Report>(`results/${second}.json`);
  writeFileSync(BASELINE, `${JSON.stringify({ runId: report.runId, metrics: gateMetrics(report) }, null, 2)}\n`);
  console.log(`baseline is now ${report.runId}`);
} else {
  const path = first ?? 'results/replay.json';
  const baseline = readJson<{ runId: string; metrics: GateMetrics }>(BASELINE);
  const result = gate(gateMetrics(readJson<Report>(path)), baseline.metrics);

  console.log(`gate: ${path} vs baseline ${baseline.runId}\n`);
  for (const c of result.checks) {
    const mark = c.skipped ? 'skip' : c.ok ? 'ok  ' : 'FAIL';
    console.log(`${mark}  ${c.name.padEnd(18)} ${String(c.baseline).padStart(9)} → ${String(c.current).padEnd(9)} ${c.rule}`);
  }
  console.log(result.ok ? '\ngate passed' : '\ngate FAILED');
  process.exit(result.ok ? 0 : 1);
}
