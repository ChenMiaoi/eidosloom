#!/usr/bin/env python3
"""Build an Eidosloom review packet with a selected review level."""

from __future__ import annotations

import argparse
import re
from datetime import datetime, timezone
from pathlib import Path


LEVEL_ALIASES = {
    "quick": "quick",
    "fast": "quick",
    "low": "quick",
    "scan": "quick",
    "smoke": "quick",
    "快速": "quick",
    "standard": "standard",
    "normal": "standard",
    "medium": "standard",
    "balanced": "standard",
    "default": "standard",
    "普通": "standard",
    "标准": "standard",
    "deep": "deep",
    "high": "deep",
    "rigorous": "deep",
    "thorough": "deep",
    "深度": "deep",
    "深入": "deep",
    "adversarial": "adversarial",
    "strict": "adversarial",
    "critic": "adversarial",
    "red-team": "adversarial",
    "reviewer-2": "adversarial",
    "挑剔": "adversarial",
    "严格": "adversarial",
    "committee": "committee",
    "max": "committee",
    "maximum": "committee",
    "exhaustive": "committee",
    "panel": "committee",
    "最大": "committee",
    "多视角": "committee",
}

LEVEL_INSTRUCTIONS = {
    "quick": "Fast triage. Focus on blockers, obvious missing evidence, and the next single action. Avoid broad rewrites.",
    "standard": "Balanced review. Check correctness, scope, tests, required fixes, optional improvements, and next actions.",
    "deep": "Rigorous review. Audit evidence, edge cases, assumptions, failure modes, and test gaps. Tie concerns to artifacts or missing evidence.",
    "adversarial": "Skeptical review. Make the strongest case against approval, separating fatal blockers, serious concerns, and speculative objections.",
    "committee": "Multi-perspective review. Provide short reviews from relevant perspectives, dissenting concerns, a consensus gate, and one unified next-step plan.",
}

TARGETS = {"plan", "implementation", "roadmap", "paper", "prompt-skill", "architecture"}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "project"


def normalize_level(value: str) -> str:
    key = value.strip().lower().replace("_", "-").replace(" ", "-")
    level = LEVEL_ALIASES.get(key)
    if not level:
        allowed = ", ".join(sorted(set(LEVEL_ALIASES.values())))
        raise SystemExit(f"Unknown review level '{value}'. Use one of: {allowed}")
    return level


def default_output(workspace: Path, project: str, round_number: int, target: str) -> Path:
    root = workspace / "work" / "eidosloom" / project
    if target == "paper":
        return root / "paper" / "review-packet.md"
    return root / f"round-{round_number:02d}" / "chatgpt-review-packet.md"


def build_packet(target: str, level: str, title: str) -> str:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    gate = "approved, changes-requested, blocked, or needs-user-decision"
    if target == "paper":
        gate = "acceptable, revise, or blocked"
    elif target in {"prompt-skill", "architecture"}:
        gate = "accept, revise, or reject"

    return f"""# Eidosloom Review Packet

## Metadata

- Title: {title}
- Target: {target}
- Review level: {level}
- Created at: {now}
- Requested gate: {gate}

## Level Instructions

{LEVEL_INSTRUCTIONS[level]}

Do not reveal hidden chain-of-thought. Provide concise rationale, evidence, uncertainty, and actionable findings.

## User Objective


## Constraints And Non-Goals


## Evidence Available


## Artifacts To Review


## Verification Results


## Known Limitations Or Open Questions


## Requested Output

1. Gate decision: {gate}.
2. Main reason for the decision.
3. Required fixes before approval or acceptance.
4. Optional improvements to defer.
5. Missing evidence, tests, citations, or edge cases.
6. Concrete next Codex steps.
7. Roadmap updates if applicable.
"""


def print_levels() -> None:
    for level, instructions in LEVEL_INSTRUCTIONS.items():
        print(f"{level}: {instructions}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", default=".", help="Target workspace root.")
    parser.add_argument("--project", default=None, help="Project name or slug.")
    parser.add_argument("--round", type=int, default=0, help="Round number.")
    parser.add_argument("--target", default="implementation", choices=sorted(TARGETS))
    parser.add_argument("--level", default="standard", help="Review level or alias.")
    parser.add_argument("--title", default="Untitled review", help="Packet title.")
    parser.add_argument("--out", default=None, help="Output Markdown file.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing packet.")
    parser.add_argument("--print-levels", action="store_true", help="Print review levels and exit.")
    args = parser.parse_args()

    if args.print_levels:
        print_levels()
        return 0

    workspace = Path(args.workspace).resolve()
    project = slugify(args.project or workspace.name)
    level = normalize_level(args.level)
    out = Path(args.out).resolve() if args.out else default_output(workspace, project, args.round, args.target)

    if out.exists() and not args.force:
        raise SystemExit(f"Refusing to overwrite existing packet: {out}")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(build_packet(args.target, level, args.title), encoding="utf-8")
    print(f"Wrote review packet: {out}")
    print(f"Target: {args.target}")
    print(f"Level: {level}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
