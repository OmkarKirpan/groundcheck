import { describe, expect, it } from 'vitest';
import type { AgentRun } from '../../src/agent/loop.ts';
import type { HumanLabel } from '../../src/judge/agreement.ts';
import { judgeRun } from '../../src/judge/run.ts';
import type { Case } from '../../src/runner/cases.ts';
import type { CaseOutcome } from '../../src/runner/run.ts';

const kase = (id: string): Case => ({
  id,
  role: 'employee',
  question: `question ${id}`,
  category: 'single-doc',
  goldAnswer: 'gold',
  goldDocIds: ['d'],
  mustRefuse: false,
  forbiddenDocIds: [],
});

const outcome = (id: string, run: AgentRun): CaseOutcome => ({
  caseId: id,
  role: 'employee',
  category: 'single-doc',
  question: `question ${id}`,
  mustRefuse: false,
  goldDocIds: ['d'],
  run,
  grades: [],
});

const answered: AgentRun = { final: { kind: 'answer', answer: 'a', citations: [{ docId: 'd', quote: 'q' }] }, stopReason: 'final_answer', trace: [] };
const unfinished: AgentRun = { final: null, stopReason: 'step_limit', trace: [] };

// c1 scores 4/4, c2 scores 1/2.
const call = async (req: { messages: { content: string }[] }) => ({
  content: req.messages[1]!.content.includes('question c1')
    ? '{"faithfulness": 4, "correctness": 4, "rationale": ""}'
    : '{"faithfulness": 1, "correctness": 2, "rationale": ""}',
  tokensIn: 0,
  tokensOut: 0,
});

const outcomes = [outcome('c1', answered), outcome('c2', answered), outcome('c3', unfinished)];
const cases = [kase('c1'), kase('c2'), kase('c3')];

describe('judgeRun', () => {
  it('scores every case with a final answer and averages J1 and J2', async () => {
    const judge = await judgeRun({ runId: 'r1', outcomes, cases, rubric: 'R', call, labels: [] });
    expect(Object.keys(judge.scores)).toEqual(['c1', 'c2']);
    expect(judge).toMatchObject({ judged: 2, j1Mean: 2.5, j2Mean: 3 });
    expect(judge.agreement).toBeUndefined();
  });

  it('adds agreement using only the labels written for this run', async () => {
    const labels: HumanLabel[] = [
      { runId: 'r1', caseId: 'c1', faithful: 'pass', correct: 'pass' },
      { runId: 'r1', caseId: 'c2', faithful: 'fail', correct: 'pass' },
      { runId: 'old', caseId: 'c2', faithful: 'pass', correct: 'pass' },
    ];
    const judge = await judgeRun({ runId: 'r1', outcomes, cases, rubric: 'R', call, labels });
    expect(judge.agreement).toMatchObject({ faithful: { n: 2, agree: 2 }, correct: { n: 2, agree: 1 }, overallPct: 75 });
  });
});
