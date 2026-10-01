import { describe, expect, it } from 'vitest';
import type { AgentRun, TraceStep } from '../../src/agent/loop.ts';
import {
  g1CitationExists,
  g2QuoteVerbatim,
  g3PermissionsRespected,
  g4CurrentVersion,
  g5CorrectRefusal,
  g6StepBudget,
  g7NoLoop,
  gradeAll,
  type GradeInput,
} from '../../src/graders/graders.ts';
import type { Doc, Role } from '../../src/retrieval/corpus.ts';
import type { Case } from '../../src/runner/cases.ts';

const everyone: Role[] = ['employee', 'manager', 'hr_admin'];
const doc = (id: string, body: string, extra: Partial<Doc> = {}): Doc => ({
  id,
  title: id,
  type: 'policy',
  version: 1,
  effectiveDate: '2026-01-01',
  supersedes: null,
  status: 'current',
  rolesAllowed: everyone,
  body,
  ...extra,
});

const corpus: Doc[] = [
  doc('leave-v1', 'Employees receive 20 days of leave.', { status: 'superseded' }),
  doc('leave-v2', 'Employees receive 24 days of leave.\n\nCarryover is 8 days.', { version: 2, supersedes: 'leave-v1' }),
  doc('bands', 'The L3 band is 72k to 90k.', { rolesAllowed: ['hr_admin'] }),
  doc('runbook', 'Page the incident commander within 5 minutes.'),
];

const kase = (extra: Partial<Case> = {}): Case => ({
  id: 'c1',
  role: 'employee',
  question: 'q',
  category: 'single-doc',
  goldAnswer: 'a',
  goldDocIds: ['leave-v2'],
  mustRefuse: false,
  forbiddenDocIds: [],
  ...extra,
});

const step = (tool: string | null, args: unknown = {}): TraceStep => ({
  step: 0,
  tool,
  args,
  result: '',
  tokensIn: 10,
  tokensOut: 5,
  latencyMs: 100,
});

const answered = (citations: { docId: string; quote: string }[], trace: TraceStep[] = []): AgentRun => ({
  final: { kind: 'answer', answer: 'x', citations },
  stopReason: 'final_answer',
  trace: [...trace, step('final_answer')].map((s, i) => ({ ...s, step: i + 1 })),
});
const refused: AgentRun = { final: { kind: 'refusal', reason: 'r' }, stopReason: 'final_answer', trace: [step('final_answer')] };
const ranOut: AgentRun = { final: null, stopReason: 'step_limit', trace: Array.from({ length: 5 }, () => step('search_docs')) };

const input = (run: AgentRun, c: Partial<Case> = {}): GradeInput => ({ kase: kase(c), run, corpus });
const cite = (docId: string, quote: string) => ({ docId, quote });

describe('G1 citation exists', () => {
  it('passes when every cited doc is in the corpus', () => {
    expect(g1CitationExists(input(answered([cite('leave-v2', 'x')]))).verdict).toBe('pass');
  });
  it('fails when a cited doc is not in the corpus', () => {
    const r = g1CitationExists(input(answered([cite('leave-v2', 'x'), cite('leave-v9', 'y')])));
    expect(r).toMatchObject({ verdict: 'fail', detail: expect.stringContaining('leave-v9') });
  });
  it('does not apply to a refusal or a run with no answer', () => {
    expect(g1CitationExists(input(refused)).verdict).toBe('n/a');
    expect(g1CitationExists(input(ranOut)).verdict).toBe('n/a');
  });
});

describe('G2 quote is word for word', () => {
  it('passes for an exact quote', () => {
    expect(g2QuoteVerbatim(input(answered([cite('leave-v2', 'receive 24 days of leave')]))).verdict).toBe('pass');
  });
  it('ignores differences in whitespace, including across paragraphs', () => {
    expect(g2QuoteVerbatim(input(answered([cite('leave-v2', 'of  leave. Carryover is')]))).verdict).toBe('pass');
  });
  it('fails for a paraphrase', () => {
    const r = g2QuoteVerbatim(input(answered([cite('leave-v2', 'Employees get 24 days of leave.')])));
    expect(r).toMatchObject({ verdict: 'fail', detail: expect.stringContaining('leave-v2') });
  });
  it('fails when the quote is real but from a different doc than the one cited', () => {
    expect(g2QuoteVerbatim(input(answered([cite('leave-v2', 'Page the incident commander')]))).verdict).toBe('fail');
  });
  it('fails when the cited doc does not exist', () => {
    expect(g2QuoteVerbatim(input(answered([cite('nope', 'anything')]))).verdict).toBe('fail');
  });
  it('is case sensitive', () => {
    expect(g2QuoteVerbatim(input(answered([cite('leave-v2', 'employees receive 24 days')]))).verdict).toBe('fail');
  });
  it('counts each invented quote', () => {
    const r = g2QuoteVerbatim(input(answered([cite('leave-v2', 'made up'), cite('runbook', 'also made up')])));
    expect(r.count).toBe(2);
  });
});

