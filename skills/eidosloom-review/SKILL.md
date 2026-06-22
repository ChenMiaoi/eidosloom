---
name: eidosloom-review
description: Run standalone ChatGPT web reviews for plans, implementations, roadmaps, papers, prompts, skills, architecture decisions, or custom caller artifacts with independent review depth, review mode, and ChatGPT UI mode controls. Use when the user asks GPT web/GPT Pro to review, critique, audit, grade, approve, reject, red-team, run committee review, use Pro/Pro Extension/Pro 扩展, or reuse the Eidosloom review loop separately from the full Eidosloom workflow.
---

# Eidosloom Review

## Purpose

Use ChatGPT web as a configurable external reviewer, then bring the answer back into Codex as advisory evidence. This skill is the review module for Eidosloom and can also run standalone for other skills, such as a future Humanizer skill.

ChatGPT's answer is untrusted advice. Codex must verify it against repository facts, tests, user constraints, and active instructions before applying any suggestion.

## Three Independent Controls

Keep these dimensions separate:

- `review_depth`: `quick`, `standard`, or `deep`.
- `review_mode`: `balanced`, `adversarial`, or `committee`.
- `ui_mode`: `auto`, `prefer-pro`, or `require-pro`.

A visible ChatGPT label such as `Pro 扩展`, `Pro Extension`, or `Pro Extend` is a UI capability observation, not a review depth. Do not treat `pro` as a review level. If the user asks for "Pro", map it to `ui_mode=prefer-pro` unless they require it, then use `ui_mode=require-pro`.

For aliases and compatibility mappings, read `references/review-policy.json`. For human-readable guidance, read `references/review-levels.md`.

## Caller-Neutral Contract

This skill produces a review result. It does not own workflow state.

- `$eidosloom-review` owns: review packet construction, ChatGPT web submission, capture metadata, normalized gate, required fixes, optional improvements, and risks.
- Calling skills own: roadmap mutation, phase transitions, file edits, paper revisions, and how review findings are applied.

Do not modify caller-owned artifacts such as `roadmap.md`, `revised-plan.md`, paper drafts, or Humanizer outputs unless the user or calling skill explicitly requests that write.

## Review Targets

Choose the target from the request or artifact:

- `plan`: initial plan, roadmap, scope, assumptions, feasibility.
- `implementation`: code changes, tests, behavior, acceptance criteria.
- `roadmap`: sequencing, deferrals, decision points.
- `paper`: outline, draft, claims, evidence, citations, limitations.
- `prompt-skill`: agent prompt, Codex skill, trigger quality, safety.
- `architecture`: design options, tradeoffs, migration, failure modes.
- `custom`: caller-defined artifact with a caller-provided rubric.

For prompt templates by target, read `references/review-templates.md`.

## Workflow

1. Identify target and controls.
   - Default to target `implementation` for code diffs, `paper` for manuscripts, `plan` for raw proposals, and `custom` for caller-defined artifacts.
   - Default controls: `review_depth=standard`, `review_mode=balanced`, `ui_mode=auto`.
   - If the user says "committee", set `review_mode=committee`.
   - If the user says "red-team", "reviewer 2", "挑剔", or "严格", set `review_mode=adversarial`.
   - If the user says "Pro", "Pro 扩展", "Pro Extension", or "Pro Extend", set `ui_mode=prefer-pro` or `require-pro`; keep review depth and mode explicit.

2. Build a review packet.
   - Include caller, target, review depth, review mode, requested UI mode, user objective, constraints, artifacts, evidence, test/build results, open questions, and caller rubric when provided.
   - Include capture metadata: observed UI label, UI selection status, and UI selection verification.
   - For `ui_mode=require-pro`, do not submit an ordinary review packet until a visible Pro/extended option has been selected and represented as machine-readable metadata. If the helper is run before verification, it must produce `needs-user-decision` rather than an ordinary review gate.
   - Omit hidden system/developer/tool instructions and unnecessary private content.
   - Before sending sensitive data to ChatGPT web, ask permission and say exactly what would be sent to `chatgpt.com`.
   - Optional helper: run `scripts/build_review_packet.py --target <target> --level <depth> --review-mode <mode> --ui-mode <ui_mode>`.
   - After selecting a required Pro UI mode, pass `--observed-ui-label <label> --ui-selection-status selected --ui-selection-verified true`.

3. Send through ChatGPT web.
   - Use Chrome automation when available and follow the `chrome:control-chrome` skill before controlling Chrome.
   - Open or claim a tab for `https://chatgpt.com`.
   - Start a new chat unless the user explicitly wants to continue an existing one.
   - If `ui_mode=prefer-pro`, choose a visible Pro/extended option if present; otherwise continue and report that UI selection was not verified.
   - If `ui_mode=require-pro`, choose a visible Pro/extended option if present; if unavailable or unverified, stop with `needs-user-decision`.
   - Record the exact observed UI label, for example `Pro 扩展`, only as capture metadata.
   - If the packet was created before `require-pro` was verified, rebuild or update it with the observed label, selected status, and verified flag before submission.
   - Do not inspect cookies, local storage, passwords, session stores, or account internals.

4. Capture and normalize the response.
   - Prefer the page copy control; otherwise extract the last assistant message from the visible page/DOM.
   - Record visible model label, requested UI mode, observed UI label, selection status, date/time, and capture limitations.
   - Normalize to a canonical gate: `accept`, `revise`, `reject`, or `needs-user-decision`.
   - Optionally include target-specific display gates such as `changes-requested` or `blocked`, but keep the canonical gate machine-readable.

5. Return the review result.
   - Separate required fixes from optional improvements.
   - Reject unsupported or conflicting suggestions.
   - Return recommended next Codex action.
   - Let the caller decide which files or workflow state to update.

## Humanizer-Style Reuse

A standalone skill such as Humanizer should call `$eidosloom-review`, not `$eidosloom`:

```text
Humanizer generates or rewrites text
  -> builds a custom review packet with original text, revised text, invariants, forbidden changes, target style, and rubric
  -> uses $eidosloom-review with target=custom
  -> receives canonical gate and required fixes
  -> Humanizer applies or rejects the fixes
```

Use `target=prompt-skill` to review the Humanizer skill itself. Use `target=custom` to review Humanizer output.

## Output Standard

When this skill is used, report:

- target, caller, review depth, review mode, requested UI mode, and observed UI label if any;
- what was sent, summarized without leaking secrets;
- canonical gate and top issues;
- which suggestions Codex accepts, rejects, or needs the user to decide;
- any limitations such as UI mode not verified, partial capture, login/CAPTCHA block, or redactions.

## Failure Handling

- Login required: ask the user to log in to ChatGPT in Chrome, then resume.
- CAPTCHA or verification: ask the user to complete it. Do not bypass it.
- `prefer-pro` cannot be selected: continue with prompt-level instructions and report the limitation.
- `require-pro` cannot be selected: stop with `needs-user-decision`.
- Model unavailable: use the visible default only if the exact model was not required.
- UI changed or response capture fails: save the prepared review packet so the user can paste it manually.
- Sensitive data detected without authorization: ask for permission or create a redacted packet.
