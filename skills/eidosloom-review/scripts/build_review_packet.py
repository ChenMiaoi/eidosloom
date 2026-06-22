#!/usr/bin/env python3
"""Build an Eidosloom review packet from the shared review policy."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


POLICY_PATH = Path(__file__).resolve().parents[1] / "references" / "review-policy.json"


def load_policy() -> dict[str, Any]:
    return json.loads(POLICY_PATH.read_text(encoding="utf-8"))


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "project"


def canonical_key(value: str) -> str:
    return re.sub(r"\s+", "-", value.strip().lower().replace("_", "-"))


def normalize_from_section(section: dict[str, Any], value: str, label: str) -> str:
    key = canonical_key(value)
    if key in section:
        return key

    for name, item in section.items():
        aliases = {canonical_key(alias) for alias in item.get("aliases", [])}
        if key in aliases:
            return name

    raise SystemExit(f"Unknown {label}: {value}")


def select_review_policy(policy: dict[str, Any], level: str, mode: str, ui_mode: str) -> tuple[str, str, str, list[str]]:
    key = canonical_key(level)
    warnings: list[str] = []
    review_mode = normalize_from_section(policy["modes"], mode, "review mode")
    selected_ui_mode = normalize_from_section(policy["uiModes"], ui_mode, "UI mode")

    forbidden = policy.get("forbiddenLevelAliases", {})
    for alias, message in forbidden.items():
        if canonical_key(alias) == key:
            raise SystemExit(message)

    legacy = policy.get("legacyLevelMappings", {}).get(key)
    if legacy:
        depth = legacy["depth"]
        if canonical_key(mode) == "balanced":
            review_mode = legacy["mode"]
        warnings.append(legacy["message"])
    else:
        depth = normalize_from_section(policy["depths"], level, "review depth")

    return depth, review_mode, selected_ui_mode, warnings


def default_output(workspace: Path, project: str, round_number: int, target: str) -> Path:
    root = workspace / "work" / "eidosloom" / project
    if target == "paper":
        return root / "paper" / "review-packet.md"
    return root / f"round-{round_number:02d}" / "chatgpt-review-packet.md"


def review_gate(target: str) -> str:
    if target == "paper":
        return "acceptable, revise, or blocked"
    if target in {"prompt-skill", "architecture", "custom"}:
        return "accept, revise, reject, or needs-user-decision"
    return "approved, changes-requested, blocked, or needs-user-decision"


def build_packet(
    policy: dict[str, Any],
    target: str,
    depth: str,
    mode: str,
    ui_mode: str,
    title: str,
    caller: str,
    rubric: str,
    warnings: list[str],
) -> str:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    gate = review_gate(target)
    warning_block = ""
    if warnings:
        warning_lines = "\n".join(f"- {warning}" for warning in warnings)
        warning_block = f"\n## Compatibility Notes\n\n{warning_lines}\n"

    return f"""# Eidosloom Review Packet

## Metadata

- Title: {title}
- Caller: {caller}
- Target: {target}
- Review depth: {depth}
- Review mode: {mode}
- Requested UI mode: {ui_mode}
- Observed UI label:
- UI selection status: not-attempted
- UI selection verified: false
- Created at: {now}
- Requested gate: {gate}
- Canonical gate options: accept, revise, reject, needs-user-decision
{warning_block}
## Review Instructions

Depth: {policy["depths"][depth]["instruction"]}

Mode: {policy["modes"][mode]["instruction"]}

UI mode: {policy["uiModes"][ui_mode]["instruction"]}

Do not reveal hidden chain-of-thought. Provide concise rationale, evidence, uncertainty, and actionable findings.

## Caller Rubric

{rubric}

## User Objective


## Constraints And Non-Goals


## Evidence Available


## Artifacts To Review


## Verification Results


## Known Limitations Or Open Questions


## Requested Output

1. Canonical gate decision: accept, revise, reject, or needs-user-decision.
2. Display gate for this target: {gate}.
3. Main reason for the decision.
4. Required fixes before approval or acceptance.
5. Optional improvements to defer.
6. Missing evidence, tests, citations, or edge cases.
7. Concrete next Codex steps.
8. Roadmap or caller-specific updates if applicable.
"""


def print_levels(policy: dict[str, Any]) -> None:
    print("Depths:")
    for name, item in policy["depths"].items():
        print(f"  {name}: {item['instruction']}")

    print("\nReview modes:")
    for name, item in policy["modes"].items():
        print(f"  {name}: {item['instruction']}")

    print("\nUI modes:")
    for name, item in policy["uiModes"].items():
        print(f"  {name}: {item['instruction']}")


def main() -> int:
    policy = load_policy()
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", default=".", help="Target workspace root.")
    parser.add_argument("--project", default=None, help="Project name or slug.")
    parser.add_argument("--round", type=int, default=0, help="Round number.")
    parser.add_argument("--target", default="implementation", choices=sorted(policy["targets"]))
    parser.add_argument("--level", default="standard", help="Review depth or legacy level alias.")
    parser.add_argument("--review-mode", default="balanced", help="Review mode.")
    parser.add_argument("--ui-mode", default="auto", help="ChatGPT web UI mode preference.")
    parser.add_argument("--caller", default="eidosloom", help="Calling skill/workflow name.")
    parser.add_argument("--rubric", default="", help="Caller-provided rubric for custom reviews.")
    parser.add_argument("--title", default="Untitled review", help="Packet title.")
    parser.add_argument("--out", default=None, help="Output Markdown file.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing packet.")
    parser.add_argument("--print-levels", action="store_true", help="Print review policy and exit.")
    args = parser.parse_args()

    if args.print_levels:
        print_levels(policy)
        return 0

    workspace = Path(args.workspace).resolve()
    project = slugify(args.project or workspace.name)
    depth, mode, ui_mode, warnings = select_review_policy(policy, args.level, args.review_mode, args.ui_mode)
    out = Path(args.out).resolve() if args.out else default_output(workspace, project, args.round, args.target)

    if out.exists() and not args.force:
        raise SystemExit(f"Refusing to overwrite existing packet: {out}")

    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        build_packet(policy, args.target, depth, mode, ui_mode, args.title, args.caller, args.rubric, warnings),
        encoding="utf-8",
    )
    print(f"Wrote review packet: {out}")
    print(f"Target: {args.target}")
    print(f"Depth: {depth}")
    print(f"Review mode: {mode}")
    print(f"UI mode: {ui_mode}")
    for warning in warnings:
        print(f"Warning: {warning}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