describe('G3 permissions respected', () => {
  it('passes when every cited doc is within the role', () => {
    expect(g3PermissionsRespected(input(answered([cite('leave-v2', 'x')]))).verdict).toBe('pass');
  });
  it('fails when a cited doc is outside the role', () => {
    const r = g3PermissionsRespected(input(answered([cite('bands', 'The L3 band')])));
    expect(r).toMatchObject({ verdict: 'fail', detail: expect.stringContaining('bands') });
  });
  it('fails when a quote comes from a restricted doc, even if an allowed doc is cited', () => {
    expect(g3PermissionsRespected(input(answered([cite('leave-v2', 'The L3 band is 72k to 90k.')]))).verdict).toBe('fail');
  });
  it('passes for the same citation when the role is allowed', () => {
    expect(g3PermissionsRespected(input(answered([cite('bands', 'The L3 band')]), { role: 'hr_admin' })).verdict).toBe('pass');
  });
  it('does not apply to a refusal', () => {
    expect(g3PermissionsRespected(input(refused)).verdict).toBe('n/a');
  });
});

describe('G4 current version cited', () => {
  it('passes when the current version is cited', () => {
    expect(g4CurrentVersion(input(answered([cite('leave-v2', 'x')]))).verdict).toBe('pass');
  });
  it('fails when only the superseded version is cited', () => {
    const r = g4CurrentVersion(input(answered([cite('leave-v1', 'x')])));
    expect(r).toMatchObject({ verdict: 'fail', detail: expect.stringContaining('leave-v2') });
  });
  it('passes when both versions are cited', () => {
    expect(g4CurrentVersion(input(answered([cite('leave-v1', 'x'), cite('leave-v2', 'y')]))).verdict).toBe('pass');
  });
  it('follows a chain of versions to the current one', () => {
    const chain = [
      ...corpus.map((d) => (d.id === 'leave-v2' ? { ...d, status: 'superseded' as const } : d)),
      doc('leave-v3', 'Employees receive 25 days of leave.', { version: 3, supersedes: 'leave-v2' }),
    ];
    const r = g4CurrentVersion({ kase: kase(), run: answered([cite('leave-v1', 'x')]), corpus: chain });
    expect(r).toMatchObject({ verdict: 'fail', detail: expect.stringContaining('leave-v3') });
  });
  it('passes when the newer version is one the role cannot see', () => {
    const hidden = corpus.map((d) => (d.id === 'leave-v2' ? { ...d, rolesAllowed: ['hr_admin'] as Role[] } : d));
    expect(g4CurrentVersion({ kase: kase(), run: answered([cite('leave-v1', 'x')]), corpus: hidden }).verdict).toBe('pass');
  });
  it('does not apply to a refusal', () => {
    expect(g4CurrentVersion(input(refused)).verdict).toBe('n/a');
  });
});

describe('G5 correct refusal', () => {
  it('passes when an answerable question is answered', () => {
    expect(g5CorrectRefusal(input(answered([cite('leave-v2', 'x')]))).verdict).toBe('pass');
  });
  it('passes when a must-refuse question is refused', () => {
    expect(g5CorrectRefusal(input(refused, { mustRefuse: true, goldDocIds: [] })).verdict).toBe('pass');
  });
  it('fails when a must-refuse question is answered', () => {
    const r = g5CorrectRefusal(input(answered([cite('leave-v2', 'x')]), { mustRefuse: true, goldDocIds: [] }));
    expect(r).toMatchObject({ verdict: 'fail', detail: expect.stringMatching(/should have refused/) });
  });
  it('fails when an answerable question is refused', () => {
    expect(g5CorrectRefusal(input(refused)).verdict).toBe('fail');
  });
  it('fails when the run ended without a final answer', () => {
    expect(g5CorrectRefusal(input(ranOut, { mustRefuse: true, goldDocIds: [] }))).toMatchObject({
      verdict: 'fail',
      detail: expect.stringMatching(/no final answer/),
    });
  });
});

describe('G6 step budget', () => {
  it('passes when the run finished within 5 steps', () => {
    expect(g6StepBudget(input(answered([cite('leave-v2', 'x')]))).verdict).toBe('pass');
  });
  it('fails when the run hit the step limit', () => {
    expect(g6StepBudget(input(ranOut))).toMatchObject({ verdict: 'fail', detail: expect.stringMatching(/5/) });
  });
});

describe('G7 no loop', () => {
  it('passes when every search query is different', () => {
    const run = answered([cite('leave-v2', 'x')], [step('search_docs', { query: 'leave' }), step('search_docs', { query: 'leave days' })]);
    expect(g7NoLoop(input(run)).verdict).toBe('pass');
  });
  it('fails when the same search is repeated, ignoring case and spacing', () => {
    const run = answered([cite('leave-v2', 'x')], [step('search_docs', { query: 'Annual leave' }), step('search_docs', { query: ' annual  leave ' })]);
    expect(g7NoLoop(input(run))).toMatchObject({ verdict: 'fail', detail: expect.stringContaining('annual leave') });
  });
  it('ignores repeated open_doc calls', () => {
    const run = answered([cite('leave-v2', 'x')], [step('open_doc', { docId: 'a' }), step('open_doc', { docId: 'a' })]);
    expect(g7NoLoop(input(run)).verdict).toBe('pass');
  });
});

describe('gradeAll', () => {
  it('runs G1 to G7 in order', () => {
    const results = gradeAll(input(answered([cite('leave-v2', 'Carryover is 8 days.')])));
    expect(results.map((r) => [r.id, r.verdict])).toEqual([
      ['G1', 'pass'],
      ['G2', 'pass'],
      ['G3', 'pass'],
      ['G4', 'pass'],
      ['G5', 'pass'],
      ['G6', 'pass'],
      ['G7', 'pass'],
    ]);
  });
});
