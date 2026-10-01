import { describe, expect, it } from 'vitest';
import { bm25, tokenize } from '../../src/retrieval/bm25.ts';

const chunk = (docId: string, text: string, title = docId) => ({ docId, title, index: 0, text });

describe('tokenize', () => {
  it('lowercases, splits on non-alphanumerics and drops stopwords', () => {
    expect(tokenize('How many DAYS of leave do I get? (2026)')).toEqual(['many', 'days', 'leave', 'get', '2026']);
  });
});

describe('bm25', () => {
  const chunks = [
    chunk('a', 'Annual leave is 24 days per year.'),
    chunk('b', 'Expense receipts are required above 25 dollars.'),
    chunk('c', 'The on-call engineer pages the incident commander.'),
  ];

  it('ranks the chunk that contains the query terms first', () => {
    const [top] = bm25('how much annual leave', chunks, 5);
    expect(top?.chunk.docId).toBe('a');
  });

  it('leaves out chunks that match no query term', () => {
    const hits = bm25('annual leave', chunks, 5);
    expect(hits.map((h) => h.chunk.docId)).toEqual(['a']);
  });

  it('returns at most k hits, best first', () => {
    const many = Array.from({ length: 8 }, (_, i) => chunk(`d${i}`, `leave ${'leave '.repeat(i)}`));
    const hits = bm25('leave', many, 5);
    expect(hits).toHaveLength(5);
    const scores = hits.map((h) => h.score);
    expect(scores).toEqual([...scores].sort((x, y) => y - x));
  });

  it('scores a shorter chunk higher than a longer one with the same term count', () => {
    const short = chunk('short', 'carryover rules');
    const long = chunk('long', 'carryover rules apply to every team member in every office across all regions');
    const [top] = bm25('carryover', [long, short, chunks[2]!], 5);
    expect(top?.chunk.docId).toBe('short');
  });

  it('matches the title as well as the body', () => {
    const hits = bm25('travel', [chunk('t', 'Book through the portal.', 'Travel Policy'), chunks[0]!], 5);
    expect(hits[0]?.chunk.docId).toBe('t');
  });

  it('returns nothing for an empty or stopword-only query', () => {
    expect(bm25('', chunks, 5)).toEqual([]);
    expect(bm25('the of and', chunks, 5)).toEqual([]);
  });
});
