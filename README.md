# Eidosloom

Eidosloom is a small Codex skill bundle for an auditable research loop:

```text
idea
  -> ask ChatGPT web for a first plan
  -> package the plan and roadmap
  -> implement with Codex
  -> ask ChatGPT web to review the implementation and rewrite the next plan
  -> repeat until the implementation is approved
  -> draft a paper from verified artifacts
  -> ask ChatGPT web to review the paper
  -> repeat until the paper is ready
```

The optimization is that every loop has a gate decision and a stable artifact shape. ChatGPT web acts as an outside planner/reviewer; Codex remains responsible for reading the repository, implementing, running checks, rejecting unsupported advice, and keeping evidence attached to the roadmap and paper.

The bundle is split into two skills:

- `$eidosloom`: the full idea -> implementation -> roadmap -> paper orchestration workflow.
- `$eidosloom-review`: standalone GPT web review with selectable intensity levels.

This repo is local-only right now. It has not been pushed to GitHub.

## Installed Skills

The installer copies both `eidosloom` and `eidosloom-review`.

`eidosloom` supports:

- initial planning from a raw idea into a first-round plan package;
- Codex implementation from an approved plan;
- delegation to `$eidosloom-review` for implementation, roadmap, and paper reviews;
- roadmap rewrite after each review;
- transition to paper drafting only after approval or explicit user override;
- paper drafting and ChatGPT web paper review loops.

`eidosloom-review` supports standalone reviews for plans, implementations, roadmaps, papers, prompts/skills, and architecture decisions. Review levels are:

- `quick`: fast blocker scan.
- `standard`: default balanced review.
- `deep`: rigorous evidence and edge-case review.
- `adversarial`: skeptical rejection-risk review.
- `committee`: multi-perspective final approval review.

By default, workflow artifacts are written in the target workspace under:

```text
work/eidosloom/<project-slug>/
```

The main skill includes `scripts/scaffold_eidosloom.py`, which can create a round directory, manifest, reusable Markdown files, and a zip package for handoff or ChatGPT review. The review skill includes `scripts/build_review_packet.py`, which can create review packets with a selected level.

## Name

Selected name: `eidosloom`

- "Eidos" suggests idea, form, and conceptual shape; "loom" suggests weaving those ideas into concrete work.
- It fits the workflow: ideas become plans, plans become implementation, implementation becomes feedback for the next idea.
- It is aesthetic without naming a specific agent, model, or product surface.
- It currently appears available as `github.com/ChenMiaoi/eidosloom` and the unscoped npm package `eidosloom`.

## One-Line Install

These commands are for the future GitHub repo once published under `ChenMiaoi`.

macOS/Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/ChenMiaoi/eidosloom/main/installers/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/ChenMiaoi/eidosloom/main/installers/install.ps1 | iex
```

After publishing a test branch or fork, override repo name or branch like this:

```sh
EIDOSLOOM_REPO=eidosloom EIDOSLOOM_REF=main ./installers/install.sh
```

```powershell
$env:EIDOSLOOM_REPO = "eidosloom"
$env:EIDOSLOOM_REF = "main"
.\installers\install.ps1
```

## Local Development

```sh
npm install
npm run build
npm run doctor
npm run install-skill
```

The local CLI installs the bundled skills into:

```text
~/.codex/skills/eidosloom
~/.codex/skills/eidosloom-review
```

Set `CODEX_HOME` to install into a different Codex home directory.

Useful local commands:

```sh
eidosloom review-levels
eidosloom review-packet --target implementation --level deep --round 1
eidosloom review-packet --target paper --level committee --title "Final paper review"
```

## What Gets Installed

The installer copies `skills/eidosloom` and `skills/eidosloom-review` into the user's Codex skills directory. The bundle:

- opens or claims a Chrome tab for `https://chatgpt.com` through Codex Chrome automation;
- sends focused planning, review, roadmap, and paper-review packets;
- supports review intensity selection through `$eidosloom-review`;
- captures the answer and brings it back as advisory context;
- keeps Codex responsible for final decisions, implementation, and verification;
- requires confirmation before sending sensitive data;
- can scaffold consistent workflow artifacts and zip packages.

## Limitations

- This is browser automation, not an official ChatGPT API.
- It depends on the user's logged-in ChatGPT web session.
- It cannot bypass login, CAPTCHA, model access limits, or UI changes.
- It must not send secrets, credentials, or private data without explicit user authorization.
