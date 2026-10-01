import { describe, expect, it } from 'vitest';
import { loadCorpus, type Doc } from '../../src/retrieval/corpus.ts';
import { openDoc, searchDocs } from '../../src/tools/tools.ts';

const doc = (id: string, body: string, rolesAllowed: Doc['rolesAllowed']): Doc => ({
  id,
  title: id,
  type: 'policy',
  version: 1,
  effectiveDate: '2026-01-01',
  supersedes: null,
  status: 'current',
  rolesAllowed,
  body,
});

const everyone = ['employee', 'manager', 'hr_admin'] as const;
const leave = doc('pol-leave', 'Annual leave is 24 days. Salary is paid monthly.', [...everyone]);
const travel = doc('pol-travel', 'Hotels are capped per night.', [...everyone]);
const bands = doc('hr-comp-bands', 'Salary band L3 is 90k to 110k.', ['hr_admin']);
const corpus = [leave, travel, bands];

describe('searchDocs', () => {
  it('never returns a doc outside the role', () => {
    const hits = searchDocs(corpus, 'employee', 'salary band L3');
    expect(hits.map((h) => h.docId)).not.toContain('hr-comp-bands');
  });

  it('returns the restricted doc to a role that is allowed it', () => {
    const [top] = searchDocs(corpus, 'hr_admin', 'salary band L3');
    expect(top?.docId).toBe('hr-comp-bands');
  });

  it('scores are not influenced by docs the role cannot see', () => {
    const withRestricted = searchDocs(corpus, 'employee', 'salary');
    const without = searchDocs([leave, travel], 'employee', 'salary');
    expect(withRestricted).toEqual(without);
  });

  it('returns docId, title, snippet and a rounded score', () => {
    const [top] = searchDocs(corpus, 'employee', 'annual leave');
    expect(top).toEqual({
      docId: 'pol-leave',
      title: 'pol-leave',
      snippet: 'Annual leave is 24 days. Salary is paid monthly.',
      score: expect.any(Number),
    });
    expect(top!.score).toBe(Math.round(top!.score * 1000) / 1000);
  });

  it('returns at most 5 hits', () => {
    const many = Array.from({ length: 9 }, (_, i) => doc(`d${i}`, 'leave policy', [...everyone]));
    expect(searchDocs(many, 'employee', 'leave')).toHaveLength(5);
  });
});

describe('openDoc', () => {
  it('returns the doc for an allowed role', () => {
    expect(openDoc(corpus, 'employee', 'pol-leave')).toEqual({
      docId: 'pol-leave',
      title: 'pol-leave',
      version: 1,
      status: 'current',
      body: leave.body,
    });
  });

  it('refuses a doc outside the role', () => {
    expect(openDoc(corpus, 'manager', 'hr-comp-bands')).toEqual({ error: 'forbidden' });
  });

  it('reports an unknown doc', () => {
    expect(openDoc(corpus, 'hr_admin', 'nope')).toEqual({ error: 'not_found' });
  });
});

describe('on the real corpus', () => {
  const real = loadCorpus();

  it('an employee searching for salary bands gets no restricted doc', () => {
    const hits = searchDocs(real, 'employee', 'L3 base salary range');
    for (const h of hits) {
      expect(real.find((d) => d.id === h.docId)!.rolesAllowed).toContain('employee');
    }
  });

  it('an hr_admin finds the salary bands', () => {
    expect(searchDocs(real, 'hr_admin', 'L3 base salary range')[0]?.docId).toBe('hr-comp-bands');
  });
});
