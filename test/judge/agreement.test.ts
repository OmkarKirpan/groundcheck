import { describe, expect, it } from 'vitest';
import { agreement, type HumanLabel } from '../../src/judge/agreement.ts';

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
