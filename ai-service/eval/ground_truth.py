def load_predator_ids(problem1_path: str) -> set[str]:
    with open(problem1_path, encoding="utf-8") as f:
        return {line.strip() for line in f if line.strip()}


def load_problematic_lines(problem2_path: str) -> dict[str, set[int]]:
    """conversation_id -> set of line numbers flagged as grooming evidence (tab-separated)."""
    result: dict[str, set[int]] = {}
    with open(problem2_path, encoding="utf-8") as f:
        for raw_line in f:
            raw_line = raw_line.strip()
            if not raw_line:
                continue
            conv_id, line_id = raw_line.split("\t")
            result.setdefault(conv_id, set()).add(int(line_id))
    return result
