import { mkdtempSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { recording, replaying, requestKey } from '../../src/replay/replay.ts';

const tmp = () => mkdtempSync(join(tmpdir(), 'groundcheck-'));

describe('requestKey', () => {
  it('does not depend on object key order', () => {
    expect(requestKey({ model: 'm', messages: [{ role: 'user', content: 'hi' }] })).toBe(
      requestKey({ messages: [{ content: 'hi', role: 'user' }], model: 'm' }),
    );
  });

  it('changes when anything in the request changes', () => {
    const base = { model: 'm', messages: [{ role: 'user', content: 'hi' }], tools: [] };
    expect(requestKey(base)).not.toBe(requestKey({ ...base, messages: [{ role: 'user', content: 'hi!' }] }));
    expect(requestKey(base)).not.toBe(requestKey({ ...base, model: 'n' }));
  });
});

describe('recording and replaying', () => {
  it('replays a recorded response without calling the model', async () => {
    const dir = tmp();
    let calls = 0;
    const live = recording(async (req: { q: string }) => ({ a: `answer to ${req.q}`, n: ++calls }), dir, 'agent');
    await live({ q: 'one' });
    await live({ q: 'two' });
    expect(readdirSync(dir)).toHaveLength(2);

    const replay = replaying<{ q: string }, { a: string; n: number }>(dir, 'agent');
    expect(await replay({ q: 'two' })).toEqual({ a: 'answer to two', n: 2 });
    expect(calls).toBe(2);
  });

  it('fails on a request that was not recorded', async () => {
    const dir = tmp();
    await recording(async () => ({ a: 1 }), dir, 'agent')({ q: 'one' });
    const replay = replaying(dir, 'agent');
    await expect(replay({ q: 'changed prompt' })).rejects.toThrow(/not recorded/);
  });

  it('keeps kinds apart, so a judge fixture never answers an agent request', async () => {
    const dir = tmp();
    await recording(async () => ({ a: 1 }), dir, 'judge')({ q: 'one' });
    await expect(replaying(dir, 'agent')({ q: 'one' })).rejects.toThrow(/not recorded/);
  });
});
