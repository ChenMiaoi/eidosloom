# Eidosloom Modular Architecture

## Current Released Modules

`eidosloom`:

- Orchestrates the complete workflow.
- Owns roadmap mutation, implementation loop state, paper gate transitions, and final user-facing phase decisions.
- Delegates initial planning to `eidosloom-plan` when available.
- Delegates external review to `eidosloom-review`.

`eidosloom-plan`:

- Owns the initial planning entrypoint.
- Creates or resumes `round-00` plan packages.
- Defines `create`, `resume`, and `force` lifecycle semantics.
- Does not implement code, review implementation, or draft papers.

`eidosloom-review`:

- Owns GPT web review packet construction, UI-mode metadata, gate normalization, findings, and advice.
- Supports standalone use by other skills through `references/caller-contract.md`.
- Does not mutate caller-owned artifacts.

## Deferred Module

`eidosloom-paper` is intentionally deferred.

Before exposing it as an installed skill, Eidosloom needs a deterministic implementation-verification manifest that separates:

- revision identity;
- checks that were actually run;
- pass/fail status;
- produced artifacts;
- known limitations;
- evidence-backed claims;
- unsupported or unresolved claims.

Paper drafting must start from that manifest. Passing tests alone is not proof that a paper claim is supported.

## Dependency Rules

- `eidosloom` may depend on `eidosloom-plan` and `eidosloom-review`.
- `eidosloom-plan` may depend on the shared runtime under `eidosloom` and may call `eidosloom-review` for plan review.
- `eidosloom-review` must not depend on caller-specific workflow state.
- No subskill should maintain a copied implementation of a shared script or schema.

## Release Rule

All installed skills must be declared in `bundle-manifest.json`. CLI install, shell install, PowerShell install, README documentation, package contents, and tests must agree with that manifest before tagging a release.
