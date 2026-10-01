import type { Report } from './run.ts';

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const show = (x: unknown) => (typeof x === 'object' && x !== null ? JSON.stringify(x) : String(x));

/**
 * What differs between a committed report and a fresh replay of the same fixtures, ignoring timestamps.
 * Empty means the committed results really are what this code produces from those recordings.
 */
export function reportDiff(committed: Report, replayed: Report): string[] {
  const diffs: string[] = [];

  const metricKeys = new Set([...Object.keys(committed.metrics), ...Object.keys(replayed.metrics)]);
  for (const key of metricKeys) {
    const [a, b] = [committed.metrics[key as keyof Report['metrics']], replayed.metrics[key as keyof Report['metrics']]];
    if (!same(a, b)) diffs.push(`metrics.${key}: ${show(a)} → ${show(b)}`);
  }

  const replayedCases = new Map(replayed.cases.map((c) => [c.caseId, c]));
  for (const c of committed.cases) {
    const r = replayedCases.get(c.caseId);
    if (!r) {
      diffs.push(`${c.caseId}: missing from the replay`);
      continue;
    }
    if (!same(c.run.final, r.run.final)) diffs.push(`${c.caseId}: final answer differs`);
    for (const g of c.grades) {
      const other = r.grades.find((x) => x.id === g.id)?.verdict ?? 'missing';
      if (g.verdict !== other) diffs.push(`${c.caseId}: ${g.id} ${g.verdict} → ${other}`);
    }
    for (const g of r.grades.filter((x) => !c.grades.some((y) => y.id === x.id))) {
      diffs.push(`${c.caseId}: ${g.id} missing → ${g.verdict}`);
    }
  }

  const [ja, jb] = [committed.judge, replayed.judge];
  if (!ja !== !jb) {
    diffs.push(`judge: ${ja ? 'present' : 'missing'} → ${jb ? 'present' : 'missing'}`);
  } else if (ja && jb) {
    for (const id of Object.keys(ja.scores)) {
      const [a, b] = [ja.scores[id], jb.scores[id]];
      if (a?.faithfulness !== b?.faithfulness || a?.correctness !== b?.correctness) {
        diffs.push(`${id}: judge ${a ? `${a.faithfulness}/${a.correctness}` : 'none'} → ${b ? `${b.faithfulness}/${b.correctness}` : 'none'}`);
      }
    }
    if (!same(ja.agreement, jb.agreement)) diffs.push('judge.agreement differs');
  }

  return diffs;
}
