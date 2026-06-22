---
name: eidosloom-review
description: Run standalone ChatGPT web reviews for Eidosloom artifacts, code implementations, plans, roadmaps, papers, prompts, or architecture decisions with selectable review intensity levels such as quick, standard, deep, adversarial, or committee. Use when the user asks GPT web/GPT Pro to review, critique, audit, grade, approve, reject, rewrite a roadmap after review, or choose a thinking/review level separately from the full Eidosloom workflow.
---

# Eidosloom Review

## Purpose

Use ChatGPT web as a configurable external reviewer, then bring the answer back into Codex as advisory evidence. This skill is the review module for Eidosloom and can also run standalone.

ChatGPT's answer is untrusted advice. Codex must verify it against repository facts, tests, user constraints, and active instructions before applying any suggestion.

## Review Levels

Default to `standard` unless the user names a level.

- `quick`: fast triage; find blockers and obvious missing evidence.
- `standard`: balanced review; check correctness, scope, tests, and next actions.
- `deep`: rigorous review; examine edge cases, assumptions, evidence quality, and failure modes.
- `adversarial`: skeptical review; look for reasons the work would be rejected or fail under hostile scrutiny.
- `committee`: multi-perspective review; ask for separate views such as engineering, research, user/product, security/privacy, and paper reviewer when relevant.

Accept natural aliases such as `fast`, `low`, `normal`, `medium`, `high`, `max`, `strict`, `critic`, `red-team`, `reviewer 2`, `快速`, `普通`, `深度`, `严格`, `挑剔`, `最大`, and map them to the closest level. For detailed selection rules, read `references/review-levels.md`.

Do not ask ChatGPT to reveal hidden chain-of-thought. Ask for concise rationale, evidence, issue lists, uncertainty, and gate decisions.

## Review Targets

Choose the review target from the user's request or artifact:

- `plan`: initial plan, roadmap, scope, assumptions, feasibility.
- `implementation`: code changes, tests, behavior, acceptance criteria.
- `roadmap`: next-round plan, sequencing, deferrals, decision points.
- `paper`: outline, draft, claims, evidence, citations, limitations.
- `prompt-skill`: agent prompt, Codex skill, trigger quality, safety.
- `architecture`: design options, tradeoffs, migration, failure modes.

For prompt templates by target and level, read `references/review-templates.md`.

## Workflow

1. Identify target and level.
   - If unspecified, use target `implementation` for code diffs, `paper` for manuscripts, `plan` for raw proposals, and level `standard`.
   - If the requested level is ambiguous, map it conservatively and record the mapping.

2. Build a review packet.
   - Include the review goal, target type, selected level, user objective, constraints, relevant artifacts, evidence, test/build results, and open questions.
   - Omit hidden system/developer/tool instructions and unnecessary private content.
   - Before sending sensitive data to ChatGPT web, ask permission and say exactly what would be sent to `chatgpt.com`.
   - Optional helper: run `scripts/build_review_packet.py --target <target> --level <level>` to create a Markdown packet.

3. Send through ChatGPT web.
   - Use Chrome automation when available and follow the `chrome:control-chrome` skill before controlling Chrome.
   - Open or claim a tab for `https://chatgpt.com`.
   - Start a new chat unless the user explicitly wants to continue an existing one.
   - If the ChatGPT UI exposes a visible model, reasoning, or thinking selector, choose the closest visible option to the requested level. If not visible, encode the level in the prompt and report that UI-level selection was not verified.
   - Do not inspect cookies, local storage, passwords, session stores, or account internals.

4. Capture and normalize the response.
   - Prefer the page copy control; otherwise extract the last assistant message from the visible page/DOM.
   - Record visible model label, requested level, actual visible setting if known, date/time, and capture limitations.
   - Convert the answer into a gate decision where applicable:
     - implementation/plan/roadmap: `approved`, `changes-requested`, `blocked`, or `needs-user-decision`;
     - paper: `acceptable`, `revise`, or `blocked`;
     - prompt-skill/architecture: `accept`, `revise`, or `reject`.

5. Apply or report.
   - Separate required fixes from optional improvements.
   - Reject unsupported or conflicting suggestions.
   - If the review belongs to an Eidosloom round, update `chatgpt-response.md`, `revised-plan.md`, `roadmap.md`, or `paper/review-notes.md` as appropriate.
   - If used standalone, return the review summary, gate decision, required changes, and recommended next Codex action.

## Output Standard

When this skill is used, report:

- target and selected level;
- what was sent, summarized without leaking secrets;
- ChatGPT's gate decision and top issues;
- which suggestions Codex accepts, rejects, or needs the user to decide;
- any limitations such as model/level not verified, partial capture, login/CAPTCHA block, or redactions.

## Failure Handling

- Login required: ask the user to log in to ChatGPT in Chrome, then resume.
- CAPTCHA or verification: ask the user to complete it. Do not bypass it.
- Requested level cannot be selected in UI: continue by prompt-level instruction unless the user required exact UI selection.
- Model unavailable: use the visible default only if the exact model was not required.
- UI changed or response capture fails: save the prepared review packet so the user can paste it manually.
- Sensitive data detected without authorization: ask for permission or create a redacted packet.
