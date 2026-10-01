import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

export const ROLES = ['employee', 'manager', 'hr_admin'] as const;
export type Role = (typeof ROLES)[number];

const TYPES = ['policy', 'runbook', 'faq', 'product'] as const;
const STATUSES = ['current', 'superseded'] as const;

export interface Doc {
  id: string;
  title: string;
  type: (typeof TYPES)[number];
  version: number;
  effectiveDate: string;
  supersedes: string | null;
  status: (typeof STATUSES)[number];
  rolesAllowed: Role[];
  body: string;
}

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

function oneOf<T extends string>(field: string, value: unknown, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${field} must be one of ${allowed.join(', ')}, got ${JSON.stringify(value)}`);
  }
  return value as T;
}

function text(field: string, value: unknown): string {
  if (typeof value !== 'string' || !value) throw new Error(`${field} must be a non-empty string`);
  return value;
}

export function parseDoc(raw: string): Doc {
  const match = FRONTMATTER.exec(raw.replace(/\r\n/g, '\n'));
  if (!match) throw new Error('missing frontmatter (--- block at the top)');
  const fm = parse(match[1]!) as Record<string, unknown>;

  if (!Array.isArray(fm.roles_allowed) || fm.roles_allowed.length === 0) {
    throw new Error('roles_allowed must be a non-empty list');
  }
  if (!Number.isInteger(fm.version)) throw new Error('version must be an integer');
  const date = fm.effective_date instanceof Date ? fm.effective_date.toISOString().slice(0, 10) : fm.effective_date;

  return {
    id: text('id', fm.id),
    title: text('title', fm.title),
    type: oneOf('type', fm.type, TYPES),
    version: fm.version as number,
    effectiveDate: text('effective_date', date),
    supersedes: fm.supersedes == null ? null : text('supersedes', fm.supersedes),
    status: oneOf('status', fm.status, STATUSES),
    rolesAllowed: fm.roles_allowed.map((r) => oneOf('roles_allowed', r, ROLES)),
    body: match[2]!.trim(),
  };
}

export function loadCorpus(dir = 'corpus'): Doc[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort()
    .map((f) => {
      try {
        const doc = parseDoc(readFileSync(join(dir, f), 'utf8'));
        if (`${doc.id}.md` !== f) throw new Error(`id ${doc.id} does not match the file name`);
        return doc;
      } catch (e) {
        throw new Error(`${f}: ${(e as Error).message}`);
      }
    });
}
