"""PAN12 precision/recall eval harness. Run from ai-service/ with:

    python -m eval.run_eval --quick          # ~20 conversations, sanity check only
    python -m eval.run_eval                  # full sampled run (all positives + N negatives)

Ground truth = conversation id appears in problem2 (i.e. PAN12 flags >=1 line in this specific
conversation as suspicious) — NOT merely "an author flagged in problem1 appears somewhere in this
conversation," which is too coarse (a flagged author's ordinary, unrelated conversations would
count as positive under that definition). See eval/README.md.
Predicted positive = response.stages_reached includes isolation_secrecy or desensitization.
This threshold is fixed here deliberately and must not be tuned against results from this
same script run repeatedly — see eval/README.md for the one-shot eval discipline.
"""

import argparse
import json
import random
from pathlib import Path

from dotenv import load_dotenv
from sklearn.metrics import average_precision_score, roc_auc_score

from app.schemas import Stage
from app.scorer import analyze
from eval.ground_truth import load_problematic_lines
from eval.pan12_parser import Conversation
from eval.sampler import sample_conversations

POSITIVE_STAGES = {Stage.isolation_secrecy, Stage.desensitization}

BASE = Path(__file__).resolve().parent.parent
DEFAULT_XML = BASE / "test" / "pan12-sexual-predator-identification-test-corpus-2012-05-17.xml"
DEFAULT_PROBLEM2 = BASE / "test" / "pan12-sexual-predator-identification-groundtruth-problem2.txt"
DEFAULT_REPORT = BASE / "eval" / "report" / "results.json"


def to_transcript(conv: Conversation) -> list[dict]:
    return [
        {"speaker": m["author"], "message": m["text"], "timestamp": m["time"]}
        for m in sorted(conv["messages"], key=lambda m: m["line"])
    ]


