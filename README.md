# Eidosloom

Eidosloom is an experimental Codex skill bundle for an auditable research loop:

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
- `$eidosloom-review`: standalone GPT web review with explicit depth, mode, and ChatGPT UI controls.

Repository: `https://github.com/ChenMiaoi/eidosloom`

## Installed Skills

The installer copies both `eidosloom` and `eidosloom-review`.

`eidosloom` supports:

- initial planning from a raw idea into a first-round plan package;
- Codex implementation from an approved plan;
- delegation to `$eidosloom-review` for implementation, roadmap, and paper reviews;
- roadmap rewrite after each review;
- transition to paper drafting only after approval or explicit user override;
- paper drafting and ChatGPT web paper review loops.

`eidosloom-review` supports standalone reviews for plans, implementations, roadmaps, papers, prompts/skills, architecture decisions, and custom caller artifacts. It separates three controls:

- `review_depth`: `quick`, `standard`, or `deep`.
- `review_mode`: `balanced`, `adversarial`, or `committee`.
- `ui_mode`: `auto`, `prefer-pro`, or `require-pro`.

Visible ChatGPT web labels such as `Pro 扩展`, `Pro Extension`, or `Pro Extend` are UI capabilities, not review levels. Use `ui_mode=prefer-pro` or `ui_mode=require-pro` instead of treating `pro` as a depth.

By default, workflow artifacts are written in the target workspace under:

```text
work/eidosloom/<project-slug>/
```

The main skill includes `scripts/scaffold_eidosloom.py`, which can create a round directory, manifest, reusable Markdown files, and a zip package for handoff or ChatGPT review. The review skill includes `scripts/build_review_packet.py`, which can create review packets with selected review depth, review mode, and ChatGPT UI mode metadata.

## One-Line Install

Prefer versioned installs. The examples below use the `v0.1.0` tag.

macOS/Linux:

```sh
curl -fsSL https://raw.githubusercontent.com/ChenMiaoi/eidosloom/v0.1.0/installers/install.sh | bash
```

Windows PowerShell:

```powershell
irm https://raw.githubusercontent.com/ChenMiaoi/eidosloom/v0.1.0/installers/install.ps1 | iex
```

To test a branch or fork, override repo name or ref:

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
eidosloom review-packet --target implementation --level deep --review-mode balanced --round 1
eidosloom review-packet --target paper --level deep --review-mode committee --ui-mode prefer-pro --title "Final paper review"
eidosloom review-packet --target custom --caller humanizer --level deep --review-mode adversarial --rubric "Preserve facts and reduce AI-like phrasing."
eidosloom review-packet --target custom --caller humanizer --level deep --review-mode committee --ui-mode require-pro --observed-ui-label Pro --ui-selection-status selected --ui-selection-verified true
```

When `--ui-mode require-pro` is used without verified UI metadata, the generated packet is gated as `needs-user-decision`. Verify the visible ChatGPT UI mode first, then pass the observed label and selected/verified metadata before submitting an ordinary review request.

## What Gets Installed

The installer copies `skills/eidosloom` and `skills/eidosloom-review` into the user's Codex skills directory. The bundle:

- opens or claims a Chrome tab for `https://chatgpt.com` through Codex Chrome automation;
- sends focused planning, review, roadmap, and paper-review packets;
- supports review depth, review mode, and ChatGPT UI mode selection through `$eidosloom-review`;
- captures the answer and brings it back as advisory context;
- keeps Codex responsible for final decisions, implementation, and verification;
- requires confirmation before sending sensitive data;
- can scaffold consistent workflow artifacts and zip packages.

## Limitations

- This is browser automation, not an official ChatGPT API.
- It depends on the user's logged-in ChatGPT web session.
- It cannot bypass login, CAPTCHA, model access limits, or UI changes.
- It must not send secrets, credentials, or private data without explicit user authorization.
- `work/` artifacts are local workflow state and are ignored by git by default.

## Uninstall

Remove the installed skill directories:

```sh
rm -rf ~/.codex/skills/eidosloom ~/.codex/skills/eidosloom-review
```

Installers create timestamped backups when replacing existing skill directories.
