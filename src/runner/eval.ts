// npm run eval:live              agent on Ollama (+ judge on OpenRouter if OPENROUTER_API_KEY is set);
//                                records fixtures/<runId>/ and writes results/<runId>.{json,md}
// npm run eval:replay [runId]    replays fixtures (default: the newest run), writes results/replay.{json,md},
//                                and fails unless it matches the committed results/<runId>.json
// npm run eval:replay -- <runId> --write   regrades a run in place after a grader or metric change
// npm run judge -- <runId>       judges an existing live run on OpenRouter and updates its report
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { ollamaClient } from '../agent/ollama.ts';
import { AGENT_MODEL } from '../agent/prompt.ts';
import type { ChatRequest, ChatResponse, ModelClient } from '../agent/types.ts';
import { LABELS_PATH, loadLabels } from '../judge/agreement.ts';
import { RUBRIC_PATH, type JudgeCall, type JudgeReply, type JudgeRequest } from '../judge/judge.ts';
import { openRouterCall } from '../judge/openrouter.ts';
import { judgeRun } from '../judge/run.ts';
import { loadConflicts } from '../graders/precedence.ts';
import { cached, recording, replaying } from '../replay/replay.ts';
import { loadCorpus } from '../retrieval/corpus.ts';
import { loadCases } from './cases.ts';
import { reportDiff } from './compare.ts';
import { buildReport, renderMarkdown, runEval, type Report } from './run.ts';

if (existsSync('.env')) process.loadEnvFile();

const [mode, arg] = process.argv.slice(2);
const cases = loadCases();

/** The newest recorded run: the candidate a change is judged by. Run ids sort by time. */
function newestRun(): string {
  const runs = existsSync('fixtures') ? readdirSync('fixtures').sort() : [];
  if (runs.length === 0) throw new Error('no fixtures/ to replay; run npm run eval:live first');
  return runs.at(-1)!;
}

function writeReport(name: string, report: Report) {
  mkdirSync('results', { recursive: true });
  writeFileSync(`results/${name}.json`, `${JSON.stringify(report, null, 1)}\n`);
  writeFileSync(`results/${name}.md`, renderMarkdown(report));
  console.log(`\nresults/${name}.md`);
}

async function addJudge(report: Report, call: JudgeCall) {
  console.log('\njudging…');
  report.judge = await judgeRun({
    runId: report.runId,
    outcomes: report.cases,
    cases,
    rubric: readFileSync(RUBRIC_PATH, 'utf8'),
    call,
    labels: existsSync(LABELS_PATH) ? loadLabels() : [],
    onCase: (id, s) => console.log(`${id}  J1=${s.faithfulness} J2=${s.correctness}  ${s.model}`),
  });
}

/** Every other recorded run: an unchanged answer is judged once, not once per run. */
const otherRuns = (fixtures: string) =>
  existsSync('fixtures') ? readdirSync('fixtures').map((d) => `fixtures/${d}`).filter((d) => d !== fixtures) : [];

function liveJudge(fixtures: string): JudgeCall | null {
  const key = process.env.OPENROUTER_API_KEY;
  return key ? cached(openRouterCall(key), fixtures, 'judge', otherRuns(fixtures)) : null;
}

async function runAgentEval(runId: string, client: ModelClient): Promise<Report> {
  const results = await runEval({
    cases,
    corpus: loadCorpus(),
    conflicts: loadConflicts(),
    client,
    onCase: (c) => {
      const failed = c.grades.filter((g) => g.verdict === 'fail').map((g) => g.id);
      console.log(`${c.caseId}  ${(c.run.final?.kind ?? c.run.stopReason).padEnd(11)} steps=${c.run.trace.length}  ${failed.join(' ') || 'ok'}`);
    },
  });
  const errors = results.filter((r) => r.run.stopReason === 'error');
  if (errors.length) {
    console.error(`\n${errors.length} case(s) errored:\n${errors.map((r) => `  ${r.caseId}: ${r.run.error}`).join('\n')}`);
    process.exit(1);
  }
  return buildReport({ runId, createdAt: new Date().toISOString(), results });
}

if (mode === 'live') {
  const runId = new Date().toISOString().slice(0, 16).replace(':', '-');
  const fixtures = `fixtures/${runId}`;
  const host = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
  // Load the model first so the cold start doesn't land in the first case's latency.
  await fetch(`${host}/api/generate`, { method: 'POST', body: JSON.stringify({ model: AGENT_MODEL, keep_alive: '30m' }) });
  const report = await runAgentEval(runId, { chat: recording(ollamaClient(host).chat, fixtures, 'agent') });
  const judge = liveJudge(fixtures);
  if (judge) await addJudge(report, judge);
  else console.log('\njudge skipped: OPENROUTER_API_KEY is not set (add it to .env, then npm run judge -- ' + runId + ')');
  writeReport(runId, report);
} else if (mode === 'replay') {
  const { values, positionals } = parseArgs({ args: process.argv.slice(3), options: { write: { type: 'boolean' } }, allowPositionals: true });
  const runId = positionals[0] ?? newestRun();
  const fixtures = `fixtures/${runId}`;
  const report = await runAgentEval(runId, { chat: replaying<ChatRequest, ChatResponse>(fixtures, 'agent') });
  if (readdirSync(fixtures).some((f) => f.startsWith('judge-'))) {
    await addJudge(report, replaying<JudgeRequest, JudgeReply>(fixtures, 'judge'));
  }
  const committed = `results/${runId}.json`;
  if (values.write || !existsSync(committed)) {
    // Regrade: same recorded model outputs, current graders and metrics.
    writeReport(runId, report);
  } else {
    writeReport('replay', report);
    const diffs = reportDiff(JSON.parse(readFileSync(committed, 'utf8')) as Report, report);
    if (diffs.length) {
      console.error(`\n${committed} doesn't match its replay:\n${diffs.map((d) => `  ${d}`).join('\n')}`);
      console.error(`If graders or metrics changed on purpose, regenerate it with: npm run eval:replay -- ${runId} --write`);
      process.exit(1);
    }
    console.log(`replay matches ${committed}`);
  }
} else if (mode === 'judge') {
  if (!arg) throw new Error('usage: npm run judge -- <runId>');
  const judge = liveJudge(`fixtures/${arg}`);
  if (!judge) throw new Error('OPENROUTER_API_KEY is not set; add it to .env');
  const report = JSON.parse(readFileSync(`results/${arg}.json`, 'utf8')) as Report;
  await addJudge(report, judge);
  writeReport(arg, report);
} else {
  throw new Error('usage: eval.ts live | replay [runId] | judge <runId>');
}
