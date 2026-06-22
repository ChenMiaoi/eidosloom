#!/usr/bin/env python3
"""Create a compact Eidosloom workflow round and optional zip package."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_PHASES = {"plan", "implementation", "review", "paper", "paper-review"}
MANIFEST_SCHEMA = "eidosloom.v1"
SCAFFOLD_OWNER = "eidosloom"
SCAFFOLD_GENERATOR = "eidosloom-scaffold"


@dataclass(frozen=True)
class Artifact:
    path: Path
    content: str


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return slug or "project"


def sha256_text(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def fail(message: str) -> None:
    raise SystemExit(message)


def safe_relative_path(root: Path, relpath: str) -> Path:
    if relpath.startswith("/") or relpath.startswith("\\"):
        fail(f"Managed path must be relative: {relpath}")
    path = (root / relpath).resolve()
    try:
        path.relative_to(root.resolve())
    except ValueError:
        fail(f"Managed path escapes workspace root: {relpath}")
    return path


def relative_to_root(root: Path, path: Path) -> str:
    return path.relative_to(root).as_posix()


def write_artifact(artifact: Artifact, overwrite: bool) -> str:
    artifact.path.parent.mkdir(parents=True, exist_ok=True)
    if artifact.path.exists() and not overwrite:
        return "preserved"
    artifact.path.write_text(artifact.content, encoding="utf-8")
    return "updated" if overwrite else "created"


def load_json(path: Path) -> dict[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(f"Existing manifest is not valid JSON: {path}: {error}")
    if not isinstance(value, dict):
        fail(f"Existing manifest must be a JSON object: {path}")
    return value


def assert_owned_manifest(manifest: dict[str, object], project: str, round_number: int, scope: str, manifest_path: Path) -> None:
    owner = manifest.get("owner")
    managed_files = manifest.get("managed_files")
    if manifest.get("schema") != MANIFEST_SCHEMA:
        fail(f"Existing manifest has unsupported schema: {manifest_path}")
    if manifest.get("project") != project or manifest.get("round") != round_number:
        fail(f"Existing manifest does not match requested project/round: {manifest_path}")
    if manifest.get("scope") != scope:
        fail(f"Existing manifest scope mismatch: {manifest_path}")
    if not isinstance(owner, dict) or owner.get("skill") != SCAFFOLD_OWNER or owner.get("generator") != SCAFFOLD_GENERATOR:
        fail(f"Existing manifest is not owned by {SCAFFOLD_GENERATOR}: {manifest_path}")
    if not isinstance(managed_files, list):
        fail(f"Existing manifest is missing managed file ownership metadata: {manifest_path}")


def managed_hashes(manifest: dict[str, object]) -> dict[str, str]:
    result: dict[str, str] = {}
    for item in manifest.get("managed_files", []):
        if not isinstance(item, dict):
            fail("Managed file metadata entries must be JSON objects.")
        relpath = item.get("path")
        digest = item.get("sha256")
        if not isinstance(relpath, str) or not isinstance(digest, str):
            fail("Managed file metadata entries require path and sha256.")
        result[relpath] = digest
    return result


def assert_managed_files_clean(root: Path, manifest: dict[str, object]) -> None:
    for relpath, expected_hash in managed_hashes(manifest).items():
        path = safe_relative_path(root, relpath)
        if not path.exists():
            continue
        actual_hash = hashlib.sha256(path.read_bytes()).hexdigest()
        if actual_hash != expected_hash:
            fail(f"Refusing to overwrite modified generated artifact: {relpath}")


def zip_dir(source_dir: Path, zip_path: Path) -> None:
    if zip_path.exists():
        zip_path.unlink()
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(source_dir.rglob("*")):
            if path.is_file() and path != zip_path:
                archive.write(path, path.relative_to(source_dir.parent))


def build_artifacts(root: Path, round_dir: Path, paper_dir: Path, scope: str) -> list[Artifact]:
    artifacts = [
        Artifact(
            round_dir / "idea.md",
            "# Idea\n\n## Raw Idea\n\n\n## Context\n\n\n## Constraints\n\n\n",
        ),
        Artifact(
            round_dir / "plan.md",
            "# Plan\n\n## Objective\n\n\n## Non-Goals\n\n\n## Assumptions\n\n\n## Steps\n\n1. \n\n## Acceptance Checks\n\n- \n\n",
        ),
        Artifact(
            root / "roadmap.md",
            "# Roadmap\n\n## Current Gate\n\n- Decision: not-reviewed\n\n## Rounds\n\n- Round 00: initial plan and first implementation slice.\n\n",
        ),
        Artifact(
            root / "decision-log.md",
            "# Decision Log\n\n| Date | Phase | Decision | Rationale |\n| --- | --- | --- | --- |\n\n",
        ),
        Artifact(
            round_dir / "chatgpt-consult-packet.md",
            "# ChatGPT Consult Packet\n\n## Goal\n\n\n## Packet\n\n\n",
        ),
        Artifact(
            round_dir / "chatgpt-response.md",
            "# ChatGPT Response\n\n## Capture Notes\n\n- Model label visible: unknown\n- Captured at: \n\n## Response\n\n\n",
        ),
    ]
    if scope == "full":
        artifacts.extend(
            [
                Artifact(
                    round_dir / "codex-implementation-report.md",
                    "# Codex Implementation Report\n\n## Summary\n\n\n## Changed Files\n\n- \n\n## Verification\n\n- \n\n## Open Issues\n\n- \n\n",
                ),
                Artifact(
                    round_dir / "chatgpt-review-packet.md",
                    "# ChatGPT Review Packet\n\n## Review Settings\n\n- Target: implementation\n- Review depth: standard\n- Review mode: balanced\n- UI mode: auto\n\n## Review Question\n\nGate decision requested: approved, changes-requested, blocked, or needs-user-decision.\n\n## Evidence\n\n\n",
                ),
                Artifact(
                    round_dir / "revised-plan.md",
                    "# Revised Plan\n\n## Gate Decision\n\n\n## Next Steps\n\n1. \n\n",
                ),
                Artifact(
                    paper_dir / "draft.md",
                    "# Paper Draft\n\n## Title\n\n\n## Abstract\n\n\n",
                ),
                Artifact(
                    paper_dir / "review-packet.md",
                    "# Paper Review Packet\n\n## Review Settings\n\n- Target: paper\n- Review depth: deep\n- Review mode: committee\n- UI mode: auto\n\n## Review Goal\n\n\n## Draft Scope\n\n\n",
                ),
                Artifact(
                    paper_dir / "review-notes.md",
                    "# Paper Review Notes\n\n## Gate Decision\n\n\n## Required Fixes\n\n- \n\n",
                ),
            ]
        )
    return artifacts


def build_manifest(project: str, round_number: int, phase: str, scope: str, root: Path, artifacts: list[Artifact]) -> dict[str, object]:
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    files = [
        "idea.md",
        "plan.md",
        "../roadmap.md",
        "../decision-log.md",
        "chatgpt-consult-packet.md",
        "chatgpt-response.md",
    ]
    if scope == "full":
        files.extend(
            [
                "codex-implementation-report.md",
                "chatgpt-review-packet.md",
                "revised-plan.md",
            ]
        )
    return {
        "schema": MANIFEST_SCHEMA,
        "project": project,
        "round": round_number,
        "phase": phase,
        "scope": scope,
        "owner": {
            "skill": SCAFFOLD_OWNER,
            "generator": SCAFFOLD_GENERATOR,
        },
        "created_at": now,
        "gate_decision": "not-reviewed",
        "review_depth": "standard",
        "review_mode": "balanced",
        "ui_mode": "auto",
        "files": files,
        "managed_files": [
            {
                "path": relative_to_root(root, artifact.path),
                "sha256": sha256_text(artifact.content),
            }
            for artifact in artifacts
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", default=".", help="Target workspace root.")
    parser.add_argument("--project", default=None, help="Project name or slug.")
    parser.add_argument("--round", type=int, default=0, help="Round number.")
    parser.add_argument(
        "--scope",
        default="full",
        choices=["full", "plan"],
        help="Artifact scope. Use plan for planning-only packages.",
    )
    parser.add_argument(
        "--phase",
        default="plan",
        choices=sorted(DEFAULT_PHASES),
        help="Current workflow phase.",
    )
    parser.add_argument(
        "--mode",
        default="create",
        choices=["create", "resume"],
        help="Lifecycle mode. create refuses existing owned rounds; resume fills missing files in an owned round.",
    )
    parser.add_argument("--no-zip", action="store_true", help="Skip zip package creation.")
    parser.add_argument("--force", action="store_true", help="Refresh only unmodified generated artifacts from an owned round.")
    args = parser.parse_args()

    workspace = Path(args.workspace).resolve()
    project = slugify(args.project or workspace.name)
    root = workspace / "work" / "eidosloom" / project
    round_dir = root / f"round-{args.round:02d}"
    paper_dir = root / "paper"
    manifest_path = round_dir / "manifest.json"

    artifacts = build_artifacts(root, round_dir, paper_dir, args.scope)
    manifest = build_manifest(project, args.round, args.phase, args.scope, root, artifacts)
    existing_manifest = load_json(manifest_path) if manifest_path.exists() else None
    overwrite_generated = args.force

    if args.mode == "resume":
        if existing_manifest is None:
            fail(f"Cannot resume without an owned Eidosloom manifest: {manifest_path}")
        assert_owned_manifest(existing_manifest, project, args.round, args.scope, manifest_path)
    elif existing_manifest is not None:
        if not args.force:
            fail(f"Refusing to create over existing Eidosloom round: {round_dir}. Use --mode resume or --force.")
        assert_owned_manifest(existing_manifest, project, args.round, args.scope, manifest_path)

    if existing_manifest is None:
        unowned_files = [path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file()] if root.exists() else []
        if unowned_files:
            fail(f"Refusing to create in a non-empty unowned Eidosloom workspace. Existing files: {', '.join(sorted(unowned_files))}")

    if args.force and existing_manifest is not None:
        assert_managed_files_clean(root, existing_manifest)

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    if existing_manifest is None or args.force:
        manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    actions: list[str] = []
    for artifact in artifacts:
        actions.append(f"{relative_to_root(root, artifact.path)}:{write_artifact(artifact, overwrite_generated)}")

    zip_path = round_dir.with_suffix(".zip")
    if not args.no_zip:
        zip_dir(round_dir, zip_path)

    print(f"Created Eidosloom artifacts at {root}")
    print(f"Lifecycle mode: {'force' if args.force else args.mode}")
    print(f"Current round: {round_dir}")
    print(f"Artifact actions: {', '.join(actions)}")
    if not args.no_zip:
        print(f"Zip package: {zip_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
