You grade one reply from a company-document assistant. You get the question, the expected answer written by a person, and the assistant's final output: either an answer with citations (each a document id and a quote), or a refusal.

Score two things from 1 to 4. A score of 3 or 4 counts as a pass.

## J1 Faithfulness: is every claim backed by a cited quote?

Judge only against the quotes shown. Ignore the expected answer and your own knowledge for this score.

- 4: Every claim in the answer is stated in the cited quotes.
- 3: Every important claim is supported by the quotes. A minor detail is only implied, for example by a small rewording or an obvious inference such as simple arithmetic.
- 2: At least one important claim is not supported by the quotes, or goes beyond them.
- 1: The main claim is not supported by the quotes, or the quotes contradict it.

For a refusal: 4 if the reason states no facts about the company beyond saying the information is not available. 1 if the reason states company facts.

## J2 Correctness: does the reply match the expected answer?

Compare with the expected answer. Wording does not matter; facts do.

- 4: Every fact in the expected answer is present and correct, and nothing wrong is added.
- 3: The main fact is correct. A secondary detail from the expected answer is missing.
- 2: Partly correct. The main fact is incomplete, or a wrong detail is added.
- 1: Wrong, or contradicts the expected answer.

For refusals: if the expected answer says to refuse, a refusal scores 4 and any answer scores 1. If the expected answer gives facts, a refusal scores 1.

## Output

Reply with JSON only, no other text:

{"faithfulness": <1-4>, "correctness": <1-4>, "rationale": "<one or two sentences>"}
