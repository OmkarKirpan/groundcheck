// npm run judge:probes                judge the planted-mistake probes (cache-first: only new probes cost OpenRouter calls)
// npm run judge:probes -- --replay    recompute from recorded responses only; fails if the judge prompt changed (CI)
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { cached, replaying } from '../replay/replay.ts';
import { loadCases } from '../runner/cases.ts';
import { JUDGE_PROMPT_VERSION, RUBRIC_PATH, judgeCase, type JudgeCall, type JudgeReply, type JudgeRequest } from './judge.ts';
import { openRouterCall } from './openrouter.ts';
import { loadProbes, scoreProbes, type DimensionResult } from './probes.ts';

const DIR = 'fixtures/judge-probes';

if (existsSync('.env')) process.loadEnvFile();
const { values } = parseArgs({ options: { replay: { type: 'boolean' } } });

let call: JudgeCall;
if (values.replay) {
  call = replaying<JudgeRequest, JudgeReply>(DIR, 'judge');
} else {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set; add it to .env (or use --replay)');
  const others = readdirSync('fixtures').map((d) => `fixtures/${d}`).filter((d) => d !== DIR);
  call = cached(openRouterCall(key), DIR, 'judge', others);
}

const cases = new Map(loadCases().map((c) => [c.id, c]));
const rubric = readFileSync(RUBRIC_PATH, 'utf8');
const probes = loadProbes();
const scores = new Map<string, { faithfulness: number; correctness: number }>();
for (const p of probes) {
  const s = await judgeCase(cases.get(p.caseId)!, p.final, rubric, call);
  scores.set(p.id, s);
}
const result = scoreProbes(probes, scores);

const line = (name: string, d: DimensionResult) =>
  `| ${name} | ${d.caught} of ${d.mustFail} | ${d.falselyFailed} of ${d.mustPass} |`;
const md = [
  '# Judge probes',
  '',
  `Answers with a planted mistake, plus untouched controls, judged with rubric \`${JUDGE_PROMPT_VERSION}\`. Every quote is real, so only the judge can catch the mistake. A score under 3 is a fail.`,
  '',
  '| Dimension | Planted mistakes caught | Good answers wrongly failed |',
  '|---|---|---|',
  line('J1 faithfulness', result.faithful),
  line('J2 correctness', result.correct),
  '',
  '| Probe | Case | Planted mistake | Expected J1 / J2 | Judge J1 / J2 | As expected |',
  '|---|---|---|---|---|---|',
  ...result.rows.map(
    (r) =>
      `| ${r.id} | ${r.caseId} | ${r.mutation} | ${r.expect.faithful} / ${r.expect.correct ?? '—'} | ${r.got.faithfulness} / ${r.got.correctness} | ${r.ok ? 'yes' : '**no**'} |`,
  ),
  '',
].join('\n');

writeFileSync('results/judge-probes.md', md);
writeFileSync('results/judge-probes.json', `${JSON.stringify({ promptVersion: JUDGE_PROMPT_VERSION, ...result }, null, 1)}\n`);
console.log(`J1 caught ${result.faithful.caught}/${result.faithful.mustFail}, false alarms ${result.faithful.falselyFailed}/${result.faithful.mustPass}`);
console.log(`J2 caught ${result.correct.caught}/${result.correct.mustFail}, false alarms ${result.correct.falselyFailed}/${result.correct.mustPass}`);
console.log('results/judge-probes.md');
