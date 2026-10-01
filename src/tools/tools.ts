import { bm25 } from '../retrieval/bm25.ts';
import { chunkDoc } from '../retrieval/chunk.ts';
import type { Doc, Role } from '../retrieval/corpus.ts';

export const SEARCH_TOP_K = 5;

export interface SearchHit {
  docId: string;
  title: string;
  snippet: string;
  score: number;
}

export type OpenDocResult =
  | { docId: string; title: string; version: number; status: Doc['status']; body: string }
  | { error: 'not_found' | 'forbidden' };

/** Role filter first, then rank: docs the role can't see never touch the index or its statistics. */
export function searchDocs(corpus: readonly Doc[], role: Role, query: string): SearchHit[] {
  const chunks = corpus.filter((d) => d.rolesAllowed.includes(role)).flatMap(chunkDoc);
  return bm25(query, chunks, SEARCH_TOP_K).map(({ chunk, score }) => ({
    docId: chunk.docId,
    title: chunk.title,
    snippet: chunk.text,
    score: Math.round(score * 1000) / 1000,
  }));
}

export function openDoc(corpus: readonly Doc[], role: Role, docId: string): OpenDocResult {
  const doc = corpus.find((d) => d.id === docId);
  if (!doc) return { error: 'not_found' };
  if (!doc.rolesAllowed.includes(role)) return { error: 'forbidden' };
  return { docId: doc.id, title: doc.title, version: doc.version, status: doc.status, body: doc.body };
}
