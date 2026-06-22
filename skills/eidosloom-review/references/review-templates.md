# Review Templates

Use one template based on target. Add the selected review level and level-specific behavior from `review-levels.md`.

## Shared Header

```text
You are reviewing an Eidosloom artifact through ChatGPT web.

Review target: {target}
Review level: {level}
Level instructions:
{level_instructions}

Do not reveal hidden chain-of-thought. Provide concise rationale, evidence, uncertainty, and actionable findings.

User objective:
{objective}

Constraints and non-goals:
{constraints}

Evidence available:
{evidence}

Open questions:
{open_questions}
```

## Plan Review

```text
Plan or roadmap:
{plan}

Please return:
1. Gate decision: approved, changes-requested, blocked, or needs-user-decision.
2. Main reason for the decision.
3. Missing assumptions, scope errors, or research risks.
4. Required changes before Codex implements.
5. Revised executable plan in 3-6 steps.
6. Acceptance checks and evidence to collect.
```

## Implementation Review

```text
Current plan:
{plan}

Implementation summary:
{implementation_summary}

Changed files or important code references:
{changed_files}

Verification results:
{verification}

Known limitations or failures:
{open_issues}

Please return:
1. Gate decision: approved, changes-requested, blocked, or needs-user-decision.
2. Main reason for the decision.
3. Required fixes before approval.
4. Optional improvements to defer.
5. Missing tests, evidence, or edge cases.
6. Revised next Codex steps.
7. Roadmap updates, including what to remove or defer.
```

## Roadmap Review

```text
Original idea:
{idea}

Previous roadmap:
{previous_roadmap}

Latest implementation or review evidence:
{evidence}

Proposed next direction:
{proposal}

Please return:
1. Updated goal statement.
2. Gate decision for the proposed direction.
3. Ordered roadmap rounds with deliverables and exit criteria.
4. Items to remove, defer, or explicitly avoid.
5. Dependencies and decision points.
6. The next Codex execution slice.
```

## Paper Review

```text
Paper draft or section:
{draft}

Implementation/evidence summary:
{evidence}

Target venue or audience:
{audience}

Known limitations:
{limitations}

Please return:
1. Gate decision: acceptable, revise, or blocked.
2. Highest-priority issues with section references.
3. Unsupported, overstated, or unclear claims.
4. Missing citations, experiments, or limitations.
5. Structure and argument improvements.
6. Concrete revision plan for Codex.

Do not invent citations or results. Mark uncertainty explicitly.
```

## Prompt Or Skill Review

```text
Prompt or skill draft:
{draft}

Intended behavior:
{intended_behavior}

Example user requests:
{examples}

Please return:
1. Gate decision: accept, revise, or reject.
2. Trigger ambiguity or missing use cases.
3. Unsafe assumptions or privacy risks.
4. Workflow steps that are hard to execute or verify.
5. Suggested edits, prioritized.
6. A shorter revised version if useful.
```

## Architecture Review

```text
Goal:
{goal}

Existing system:
{system}

Options under consideration:
{options}

Constraints:
{constraints}

Please return:
1. Gate decision: accept, revise, or reject.
2. Recommended option and why.
3. Major tradeoffs and migration steps.
4. Failure modes and guardrails.
5. Evidence needed before claiming the design works.
6. Next Codex execution step.
```
