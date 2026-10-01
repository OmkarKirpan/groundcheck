import type { FinalAnswer } from '../agent/final.ts';
import type { Case } from '../runner/cases.ts';

/** Primary first, then the fallback. Different family from the agent (Gemma 2B) where possible. */
export const JUDGE_MODELS = ['nvidia/nemotron-3-super-120b-a12b:free', 'google/gemma-4-31b-it:free'] as const;
export const JUDGE_PROMPT_VERSION = 'judge-v2';
export const RUBRIC_PATH = 'docs/judge-rubric.md';

export interface JudgeRequest {
  model: string;
  messages: { role: 'system' | 'user'; content: string }[];
  temperature: 0;
  seed: 0;
  response_format: { type: 'json_object' };
}

export interface JudgeReply {
  content: string;
  tokensIn: number;
  tokensOut: number;
}

export type JudgeCall = (req: JudgeRequest) => Promise<JudgeReply>;

type Score = 1 | 2 | 3 | 4;

export interface JudgeScore {
  faithfulness: Score;
  correctness: Score;
  rationale: string;
  model: string;
}

export function judgeMessages(kase: Case, final: FinalAnswer, rubric: string): JudgeRequest['messages'] {
  const output =
    final.kind === 'refusal'
      ? `Refusal. Reason: ${final.reason || '(none given)'}`
      : [`Answer: ${final.answer}`, 'Citations:', ...final.citations.map((c) => `- [${c.docId}] "${c.quote}"`)].join('\n');
  return [
    { role: 'system', content: rubric },
    { role: 'user', content: `Question: ${kase.question}\n\nExpected answer: ${kase.goldAnswer}\n\nAssistant output:\n${output}` },
  ];
}

const isScore = (x: unknown): x is Score => x === 1 || x === 2 || x === 3 || x === 4;

export function parseJudgeReply(
  text: string,
): { ok: true; value: Omit<JudgeScore, 'model'> } | { ok: false; error: string } {
  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return { ok: false, error: 'no JSON object in the reply' };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'reply JSON does not parse' };
  }
  if (!isScore(raw.faithfulness) || !isScore(raw.correctness)) {
    return { ok: false, error: 'faithfulness and correctness must be integers from 1 to 4' };
  }
  return {
    ok: true,
    value: { faithfulness: raw.faithfulness, correctness: raw.correctness, rationale: String(raw.rationale ?? '') },
  };
}

/** Tries each judge model in turn; a call error or an unparseable reply moves on to the next. */
export async function judgeCase(kase: Case, final: FinalAnswer, rubric: string, call: JudgeCall): Promise<JudgeScore> {
  const errors: string[] = [];
  for (const model of JUDGE_MODELS) {
    const request: JudgeRequest = {
      model,
      messages: judgeMessages(kase, final, rubric),
      temperature: 0,
      seed: 0,
      response_format: { type: 'json_object' },
    };
    try {
      const parsed = parseJudgeReply((await call(request)).content);
      if (parsed.ok) return { ...parsed.value, model };
      errors.push(`${model}: ${parsed.error}`);
    } catch (e) {
      errors.push(`${model}: ${(e as Error).message}`);
    }
  }
  throw new Error(`judge failed for ${kase.id}: ${errors.join('; ')}`);
}
