# Review Policy

The canonical machine-readable source is `review-policy.json`. This file explains how to apply it.

## Three Dimensions

| Dimension | Values | Meaning |
| --- | --- | --- |
| `review_depth` | `quick`, `standard`, `deep` | How much evidence and edge-case scrutiny to request. |
| `review_mode` | `balanced`, `adversarial`, `committee` | The review stance or organization. |
| `ui_mode` | `auto`, `prefer-pro`, `require-pro` | Whether to select a visible ChatGPT web Pro/extended UI mode. |

Do not use `pro` as a review depth. A visible label such as `Pro`, `专业`, `Pro 扩展`, `Pro Extension`, or `Pro Extend` is a UI observation. Record it as `observed_ui_label`.

## Depths

`quick`:
- Fast triage.
- Focus on blockers, obvious missing evidence, and the next single action.

`standard`:
- Default depth.
- Check correctness, scope, test coverage, required fixes, optional improvements, and next actions.

`deep`:
- Rigorous depth.
- Audit evidence, edge cases, assumptions, failure modes, and test gaps.

## Modes

`balanced`:
- Practical reviewer stance.
- Prioritize actionable findings.

`adversarial`:
- Skeptical stance.
- Make the strongest case against approval, separating blockers, serious concerns, and speculative objections.

`committee`:
- Multi-perspective stance.
- Provide short views from relevant perspectives, dissenting concerns, a consensus gate, and one next-step plan.

## UI Modes

`auto`:
- Use the currently visible ChatGPT web mode.
- Record any visible label if observed.

`prefer-pro`:
- Choose a visible Pro or extended ChatGPT web UI mode if available.
- If unavailable, continue and report that selection was not verified.

`require-pro`:
- Choose a visible Pro or extended ChatGPT web UI mode if available.
- If unavailable, unverified, or not listed in `acceptedProUiLabels`, stop with `needs-user-decision`.

## Accepted Pro UI Labels

Use `acceptedProUiLabels` from `review-policy.json` as the machine-readable allowlist. `require-pro` is satisfied only when all of these are true:

- The observed label canonicalizes to an allowlisted Pro/extended label.
- UI selection status is `selected`.
- UI selection verified is `true`.

## Compatibility

Legacy commands remain accepted:

- `--level adversarial` maps to `--level deep --review-mode adversarial`.
- `--level committee` maps to `--level deep --review-mode committee`.

Forbidden as `--level`:

- `pro`
- `pro-extended`
- `pro-extension`
- `pro-extend`
- `Pro 扩展`

Use `--ui-mode prefer-pro` or `--ui-mode require-pro` instead.

Never request hidden reasoning. Request concise rationale and externally checkable evidence.
