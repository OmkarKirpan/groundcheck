import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** JSON with object keys sorted, so the same request always hashes the same way. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Hash of everything that decides the reply: model, messages, tools and options. */
export function requestKey(request: unknown): string {
  return createHash('sha256').update(stableJson(request)).digest('hex').slice(0, 16);
}

interface Fixture<Req, Res> {
  kind: string;
  key: string;
  request: Req;
  response: Res;
}

/** Wraps a live call so every request/response pair is saved to `dir` as `<kind>-<key>.json`. */
export function recording<Req, Res>(call: (req: Req) => Promise<Res>, dir: string, kind: string) {
  mkdirSync(dir, { recursive: true });
  return async (request: Req): Promise<Res> => {
    const response = await call(request);
    const key = requestKey(request);
    const fixture: Fixture<Req, Res> = { kind, key, request, response };
    writeFileSync(join(dir, `${kind}-${key}.json`), `${JSON.stringify(fixture, null, 1)}\n`);
    return response;
  };
}

function loadFixtures<Res>(dir: string, kind: string): Map<string, Res> {
  const fixtures = new Map<string, Res>();
  if (!existsSync(dir)) return fixtures;
  for (const file of readdirSync(dir).filter((f) => f.startsWith(`${kind}-`) && f.endsWith('.json'))) {
    const fixture = JSON.parse(readFileSync(join(dir, file), 'utf8')) as Fixture<unknown, Res>;
    fixtures.set(fixture.key, fixture.response);
  }
  return fixtures;
}

/** Recorded response if there is one, otherwise a live call that gets recorded. Saves rate-limited judge calls. */
export function cached<Req, Res>(call: (req: Req) => Promise<Res>, dir: string, kind: string) {
  const fixtures = loadFixtures<Res>(dir, kind);
  const live = recording(call, dir, kind);
  return async (request: Req): Promise<Res> => {
    const hit = fixtures.get(requestKey(request));
    return hit === undefined ? live(request) : structuredClone(hit);
  };
}

/** Serves recorded responses. Any request that wasn't recorded fails, so prompt or tool changes show up. */
export function replaying<Req, Res>(dir: string, kind: string) {
  const fixtures = loadFixtures<Res>(dir, kind);
  return async (request: Req): Promise<Res> => {
    const key = requestKey(request);
    const response = fixtures.get(key);
    if (response === undefined) {
      throw new Error(`${kind} request ${key} was not recorded in ${dir}; a prompt, tool or case changed. Re-record with npm run eval:live`);
    }
    return structuredClone(response);
  };
}
