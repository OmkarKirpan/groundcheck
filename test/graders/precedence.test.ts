import { describe, expect, it } from 'vitest';
import type { AgentRun } from '../../src/agent/loop.ts';
import { g8PrecedenceRespected } from '../../src/graders/graders.ts';
import { loadConflicts, winner, type Conflict } from '../../src/graders/precedence.ts';
import { loadCorpus, type Doc, type Role } from '../../src/retrieval/corpus.ts';
import type { Case } from '../../src/runner/cases.ts';

const everyone: Role[] = ['employee', 'manager', 'hr_admin'];
const doc = (id: string, type: Doc['type'], effectiveDate: string, body: string, extra: Partial<Doc> = {}): Doc => ({
  id,
  title: id,
  type,
  version: 1,
  effectiveDate,
  supersedes: null,
  status: 'current',
  rolesAllowed: everyone,
  body,
  ...extra,
});

describe('winner (the Document Precedence rule)', () => {
  const policy = doc('pol', 'policy', '2026-01-01', '');
  const faq = doc('faq', 'faq', '2026-06-01', '');

  it('a policy beats an FAQ, even an FAQ with a later date', () => {
    expect(winner(policy, faq)?.id).toBe('pol');
    expect(winner(faq, policy)?.id).toBe('pol');
  });

  it('between two policies, the later effective date wins', () => {
    const newer = doc('pol-new', 'policy', '2026-05-01', '');
    expect(winner(policy, newer)?.id).toBe('pol-new');
  });

  it('a superseded doc never wins against a current one', () => {
    expect(winner(doc('old', 'policy', '2027-01-01', '', { status: 'superseded' }), faq)?.id).toBe('faq');
  });

  it('has no winner where the rule says nothing', () => {
    expect(winner(doc('rb', 'runbook', '2026-01-01', ''), faq)).toBeNull();
    expect(winner(policy, doc('pol2', 'policy', '2026-01-01', ''))).toBeNull();
  });
});

describe('G8 precedence respected', () => {
  const corpus = [
    doc('pol-travel', 'policy', '2026-02-01', 'The hotel limit is EUR 220 per night in every city.'),
    doc('faq-travel', 'faq', '2026-06-01', 'Trains are encouraged. The hotel limit is EUR 180 per night.'),
  ];
  const conflicts: Conflict[] = [
    {
      id: 'hotel-limit',
      sides: [
        { docId: 'pol-travel', text: 'The hotel limit is EUR 220 per night in every city.' },
        { docId: 'faq-travel', text: 'The hotel limit is EUR 180 per night.' },
      ],
    },
  ];
  const kase: Case = {
    id: 'c1',
    role: 'employee',
    question: 'q',
    category: 'stale/conflict',
    goldAnswer: 'a',
    goldDocIds: ['pol-travel'],
    mustRefuse: false,
    forbiddenDocIds: [],
  };
  const answer = (...citations: [string, string][]): AgentRun => ({
    final: { kind: 'answer', answer: 'x', citations: citations.map(([docId, quote]) => ({ docId, quote })) },
    stopReason: 'final_answer',
    trace: [],
  });
  const grade = (run: AgentRun, c: Partial<Case> = {}, docs = corpus) =>
    g8PrecedenceRespected({ kase: { ...kase, ...c }, run, corpus: docs, conflicts });

  it('fails when the losing side of a known conflict is cited without the winning side', () => {
    expect(grade(answer(['faq-travel', 'The hotel limit is EUR 180 per night.']))).toMatchObject({
      verdict: 'fail',
      detail: expect.stringMatching(/faq-travel.*pol-travel/),
    });
  });

  it('also fails for a fragment of the losing sentence', () => {
    expect(grade(answer(['faq-travel', 'EUR 180 per night'])).verdict).toBe('fail');
  });

  it('passes when the winning side is cited', () => {
    expect(grade(answer(['pol-travel', 'The hotel limit is EUR 220 per night in every city.'])).verdict).toBe('pass');
  });

  it('passes when both sides are cited', () => {
    const run = answer(['faq-travel', 'EUR 180 per night'], ['pol-travel', 'EUR 220 per night']);
    expect(grade(run).verdict).toBe('pass');
  });

  it('passes for an unrelated quote from the losing doc', () => {
    expect(grade(answer(['faq-travel', 'Trains are encouraged.'])).verdict).toBe('pass');
  });

  it('passes when the role cannot see the winning doc', () => {
    const hidden = corpus.map((d) => (d.id === 'pol-travel' ? { ...d, rolesAllowed: ['hr_admin'] as Role[] } : d));
    expect(grade(answer(['faq-travel', 'EUR 180 per night']), {}, hidden).verdict).toBe('pass');
  });

  it('does not apply to a refusal', () => {
    const run: AgentRun = { final: { kind: 'refusal', reason: '' }, stopReason: 'final_answer', trace: [] };
    expect(grade(run).verdict).toBe('n/a');
  });
});

describe('the real conflicts file', () => {
  const docs = new Map(loadCorpus().map((d) => [d.id, d]));
  const conflicts = loadConflicts();

  it('lists at least the travel hotel-limit conflict', () => {
    expect(conflicts.map((c) => c.id)).toContain('hotel-limit');
  });

  it('quotes each side word for word from its doc, and the rule picks a winner', () => {
    for (const c of conflicts) {
      for (const side of c.sides) {
        expect(docs.get(side.docId)?.body, `${c.id}: ${side.docId}`).toContain(side.text);
      }
      expect(winner(docs.get(c.sides[0].docId)!, docs.get(c.sides[1].docId)!), c.id).not.toBeNull();
    }
  });
});
