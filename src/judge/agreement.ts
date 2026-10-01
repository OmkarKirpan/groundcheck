import { readFileSync } from 'node:fs';

export const PASS_SCORE = 3;
export const MIN_AGREEMENT_PCT = 80;
export const LABELS_PATH = 'cases/human-labels.jsonl';

/** Written blind by a person, against the agent outputs of one run (runId). */
export interface HumanLabel {
  runId: string;
  caseId: string;
  faithful: 'pass' | 'fail';
  correct: 'pass' | 'fail';
}

export interface Confusion {
  bothPass: number;
  judgePassHumanFail: number;
  judgeFailHumanPass: number;
  bothFail: number;
}

export interface DimensionAgreement {
  n: number;
  agree: number;
  pct: number;
  confusion: Confusion;
}

export interface Agreement {
  faithful: DimensionAgreement;
  correct: DimensionAgreement;
  overallPct: number;
  /** False below MIN_AGREEMENT_PCT: fix the rubric and don't trust the judge's scores. */
  trusted: boolean;
}

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10);

function compare(pairs: [judgePass: boolean, humanPass: boolean][]): DimensionAgreement {
  const confusion: Confusion = { bothPass: 0, judgePassHumanFail: 0, judgeFailHumanPass: 0, bothFail: 0 };
  for (const [j, h] of pairs) {
    if (j && h) confusion.bothPass++;
    else if (j) confusion.judgePassHumanFail++;
    else if (h) confusion.judgeFailHumanPass++;
    else confusion.bothFail++;
  }
  const agree = confusion.bothPass + confusion.bothFail;
  return { n: pairs.length, agree, pct: pct(agree, pairs.length), confusion };
}

export function agreement(
  labels: HumanLabel[],
  scores: Map<string, { faithfulness: number; correctness: number }>,
): Agreement {
  const scored = labels.filter((l) => scores.has(l.caseId));
  const faithful = compare(scored.map((l) => [scores.get(l.caseId)!.faithfulness >= PASS_SCORE, l.faithful === 'pass']));
  const correct = compare(scored.map((l) => [scores.get(l.caseId)!.correctness >= PASS_SCORE, l.correct === 'pass']));
  const overallPct = pct(faithful.agree + correct.agree, faithful.n + correct.n);
  return { faithful, correct, overallPct, trusted: overallPct >= MIN_AGREEMENT_PCT };
}

export function loadLabels(path = LABELS_PATH): HumanLabel[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as HumanLabel);
}
