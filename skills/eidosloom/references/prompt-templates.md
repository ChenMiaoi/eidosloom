# Prompt Templates

Use these templates for the orchestration parts of Eidosloom. For implementation review, paper review, prompt/skill review, architecture review, or any review with a selected thinking level, use `$eidosloom-review` and its `references/review-templates.md`.

## Idea To Plan Package

```text
You are advising an iterative research/coding workflow called Eidosloom.
Your job is to convert a raw idea into a first implementation plan package that Codex can execute.

Raw idea:
{idea}

Project/repository context:
{context}

Constraints and non-goals:
{constraints}

Available evidence or prior work:
{evidence}

Privacy or data limits:
{privacy_limits}

Please return:
1. Problem framing in 3-5 sentences.
2. First-round objective and explicit non-goals.
3. Assumptions and unknowns, separated.
4. Executable Codex plan in 5-8 steps.
5. Acceptance checks/tests/evidence to collect.
6. Roadmap with 2-4 later rounds.
7. Review packet checklist for the next ChatGPT implementation review.

Keep the plan scoped: prefer the smallest useful implementation slice over a broad roadmap.
```

## Roadmap Rewrite

```text
You are rewriting an Eidosloom roadmap after a review cycle.

Original idea:
{idea}

Previous roadmap:
{previous_roadmap}

Latest review decision and rationale:
{review_decision}

Implementation evidence:
{evidence}

User constraints or new direction:
{constraints}

Please return:
1. Updated goal statement.
2. Ordered roadmap rounds with purpose, deliverables, and exit criteria.
3. Items to remove, defer, or explicitly avoid.
4. Dependencies and decision points.
5. The next Codex execution slice.
```

## Paper Drafting

```text
You are advising on a paper that should be grounded in an implemented Eidosloom project.

Research idea:
{idea}

Approved implementation summary:
{implementation_summary}

Evidence, experiments, examples, or evaluation results:
{evidence}

Known limitations:
{limitations}

Target venue or audience:
{audience}

Related work or citations already known:
{related_work}

Please return:
1. Paper thesis and contribution claim.
2. Recommended outline with section goals.
3. Claims that are supported by current evidence.
4. Claims that need more evidence or should be weakened.
5. Missing experiments, examples, or citations.
6. First drafting task Codex should execute.
```
