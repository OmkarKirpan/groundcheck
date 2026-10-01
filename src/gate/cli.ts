// npm run gate [report.json] [--baseline path]   compare a report (default results/replay.json)
//                                                with a baseline (default results/baseline.json)
// npm run baseline -- <runId>                     make results/<runId>.json the baseline
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import type { Report } from '../runner/run.ts';
import { caseVerdicts, gate, newFailures, type CaseVerdicts, type GateMetrics } from './gate.ts';

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

const { values, positionals } = parseArgs({ options: { baseline: { type: 'string' } }, allowPositionals: true });
const [first, second] = positionals;

if (first === 'set') {
  if (!second) throw new Error('usage: npm run baseline -- <runId>');
  const report = readJson<Report>(`results/${second}.json`);
  const baseline = { runId: report.runId, metrics: gateMetrics(report), cases: caseVerdicts(report.cases) };
  writeFileSync(BASELINE, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`baseline is now ${report.runId}`);
} else {
  const path = first ?? 'results/replay.json';
  // CI passes the base branch's baseline, so a change can't approve itself by editing baseline.json.
  const baseline = readJson<{ runId: string; metrics: GateMetrics; cases?: CaseVerdicts }>(values.baseline ?? BASELINE);
  const report = readJson<Report>(path);
  const result = gate(gateMetrics(report), baseline.metrics);
  const regressions = baseline.cases ? newFailures(baseline.cases, report.cases) : [];

  console.log(`gate: ${path} vs baseline ${baseline.runId}\n`);
  for (const c of result.checks) {
    const mark = c.skipped ? 'skip' : c.ok ? 'ok  ' : 'FAIL';
    console.log(`${mark}  ${c.name.padEnd(18)} ${String(c.baseline).padStart(9)} → ${String(c.current).padEnd(9)} ${c.rule}`);
  }
  const perCase = regressions.length ? 'FAIL' : baseline.cases ? 'ok  ' : 'skip';
  console.log(`${perCase}  ${'perCase'.padEnd(18)} ${''.padStart(21)} no check may go from pass to fail on any case`);
  for (const r of regressions) console.log(`        ${r}`);
  const ok = result.ok && regressions.length === 0;
  console.log(ok ? '\ngate passed' : '\ngate FAILED');
  process.exit(ok ? 0 : 1);
}
