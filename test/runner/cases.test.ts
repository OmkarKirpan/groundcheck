import { describe, expect, it } from 'vitest';
import { loadCases, parseCase } from '../../src/runner/cases.ts';
import { loadCorpus } from '../../src/retrieval/corpus.ts';

const base = {
  id: 'c1',
  role: 'employee',
  question: 'How many leave days?',
  category: 'single-doc',
  goldAnswer: '24 days.',
  goldDocIds: ['pol-leave-v2'],
  mustRefuse: false,
  forbiddenDocIds: [],
};

describe('parseCase', () => {
  it('accepts a well-formed case', () => {
    expect(parseCase(base)).toEqual(base);
  });

  it('rejects an unknown category', () => {
    expect(() => parseCase({ ...base, category: 'easy' })).toThrow(/category/);
  });

  it('rejects an unknown role', () => {
    expect(() => parseCase({ ...base, role: 'ceo' })).toThrow(/role/);
  });

  it('rejects a missing question', () => {
    expect(() => parseCase({ ...base, question: '' })).toThrow(/question/);
  });
});

describe('the real cases', () => {
  const cases = loadCases();
  const docs = new Map(loadCorpus().map((d) => [d.id, d]));

  it('match the spec mix: 30 cases, 12/6/4/4/4, across all 3 roles', () => {
    const count = (cat: string) => cases.filter((c) => c.category === cat).length;
    expect(cases).toHaveLength(30);
    expect([count('single-doc'), count('multi-doc'), count('stale/conflict'), count('permission'), count('unanswerable')]).toEqual([12, 6, 4, 4, 4]);
    expect(new Set(cases.map((c) => c.role))).toEqual(new Set(['employee', 'manager', 'hr_admin']));
  });

  it('have unique ids', () => {
    expect(new Set(cases.map((c) => c.id)).size).toBe(cases.length);
  });

  it('cite gold docs that exist and that the role may see', () => {
    for (const c of cases) {
      for (const id of c.goldDocIds) {
        expect(docs.get(id)?.rolesAllowed, `${c.id}: ${id}`).toContain(c.role);
      }
    }
  });

  it('list forbidden docs that exist and that the role may not see', () => {
    for (const c of cases) {
      for (const id of c.forbiddenDocIds) {
        expect(docs.has(id), `${c.id}: ${id} missing`).toBe(true);
        expect(docs.get(id)!.rolesAllowed, `${c.id}: ${id}`).not.toContain(c.role);
      }
    }
  });

  it('have gold docs exactly when they are answerable', () => {
    for (const c of cases) {
      expect(c.goldDocIds.length > 0, c.id).toBe(!c.mustRefuse);
    }
  });
});
