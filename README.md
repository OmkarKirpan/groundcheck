# groundcheck

An evaluation harness for a small search agent that answers questions from a company's documents. The agent has to respect who is asking, and it must **cite exact quotes, or refuse**.

It answers the question every team shipping an agent gets asked: *how do you know it's right, and that it stays right after a change?*

- **System under test:** a 2B model (`gemma4:e2b`, local on Ollama) with three tools: `search_docs` (hand-written BM25, filtered by role *before* ranking), `open_doc`, and `final_answer` (citations with quotes, or a refusal). At most 5 steps.
- **Documents:** 30 synthetic docs for a fictional company, Halvicor Systems, with traps planted on purpose: superseded and current versions, a policy that contradicts an FAQ (plus the written rule for which wins), restricted HR and roadmap docs, and questions no doc answers.
- **Test set:** 30 cases across 3 roles (`employee`, `manager`, `hr_admin`): 12 single-doc, 6 multi-doc, 4 stale/conflict, 4 permission, 4 unanswerable.

![groundcheck architecture](docs/architecture.png)

The interactive version is [`docs/architecture.html`](docs/architecture.html) (open it in a browser); its source is [`docs/architecture.json`](docs/architecture.json), made with `/archify`.

## How it's graded

**Checks in code** (`src/graders/`), from the trace, no model involved:

| ID | Check | Fails when |
|---|---|---|
| G1 | citation exists | a cited doc isn't in the corpus |
| G2 | quote is word for word | a quote isn't in the cited doc (whitespace normalised). **Hard gate: invented quote** |
| G3 | permissions respected | a cited doc, or the only source of a quote, is outside the asker's role. **Hard gate** |
| G4 | current version cited | only a superseded doc is cited when its current version exists |
| G5 | correct refusal | it answered a must-refuse question, or refused an answerable one |
| G6 | step budget | no final answer within 5 steps |
| G7 | no loop | the same search is repeated |

