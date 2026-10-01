import { describe, expect, it } from 'vitest';
import { loadProbes, scoreProbes, type Probe } from '../../src/judge/probes.ts';
import { loadCases } from '../../src/runner/cases.ts';
import { loadCorpus } from '../../src/retrieval/corpus.ts';

const probe = (id: string, faithful: 'pass' | 'fail', correct: 'pass' | 'fail' | null): Probe => ({
  id,
  caseId: 'c001',
  mutation: 'm',
  final: { kind: 'answer', answer: 'a', citations: [{ docId: 'd', quote: 'q' }] },
  expect: { faithful, correct },
});
const score = (faithfulness: number, correctness: number) => ({ faithfulness, correctness });

describe('scoreProbes', () => {
  const probes = [probe('p1', 'fail', 'fail'), probe('p2', 'fail', 'pass'), probe('p3', 'fail', null), probe('ctl', 'pass', 'pass')];

  it('counts planted mistakes the judge caught (score under 3)', () => {
    const r = scoreProbes(probes, new Map([['p1', score(1, 1)], ['p2', score(2, 4)], ['p3', score(4, 3)], ['ctl', score(4, 4)]]));
    expect(r.faithful).toEqual({ mustFail: 3, caught: 2, mustPass: 1, falselyFailed: 0 });
    expect(r.correct).toEqual({ mustFail: 1, caught: 1, mustPass: 2, falselyFailed: 0 });
  });

  it('counts a good answer the judge failed as a false alarm', () => {
    const r = scoreProbes(probes, new Map([['p1', score(1, 1)], ['p2', score(1, 2)], ['p3', score(1, 1)], ['ctl', score(2, 4)]]));
    expect(r.faithful.falselyFailed).toBe(1);
    expect(r.correct.falselyFailed).toBe(1);
  });

  it('marks each probe ok or not, ignoring a dimension with no expectation', () => {
    const r = scoreProbes(probes, new Map([['p1', score(1, 1)], ['p2', score(2, 4)], ['p3', score(4, 1)], ['ctl', score(4, 4)]]));
    expect(r.rows.map((x) => [x.id, x.ok])).toEqual([['p1', true], ['p2', true], ['p3', false], ['ctl', true]]);
  });
});

describe('the real probes file', () => {
  const probes = loadProbes();
  const cases = new Set(loadCases().map((c) => c.id));
  const docs = new Map(loadCorpus().map((d) => [d.id, d]));

  it('has planted mistakes and untouched controls', () => {
    expect(probes.filter((p) => p.expect.faithful === 'fail').length).toBeGreaterThanOrEqual(8);
    expect(probes.filter((p) => p.expect.faithful === 'pass').length).toBeGreaterThanOrEqual(3);
  });

  it('only quotes real text, so the judge (not G2) is what is being tested', () => {
    for (const p of probes) {
      expect(cases.has(p.caseId), p.id).toBe(true);
      if (p.final.kind !== 'answer') continue;
      for (const c of p.final.citations) expect(docs.get(c.docId)?.body, `${p.id}: ${c.docId}`).toContain(c.quote);
    }
  });
});
