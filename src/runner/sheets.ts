// Review sheets for the two human checks.
// npm run sheet:gold               cases/gold-review.md: every expected answer next to its source paragraphs (D20)
// npm run sheet:labels -- <runId>  cases/labeling-sheet.md + cases/human-labels.jsonl to fill in blind (D21)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { LABELS_PATH, pickLabelCases, type HumanLabel } from '../judge/agreement.ts';
import { bm25 } from '../retrieval/bm25.ts';
import { chunkDoc } from '../retrieval/chunk.ts';
import { loadCorpus } from '../retrieval/corpus.ts';
import { searchDocs } from '../tools/tools.ts';
import { loadCases } from './cases.ts';
import type { Report } from './run.ts';

const corpus = loadCorpus();
const cases = loadCases();
const docById = new Map(corpus.map((d) => [d.id, d]));
const quote = (text: string) => text.split('\n').map((l) => `> ${l}`).join('\n');

function goldSheet(): string {
  const out = [
    '# Expected-answer review',
    '',
    'Check every expected answer against its source before trusting any eval numbers (decision D20).',
    'Tick the box when the expected answer is right. If one is wrong, fix `cases/cases.jsonl` and re-run.',
    '',
  ];
  for (const c of cases) {
    out.push(`## ${c.id} · ${c.category} · ${c.role}`, '', `**Question:** ${c.question}`, '', `**Expected answer:** ${c.goldAnswer}`, '');
    if (c.mustRefuse) {
      if (c.forbiddenDocIds.length) out.push(`**Restricted doc that holds the answer:** ${c.forbiddenDocIds.join(', ')}`, '');
      out.push(`**What a search as \`${c.role}\` finds** (none of this should answer the question):`, '');
      for (const h of searchDocs(corpus, c.role, c.question).slice(0, 3)) out.push(`- \`${h.docId}\`: ${h.snippet.replace(/\n+/g, ' ')}`);
    } else {
      for (const id of c.goldDocIds) {
        const doc = docById.get(id)!;
        const best = bm25(`${c.question} ${c.goldAnswer}`, chunkDoc(doc), 2).sort((a, b) => a.chunk.index - b.chunk.index);
        out.push(`**\`${id}\`** (${doc.status}, effective ${doc.effectiveDate})`, '', ...best.map((h) => `${quote(h.chunk.text)}\n`));
      }
    }
    out.push('', '- [ ] Expected answer checked', '');
  }
  return out.join('\n');
}

function labelSheet(runId: string): string {
  const report = JSON.parse(readFileSync(`results/${runId}.json`, 'utf8')) as Report;
  const picked = pickLabelCases(report.cases);

  const existing = existsSync(LABELS_PATH)
    ? readFileSync(LABELS_PATH, 'utf8').split('\n').filter((l) => l.trim()).map((l) => JSON.parse(l) as HumanLabel)
    : [];
  const kept = existing.filter((l) => l.runId !== runId || picked.includes(l.caseId));
  for (const caseId of picked) {
    if (!kept.some((l) => l.runId === runId && l.caseId === caseId)) {
      kept.push({ runId, caseId, faithful: '?', correct: '?' } as unknown as HumanLabel);
    }
  }
  writeFileSync(LABELS_PATH, kept.map((l) => JSON.stringify(l)).join('\n') + '\n');

  const out = [
    `# Labelling sheet for run ${runId}`,
    '',
    'Label these 20 cases **before looking at any judge scores** (decision D21).',
    `For each one, set \`faithful\` and \`correct\` to \`pass\` or \`fail\` in \`${LABELS_PATH}\` (lines still \`?\` are ignored).`,
    '',
    '- **faithful**: is every claim in the answer backed by the quotes shown? A refusal passes if it states no company facts.',
    '- **correct**: does it match the expected answer? For a must-refuse case, a refusal passes and any answer fails.',
    '',
  ];
  for (const id of picked) {
    const o = report.cases.find((c) => c.caseId === id)!;
    const c = cases.find((k) => k.id === id)!;
    const final = o.run.final!;
    out.push(`## ${id} · ${c.role}`, '', `**Question:** ${c.question}`, '', `**Expected answer:** ${c.goldAnswer}`, '');
    if (final.kind === 'refusal') {
      out.push(`**Agent refused.** Reason: ${final.reason || '(none given)'}`, '');
    } else {
      out.push(`**Agent answer:** ${final.answer}`, '', '**Citations:**', '');
      for (const cit of final.citations) out.push(`- \`${cit.docId}\`: "${cit.quote}"`);
      out.push('');
      for (const docId of new Set(final.citations.map((x) => x.docId))) {
        const doc = docById.get(docId);
        if (doc) out.push(`<details><summary>Full text of ${docId}</summary>\n\n${quote(doc.body)}\n\n</details>`, '');
      }
    }
  }
  return out.join('\n');
}

const [kind, runId] = process.argv.slice(2);
if (kind === 'gold') {
  writeFileSync('cases/gold-review.md', goldSheet());
  console.log('cases/gold-review.md');
} else if (kind === 'labels' && runId) {
  writeFileSync('cases/labeling-sheet.md', labelSheet(runId));
  console.log(`cases/labeling-sheet.md and ${LABELS_PATH}`);
} else {
  throw new Error('usage: sheets.ts gold | labels <runId>');
}