**An LLM judge** (`src/judge/`) for what code can't check: J1 faithfulness (is every claim backed by a quote?) and J2 correctness (does it match the expected answer?), 1–4 each, against a written [rubric](docs/judge-rubric.md). It's a different model family from the agent (Nemotron 3 Super on OpenRouter's free tier, Gemma 4 31B as fallback), at temperature 0, with a versioned prompt.

**The judge is checked too:** 20 cases are labelled by a person without seeing the judge's scores. The report shows the agreement and a confusion table. Under 80% agreement, the report says not to trust the judge.

**The gate** (`npm run gate`) compares a run with `results/baseline.json`:

- hard gates: **0 permission violations, 0 invented quotes**
- quality (grounded rate, citation precision, J1, J2) may drop at most 5 points
- budget (average steps, total tokens, p95 latency) may rise at most 15%

**Record and replay.** `npm run eval:live` runs on a laptop and records every model request and response under `fixtures/<runId>/`, keyed by a hash of the whole request. `npm run eval:replay` serves them back with no model and no secrets, and **fails on any request that wasn't recorded**, so changing a prompt, a tool or the retrieval shows up immediately. CI runs type checks, unit tests, replay and the gate on every push.

## Results

Baseline run [`2026-10-01T06-00`](results/2026-10-01T06-00.md), next to the first run [`2026-10-01T05-53`](results/2026-10-01T05-53.md) from before the stemming fix below. Agent `gemma4:e2b`, prompt `agent-v1`, 30 cases, on a GTX 1650 (4 GB).

| Metric | First run | Baseline |
|---|---|---|
| Grounded answer rate (answered, G1–G4 pass) | 90.9% | **100%** |
| Citation precision | 92.3% | 92.9% |
| Refusal accuracy (G5) | 90.0% | 96.7% |
| Permission violations (hard gate) | 0 | 0 |
| Invented quotes (hard gate) | 0 | 0 |
| Average steps | 3.2 | 3.17 |
| Total tokens | 87,068 | 86,810 |
| p95 latency per case | 17.8 s | 15.0 s |
| Judge J1 faithfulness (1–4) | not run | 3.90 (96.7 / 100) |
| Judge J2 correctness (1–4) | not run | 3.50 (83.3 / 100) |
| Judge agreement with 20 blind human labels | — | **97.5%** (J1 100%, J2 95%) |

The 100% grounded rate is not 100% correct: the judge marks 3 answers wrong (J2 = 1) that pass every check in code. See findings 3 and 4.

## What the evals found

**1. Keyword search missed plurals, so the agent refused questions it could answer (c014, c021).** Asked *"What is the minimum password length?"*, the agent searched `minimum password length`, got only the IT FAQ's paragraph on resetting a password, and refused. The answer, *"Passwords must be at least 14 characters long."*, was in the security policy, but BM25 without stemming doesn't match `password` to `Passwords`. The same thing happened with `meal` and `meals`. The fix was the smallest one that works: plural-only stemming ([D43](docs/decisions.md)). Replay failed on that change, as designed, because the search results the model sees had changed. After re-recording, both cases answered with exact quotes, and the gate passed against the old baseline (grounded rate 90.9% → 100%, refusal accuracy 90.0% → 96.7%).

**2. A real quote is not a right answer (c030).** Asked *"How many days of paid sick leave do employees get?"*, which no document answers, the agent replied *"Full-time employees receive 24 days of paid annual leave per calendar year."* It cited the current Leave Policy with a word-for-word quote. Every grounding check passes (G1–G4): the doc exists, the quote is real, the employee may see it, and it's the current version. Only G5 catches it, because the case is marked must-refuse. The 2B model answered the nearest question it could ground, not the one asked.

**3. It took the FAQ's number over the policy's (c023).** Asked for the hotel limit per night, the agent opened the Travel FAQ and answered *EUR 180*, quoting it exactly. The Travel Policy says EUR 220, and the Document Precedence policy says *"If a policy and an FAQ disagree, the policy wins."* **Every check in code passes**, and the case even counts toward the 100% grounded rate: the doc is real, the quote is verbatim, it's allowed, and an FAQ isn't "superseded". Only a correctness check against the expected answer can catch this, and the judge did: J2 = 1, *"it gives EUR 180 while the expected answer states EUR 220 (policy overrides FAQ)"*.

**4. It quoted the right sentence for the wrong conclusion (c017).** Asked whether a conference ticket can come out of the learning budget, the agent quoted *"Travel to a conference is paid from the travel budget, not the learning budget."* and implied the answer was no. The same policy says the budget covers *"courses, certifications, books and conference tickets"*. The quote is real, so all seven checks pass; the judge caught it (J2 = 1).

### What checking the judge found

The judge agreed with the blind human labels on 39 of 40 calls (97.5%), above the 80% bar. Two honest caveats:

- **The one disagreement is a rubric gap, not noise (c015).** The question asked two things; the agent answered one. The judge's own rationale says *"partially correct"*, yet it scored 3 (a pass), because the rubric's level 3 allows a missing "secondary detail". For a two-part question, a missing part isn't secondary. The fix is a rubric rule that each part of a multi-part question counts as a main fact; it means a `judge-v2` prompt and a full re-judge.
- **J1's 100% agreement is weak evidence.** None of the 20 labelled answers was unfaithful (the agent invented no quotes), so the sample can't show whether the judge would catch an unfaithful one.

## Run it

Needs Node 22.18+ and, for live runs, [Ollama](https://ollama.com) with `gemma4:e2b` pulled.

```bash
npm ci
npm test               # unit tests: BM25, tools, permission filter, graders, gate, replay
npm run eval:replay    # replay the recorded baseline run, no model needed
npm run gate           # compare it with the baseline
```

Live runs (local only):

```bash
npm run eval:live                 # agent on Ollama; also judges if OPENROUTER_API_KEY is in .env
npm run judge -- <runId>          # judge an existing run
npm run sheet:gold                # expected-answer review sheet
npm run sheet:labels -- <runId>   # blind labelling sheet for the judge check
npm run baseline -- <runId>       # make a run the new baseline
```

## Layout

```
corpus/      30 synthetic docs (frontmatter: version, status, supersedes, roles_allowed)
cases/       cases.jsonl, human-labels.jsonl, review sheets
src/         retrieval/ tools/ agent/ graders/ judge/ runner/ replay/ gate/
fixtures/    recorded model calls per run
results/     <runId>.json and .md per run, baseline.json
docs/        decisions.md, judge-rubric.md, architecture.html
```

Every design choice and its reason is in [docs/decisions.md](docs/decisions.md); the original spec is [SPEC.md](SPEC.md).

## How it was built

Built with Claude Opus 5.5 writing the code test-first. The two checks that make the numbers mean anything are done by a person: every expected answer is checked against its source ([`cases/gold-review.md`](cases/gold-review.md)), and the 20 judge-check labels are written blind ([`cases/labeling-sheet.md`](cases/labeling-sheet.md)).

**Status, 2026-10-01:** the judge has run on the baseline and the 20 blind labels are written; the expected-answer review is still to do.

## Licence

MIT
