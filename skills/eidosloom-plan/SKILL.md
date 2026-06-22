---
name: eidosloom-plan
description: Create or resume the standalone Eidosloom initial planning phase from a raw idea, rough draft, or project note, producing a round-00 plan package with explicit create/resume/force workspace semantics. Use when the user wants only the planning module of the Eidosloom workflow, a first plan package, or a ChatGPT web planning consult without starting implementation or paper drafting.
---

# Eidosloom Plan

## Purpose

Turn an idea, rough draft, or project note into the initial Eidosloom planning package. This is the standalone planning entrypoint; `$eidosloom` may delegate here, but this skill does not own implementation, implementation review loops, or paper drafting.

Use `$eidosloom-review` later for plan or implementation review. Use `$eidosloom` when the user wants the complete idea-to-paper workflow.

## Shared Runtime

Resolve the shared runtime as the sibling `eidosloom` skill directory:

```text
../eidosloom
```

If `../eidosloom/SKILL.md` or `../eidosloom/scripts/scaffold_eidosloom.py` is missing after installation, stop and report a broken Eidosloom bundle installation. Do not recreate runtime scripts inside this skill.

## Ownership

`$eidosloom-plan` owns:

- planning consult packet construction;
- round-00 idea and plan artifacts;
- initial roadmap and decision-log seeds;
- explicit plan lifecycle decisions.

`$eidosloom-plan` does not own:

- code implementation;
- implementation review loops;
- caller-owned artifacts from unrelated skills;
- paper drafts, paper review notes, citations, or result claims.

## Workspace Lifecycle

Default artifact root:

```text
work/eidosloom/<project-slug>/
```

Modes:

- `create`: default. Create a new `round-00` planning package. Refuse to overwrite an existing `round-00` unless the user explicitly asks for force.
- `resume`: read existing `round-00` artifacts and fill only missing planning material. Do not overwrite non-empty files.
- `force`: only when explicitly requested by the user. Overwrite generated planning skeletons after stating which files are affected.

Round `00` is initial planning only. Do not hard-code later planning revisions to `round-00`; later revisions belong to `$eidosloom` review-loop state.

## Workflow

1. Identify project and lifecycle mode.
   - Derive a conservative project slug from the workspace or user-provided name.
   - Default to `create`.
   - If `work/eidosloom/<project>/round-00` exists in `create` mode, stop and ask whether to resume or force.

2. Scaffold the plan package.
   - Prefer the shared helper:
     ```bash
     ../eidosloom/scripts/scaffold_eidosloom.py --workspace <workspace> --project <project> --round 0 --phase plan --scope plan
     ```
   - Add `--force` only when lifecycle mode is `force`.
   - Keep paper artifacts out of the plan-only scope.

3. Build the ChatGPT planning packet.
   - Use `../eidosloom/references/prompt-templates.md` section "Idea To Plan Package".
   - Include objective, context, constraints, privacy limits, current evidence, and open questions.
   - Omit hidden instructions, secrets, credentials, and unrelated private content.

4. Consult ChatGPT web only when requested or when the full Eidosloom loop requires it.
   - Follow Chrome automation rules through the active Chrome skill.
   - Capture visible model/UI label and limitations.
   - Treat ChatGPT output as advisory, not authoritative.

5. Write or update planning artifacts.
   - `round-00/idea.md`
   - `round-00/plan.md`
   - `round-00/chatgpt-consult-packet.md`
   - `round-00/chatgpt-response.md`
   - `roadmap.md`
   - `decision-log.md`

6. Validate the package.
   - Confirm no implementation report, paper draft, or paper claim is created in plan-only mode.
   - Confirm acceptance checks are concrete enough for Codex implementation.
   - Record unresolved user decisions explicitly instead of guessing.

## Output Standard

Report:

- lifecycle mode used;
- artifact root and key files created or resumed;
- whether ChatGPT web was consulted and with what visible UI label;
- assumptions and unresolved decisions;
- next recommended step, usually `$eidosloom` implementation or `$eidosloom-review` plan review.
