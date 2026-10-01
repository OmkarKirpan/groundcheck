import { describe, expect, it } from 'vitest';
import { loadCorpus, parseDoc } from '../../src/retrieval/corpus.ts';

const file = (frontmatter: string, body = 'Body text.') => `---\n${frontmatter}\n---\n\n${body}\n`;

const valid = `id: pol-leave-v2
title: Leave Policy
type: policy
version: 2
effective_date: 2026-04-01
supersedes: pol-leave-v1
status: current
roles_allowed: [employee, manager, hr_admin]`;

describe('parseDoc', () => {
  it('maps frontmatter to a Doc and keeps the body', () => {
    expect(parseDoc(file(valid, 'Annual leave is 24 days.'))).toEqual({
      id: 'pol-leave-v2',
      title: 'Leave Policy',
      type: 'policy',
      version: 2,
      effectiveDate: '2026-04-01',
      supersedes: 'pol-leave-v1',
      status: 'current',
      rolesAllowed: ['employee', 'manager', 'hr_admin'],
      body: 'Annual leave is 24 days.',
    });
  });

  it('normalises CRLF in the body', () => {
    expect(parseDoc(file(valid, 'One.\n\nTwo.').replace(/\n/g, '\r\n')).body).toBe('One.\n\nTwo.');
  });

  it('accepts supersedes: null', () => {
    expect(parseDoc(file(valid.replace('pol-leave-v1', 'null'))).supersedes).toBeNull();
  });

  it('rejects an unknown role', () => {
    expect(() => parseDoc(file(valid.replace('hr_admin]', 'ceo]')))).toThrow(/roles_allowed/);
  });

  it('rejects an unknown status', () => {
    expect(() => parseDoc(file(valid.replace('status: current', 'status: draft')))).toThrow(/status/);
  });

  it('rejects a file without frontmatter', () => {
    expect(() => parseDoc('Just text')).toThrow(/frontmatter/);
  });
});

describe('the real corpus', () => {
  const docs = loadCorpus();
  const ids = new Set(docs.map((d) => d.id));

  it('loads, with unique ids', () => {
    expect(docs.length).toBeGreaterThan(0);
    expect(ids.size).toBe(docs.length);
  });

  it('only supersedes docs that exist and are marked superseded', () => {
    for (const d of docs.filter((d) => d.supersedes)) {
      const old = docs.find((o) => o.id === d.supersedes);
      expect(old, `${d.id} supersedes missing ${d.supersedes}`).toBeDefined();
      expect(old?.status, `${old?.id} should be superseded`).toBe('superseded');
    }
  });

  it('gives every superseded doc a successor', () => {
    for (const d of docs.filter((d) => d.status === 'superseded')) {
      expect(docs.some((n) => n.supersedes === d.id), `${d.id} has no successor`).toBe(true);
    }
  });
});
