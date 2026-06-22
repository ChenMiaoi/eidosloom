#!/usr/bin/env node

import { existsSync } from "node:fs";
import { cp, mkdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { fileURLToPath } from "node:url";

const skillNames = ["eidosloom", "eidosloom-review"] as const;

const levelInstructions = {
  quick:
    "Fast triage. Focus on blockers, obvious missing evidence, and the next single action. Avoid broad rewrites.",
  standard:
    "Balanced review. Check correctness, scope, tests, required fixes, optional improvements, and next actions.",
  deep:
    "Rigorous review. Audit evidence, edge cases, assumptions, failure modes, and test gaps. Tie concerns to artifacts or missing evidence.",
  adversarial:
    "Skeptical review. Make the strongest case against approval, separating fatal blockers, serious concerns, and speculative objections.",
  committee:
    "Multi-perspective review. Provide short reviews from relevant perspectives, dissenting concerns, a consensus gate, and one unified next-step plan.",
} as const;

type SkillName = (typeof skillNames)[number];
type ReviewLevel = keyof typeof levelInstructions;

type InstallOptions = {
  codexHome?: string;
  repoRoot?: string;
};

type SkillPath = {
  name: SkillName;
  source: string;
  destination: string;
};

type ResolvedPaths = {
  codexHome: string;
  repoRoot: string;
  skills: SkillPath[];
};

const levelAliases: Record<string, ReviewLevel> = {
  quick: "quick",
  fast: "quick",
  low: "quick",
  scan: "quick",
  smoke: "quick",
  "快速": "quick",
  standard: "standard",
  normal: "standard",
  medium: "standard",
  balanced: "standard",
  default: "standard",
  "普通": "standard",
  "标准": "standard",
  deep: "deep",
  high: "deep",
  rigorous: "deep",
  thorough: "deep",
  "深度": "deep",
  "深入": "deep",
  adversarial: "adversarial",
  strict: "adversarial",
  critic: "adversarial",
  "red-team": "adversarial",
  "reviewer-2": "adversarial",
  "挑剔": "adversarial",
  "严格": "adversarial",
  committee: "committee",
  max: "committee",
  maximum: "committee",
  exhaustive: "committee",
  panel: "committee",
  "最大": "committee",
  "多视角": "committee",
};

const reviewTargets = new Set(["plan", "implementation", "roadmap", "paper", "prompt-skill", "architecture"]);

function usage(): string {
  return [
    "eidosloom <command>",
    "",
    "Commands:",
    "  install        Install bundled Eidosloom skills into ~/.codex/skills",
    "  doctor         Check local installation state",
    "  paths          Print resolved installation paths",
    "  review-levels  Print available GPT web review levels",
    "  review-packet  Create a review packet Markdown file",
    "",
    "Review packet options:",
    "  --workspace <path>   Target workspace root (default: current directory)",
    "  --project <name>     Project name/slug (default: workspace folder name)",
    "  --round <number>     Eidosloom round number (default: 0)",
    "  --target <target>    plan|implementation|roadmap|paper|prompt-skill|architecture",
    "  --level <level>      quick|standard|deep|adversarial|committee, or an alias",
    "  --title <title>      Packet title",
    "  --out <path>         Output Markdown path",
    "  --force              Overwrite an existing packet",
    "",
    "Environment:",
    "  CODEX_HOME  Override the Codex home directory",
  ].join("\n");
}

function defaultCodexHome(): string {
  return process.env.CODEX_HOME || join(homedir(), ".codex");
}

function currentRepoRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return resolve(dirname(thisFile), "..");
}

function resolvePaths(options: InstallOptions = {}): ResolvedPaths {
  const codexHome = resolve(options.codexHome || defaultCodexHome());
  const repoRoot = resolve(options.repoRoot || currentRepoRoot());
  const skills = skillNames.map((name) => ({
    name,
    source: join(repoRoot, "skills", name),
    destination: join(codexHome, "skills", name),
  }));

  return { codexHome, repoRoot, skills };
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function backupExisting(destination: string): Promise<string | null> {
  if (!(await pathExists(destination))) {
    return null;
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backup = `${destination}.backup.${stamp}`;
  await rename(destination, backup);
  return backup;
}

async function installOneSkill(skill: SkillPath, codexHome: string): Promise<void> {
  if (!existsSync(join(skill.source, "SKILL.md"))) {
    throw new Error(`Bundled skill not found at ${skill.source}`);
  }

  await mkdir(join(codexHome, "skills"), { recursive: true });
  const backup = await backupExisting(skill.destination);
  await cp(skill.source, skill.destination, { recursive: true });

  console.log(`Installed ${skill.name} to ${skill.destination}`);
  if (backup) {
    console.log(`Previous installation moved to ${backup}`);
  }
}

async function installSkills(options: InstallOptions = {}): Promise<void> {
  const paths = resolvePaths(options);
  for (const skill of paths.skills) {
    await installOneSkill(skill, paths.codexHome);
  }
}

async function doctor(): Promise<void> {
  const paths = resolvePaths();

  console.log(`Platform: ${platform()}`);
  console.log(`Codex home: ${paths.codexHome}`);
  for (const skill of paths.skills) {
    const installed = existsSync(join(skill.destination, "SKILL.md"));
    const bundled = existsSync(join(skill.source, "SKILL.md"));
    console.log(`Bundled ${skill.name}: ${bundled ? "found" : "missing"} (${skill.source})`);
    console.log(`Installed ${skill.name}: ${installed ? "found" : "missing"} (${skill.destination})`);
  }
  console.log("Chrome automation: required at runtime through Codex Chrome support");
}

async function printPaths(): Promise<void> {
  const paths = resolvePaths();
  console.log(JSON.stringify(paths, null, 2));
}

function printReviewLevels(): void {
  for (const [level, instructions] of Object.entries(levelInstructions)) {
    console.log(`${level}: ${instructions}`);
  }
}

function parseOptions(args: string[]): Record<string, string | boolean> {
  const options: Record<string, string | boolean> = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }

    const key = arg.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      options[key] = true;
      continue;
    }

    options[key] = next;
    index += 1;
  }

  return options;
}

