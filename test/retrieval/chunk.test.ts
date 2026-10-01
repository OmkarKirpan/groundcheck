import { describe, expect, it } from 'vitest';
import { chunkDoc } from '../../src/retrieval/chunk.ts';

const doc = (body: string) => ({ id: 'd1', title: 'Leave Policy', body });

describe('chunkDoc', () => {
  it('splits the body into one chunk per paragraph', () => {
    const chunks = chunkDoc(doc('First para.\n\nSecond para\nstill second.\n\n\nThird.'));
    expect(chunks.map((c) => c.text)).toEqual(['First para.', 'Second para\nstill second.', 'Third.']);
  });

  it('attaches a heading-only paragraph to the paragraph after it', () => {
    const chunks = chunkDoc(doc('## Carryover\n\nUp to 8 days carry over.'));
    expect(chunks.map((c) => c.text)).toEqual(['## Carryover\n\nUp to 8 days carry over.']);
  });

  it('treats CRLF line endings like LF', () => {
    const chunks = chunkDoc(doc('One.\r\n\r\nTwo.'));
    expect(chunks.map((c) => c.text)).toEqual(['One.', 'Two.']);
  });

  it('carries docId, title and a stable chunk index', () => {
    const [a, b] = chunkDoc(doc('One.\n\nTwo.'));
    expect(a).toMatchObject({ docId: 'd1', title: 'Leave Policy', index: 0 });
    expect(b).toMatchObject({ index: 1 });
  });
});
