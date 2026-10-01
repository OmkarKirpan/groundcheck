import type { Chunk } from './chunk.ts';

const K1 = 1.2;
const B = 0.75;

// Small on purpose: just the words that make natural-language questions noisy.
const STOPWORDS = new Set(
  ('a an and are as at be by can do does for from has have how i if in is it its me my of on or our ' +
    'should so that the their there this to was we what when where which who why will with you your')
    .split(' '),
);

/** Plural to singular, nothing more: a full stemmer isn't needed for a 30-doc corpus. */
function singular(t: string): string {
  if (t.length > 4 && t.endsWith('ies')) return `${t.slice(0, -3)}y`;
  if (t.length > 3 && t.endsWith('s') && !/(ss|us|is)$/.test(t)) return t.slice(0, -1);
  return t;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t && !STOPWORDS.has(t))
    .map(singular);
}

export interface Hit {
  chunk: Chunk;
  score: number;
}

/**
 * Okapi BM25 over title + text of each chunk. All corpus statistics (IDF, average
 * length) come only from `chunks`, so callers filter by role *before* calling this.
 */
export function bm25(query: string, chunks: readonly Chunk[], k: number): Hit[] {
  const terms = [...new Set(tokenize(query))];
  if (terms.length === 0 || chunks.length === 0) return [];

  const docs = chunks.map((chunk) => {
    const tokens = tokenize(`${chunk.title} ${chunk.text}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { chunk, length: tokens.length, tf };
  });

  const n = docs.length;
  const avgLength = docs.reduce((sum, d) => sum + d.length, 0) / n;
  const idf = new Map(
    terms.map((t) => {
      const df = docs.filter((d) => d.tf.has(t)).length;
      return [t, Math.log(1 + (n - df + 0.5) / (df + 0.5))];
    }),
  );

  const hits: Hit[] = [];
  for (const d of docs) {
    let score = 0;
    for (const t of terms) {
      const f = d.tf.get(t);
      if (!f) continue;
      score += idf.get(t)! * ((f * (K1 + 1)) / (f + K1 * (1 - B + (B * d.length) / avgLength)));
    }
    if (score > 0) hits.push({ chunk: d.chunk, score });
  }

  return hits.sort((x, y) => y.score - x.score).slice(0, k);
}
