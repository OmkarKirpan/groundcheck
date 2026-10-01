import { readFileSync } from 'node:fs';
import type { Doc } from '../retrieval/corpus.ts';

export const CONFLICTS_PATH = 'cases/conflicts.jsonl';

/** Two statements that disagree, each quoted word for word from its doc. Eval metadata, not part of the corpus. */
export interface Conflict {
  id: string;
  sides: [{ docId: string; text: string }, { docId: string; text: string }];
}

/**
 * The corpus's own Document Precedence rule: a superseded doc never applies; a policy beats an FAQ;
 * between two policies the later effective date wins. Null where the rule says nothing.
 */
export function winner(a: Doc, b: Doc): Doc | null {
  if (a.status !== b.status) return a.status === 'current' ? a : b;
  const types = [a.type, b.type].sort().join('/');
  if (types === 'faq/policy') return a.type === 'policy' ? a : b;
  if (types === 'policy/policy' && a.effectiveDate !== b.effectiveDate) return a.effectiveDate > b.effectiveDate ? a : b;
  return null;
}

export function loadConflicts(path = CONFLICTS_PATH): Conflict[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as Conflict);
}
