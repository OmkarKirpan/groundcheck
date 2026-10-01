import { runAgent } from '../agent/loop.ts';
import { AGENT_MODEL, AGENT_PROMPT_VERSION } from '../agent/prompt.ts';
import type { ModelClient } from '../agent/types.ts';
import { gradeAll } from '../graders/graders.ts';
import { computeMetrics, type CaseResult, type Metrics } from '../graders/metrics.ts';
import { normaliseJudge } from '../gate/gate.ts';
import { MIN_AGREEMENT_PCT, type Agreement } from '../judge/agreement.ts';
import type { JudgeSection } from '../judge/run.ts';
import type { Conflict } from '../graders/precedence.ts';
import type { Doc } from '../retrieval/corpus.ts';
import type { Case } from './cases.ts';

export interface CaseOutcome extends CaseResult {
  role: Case['role'];
  category: Case['category'];
  question: string;
}

export interface Report {
  runId: string;
  createdAt: string;
  agent: { model: string; promptVersion: string };
  metrics: Metrics;
  cases: CaseOutcome[];
  /** Filled in by the judge step; absent when the judge didn't run. */
  judge?: JudgeSection;
}

export async function runEval(input: {
  cases: Case[];
  corpus: readonly Doc[];
  client: ModelClient;
  conflicts?: readonly Conflict[];
  onCase?: (outcome: CaseOutcome) => void;
}): Promise<CaseOutcome[]> {
  const outcomes: CaseOutcome[] = [];
  for (const kase of input.cases) {
    const run = await runAgent({ question: kase.question, role: kase.role, corpus: input.corpus, client: input.client });
    const outcome: CaseOutcome = {
      caseId: kase.id,
      role: kase.role,
      category: kase.category,
      question: kase.question,
      mustRefuse: kase.mustRefuse,
      goldDocIds: kase.goldDocIds,
      run,
      grades: gradeAll({ kase, run, corpus: input.corpus, conflicts: input.conflicts }),
    };
    outcomes.push(outcome);
    input.onCase?.(outcome);
  }
  return outcomes;
}

export function buildReport(input: { runId: string; createdAt: string; results: CaseOutcome[] }): Report {
  return {
    runId: input.runId,
    createdAt: input.createdAt,
    agent: { model: AGENT_MODEL, promptVersion: AGENT_PROMPT_VERSION },
    metrics: computeMetrics(input.results),
    cases: input.results,
  };
}

const GRADER_NAMES: Record<string, string> = {
  G1: 'citation exists',
  G2: 'quote is word for word',
  G3: 'permissions respected',
  G4: 'current version cited',
  G5: 'correct refusal',
  G6: 'step budget',
  G7: 'no loop',
  G8: 'precedence respected',
};

const cell = (s: string) => s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
const rate = (x: number | null) => (x === null ? 'n/a' : `${x.toFixed(1)}%`);

const judgeMean = (x: number | null) => (x === null ? 'n/a' : `${x.toFixed(2)} (${normaliseJudge(x).toFixed(1)} / 100)`);

function renderAgreement(a: Agreement): string[] {
  const row = (name: string, d: Agreement['faithful']) =>
    `| ${name} | ${d.n} | ${d.pct.toFixed(1)}% | ${d.confusion.bothPass} | ${d.confusion.judgePassHumanFail} | ${d.confusion.judgeFailHumanPass} | ${d.confusion.bothFail} |`;
  return [
    '## Judge vs human labels',
    '',
    a.trusted
      ? `Overall agreement **${a.overallPct.toFixed(1)}%**, at or above the ${MIN_AGREEMENT_PCT}% bar.`
      : `Overall agreement **${a.overallPct.toFixed(1)}%**, under the ${MIN_AGREEMENT_PCT}% bar: **don't trust the judge scores; fix the rubric.**`,
    '',
    '| Dimension | Labelled | Agreement | Both pass | Judge pass, human fail | Judge fail, human pass | Both fail |',
    '|---|---|---|---|---|---|---|',
    row('Faithful (J1)', a.faithful),
    row('Correct (J2)', a.correct),
    '',
  ];
}

export function renderMarkdown(report: Report): string {
  const m = report.metrics;
  const j = report.judge;
  const lines = [
    `# Eval run ${report.runId}`,
    '',
    `Agent \`${report.agent.model}\` (prompt ${report.agent.promptVersion}) · ${m.cases} cases · ${report.createdAt}`,
    '',
    '## Metrics',
    '',
    '| Metric | Value |',
    '|---|---|',
    `| Grounded answer rate | ${rate(m.groundedRate)} |`,
    `| Citation precision | ${rate(m.citationPrecision)} |`,
    `| Refusal accuracy | ${rate(m.refusalAccuracy)} |`,
    `| Permission violations (hard gate) | ${m.aclViolations} |`,
    `| Invented quotes (hard gate) | ${m.inventedQuotes} |`,
    `| Average steps | ${m.avgSteps} |`,
    `| Total tokens | ${m.totalTokens} |`,
    `| p95 latency | ${(m.p95LatencyMs / 1000).toFixed(1)} s |`,
    ...(j
      ? [
          `| Judge J1 faithfulness (1–4) | ${judgeMean(j.j1Mean)} |`,
          `| Judge J2 correctness (1–4) | ${judgeMean(j.j2Mean)} |`,
          `| Judged cases | ${j.judged} (prompt ${j.promptVersion}) |`,
        ]
      : []),
    '',
    ...(j?.agreement ? renderAgreement(j.agreement) : []),
    '## Checks in code',
    '',
    '| Check | Pass | Fail | n/a |',
    '|---|---|---|---|',
    ...Object.entries(m.graders).map(([id, g]) => `| ${id} ${GRADER_NAMES[id]} | ${g.pass} | ${g.fail} | ${g.na} |`),
    '',
    '## Cases',
    '',
    `| Case | Category | Role | Outcome | Steps |${j ? ' J1 | J2 |' : ''} Failed checks |`,
    `|---|---|---|---|---|${j ? '---|---|' : ''}---|`,
    ...report.cases.map((c) => {
      const failed = c.grades.filter((g) => g.verdict === 'fail').map((g) => `${g.id}: ${g.detail ?? ''}`);
      const outcome = c.run.final?.kind ?? c.run.stopReason;
      const s = j?.scores[c.caseId];
      const judged = j ? ` ${s?.faithfulness ?? '—'} | ${s?.correctness ?? '—'} |` : '';
      return `| ${c.caseId} | ${c.category} | ${c.role} | ${outcome} | ${c.run.trace.length} |${judged} ${cell(failed.join('; ')) || '—'} |`;
    }),
    '',
  ];
  return lines.join('\n');
}
