// Runs cases through the live agent and saves one trace per case.
// Usage: npm run agent -- [caseId ...]   (no ids = every case)
import { mkdirSync, writeFileSync } from 'node:fs';
import { runAgent } from '../agent/loop.ts';
import { ollamaClient } from '../agent/ollama.ts';
import { AGENT_MODEL, AGENT_PROMPT_VERSION } from '../agent/prompt.ts';
import { loadCorpus } from '../retrieval/corpus.ts';
import { loadCases } from './cases.ts';

const host = process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434';
const ids = process.argv.slice(2);
const cases = loadCases().filter((c) => ids.length === 0 || ids.includes(c.id));
if (cases.length === 0) throw new Error(`no cases match ${ids.join(', ')}`);

// Load the model before timing anything, so the first case doesn't carry the cold start.
await fetch(`${host}/api/generate`, { method: 'POST', body: JSON.stringify({ model: AGENT_MODEL, keep_alive: '10m' }) });

const corpus = loadCorpus();
const client = ollamaClient(host);
const runId = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
const dir = `results/traces/${runId}`;
mkdirSync(dir, { recursive: true });

for (const c of cases) {
  const run = await runAgent({ question: c.question, role: c.role, corpus, client });
  const record = { caseId: c.id, role: c.role, question: c.question, model: AGENT_MODEL, promptVersion: AGENT_PROMPT_VERSION, ...run };
  writeFileSync(`${dir}/${c.id}.json`, `${JSON.stringify(record, null, 2)}\n`);
  console.log(`${c.id}  ${run.stopReason}  steps=${run.trace.length}  ${run.final?.kind ?? run.error ?? ''}`);
}
console.log(`traces: ${dir}`);
