#!/usr/bin/env python3
"""Validate Eidosloom review caller request/result contracts."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path
from typing import Any


CONTRACT_VERSION = "eidosloom-review-contract.v1"
TARGETS = {"plan", "implementation", "roadmap", "paper", "prompt-skill", "architecture", "custom"}
DEPTHS = {"quick", "standard", "deep"}
MODES = {"balanced", "adversarial", "committee"}
UI_MODES = {"auto", "prefer-pro", "require-pro"}
RESULT_STATUSES = {"completed", "partial", "failed", "invalid"}
GATES = {"accept", "revise", "reject", "needs-user-decision"}
FINDING_SEVERITIES = {"required", "optional", "question", "blocked"}
CHECK_STATUSES = {"pass", "fail", "unknown"}


class ContractError(Exception):
    pass


def load_json(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        raise ContractError(f"invalid JSON: {error}") from error
    if not isinstance(data, dict):
        raise ContractError("contract document must be a JSON object")
    return data


def require_string(data: dict[str, Any], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ContractError(f"missing or invalid string field: {key}")
    return value


def require_list(data: dict[str, Any], key: str, *, nonempty: bool = False) -> list[Any]:
    value = data.get(key)
    if not isinstance(value, list):
        raise ContractError(f"missing or invalid list field: {key}")
    if nonempty and not value:
        raise ContractError(f"list field must not be empty: {key}")
    return value


def require_enum(data: dict[str, Any], key: str, allowed: set[str]) -> str:
    value = require_string(data, key)
    if value not in allowed:
        raise ContractError(f"invalid {key}: {value}")
    return value


def resolve_artifact_path(workspace: Path | None, raw_path: str) -> Path:
    path = Path(raw_path)
    if path.is_absolute():
        return path
    if workspace is None:
        return path
    return workspace / path


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_contract_version(data: dict[str, Any]) -> None:
    version = require_string(data, "contract_version")
    if version != CONTRACT_VERSION:
        raise ContractError(f"unsupported contract_version: {version}")


def validate_artifacts(data: dict[str, Any], key: str, workspace: Path | None, verify_hashes: bool) -> None:
    artifacts = require_list(data, key)
    seen_ids: set[str] = set()
    for index, artifact in enumerate(artifacts):
        if not isinstance(artifact, dict):
            raise ContractError(f"{key}[{index}] must be an object")
        artifact_id = require_string(artifact, "id")
        if artifact_id in seen_ids:
            raise ContractError(f"duplicate artifact id: {artifact_id}")
        seen_ids.add(artifact_id)
        raw_path = require_string(artifact, "path")
        sha256 = require_string(artifact, "sha256")
        if len(sha256) != 64 or any(char not in "0123456789abcdef" for char in sha256):
            raise ContractError(f"invalid sha256 for artifact {artifact_id}")
        if verify_hashes:
            resolved = resolve_artifact_path(workspace, raw_path)
            if not resolved.is_file():
                raise ContractError(f"artifact not found: {raw_path}")
            actual = sha256_file(resolved)
            if actual != sha256:
                raise ContractError(f"sha256 mismatch for artifact {artifact_id}: expected {sha256}, got {actual}")


def validate_text_rewrite_payload(payload: dict[str, Any]) -> None:
    required_strings = ["original_text", "rewritten_text", "target_style", "audience", "purpose"]
    for key in required_strings:
        require_string(payload, key)

    required_lists = ["semantic_invariants", "forbidden_changes", "acceptance_checks"]
    for key in required_lists:
        require_list(payload, key, nonempty=True)

    optional_lists = ["required_terminology", "known_uncertainties"]
    for key in optional_lists:
        if key in payload:
            require_list(payload, key)


def validate_request(path: Path, workspace: Path | None, verify_hashes: bool) -> None:
    data = load_json(path)
    validate_contract_version(data)
    require_string(data, "request_id")
    require_string(data, "caller_skill")
    require_string(data, "project_id")
    if "round_id" not in data:
        raise ContractError("missing field: round_id")
    require_enum(data, "target", TARGETS)
    require_enum(data, "review_depth", DEPTHS)
    require_enum(data, "review_mode", MODES)
    require_enum(data, "ui_mode", UI_MODES)
    validate_artifacts(data, "input_artifacts", workspace, verify_hashes)
    output_dir = require_string(data, "output_dir")
    if Path(output_dir).is_absolute() and workspace is not None:
        raise ContractError("output_dir must be relative when --workspace is used")
    require_list(data, "acceptance_checks", nonempty=True)

    payload = data.get("payload")
    if not isinstance(payload, dict):
        raise ContractError("missing or invalid object field: payload")
    kind = require_string(payload, "kind")
    if kind == "text-rewrite":
        validate_text_rewrite_payload(payload)
    else:
        raise ContractError(f"unsupported payload.kind: {kind}")


def validate_findings(data: dict[str, Any]) -> None:
    findings = require_list(data, "findings")
    seen_ids: set[str] = set()
    for index, finding in enumerate(findings):
        if not isinstance(finding, dict):
            raise ContractError(f"findings[{index}] must be an object")
        finding_id = require_string(finding, "id")
        if finding_id in seen_ids:
            raise ContractError(f"duplicate finding id: {finding_id}")
        seen_ids.add(finding_id)
        require_enum(finding, "severity", FINDING_SEVERITIES)
        require_string(finding, "evidence")
        require_string(finding, "recommendation")


def validate_check_results(data: dict[str, Any]) -> None:
    results = require_list(data, "acceptance_check_results")
    for index, result in enumerate(results):
        if not isinstance(result, dict):
            raise ContractError(f"acceptance_check_results[{index}] must be an object")
        require_string(result, "check")
        require_enum(result, "status", CHECK_STATUSES)


def validate_result(path: Path, workspace: Path | None, verify_hashes: bool) -> None:
    data = load_json(path)
    validate_contract_version(data)
    require_string(data, "request_id")
    status = require_enum(data, "review_status", RESULT_STATUSES)
    gate = require_enum(data, "gate", GATES)
    if status != "completed" and gate != "needs-user-decision":
        raise ContractError("non-completed review_status must use gate needs-user-decision")
    validate_artifacts(data, "reviewed_artifacts", workspace, verify_hashes)
    validate_findings(data)
    validate_check_results(data)
    require_list(data, "unresolved_questions")
    require_string(data, "created_at")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("kind", choices=["request", "result"], help="Contract document kind.")
    parser.add_argument("path", help="Path to JSON contract document.")
    parser.add_argument("--workspace", default=None, help="Workspace root for relative artifact hash checks.")
    parser.add_argument("--verify-hashes", action="store_true", help="Verify artifact files and sha256 values.")
    args = parser.parse_args()

    workspace = Path(args.workspace).resolve() if args.workspace else None
    path = Path(args.path).resolve()

    try:
        if args.kind == "request":
            validate_request(path, workspace, args.verify_hashes)
        else:
            validate_result(path, workspace, args.verify_hashes)
    except ContractError as error:
        print(f"CONTRACT_INVALID: {error}", file=sys.stderr)
        return 1

    print(f"CONTRACT_VALID: {args.kind} {path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
