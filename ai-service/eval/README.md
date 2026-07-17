# PAN12 validation harness

## Scoping note (read before trusting the numbers)

PAN12's official task is **author-level** (which user, across possibly many conversations, is
a predator). This project scores **conversations**, not users. So:

- **Ground truth** here = "this conversation's id appears in `problem2`" (i.e. PAN12 itself
  flags >=1 line in *this specific conversation* as suspicious). We deliberately do **not** use
  "conversation contains an author id listed in `problem1`" — that's author-level ground truth,
  and a flagged predator's ordinary, unrelated conversations elsewhere in the corpus would count
  as false ground-truth positives under that definition. A qualitative spot-check during
  development confirmed this: several `problem1`-only "positives" turned out to be 1-3 message
  mundane check-ins ("hope to talk to you soon") with zero grooming content, dragging recall down
  for reasons that had nothing to do with the rubric.
- **Predicted positive** = the `/analyze` response's `stages_reached` includes
  `isolation_secrecy` or `desensitization` (i.e. the conversation was scored as having
  progressed past the first two stages).

This threshold is fixed in `run_eval.py` before any real run and is **not** to be tuned by
rerunning against the test corpus and adjusting until the numbers look better — that would
invalidate the precision/recall number as a credibility claim. If the rubric prompt changes,
re-run once and report whatever comes out.

## Why this is a sample, not the full corpus

The test corpus is ~155,000 conversations; only 6,478 lines across the corpus are flagged in
`problem2` (fewer distinct conversations than that). Running
every conversation through the API would burn the token/time budget for no benefit — the
eval only needs a statistically reasonable sample: every positive conversation the corpus has,
plus a random negative sample of comparable order of magnitude (reservoir-sampled in one
streaming pass, see `sampler.py`).

## Running it

From `ai-service/`:

```bash
# quick pipeline sanity check (~20 conversations, not a real result)
python -m eval.run_eval --quick

# full sampled run — do this once, this is the number that goes on the slide
python -m eval.run_eval --negative-sample-size 300
```

Output goes to `eval/report/results.json` (gitignored along with everything under `ai-service/test`
and `ai-service/train` — never commit raw PAN12 data or per-conversation results, only the
aggregate precision/recall/F1 you choose to quote).

## Known limitation: model safety-filter refusals

Some PAN12 conversations contain genuinely graphic predatory content. The underlying model can
refuse to generate a completion for these (an empty/invalid response, HTTP 400 "generated JSON
does not match schema" with an empty `failed_generation`, rather than a clean error), which would
otherwise crash the whole eval run. `run_eval.py` catches this per-conversation, skips it, and
records it under the report's `errors` field rather than counting it as a false negative — a
refusal is a different failure mode than "the model looked and didn't flag it." If `n_errors` is
a large fraction of `n_positives_sampled`, that itself is worth mentioning on the slide as a real
limitation of building this on a guardrailed general-purpose model.

**Don't conflate this with rate-limit errors.** Early testing initially lumped HTTP 429 (rate
limit) and 413 (request too large for the current tokens-per-minute window) in with genuine
refusals — those are transient infrastructure limits, not the model declining content, and
`llm_client.py` now retries them with backoff before giving up. Only a 400 "does not match
schema" with empty `failed_generation` should be read as a likely refusal; check the `errors`
field's actual error strings before quoting a refusal rate anywhere.

## Reporting: don't quote recall_excluding_errors alone

The report includes two recall numbers (and two matching F1 numbers):

- `recall_excluding_errors` — the textbook definition, `tp / (tp + fn)`, computed only over
  positives that actually got scored. Excludes refused conversations from the denominator
  entirely.
- `recall_treating_errors_as_misses` — `tp / (tp + fn + errors_on_positives)`. Folds every
  refused known-positive conversation in as a miss.

Report the second one on the slide. A parent using this tool doesn't care whether a dangerous
conversation went unflagged because the rubric missed it or because the model refused to process
it — both outcomes are "the tool didn't warn me." Quoting only `recall_excluding_errors` would
be a materially rosier number than what the tool actually delivers end-to-end.

## Known limitation: conversation length cap

`sampler.py`'s `max_messages` (default 40, lowered from 50 once the rubric prompt grew — see
below) excludes longer conversations from the eval sample entirely. Our single-call design (one
LLM call scores the whole conversation at once, so the model has full holistic context) is
bounded by Groq's per-minute token budget for `gpt-oss-20b` (8000 tokens, shared across system
prompt + transcript + completion) — a real 107-message PAN12 conversation was observed to exceed
this and get its completion truncated mid-JSON, which looks identical to a refusal until
inspected closely (same failure signature as the earlier missing-`max_completion_tokens` bug,
just re-triggered at a higher message count once `participants` added overhead to the token
formula). When the rubric prompt was later expanded (guilt-tripping, romantic-escalation, and
tone-independence additions — see rubric.py), the larger system prompt itself started eating into
the same shared budget, causing two 47-50 message conversations to fail at the old 50-message cap;
lowering to 40 restored headroom. Chunking long conversations across multiple calls would remove
this limit but is real architectural work, not something to improvise under deadline pressure —
excluding them from the sample is the honest choice: it means this eval's numbers describe
performance on conversations up to ~40 messages, not the full length distribution of the corpus,
and that scope should be stated alongside any number quoted from this harness.

## PR-AUC / ROC-AUC: threshold-independent metrics

`precision`/`recall`/`f1` all depend on the one fixed cutoff in `POSITIVE_STAGES` (reaching
`isolation_secrecy` or `desensitization`). `pr_auc` and `roc_auc` instead use the raw continuous
`progression_score` against ground truth across every possible cutoff, answering "is the
underlying score fundamentally sound," independent of whether that one fixed cutoff is the best
choice. **Quote `pr_auc`, not `roc_auc`, as the headline threshold-independent number** — PR-AUC
is the more appropriate choice under class imbalance (positives are rare in this corpus), while
ROC-AUC can look inflated in exactly that situation. Both are computed only over successfully
scored conversations (same errors caveat as `recall_excluding_errors` above) and will be `null`
if the sample doesn't contain both classes.

## Benign false-positive check

`eval/benign_transcripts/` holds hand-written, clearly ordinary conversations — not derived
from PAN12. This is a separate, required check (section 7 of the handoff): PAN12 alone doesn't
tell you your false-positive rate on everyday conversations. Run each through `/analyze` directly
and confirm `stages_reached` never exceeds `risk_assessment` at any meaningful confidence.
