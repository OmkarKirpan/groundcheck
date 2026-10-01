import { readFileSync } from 'node:fs';
import type { FinalAnswer } from '../agent/final.ts';
import { PASS_SCORE } from './agreement.ts';

export const PROBES_PATH = 'cases/judge-probes.jsonl';

type Label = 'pass' | 'fail';

/**
 * An answer with a planted mistake (or an untouched control), to test the judge on cases where the right
 * verdict is known. Quotes are always real, so only the judge can catch the mistake.
 */
export interface Probe {
  id: string;
  caseId: string;
  mutation: string;
  final: FinalAnswer;
  /** null: no clear expectation for that dimension, so it isn't scored. */
  expect: { faithful: Label; correct: Label | null };
}

export interface DimensionResult {
  mustFail: number;
  caught: number;
  mustPass: number;
  falselyFailed: number;
}

export interface ProbeResult {
  rows: { id: string; caseId: string; mutation: string; expect: Probe['expect']; got: { faithfulness: number; correctness: number }; ok: boolean }[];
  faithful: DimensionResult;
  correct: DimensionResult;
}

export function scoreProbes(probes: Probe[], scores: Map<string, { faithfulness: number; correctness: number }>): ProbeResult {
  const faithful: DimensionResult = { mustFail: 0, caught: 0, mustPass: 0, falselyFailed: 0 };
  const correct: DimensionResult = { mustFail: 0, caught: 0, mustPass: 0, falselyFailed: 0 };
  const tally = (d: DimensionResult, expected: Label | null, score: number): boolean => {
    if (expected === null) return true;
    const judgePass = score >= PASS_SCORE;
    if (expected === 'fail') {
      d.mustFail++;
      if (!judgePass) d.caught++;
      return !judgePass;
    }
    d.mustPass++;
    if (!judgePass) d.falselyFailed++;
    return judgePass;
  };

  const rows = probes.map((p) => {
    const got = scores.get(p.id);
    if (!got) throw new Error(`no judge score for probe ${p.id}`);
    const okFaithful = tally(faithful, p.expect.faithful, got.faithfulness);
    const okCorrect = tally(correct, p.expect.correct, got.correctness);
    return { id: p.id, caseId: p.caseId, mutation: p.mutation, expect: p.expect, got, ok: okFaithful && okCorrect };
  });
  return { rows, faithful, correct };
}

export function loadProbes(path = PROBES_PATH): Probe[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Probe);
}
