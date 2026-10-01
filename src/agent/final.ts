export interface Citation {
  docId: string;
  quote: string;
}

export type FinalAnswer =
  | { kind: 'answer'; answer: string; citations: Citation[] }
  | { kind: 'refusal'; reason: string };

export type ParseResult = { ok: true; value: FinalAnswer } | { ok: false; error: string };

const fail = (error: string): ParseResult => ({ ok: false, error });

/** Validates final_answer arguments. Errors are written for the model, which gets them back as the tool result. */
export function parseFinalAnswer(args: Record<string, unknown>): ParseResult {
  if (args.refusal === true || args.refusal === 'true') {
    const reason = [args.reason, args.answer].find((r): r is string => typeof r === 'string' && r.trim() !== '');
    return { ok: true, value: { kind: 'refusal', reason: reason ?? '' } };
  }

  if (typeof args.answer !== 'string' || !args.answer.trim()) {
    return fail('answer must be a non-empty string (or set refusal to true with a reason)');
  }

  let citations = args.citations;
  if (typeof citations === 'string') {
    try {
      citations = JSON.parse(citations);
    } catch {
      return fail('citations must be a list of {docId, quote}');
    }
  }
  if (!Array.isArray(citations) || citations.length === 0) {
    return fail('an answer needs at least one citation {docId, quote}; refuse if you cannot cite one');
  }

  const parsed: Citation[] = [];
  for (const c of citations as unknown[]) {
    const { docId, quote } = (c ?? {}) as Record<string, unknown>;
    if (typeof docId !== 'string' || !docId) return fail('each citation needs a docId');
    if (typeof quote !== 'string' || !quote.trim()) {
      return fail('each citation needs a quote copied exactly from the document');
    }
    parsed.push({ docId, quote });
  }
  return { ok: true, value: { kind: 'answer', answer: args.answer, citations: parsed } };
}