function stringOption(options: Record<string, string | boolean>, key: string, fallback: string): string {
  const value = options[key];
  return typeof value === "string" ? value : fallback;
}

function normalizeLevel(value: string): ReviewLevel {
  const key = value.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  const level = levelAliases[key];
  if (!level) {
    throw new Error(`Unknown review level: ${value}`);
  }
  return level;
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "project";
}

function reviewGate(target: string): string {
  if (target === "paper") {
    return "acceptable, revise, or blocked";
  }
  if (target === "prompt-skill" || target === "architecture") {
    return "accept, revise, or reject";
  }
  return "approved, changes-requested, blocked, or needs-user-decision";
}

function defaultReviewPacketPath(workspace: string, project: string, round: number, target: string): string {
  const root = join(workspace, "work", "eidosloom", project);
  if (target === "paper") {
    return join(root, "paper", "review-packet.md");
  }
  return join(root, `round-${String(round).padStart(2, "0")}`, "chatgpt-review-packet.md");
}

function buildReviewPacket(target: string, level: ReviewLevel, title: string): string {
  const gate = reviewGate(target);
  return `# Eidosloom Review Packet

## Metadata

- Title: ${title}
- Target: ${target}
- Review level: ${level}
- Created at: ${new Date().toISOString()}
- Requested gate: ${gate}

## Level Instructions

${levelInstructions[level]}

Do not reveal hidden chain-of-thought. Provide concise rationale, evidence, uncertainty, and actionable findings.

## User Objective


## Constraints And Non-Goals


## Evidence Available


## Artifacts To Review


## Verification Results


## Known Limitations Or Open Questions


## Requested Output

1. Gate decision: ${gate}.
2. Main reason for the decision.
3. Required fixes before approval or acceptance.
4. Optional improvements to defer.
5. Missing evidence, tests, citations, or edge cases.
6. Concrete next Codex steps.
7. Roadmap updates if applicable.
`;
}

async function writeReviewPacket(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const workspace = resolve(stringOption(options, "workspace", process.cwd()));
  const project = slugify(stringOption(options, "project", basename(workspace)));
  const round = Number.parseInt(stringOption(options, "round", "0"), 10);
  const target = stringOption(options, "target", "implementation");
  const level = normalizeLevel(stringOption(options, "level", "standard"));
  const title = stringOption(options, "title", "Untitled review");
  const force = options.force === true;

  if (!Number.isInteger(round) || round < 0) {
    throw new Error(`Invalid round number: ${String(options.round)}`);
  }
  if (!reviewTargets.has(target)) {
    throw new Error(`Unknown review target: ${target}`);
  }

  const out = resolve(stringOption(options, "out", defaultReviewPacketPath(workspace, project, round, target)));
  if (existsSync(out) && !force) {
    throw new Error(`Refusing to overwrite existing packet: ${out}`);
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buildReviewPacket(target, level, title), "utf8");
  console.log(`Wrote review packet: ${out}`);
  console.log(`Target: ${target}`);
  console.log(`Level: ${level}`);
}

async function main(): Promise<void> {
  const command = process.argv[2] || "help";

  if (command === "install") {
    await installSkills();
    return;
  }

  if (command === "doctor") {
    await doctor();
    return;
  }

  if (command === "paths") {
    await printPaths();
    return;
  }

  if (command === "review-levels") {
    printReviewLevels();
    return;
  }

  if (command === "review-packet") {
    await writeReviewPacket(process.argv.slice(3));
    return;
  }

  if (command === "help" || command === "--help" || command === "-h") {
    console.log(usage());
    return;
  }

  throw new Error(`Unknown command: ${command}\n\n${usage()}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
