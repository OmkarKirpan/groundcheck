import type { Case } from '../runner/cases.ts';
import type { CaseOutcome } from '../runner/run.ts';
import { agreement, type Agreement, type HumanLabel } from './agreement.ts';
import { JUDGE_PROMPT_VERSION, judgeCase, type JudgeCall, type JudgeScore } from './judge.ts';

export interface JudgeSection {
  promptVersion: string;
  judged: number;
  /** Means on the 1–4 scale over judged cases; null if nothing was judged. */
  j1Mean: number | null;
  j2Mean: number | null;
  scores: Record<string, JudgeScore>;
  agreement?: Agreement;
}

const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : null);

/** Judges every case that ended with an answer or a refusal. Runs that never finished have nothing to judge. */
export async function judgeRun(input: {
  runId: string;
  outcomes: CaseOutcome[];
  cases: Case[];
  rubric: string;
  call: JudgeCall;
  labels: HumanLabel[];
  onCase?: (caseId: string, score: JudgeScore) => void;
}): Promise<JudgeSection> {
  const scores: Record<string, JudgeScore> = {};
  for (const o of input.outcomes) {
    if (!o.run.final) continue;
    const kase = input.cases.find((c) => c.id === o.caseId);
    if (!kase) throw new Error(`no case ${o.caseId}`);
    const score = await judgeCase(kase, o.run.final, input.rubric, input.call);
    scores[o.caseId] = score;
    input.onCase?.(o.caseId, score);
  }

  const all = Object.values(scores);
  const section: JudgeSection = {
    promptVersion: JUDGE_PROMPT_VERSION,
    judged: all.length,
    j1Mean: mean(all.map((s) => s.faithfulness)),
    j2Mean: mean(all.map((s) => s.correctness)),
    scores,
  };

  const labels = input.labels.filter((l) => l.runId === input.runId);
  if (labels.length) section.agreement = agreement(labels, new Map(Object.entries(scores)));
  return section;
}
