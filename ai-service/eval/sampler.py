import random

from .pan12_parser import Conversation, iter_conversations


def sample_conversations(
    xml_path: str,
    positive_conversation_ids: set[str],
    negative_sample_size: int,
    seed: int = 42,
    max_scan: int | None = None,
) -> tuple[list[Conversation], list[Conversation]]:
    """Single streaming pass over the corpus: every conversation whose id is in
    `positive_conversation_ids` (conversations problem2 actually flags as containing
    suspicious lines) becomes a positive; everything else is reservoir-sampled down to
    `negative_sample_size` so we never send all ~155k conversations to the API.

    Ground truth is conversation-level (problem2), not author-level (problem1) — an
    author flagged in problem1 can have plenty of ordinary conversations elsewhere in
    the corpus, so author-overlap alone is too coarse a positive signal. See eval/README.md.

    `max_scan` caps how many conversations are read before stopping — only meant for a
    quick smoke test of the pipeline, not the real eval run (it will undercount positives).
    """
    rng = random.Random(seed)
    positives: list[Conversation] = []
    negatives_reservoir: list[Conversation] = []
    seen_negatives = 0

    for scanned, conv in enumerate(iter_conversations(xml_path)):
        if max_scan is not None and scanned >= max_scan:
            break

        if conv["id"] in positive_conversation_ids:
            positives.append(conv)
            continue

        seen_negatives += 1
        if len(negatives_reservoir) < negative_sample_size:
            negatives_reservoir.append(conv)
        else:
            j = rng.randint(0, seen_negatives - 1)
            if j < negative_sample_size:
                negatives_reservoir[j] = conv

    return positives, negatives_reservoir
