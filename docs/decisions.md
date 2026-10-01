# Decisions

Settled on 2026-09-30 in a `/batch-grill-me` session: 3 rounds, and every recommendation was accepted unless noted. The spec is in [SPEC.md](../SPEC.md).

| # | Decision | Why |
|---|---|---|
| D1 | **A new project**, with no code or content from any other project | Onkar's choice. No IP questions, and fully his to show |
| D2 | **The agent is a permission-aware document search agent that cites its sources** (option b) | Onkar's choice. It's the closest match to the target domain: enterprise search, agents, answers that respect permissions |
| D3 | **6–8 h, built with Claude Opus 5.5**; the plan uses 6.5 h (Tue 6 – Mon 12) | Onkar's budget |
| D4 | **TypeScript on Node, with Vitest.** Python/uv was the alternative | Keeps practical-round fluency and matches the strongest stack |
| D5 | **Small models only: the agent runs `gemma4:e2b` locally on Ollama** | Onkar wanted small or free models. Local means no rate limits and it fits the GTX 1650 (4 GB). It's also a good story: *"where a 2B model fails at citing sources"* |
| D6 | **Judge: `nvidia/nemotron-3-super-120b-a12b:free` on OpenRouter, with `google/gemma-4-31b-it:free` as fallback** | A different model family from the agent avoids the judge favouring its own kind of answer. About 30 calls per run fits the free limit of 50/day |
| D7 | **No paid OpenRouter credit** | Designed around 50 requests/day: one live judge run a day, replay the rest of the time |
| D8 | **Documents: a fictional company, about 30 synthetic docs, with deliberate traps** (old vs current versions, a contradicting pair, restricted docs, unanswerable questions) | Each trap targets a real way enterprise search goes wrong |
| D9 | **Hand-written BM25, filtered by role before ranking**; embeddings are a stretch goal | Predictable, no extra model, and a talking point ("keyword search first, on purpose") |
| D10 | **Agent loop: at most 5 steps, using `search_docs`, `open_doc` and `final_answer`** (citations with quotes, or a refusal); JSON-mode fallback | Gives a trace that can be graded; the fallback is itself a finding |
| D11 | **Name: `groundcheck`** | Short, and it says what it does |
| D12 | **Public GitHub repo under OmkarKirpan, MIT licence, `.env` gitignored from the first commit** | Showable. Secrets hygiene from day one, a lesson from an earlier project. **The repo is created only after Onkar confirms** |
| D13 | **Eval features: grading from the trace, a budget gate, and a check of the judge against human labels** (running each case many times is a stretch goal) | Covers correctness, cost and trust in the judge, which is where senior reviewers push |
| D14 | **Record and replay: live runs on your machine; CI replays recorded fixtures (free, same result every time)** | Ollama on CPU-only runners is too slow, and free-tier limits apply |
| D15 | **Deliverables:** a README with a results table and "What the evals found", an `/archify` diagram, and a 3-minute talk track. No blog post | LinkedIn posting is out of scope for the sprint |
| D16 | **Its own repo** | Kept separate from other projects |
| D17 | **Pairing: Onkar writes the graders and reviews every file, test-first. Claude scaffolds the boilerplate** | He must be able to defend every line, and is honest about using AI assistance. *Revised by D27* |
| D18 | **Checks in code: G1–G7** (citation exists, quote word for word, permissions respected, current version, correct refusal, step budget, no loop) | Anything that can be checked in code is checked in code, not by a model |
| D19 | **The judge scores faithfulness and correctness, 1–4, against a written rubric**, at temperature 0 with a versioned prompt | Two dimensions stay understandable, and versioning makes runs comparable |
| D20 | **30 cases** (12 single, 6 multi, 4 stale/conflict, 4 permission, 4 unanswerable) across 3 roles. Claude drafts them; **Onkar checks every expected answer** | The expected answers have to be right for the evals to mean anything |
| D21 | **Checking the judge: 20 blind human labels; agreement must be at least 80%, or fix the rubric** | *"I evaluate the evaluator."* |
| D22 | **Gates: hard gates for 0 permission leaks and 0 invented quotes; quality may drop no more than 5 points; budget may rise no more than 15%** | "Never" rules become hard gates, the rest are compared with a baseline |
| D23 | **Reports: `results/<date>.json` plus a markdown summary; the README shows the latest run** | Makes progress and regressions visible |
| D24 | **Build order: one case end to end first, test-first, in 5 sessions, with a cut line.** The hard deadline is Mon 12 evening | Protects the deadline |
| D25 | **Presentation material lives outside this repo; the CV entry is added only once it runs** | Never claim something that doesn't exist yet |
| D26 | **Each build session starts from `SPEC.md` and this file** | Nothing is lost between sessions |
| D27 | **D17 revised (2026-10-01): Claude writes all the code, graders included, test-first.** Onkar reads the graders and the agent loop closely before presenting it. D20 (Onkar checks every expected answer) and D21 (Onkar writes the 20 blind labels) stay as they were | Onkar's call, to save time. The human checks that make the numbers trustworthy stay human |
| D28 | **The build starts 2026-10-01**, ahead of the Tue 6 plan | Onkar's call |
| D29 | **Commits use `okirpan@gmail.com`** (repo-local git config) | The global git email is a work address, now disabled |
| D30 | **Company name: Halvicor Systems** (product: Halvicor Relay) | No web results for "Halvicor" on 2026-10-01 |
| D31 | **TypeScript runs on Node's built-in type stripping** (Node ≥ 22.18), no tsx or build step. TS 7, Vitest 5 | One fewer dependency. Needs `.ts` import paths and erasable-only syntax |
| D32 | **`.gitattributes` forces LF** | Quotes are checked word for word and replay fixtures are keyed by a hash of the messages, so CRLF on Windows vs LF in CI would break both |
| D33 | **BM25 statistics (IDF, average length) come only from the chunks the role can see** | Otherwise restricted docs would shift scores, a small side channel. Unit-tested |
| D34 | **Native tool calling, no JSON-mode fallback.** `gemma4:e2b` on Ollama 0.35 calls tools reliably at temperature 0 with `think: false` | Checked live on 2026-10-01; the fallback isn't needed |
| D35 | **A step is one tool call** (or one text-only reply, which gets a nudge). The loop stops after 5; G6 fails when it stopped without a final answer | Makes G6 meaningful even though the loop enforces the cap |
| D36 | **`final_answer` with an answer needs at least one citation**; otherwise the error goes back to the model | Without it, an uncited answer would pass G1–G4 by having nothing to check |
| D37 | **Grounded rate is over answerable cases only; citation precision is over unique docs cited per case; p95 latency is per case, nearest rank** | Written down so the numbers can be explained |
| D38 | **G3 also fails when a quote's only source is a restricted doc**, even if an allowed doc is cited | Catches a leak hidden behind a wrong citation |
| D39 | **Fixtures are keyed by a hash of the whole request** (model, messages, tools, options), not only (model, messages, tools) | Stricter: a temperature or context change also forces a re-record |
| D40 | **The judge prompt is `docs/judge-rubric.md` loaded verbatim** | Rubric and prompt can't drift apart; editing the rubric forces a re-record |
| D41 | **The judge scores only cases that ended in an answer or a refusal**; a run that hit the step limit has nothing to judge (G5/G6 already fail it) | Keeps the judge's numbers about the judge |
| D42 | **Human labels carry the `runId` they were written for**, and agreement only uses labels for that run | Labels for an old run's outputs must not be compared with a new run's judge scores. The 20 are picked round-robin across the 5 categories (4 each), so the hard cases aren't crowded out by easy single-doc ones |
| D43 | **Plural-only stemming in BM25**, added after run `2026-10-01T05-53` showed misses on "password"/"Passwords" and "meal"/"meals" (c014, c021) | The smallest fix for the failure the evals found. A full stemmer isn't needed for 30 docs |
| D44 | **Live judge calls are cache-first**: a request already in `fixtures/<runId>/` is served from there, only new ones go to OpenRouter | Spec §7 ("judge responses are cached in the fixtures"). With 50 free calls a day, fixing one expected answer re-judges one case, not 30 |
| D45 | **Rubric judge-v2: each part of a multi-part question is a main fact**; leaving one out scores at most 2 | Judge check on run 2026-10-01T06-00: the only disagreement with the human labels (c015) was a two-part question answered by half, scored 3 under judge-v1 as a missing "secondary detail" |
| D46 | **G8 precedence respected: known conflicts are listed in `cases/conflicts.jsonl` with the exact sentence on each side; the corpus's own rule (current over superseded, policy over FAQ, later policy over earlier) picks the winner.** G8 fails when the losing sentence is cited without the winning one. Grounded rate now requires G8 too | c023 (FAQ's EUR 180 over the policy's EUR 220) passed every code check and only the judge caught it. The rule is written in the corpus, so it belongs in code. Sentence-level, so other quotes from the same FAQ aren't flagged |
| D47 | **CI replays the newest recorded run and gates it against the baseline from before the change** (base branch for a PR, previous commit for a push). Replay also fails if the committed results differ from what the code produces from the recordings; `eval:replay --write` regrades on purpose | Before, CI replayed the baseline and compared it with itself, so the gate could never fail on an agent change. Now an agent change must ship a new recording, and it is gated against the old baseline it can't edit |

## Facts checked on 2026-09-30 (check again at build time)
- Ollama 0.18.2 is installed; the server wasn't running and no models were pulled. `gemma4:e2b` is in the Ollama library.
- GPU: NVIDIA GeForce GTX 1650, 4 GB. RAM: 15.8 GB. uv 0.9.0 is installed.
- OpenRouter free models: 20 requests/min, and 50 requests/day with less than $10 of credit (1,000/day at $10 or more).
- Free models on OpenRouter that support tool calls include `google/gemma-4-31b-it`, `google/gemma-4-26b-a4b-it`, `nvidia/nemotron-3-super-120b-a12b`, `qwen/qwen3.8-27b` and `liquid/lfm-2.5-2.6b`.

## Facts checked on 2026-10-01
- Ollama is now **0.35.0** (not 0.18.2). `ollama --version` printed `CHECK failed: mlx_compile_cache_new_`; the server wasn't running and `ollama list` hung. Fix before the agent step.
- Node 22.18.0, npm 11.6.2, git 2.53, gh 2.92. GPU still a GTX 1650, 4 GB.
- Latest GitHub Actions: `actions/checkout@v7`, `actions/setup-node@v7`.
