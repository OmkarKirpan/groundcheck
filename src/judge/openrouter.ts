import type { JudgeCall } from './judge.ts';

const URL = 'https://openrouter.ai/api/v1/chat/completions';
// Free tier allows 20 requests a minute; keep a little under that.
const MIN_GAP_MS = 3_200;
const TIMEOUT_MS = 120_000;

interface Completion {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export function openRouterCall(apiKey: string): JudgeCall {
  let last = 0;
  return async (request) => {
    const wait = last + MIN_GAP_MS - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    last = Date.now();

    const res = await fetch(URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json', 'x-title': 'groundcheck' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`openrouter ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as Completion;
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error(`openrouter: no content (${json.error?.message ?? 'empty reply'})`);
    return { content, tokensIn: json.usage?.prompt_tokens ?? 0, tokensOut: json.usage?.completion_tokens ?? 0 };
  };
}
