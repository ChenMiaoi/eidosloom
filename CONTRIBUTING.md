# Contributing

Eidosloom is a small Codex skill bundle. Keep changes scoped, auditable, and easy to validate.

## Development

```sh
npm install
npm run typecheck
npm run build
npm run doctor
```

Useful smoke checks:

```sh
node dist/cli.js review-levels
node dist/cli.js review-packet --workspace /tmp/eidosloom-smoke --project smoke --target custom --level deep --review-mode adversarial --ui-mode prefer-pro --force
python skills/eidosloom/scripts/scaffold_eidosloom.py --workspace /tmp/eidosloom-smoke --project smoke --round 0 --phase review --force
python skills/eidosloom-review/scripts/build_review_packet.py --workspace /tmp/eidosloom-review-smoke --project smoke --target custom --level deep --review-mode committee --ui-mode prefer-pro --force
```

## Skill Guidelines

- Keep `SKILL.md` concise and procedural.
- Put detailed policy and templates in `references/`.
- Keep scripts deterministic and covered by a smoke check.
- Do not duplicate review policy across TypeScript, Python, and Markdown; update `skills/eidosloom-review/references/review-policy.json` first.
- Do not commit local `work/` artifacts.

## Pull Requests

Before opening a PR, run:

```sh
npm run typecheck
npm run build
npm pack --dry-run
```

Describe what changed, why it changed, and which checks passed.
