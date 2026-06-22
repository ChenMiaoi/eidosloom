# Eidosloom Review Caller Contract

## Purpose

Use this contract when another skill calls `$eidosloom-review` as a review service. The caller can be `$eidosloom`, `$eidosloom-plan`, a text-rewriting skill such as Humanizer, or any custom workflow that needs an external GPT web gate.

`$eidosloom-review` is read-only with respect to caller-owned artifacts. It builds review packets, runs or prepares GPT web review, normalizes the gate, and returns findings. The caller applies accepted fixes.

## Contract Version

Current contract version:

```text
eidosloom-review-contract.v1
```

## Request Envelope

Required JSON fields:

```json
{
  "contract_version": "eidosloom-review-contract.v1",
  "request_id": "humanizer-smoke-001",
  "caller_skill": "humanizer",
  "project_id": "style-rewrite",
  "round_id": null,
  "target": "custom",
  "review_depth": "deep",
  "review_mode": "committee",
  "ui_mode": "require-pro",
  "input_artifacts": [
    {
      "id": "original",
      "path": "original.md",
      "sha256": "<hex sha256>"
    }
  ],
  "output_dir": "reviews/humanizer-smoke-001",
  "acceptance_checks": [
    "No factual claims are added",
    "Original meaning is preserved"
  ],
  "payload": {}
}
```

Allowed values:

- `target`: `plan`, `implementation`, `roadmap`, `paper`, `prompt-skill`, `architecture`, or `custom`.
- `review_depth`: `quick`, `standard`, or `deep`.
- `review_mode`: `balanced`, `adversarial`, or `committee`.
- `ui_mode`: `auto`, `prefer-pro`, or `require-pro`.

Path rules:

- `input_artifacts[*].path` must be relative to the caller workspace or an explicit absolute path the caller is authorized to share.
- `output_dir` must not point inside caller source paths unless the caller owns that directory.
- Repeated invocations with different `request_id` values must not overwrite earlier results.
- A stale `sha256` is a contract failure, not a review finding.

## Text-Rewrite Payload

For Humanizer-style callers, use `payload.kind = "text-rewrite"`:

```json
{
  "kind": "text-rewrite",
  "original_text": "...",
  "rewritten_text": "...",
  "style_sample": "",
  "target_style": "plain technical prose",
  "semantic_invariants": [
    "Preserve all numerical values"
  ],
  "forbidden_changes": [
    "Do not add citations"
  ],
  "required_terminology": [
    "Codex"
  ],
  "audience": "software engineers",
  "purpose": "make the paragraph sound less generic",
  "acceptance_checks": [
    "No new claims",
    "No loss of technical meaning"
  ],
  "known_uncertainties": []
}
```

Required text-rewrite fields:

- `original_text`
- `rewritten_text`
- `target_style`
- `semantic_invariants`
- `forbidden_changes`
- `audience`
- `purpose`
- `acceptance_checks`

## Result Envelope

Return machine-readable result metadata alongside human-readable notes:

```json
{
  "contract_version": "eidosloom-review-contract.v1",
  "request_id": "humanizer-smoke-001",
  "review_status": "completed",
  "gate": "revise",
  "reviewed_artifacts": [
    {
      "id": "original",
      "path": "original.md",
      "sha256": "<hex sha256>"
    }
  ],
  "findings": [
    {
      "id": "F-001",
      "severity": "required",
      "evidence": "rewritten_text paragraph 1",
      "recommendation": "Restore the omitted limitation."
    }
  ],
  "acceptance_check_results": [
    {
      "check": "No factual claims are added",
      "status": "pass"
    }
  ],
  "unresolved_questions": [],
  "created_at": "2026-06-22T00:00:00Z"
}
```

Allowed `review_status` values:

- `completed`
- `partial`
- `failed`
- `invalid`

Allowed `gate` values:

- `accept`
- `revise`
- `reject`
- `needs-user-decision`

If `review_status` is not `completed`, `gate` must be `needs-user-decision`. A partial, failed, or invalid review is never equivalent to acceptance.

Allowed finding severity values:

- `required`
- `optional`
- `question`
- `blocked`

Allowed acceptance check statuses:

- `pass`
- `fail`
- `unknown`

## Ownership Rules

- Caller owns source artifacts and applies accepted fixes.
- `$eidosloom-review` owns packet construction, external-review instructions, gate normalization, findings, and advice.
- `$eidosloom-review` must not silently edit caller-owned files.
- Inputs are immutable during one review invocation.
- Missing required fields, inaccessible artifacts, invalid modes, stale hashes, and unsupported payload kinds fail explicitly.
- Reviewer uncertainty must remain visible in `unresolved_questions` or finding severity.
- The caller must redact secrets or unsuitable private content before invoking GPT web review.

## Humanizer-Style Flow

```text
Humanizer rewrites text
  -> writes request JSON with original text, rewritten text, invariants, and forbidden changes
  -> validates the request with validate_review_contract.py
  -> asks $eidosloom-review for target=custom
  -> receives result JSON and human notes
  -> decides whether and how to apply suggested edits
```
