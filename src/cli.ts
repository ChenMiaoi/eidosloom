#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, rename, stat, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { fileURLToPath } from "node:url";

const skillNames = ["eidosloom", "eidosloom-review"] as const;

type SkillName = (typeof skillNames)[number];

type ReviewPolicy = {
  depths: Record<string, { aliases: string[]; instruction: string }>;
  modes: Record<string, { aliases: string[]; instruction: string }>;
  uiModes: Record<string, { aliases: string[]; instruction: string }>;
  targets: string[];
  legacyLevelMappings: Record<string, { depth: string; mode: string; message: string }>;
  forbiddenLevelAliases: Record<string, string>;
};

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

type ReviewSelection = {
  depth: string;
  mode: string;
  uiMode: string;
  warnings: string[];
};

function usage(): string {
  return [
    "eidosloom <command>",
    "",
    "Commands:",
    "  install        Install bundled Eidosloom skills into ~/.codex/skills",
    "  doctor         Check local installation state",
    "  paths          Print resolved installation paths",
    "  review-levels  Print available review depth, mode, and UI mode options",
    "  review-packet  Create a review packet Markdown file",
    "",
    "Review packet options:",
    "  --workspace <path>       Target workspace root (default: current directory)",
    "  --project <name>         Project name/slug (default: workspace folder name)",
    "  --round <number>         Eidosloom round number (default: 0)",
    "  --target <target>        plan|implementation|roadmap|paper|prompt-skill|architecture|custom",
    "  --level <depth>          quick|standard|deep, or a depth alias",
    "  --review-mode <mode>     balanced|adversarial|committee",
    "  --ui-mode <mode>         auto|prefer-pro|require-pro",
    "  --caller <name>          Calling skill/workflow name",
    "  --rubric <text>          Caller-provided rubric for custom reviews",
    "  --title <title>          Packet title",
    "  --out <path>             Output Markdown path",
    "  --force                  Overwrite an existing packet",
    "",
    "Legacy:",
    "  --level adversarial      Maps to --level deep --review-mode adversarial",
    "  --level committee        Maps to --level deep --review-mode committee",
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

function loadReviewPolicy(): ReviewPolicy {
  const policyPath = join(currentRepoRoot(), "skills", "eidosloom-review", "references", "review-policy.json");
  return JSON.parse(readFileSync(policyPath, "utf8")) as ReviewPolicy;
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
  const policy = loadReviewPolicy();

  console.log("Depths:");
  for (const [name, item] of Object.entries(policy.depths)) {
    console.log(`  ${name}: ${item.instruction}`);
  }

  console.log("\nReview modes:");
  for (const [name, item] of Object.entries(policy.modes)) {
    console.log(`  ${name}: ${item.instruction}`);
  }

  console.log("\nUI modes:");
  for (const [name, item] of Object.entries(policy.uiModes)) {
    console.log(`  ${name}: ${item.instruction}`);
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

function canonicalKey(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
}

function normalizeFromSection(
  section: Record<string, { aliases: string[]; instruction: string }>,
  value: string,
  label: string,
): string {
  const key = canonicalKey(value);
  if (Object.hasOwn(section, key)) {
    return key;
  }

  for (const [name, item] of Object.entries(section)) {
    if (item.aliases.map(canonicalKey).includes(key)) {
      return name;
    }
  }

  throw new Error(`Unknown ${label}: ${value}`);
}

function selectReviewPolicy(policy: ReviewPolicy, levelValue: string, modeValue: string, uiModeValue: string): ReviewSelection {
  const warnings: string[] = [];
  const levelKey = canonicalKey(levelValue);
  let depth: string;
  let mode = normalizeFromSection(policy.modes, modeValue, "review mode");
  const uiMode = normalizeFromSection(policy.uiModes, uiModeValue, "UI mode");

  const forbidden = Object.entries(policy.forbiddenLevelAliases).find(([alias]) => canonicalKey(alias) === levelKey);
  if (forbidden) {
    throw new Error(forbidden[1]);
  }

  const legacy = policy.legacyLevelMappings[levelKey];
  if (legacy) {
    depth = legacy.depth;
    if (modeValue === "balanced") {
      mode = legacy.mode;
    }
    warnings.push(legacy.message);
  } else {
    depth = normalizeFromSection(policy.depths, levelValue, "review depth");
  }

  return { depth, mode, uiMode, warnings };
}

function slugify(value: string): string {
  const slug = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug || "project";
}

function reviewGate(target: string): string {
  if (target === "paper") {
    return "acceptable, revise, or blocked";
  }
  if (target === "prompt-skill" || target === "architecture" || target === "custom") {
    return "accept, revise, reject, or needs-user-decision";
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

function buildReviewPacket(
  policy: ReviewPolicy,
  target: string,
  selection: ReviewSelection,
  title: string,
  caller: string,
  rubric: string,
): string {
  const gate = reviewGate(target);
  const warningsBlock =
    selection.warnings.length > 0 ? `\n## Compatibility Notes\n\n${selection.warnings.map((warning) => `- ${warning}`).join("\n")}\n` : "";

  return `# Eidosloom Review Packet

## Metadata

- Title: ${title}
- Caller: ${caller}
- Target: ${target}
- Review depth: ${selection.depth}
- Review mode: ${selection.mode}
- Requested UI mode: ${selection.uiMode}
- Observed UI label:
- UI selection status: not-attempted
- UI selection verified: false
- Created at: ${new Date().toISOString()}
- Requested gate: ${gate}
- Canonical gate options: accept, revise, reject, needs-user-decision
${warningsBlock}
## Review Instructions

Depth: ${policy.depths[selection.depth].instruction}

Mode: ${policy.modes[selection.mode].instruction}

UI mode: ${policy.uiModes[selection.uiMode].instruction}

Do not reveal hidden chain-of-thought. Provide concise rationale, evidence, uncertainty, and actionable findings.

## Caller Rubric

${rubric}

## User Objective


## Constraints And Non-Goals


## Evidence Available


## Artifacts To Review


## Verification Results


## Known Limitations Or Open Questions


## Requested Output

1. Canonical gate decision: accept, revise, reject, or needs-user-decision.
2. Display gate for this target: ${gate}.
3. Main reason for the decision.
4. Required fixes before approval or acceptance.
5. Optional improvements to defer.
6. Missing evidence, tests, citations, or edge cases.
7. Concrete next Codex steps.
8. Roadmap or caller-specific updates if applicable.
`;
}

async function writeReviewPacket(args: string[]): Promise<void> {
  const options = parseOptions(args);
  const policy = loadReviewPolicy();
  const workspace = resolve(stringOption(options, "workspace", process.cwd()));
  const project = slugify(stringOption(options, "project", basename(workspace)));
  const round = Number.parseInt(stringOption(options, "round", "0"), 10);
  const target = stringOption(options, "target", "implementation");
  const levelValue = stringOption(options, "level", "standard");
  const modeValue = stringOption(options, "review-mode", "balanced");
  const uiModeValue = stringOption(options, "ui-mode", "auto");
  const title = stringOption(options, "title", "Untitled review");
  const caller = stringOption(options, "caller", "eidosloom");
  const rubric = stringOption(options, "rubric", "");
  const force = options.force === true;

  if (!Number.isInteger(round) || round < 0) {
    throw new Error(`Invalid round number: ${String(options.round)}`);
  }
  if (!policy.targets.includes(target)) {
    throw new Error(`Unknown review target: ${target}`);
  }

  const selection = selectReviewPolicy(policy, levelValue, modeValue, uiModeValue);
  const out = resolve(stringOption(options, "out", defaultReviewPacketPath(workspace, project, round, target)));
  if (existsSync(out) && !force) {
    throw new Error(`Refusing to overwrite existing packet: ${out}`);
  }

  await mkdir(dirname(out), { recursive: true });
  await writeFile(out, buildReviewPacket(policy, target, selection, title, caller, rubric), "utf8");
  console.log(`Wrote review packet: ${out}`);
  console.log(`Target: ${target}`);
  console.log(`Depth: ${selection.depth}`);
  console.log(`Review mode: ${selection.mode}`);
  console.log(`UI mode: ${selection.uiMode}`);
  for (const warning of selection.warnings) {
    console.warn(`Warning: ${warning}`);
  }
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
