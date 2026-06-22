#!/usr/bin/env python3
"""Create a compact Eidosloom workflow round and optional zip package."""

from __future__ import annotations

import argparse
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_PHASES = {"plan", "implementation", "review", "paper", "paper-review"}


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "project"


def write_if_missing(path: Path, content: str, force: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not force:
        return
    path.write_text(content, encoding="utf-8")


def zip_dir(source_dir: Path, zip_path: Path) -> None:
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source_dir.rglob("*")):
            if path.is_file() and path != zip_path:
                archive.write(path, path.relative_to(source_dir.parent))


def build_manifest(project: str, round_number: int, phase: str) -> dict[str, object]:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return {
        "schema": "eidosloom.v1",
        "project": project,
        "round": round_number,
        "phase": phase,
        "created_at": now,
        "gate_decision": "not-reviewed",
        "review_level": "standard",
        "files": [
            "idea.md",
            "plan.md",
            "../roadmap.md",
            "../decision-log.md",
            "chatgpt-consult-packet.md",
            "chatgpt-response.md",
            "codex-implementation-report.md",
            "chatgpt-review-packet.md",
            "revised-plan.md",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", default=".", help="Target workspace root.")
    parser.add_argument("--project", default=None, help="Project name or slug.")
    parser.add_argument("--round", type=int, default=0, help="Round number.")
    parser.add_argument(
        "--phase",
        default="plan",
        choices=sorted(DEFAULT_PHASES),
        help="Current workflow phase.",
    )
    parser.add_argument("--no-zip", action="store_true", help="Skip zip package creation.")
    parser.add_argument("--force", action="store_true", help="Overwrite existing skeleton files.")
    args = parser.parse_args()

    workspace = Path(args.workspace).resolve()
    project = slugify(args.project or workspace.name)
    root = workspace / "work" / "eidosloom" / project
    round_dir = root / f"round-{args.round:02d}"
    paper_dir = root / "paper"

    manifest = build_manifest(project, args.round, args.phase)

    write_if_missing(
        round_dir / "manifest.json",
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        args.force,
    )
    write_if_missing(
        round_dir / "idea.md",
        "# Idea\n\n## Raw Idea\n\n\n## Context\n\n\n## Constraints\n\n\n",
        args.force,
    )
    write_if_missing(
        round_dir / "plan.md",
        "# Plan\n\n## Objective\n\n\n## Non-Goals\n\n\n## Assumptions\n\n\n## Steps\n\n1. \n\n## Acceptance Checks\n\n- \n\n",
        args.force,
    )
    write_if_missing(
        root / "roadmap.md",
        "# Roadmap\n\n## Current Gate\n\n- Decision: not-reviewed\n\n## Rounds\n\n- Round 00: initial plan and first implementation slice.\n\n",
        args.force,
    )
    write_if_missing(
        root / "decision-log.md",
        "# Decision Log\n\n| Date | Phase | Decision | Rationale |\n| --- | --- | --- | --- |\n\n",
        args.force,
    )
    write_if_missing(
        round_dir / "chatgpt-consult-packet.md",
        "# ChatGPT Consult Packet\n\n## Goal\n\n\n## Packet\n\n\n",
        args.force,
    )
    write_if_missing(
        round_dir / "chatgpt-response.md",
        "# ChatGPT Response\n\n## Capture Notes\n\n- Model label visible: unknown\n- Captured at: \n\n## Response\n\n\n",
        args.force,
    )
    write_if_missing(
        round_dir / "codex-implementation-report.md",
        "# Codex Implementation Report\n\n## Summary\n\n\n## Changed Files\n\n- \n\n## Verification\n\n- \n\n## Open Issues\n\n- \n\n",
        args.force,
    )
    write_if_missing(
        round_dir / "chatgpt-review-packet.md",
        "# ChatGPT Review Packet\n\n## Review Settings\n\n- Target: implementation\n- Level: standard\n\n## Review Question\n\nGate decision requested: approved, changes-requested, blocked, or needs-user-decision.\n\n## Evidence\n\n\n",
        args.force,
    )
    write_if_missing(
        round_dir / "revised-plan.md",
        "# Revised Plan\n\n## Gate Decision\n\n\n## Next Steps\n\n1. \n\n",
        args.force,
    )
    write_if_missing(
        paper_dir / "draft.md",
        "# Paper Draft\n\n## Title\n\n\n## Abstract\n\n\n",
        args.force,
    )
    write_if_missing(
        paper_dir / "review-packet.md",
        "# Paper Review Packet\n\n## Review Settings\n\n- Target: paper\n- Level: deep\n\n## Review Goal\n\n\n## Draft Scope\n\n\n",
        args.force,
    )
    write_if_missing(
        paper_dir / "review-notes.md",
        "# Paper Review Notes\n\n## Gate Decision\n\n\n## Required Fixes\n\n- \n\n",
        args.force,
    )

    zip_path = round_dir.with_suffix(".zip")
    if not args.no_zip:
        zip_dir(round_dir, zip_path)

    print(f"Created Eidosloom artifacts at {root}")
    print(f"Current round: {round_dir}")
    if not args.no_zip:
        print(f"Zip package: {zip_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
