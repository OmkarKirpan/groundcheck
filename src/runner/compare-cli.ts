// npm run compare -- <runA> <runB>   what changed between two recorded runs (answers, checks, judge, metrics)
import { readFileSync } from 'node:fs';
import { reportDiff } from './compare.ts';
import type { Report } from './run.ts';

const [a, b] = process.argv.slice(2);
if (!a || !b) throw new Error('usage: npm run compare -- <runA> <runB>');
const read = (runId: string) => JSON.parse(readFileSync(`results/${runId}.json`, 'utf8')) as Report;
const [first, second] = [read(a), read(b)];

const diffs = reportDiff(first, second);
console.log(diffs.join('\n') || 'no differences');
const answers = diffs.filter((d) => d.endsWith('final answer differs')).length;
const checks = diffs.filter((d) => /: G\d /.test(d)).length;
const judge = diffs.filter((d) => d.includes(': judge ')).length;
console.log(`\n${answers} of ${first.cases.length} answers changed · ${checks} check verdicts flipped · ${judge} judge scores changed`);
