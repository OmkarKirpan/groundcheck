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
| G8 | precedence respected | it cites the losing side of a known conflict (listed in [`cases/conflicts.jsonl`](cases/conflicts.jsonl)) without the winning side, by the corpus's own precedence rule |

**An LLM judge** (`src/judge/`) for what code can't check: J1 faithfulness (is every claim backed by a quote?) and J2 correctness (does it match the expected answer?), 1–4 each, against a written [rubric](docs/judge-rubric.md). It's a different model family from the agent (Nemotron 3 Super on OpenRouter's free tier, Gemma 4 31B as fallback), at temperature 0, with a versioned prompt.

**The judge is checked too:** 20 cases are labelled by a person without seeing the judge's scores. The report shows the agreement and a confusion table. Under 80% agreement, the report says not to trust the judge.

**The gate** (`npm run gate`) compares a run with the baseline:

- hard gates: **0 permission violations, 0 invented quotes**
- quality (grounded rate, citation precision, J1, J2) may drop at most 5 points
- budget (average steps, total tokens, p95 latency) may rise at most 15%
- per case: **no check may go from pass to fail on any case** (see "How noisy is it?" below for why this rule exists)

**Record and replay.** `npm run eval:live` runs on a laptop and records every model request and response under `fixtures/<runId>/`, keyed by a hash of the whole request. `npm run eval:replay` serves them back with no model and no secrets, and **fails on any request that wasn't recorded**, so changing a prompt, a tool or the retrieval shows up immediately. It also fails if the committed `results/<runId>.json` isn't exactly what the current code produces from those recordings.

**CI** (on every push and pull request) runs type checks and unit tests, scans every commit for API keys, replays the newest recorded run, and gates it against the baseline from *before* the change: the base branch for a pull request, the previous commit for a push. A change can't approve itself by also editing `results/baseline.json`.

**Changing the agent** (prompt, tools, retrieval, model) therefore goes: make the change → `npm run eval:live` records a new run → `npm run gate -- results/<runId>.json` locally → commit the new `fixtures/<runId>/` and `results/<runId>.*` → CI replays that run and gates it against the old baseline → once merged, `npm run baseline -- <runId>`. Changing a grader or metric instead: `npm run eval:replay -- <runId> --write` regrades the recorded run in place.

## Results

Baseline run [`2026-10-01T06-00`](results/2026-10-01T06-00.md), next to the first run [`2026-10-01T05-53`](results/2026-10-01T05-53.md) from before the stemming fix below. Agent `gemma4:e2b`, prompt `agent-v1`, 30 cases, on a GTX 1650 (4 GB).

| Metric | First run | Baseline |
|---|---|---|
| Grounded answer rate (answered; G1–G4 and G8 pass) | 90.9% | **95.5%** (95% CI 78–99%) |
| Citation precision | 92.3% | 92.9% (95% CI 77–98%) |
| Refusal accuracy (G5) | 90.0% | 96.7% (95% CI 83–99%) |
| Permission violations (hard gate) | 0 | 0 |
| Invented quotes (hard gate) | 0 | 0 |
| Average steps | 3.2 | 3.17 |
| Total tokens | 87,068 | 86,810 |
| p95 latency per case | 17.8 s | 15.0 s |
| Judge J1 faithfulness (1–4), rubric `judge-v2` | not run | 3.93 (97.8 / 100) |
| Judge J2 correctness (1–4), rubric `judge-v2` | not run | 3.53 (84.4 / 100) |
| Judge agreement with 20 blind human labels | — | **100%** (`judge-v1`: 97.5%) |

The first run's grounded rate is from before G8 existed. Grounded is still not the same as correct: the judge fails two answers (c015, c017) that pass all eight checks in code. See finding 4 and the judge check below.

## What the evals found

**1. Keyword search missed plurals, so the agent refused questions it could answer (c014, c021).** Asked *"What is the minimum password length?"*, the agent searched `minimum password length`, got only the IT FAQ's paragraph on resetting a password, and refused. The answer, *"Passwords must be at least 14 characters long."*, was in the security policy, but BM25 without stemming doesn't match `password` to `Passwords`. The same thing happened with `meal` and `meals`. The fix was the smallest one that works: plural-only stemming ([D43](docs/decisions.md)). Replay failed on that change, as designed, because the search results the model sees had changed. After re-recording, both cases answered with exact quotes, and the gate passed against the old baseline (grounded rate 90.9% → 100%, refusal accuracy 90.0% → 96.7%).

**2. A real quote is not a right answer (c030).** Asked *"How many days of paid sick leave do employees get?"*, which no document answers, the agent replied *"Full-time employees receive 24 days of paid annual leave per calendar year."* It cited the current Leave Policy with a word-for-word quote. Every grounding check passes (G1–G4): the doc exists, the quote is real, the employee may see it, and it's the current version. Only G5 catches it, because the case is marked must-refuse. The 2B model answered the nearest question it could ground, not the one asked.

**3. It took the FAQ's number over the policy's (c023).** Asked for the hotel limit per night, the agent opened the Travel FAQ and answered *EUR 180*, quoting it exactly. The Travel Policy says EUR 220, and the Document Precedence policy says *"If a policy and an FAQ disagree, the policy wins."* At first **every check in code passed**, and the case counted toward a 100% grounded rate: the doc is real, the quote is verbatim, it's allowed, and an FAQ isn't "superseded". The judge caught it (J2 = 1, *"the expected answer says the policy overrides the FAQ to EUR 220"*). Since the corpus states its own precedence rule, this is checkable in code, so it became G8 ([D46](docs/decisions.md)): known conflicts are listed with the exact sentence on each side, and the rule picks the winner. Regrading the same recorded run, G8 fails c023 and nothing else, and the grounded rate drops from 100% to 95.5%, which the gate accepts (under 5 points).

**4. It quoted the right sentence for the wrong conclusion (c017).** Asked whether a conference ticket can come out of the learning budget, the agent quoted *"Travel to a conference is paid from the travel budget, not the learning budget."* and implied the answer was no. The same policy says the budget covers *"courses, certifications, books and conference tickets"*. The quote is real, so all eight checks pass; only the judge caught it (J2 = 2).

### What checking the judge found

With the first rubric (`judge-v1`), the judge agreed with the blind human labels on 39 of 40 calls (97.5%), above the 80% bar. **The one disagreement was a rubric gap, not noise (c015).** The question asked two things and the agent answered one. The judge's own rationale said *"partially correct"*, yet it scored 3 (a pass), because the rubric's level 3 allowed a missing "secondary detail". For a two-part question, a missing part isn't secondary.

The fix was one sentence in the [rubric](docs/judge-rubric.md): each thing a multi-part question asks for is a main fact, and leaving one out scores at most 2 ([D45](docs/decisions.md)). Re-judged with `judge-v2`, c015 drops to 2 and agreement is **40 of 40 (100%)**. No other case changed between pass and fail, but three moved by one point within their band (c016, c017, c018): at temperature 0 a single rubric sentence still nudges borderline scores, so read the judge as pass/fail, not as a fine-grained score.

One caveat: **J1's 100% agreement is weak evidence.** None of the 20 labelled answers was unfaithful (the agent invented no quotes), so this sample can't show whether the judge would catch an unfaithful one. That's what the [judge probes](cases/judge-probes.jsonl) are for: 9 answers with a planted mistake (a changed number, an invented claim, an answer that contradicts its own quote, a right answer with an irrelevant quote) and 3 untouched controls, all with real quotes so only the judge can catch them. `npm run judge:probes` reports how many it catches. *Not run yet: the free judge quota ran out for the day.*

### How noisy is it?

The 95% intervals in the results table are wide: 30 cases is a small sample, and on 22 answerable cases **one case is worth 4.5 points** of grounded rate. The gate allows a 5-point drop, so on averages alone it tolerates one case getting worse.

To see what "same code, different run" looks like, the unchanged agent was run again ([`2026-10-01T07-07`](results/2026-10-01T07-07.md)). Even at temperature 0 with a fixed seed, **7 of 30 answers came back worded differently**: GPU floating-point order isn't fixed. But **no check verdict flipped** and every rate was identical; only latency moved (p95 15.0 s → 13.2 s, about 12%, close to the 15% budget). So, on this setup, wording is noise and verdicts are signal. That's why the gate now also fails when any single check goes from pass to fail on any case ([D53](docs/decisions.md)).

### A change the gate rejected

To test the whole loop on a real agent change, the prompt gained one generic rule: *"check that your quotes answer the exact question that was asked, not a similar one; if they only answer a related question, refuse"* (`agent-v2`, aimed at c030). The recorded run (`2026-10-01T07-13`, in [pull request #1](https://github.com/OmkarKirpan/groundcheck/pull/1)) shows it **didn't fix c030**, and **c016 regressed**: the agent opened only the superseded SLA and answered 99.5% instead of 99.9% (G4 fails). The grounded rate fell 95.5% → 90.9%, exactly one case, so the averages alone would have let it through. The per-case rule caught it, and CI fails the pull request. The change stays unmerged.

## Run it

Needs Node 22.18+ and, for live runs, [Ollama](https://ollama.com) with `gemma4:e2b` pulled.

```bash
npm ci
npm test               # unit tests: BM25, tools, permission filter, graders, gate, replay
npm run eval:replay    # replay the newest recorded run, no model needed
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

**Status, 2026-10-01:** all 30 expected answers checked, 20 blind labels written, judge validated against them.

## Licence

MIT
