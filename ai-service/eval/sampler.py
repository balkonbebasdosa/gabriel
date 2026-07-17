import random

from .pan12_parser import Conversation, iter_conversations


def sample_conversations(
    xml_path: str,
    positive_conversation_ids: set[str],
    negative_sample_size: int,
    seed: int = 42,
    max_scan: int | None = None,
    max_messages: int | None = 50,
) -> tuple[list[Conversation], list[Conversation]]:
    """Single streaming pass over the corpus: every conversation whose id is in
    `positive_conversation_ids` (conversations problem2 actually flags as containing
    suspicious lines) becomes a positive; everything else is reservoir-sampled down to
    `negative_sample_size` so we never send all ~155k conversations to the API.

    Ground truth is conversation-level (problem2), not author-level (problem1) — an
    author flagged in problem1 can have plenty of ordinary conversations elsewhere in
    the corpus, so author-overlap alone is too coarse a positive signal. See eval/README.md.

    `max_messages` excludes conversations longer than this from BOTH classes (default 50).
    Our single-call design (one LLM call scores the whole conversation at once, for holistic
    context) is bounded by Groq's per-minute token budget — a 107-message real conversation
    was observed to blow past it and get its completion truncated, indistinguishable from a
    refusal until inspected. Chunking long conversations across multiple calls is future work,
    not something to improvise under deadline pressure; excluding them here is an honest,
    documented scope limit — see eval/README.md.

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

        if max_messages is not None and len(conv["messages"]) > max_messages:
            continue

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
