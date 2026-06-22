# Review Levels

Use these levels to control review intensity without asking for hidden chain-of-thought.

## Level Map

| Level | Aliases | Use For | Expected Output |
| --- | --- | --- | --- |
| `quick` | fast, low, scan, smoke, 快速, 简短 | Low-risk changes, first sanity checks, time-limited reviews | Gate, top blockers, obvious missing evidence |
| `standard` | normal, medium, balanced, default, 普通, 标准 | Default implementation or plan review | Gate, prioritized issues, required fixes, next steps |
| `deep` | high, rigorous, thorough, 深度, 深入 | Research claims, nontrivial code, architecture, paper claims | Gate, evidence audit, edge cases, hidden assumptions, test gaps |
| `adversarial` | strict, critic, red-team, reviewer 2, 挑剔, 严格 | Pre-submission checks, high-stakes claims, suspected weak work | Rejection risks, strongest objections, required proof/fixes |
| `committee` | max, exhaustive, panel, 最大, 多视角 | Major milestones or final paper/implementation approval | Separate reviewer perspectives, disagreements, consensus gate |

## Selection Rules

1. Use the user's explicit level if provided.
2. If the user says "GPT Pro", "最高", "最大", "very critical", or asks for final approval, use `committee` unless they request speed.
3. Use `deep` for paper claims, research evidence, or architecture unless the user asks for quick feedback.
4. Use `adversarial` when the user asks for rejection risk, reviewer-2 style critique, red-team review, or "挑毛病".
5. Use `standard` for ordinary loop reviews.
6. Use `quick` only when the user asks for speed, triage, smoke review, or obvious blockers.

## Prompt Behavior By Level

`quick`:
- Ask ChatGPT to avoid broad rewrites.
- Focus on blockers, obvious missing tests, and the next single action.

`standard`:
- Ask for practical correctness, scope, test coverage, and gate decision.
- Limit optional suggestions so Codex can execute immediately.

`deep`:
- Ask for evidence audit, edge cases, unstated assumptions, and failure modes.
- Require every major concern to cite the artifact section, code reference, or missing evidence.

`adversarial`:
- Ask for the strongest case against approval.
- Require a separation between fatal blockers, serious concerns, and speculative objections.

`committee`:
- Ask for separate short reviews from relevant perspectives.
- Require a consensus gate, dissenting concerns, and a unified next-step plan.

Never request hidden reasoning. Request concise rationale and externally checkable evidence instead.