def run(
    xml_path: Path,
    problem2_path: Path,
    negative_sample_size: int,
    report_path: Path,
    max_scan: int | None = None,
    max_per_class: int | None = None,
) -> dict:
    positive_conversation_ids = set(load_problematic_lines(str(problem2_path)).keys())
    positives, negatives = sample_conversations(
        str(xml_path), positive_conversation_ids, negative_sample_size, max_scan=max_scan
    )

    if max_per_class is not None:
        # positives are found in file-scan order (not randomized like the negatives'
        # reservoir sample) — shuffle with a fixed seed before capping so the sample isn't
        # systematically biased toward whichever conversations happen to appear early in
        # the corpus.
        positives = positives.copy()
        random.Random(42).shuffle(positives)
        positives = positives[:max_per_class]
        negatives = negatives[:max_per_class]

    tp = fp = tn = fn = 0
    per_conversation = []
    errors = []

    total = len(positives) + len(negatives)
    done = 0

    for actual, convs in ((True, positives), (False, negatives)):
        for conv in convs:
            transcript = to_transcript(conv)
            if not transcript:
                done += 1
                continue

            try:
                response = analyze(transcript)
            except Exception as e:
                # Most commonly a model safety-filter refusal on graphic predator content,
                # which produces an empty/invalid completion rather than a clean API error.
                # Skip and record rather than crashing the whole run — see eval/README.md.
                # Not counted toward tp/fp/tn/fn — see recall_treating_errors_as_misses below
                # for why silently excluding these from recall would be misleadingly optimistic.
                errors.append({"conversation_id": conv["id"], "actual": actual, "error": str(e)})
                done += 1
                pct = round(100 * done / total, 1) if total else 100.0
                print(f"[{done}/{total} {pct}%] {conv['id']} ERROR", flush=True)
                continue

            predicted = any(s in POSITIVE_STAGES for s in response.stages_reached)

            if predicted and actual:
                tp += 1
            elif predicted and not actual:
                fp += 1
            elif not predicted and actual:
                fn += 1
            else:
                tn += 1

            per_conversation.append(
                {
                    "conversation_id": conv["id"],
                    "actual": actual,
                    "predicted": predicted,
                    "progression_score": response.progression_score,
                    "stages_reached": [s.value for s in response.stages_reached],
                }
            )

            done += 1
            pct = round(100 * done / total, 1) if total else 100.0
            print(
                f"[{done}/{total} {pct}%] {conv['id']} actual={actual} predicted={predicted}",
                flush=True,
            )

    errors_on_positives = sum(1 for e in errors if e["actual"])
    errors_on_negatives = len(errors) - errors_on_positives

    precision = tp / (tp + fp) if (tp + fp) else 0.0

    # "recall" excludes errored positives from the denominator entirely — it only asks
    # "of the positives we actually got a score for, how many did we catch." That's the
    # standard definition, but on its own it's misleading here: a refusal that prevents
    # scoring isn't neutral for a safety tool, a parent doesn't care *why* nothing got
    # flagged. "recall_treating_errors_as_misses" folds errored positives in as misses,
    # which is the number that should actually go on the slide — report both, don't quote
    # only the flattering one.
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    recall_treating_errors_as_misses = (
        tp / (tp + fn + errors_on_positives) if (tp + fn + errors_on_positives) else 0.0
    )

    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0
    f1_treating_errors_as_misses = (
        2 * precision * recall_treating_errors_as_misses / (precision + recall_treating_errors_as_misses)
        if (precision + recall_treating_errors_as_misses)
        else 0.0
    )

    # Threshold-independent metrics computed from the continuous progression_score, over
    # only the successfully-scored conversations (same caveat as recall_excluding_errors —
    # errored conversations have no progression_score to include). PR-AUC is the primary one
    # to quote: more appropriate than ROC-AUC under class imbalance, which this dataset has
    # (positives are rare relative to negatives). Needs both classes present to be computable.
    y_true = [1 if p["actual"] else 0 for p in per_conversation]
    y_score = [p["progression_score"] for p in per_conversation]
    pr_auc = None
    roc_auc = None
    if len(set(y_true)) == 2:
        pr_auc = round(average_precision_score(y_true, y_score), 3)
        roc_auc = round(roc_auc_score(y_true, y_score), 3)

    report = {
        "counts": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "precision": round(precision, 3),
        "recall_excluding_errors": round(recall, 3),
        "recall_treating_errors_as_misses": round(recall_treating_errors_as_misses, 3),
        "f1_excluding_errors": round(f1, 3),
        "f1_treating_errors_as_misses": round(f1_treating_errors_as_misses, 3),
        "pr_auc": pr_auc,
        "roc_auc": roc_auc,
        "n_positives_sampled": len(positives),
        "n_negatives_sampled": len(negatives),
        "n_errors": len(errors),
        "errors_on_positives": errors_on_positives,
        "errors_on_negatives": errors_on_negatives,
        "errors": errors,
        "per_conversation": per_conversation,
    }

    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {k: v for k, v in report.items() if k not in ("per_conversation", "errors")},
            indent=2,
        )
    )
    if errors:
        print(f"\n{len(errors)} conversation(s) failed (see report's 'errors' field), e.g.:")
        print(f"  {errors[0]['conversation_id']}: {errors[0]['error'][:200]}")
    return report


if __name__ == "__main__":
    load_dotenv()

    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--quick",
        action="store_true",
        help="sanity-check run: scans only a small slice of the corpus and caps sample size",
    )
    parser.add_argument("--negative-sample-size", type=int, default=300)
    args = parser.parse_args()

    if args.quick:
        run(
            DEFAULT_XML,
            DEFAULT_PROBLEM2,
            negative_sample_size=10,
            report_path=BASE / "eval" / "report" / "results_quick.json",
            max_scan=2000,
            max_per_class=10,
        )
    else:
        run(
            DEFAULT_XML,
            DEFAULT_PROBLEM2,
            negative_sample_size=args.negative_sample_size,
            report_path=DEFAULT_REPORT,
        )
