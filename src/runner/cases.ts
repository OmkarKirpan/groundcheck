import { readFileSync } from 'node:fs';
import { ROLES, type Role } from '../retrieval/corpus.ts';

export const CATEGORIES = ['single-doc', 'multi-doc', 'stale/conflict', 'permission', 'unanswerable'] as const;

export interface Case {
  id: string;
  role: Role;
  question: string;
  category: (typeof CATEGORIES)[number];
  goldAnswer: string;
  goldDocIds: string[];
  mustRefuse: boolean;
  forbiddenDocIds: string[];
}

function fail(field: string, why: string): never {
  throw new Error(`${field} ${why}`);
}

const nonEmpty = (field: string, v: unknown): string =>
  typeof v === 'string' && v ? v : fail(field, 'must be a non-empty string');

const ids = (field: string, v: unknown): string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string' && x) ? (v as string[]) : fail(field, 'must be a list of ids');

export function parseCase(raw: Record<string, unknown>): Case {
  if (!ROLES.includes(raw.role as Role)) fail('role', `must be one of ${ROLES.join(', ')}`);
  if (!CATEGORIES.includes(raw.category as Case['category'])) fail('category', `must be one of ${CATEGORIES.join(', ')}`);
  if (typeof raw.mustRefuse !== 'boolean') fail('mustRefuse', 'must be true or false');
  return {
    id: nonEmpty('id', raw.id),
    role: raw.role as Role,
    question: nonEmpty('question', raw.question),
    category: raw.category as Case['category'],
    goldAnswer: nonEmpty('goldAnswer', raw.goldAnswer),
    goldDocIds: ids('goldDocIds', raw.goldDocIds),
    mustRefuse: raw.mustRefuse,
    forbiddenDocIds: ids('forbiddenDocIds', raw.forbiddenDocIds),
  };
}

export function loadCases(path = 'cases/cases.jsonl'): Case[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .map((line, i) => [line.trim(), i + 1] as const)
    .filter(([line]) => line)
    .map(([line, n]) => {
      try {
        return parseCase(JSON.parse(line));
      } catch (e) {
        throw new Error(`${path}:${n}: ${(e as Error).message}`);
      }
    });
}
