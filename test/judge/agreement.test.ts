import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { agreement, loadLabels, pickLabelCases, type HumanLabel } from '../../src/judge/agreement.ts';
import type { AgentRun } from '../../src/agent/loop.ts';

describe('loadLabels', () => {
  it('skips lines that are not labelled yet', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'gc-')), 'labels.jsonl');
    writeFileSync(
      path,
      [
        '{"runId":"r1","caseId":"c1","faithful":"pass","correct":"fail"}',
        '{"runId":"r1","caseId":"c2","faithful":"?","correct":"?"}',
        '',
      ].join('\n'),
    );
    expect(loadLabels(path)).toEqual([{ runId: 'r1', caseId: 'c1', faithful: 'pass', correct: 'fail' }]);
  });
});

describe('pickLabelCases', () => {
  const finished: AgentRun = { final: { kind: 'refusal', reason: '' }, stopReason: 'final_answer', trace: [] };
  const unfinished: AgentRun = { final: null, stopReason: 'step_limit', trace: [] };
  const many = (prefix: string, category: string, count: number) =>
    Array.from({ length: count }, (_, i) => ({ caseId: `${prefix}${String(i).padStart(2, '0')}`, category, run: finished }));
  // The spec mix: 12 / 6 / 4 / 4 / 4.
  const outcomes = [
    ...many('s', 'single-doc', 12),
    ...many('m', 'multi-doc', 6),
    ...many('c', 'stale/conflict', 4),
    ...many('p', 'permission', 4),
    ...many('u', 'unanswerable', 4),
  ];
  const countBy = (ids: string[], prefix: string) => ids.filter((id) => id.startsWith(prefix)).length;

  it('takes 20 cases round-robin across categories, so every category is labelled', () => {
    const picked = pickLabelCases(outcomes);
    expect(picked).toHaveLength(20);
    expect(['s', 'm', 'c', 'p', 'u'].map((p) => countBy(picked, p))).toEqual([4, 4, 4, 4, 4]);
  });

  it('keeps going in the bigger categories once a small one runs out', () => {
    const picked = pickLabelCases(outcomes.filter((o) => !o.caseId.startsWith('u')));
    expect(picked).toHaveLength(20);
    expect(['s', 'm', 'c', 'p'].map((p) => countBy(picked, p))).toEqual([6, 6, 4, 4]);
  });

  it('skips cases that never reached a final answer', () => {
    const picked = pickLabelCases([{ caseId: 'x', category: 'single-doc', run: unfinished }, ...outcomes]);
    expect(picked).not.toContain('x');
  });
});

const label = (caseId: string, faithful: 'pass' | 'fail', correct: 'pass' | 'fail'): HumanLabel => ({ runId: 'r1', caseId, faithful, correct });

describe('agreement', () => {
  const scores = new Map([
    ['c1', { faithfulness: 4, correctness: 3 }],
    ['c2', { faithfulness: 2, correctness: 1 }],
    ['c3', { faithfulness: 3, correctness: 2 }],
    ['c4', { faithfulness: 1, correctness: 4 }],
  ]);
  const labels = [label('c1', 'pass', 'pass'), label('c2', 'fail', 'fail'), label('c3', 'fail', 'fail'), label('c4', 'fail', 'fail')];

  it('treats a judge score of 3 or more as a pass and compares with the human label', () => {
    const a = agreement(labels, scores);
    // faithful: c1 agree, c2 agree, c3 judge pass/human fail, c4 agree → 3/4
    expect(a.faithful).toMatchObject({ n: 4, agree: 3, pct: 75 });
    // correct: c1 agree, c2 agree, c3 agree, c4 judge pass/human fail → 3/4
    expect(a.correct).toMatchObject({ n: 4, agree: 3, pct: 75 });
  });

  it('builds a confusion table of judge vs human', () => {
    expect(agreement(labels, scores).faithful.confusion).toEqual({
      bothPass: 1,
      judgePassHumanFail: 1,
      judgeFailHumanPass: 0,
      bothFail: 2,
    });
  });

  it('reports overall agreement across both dimensions and whether it clears 80%', () => {
    const a = agreement(labels, scores);
    expect(a.overallPct).toBe(75);
    expect(a.trusted).toBe(false);
  });

  it('leaves out labels for cases the judge did not score', () => {
    expect(agreement([...labels, label('c9', 'pass', 'pass')], scores).faithful.n).toBe(4);
  });
});
