import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(repoRoot, "dist", "cli.js");
const pyBuilder = join(repoRoot, "skills", "eidosloom-review", "scripts", "build_review_packet.py");
const pyContractValidator = join(repoRoot, "skills", "eidosloom-review", "scripts", "validate_review_contract.py");
const scaffold = join(repoRoot, "skills", "eidosloom", "scripts", "scaffold_eidosloom.py");
const python = process.env.PYTHON || (process.platform === "win32" ? "python" : "python3");

function tempWorkspace(name) {
  return mkdtempSync(join(tmpdir(), `${name}-`));
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }
  return result;
}

function expectFail(command, args, expectedText) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
  });
  assert.notEqual(result.status, 0, `${command} ${args.join(" ")} should fail`);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, expectedText);
  return result;
}

function read(path) {
  return readFileSync(path, "utf8");
}

function normalizePacket(text) {
  return text.replace(/\r\n/g, "\n").replace(/- Created at: .+/g, "- Created at: <timestamp>");
}

function sha256(text) {
  return createHash("sha256").update(text).digest("hex");
}

{
  const manifest = JSON.parse(read(join(repoRoot, "skills", "eidosloom", "references", "bundle-manifest.json")));
  const names = manifest.skills.map((skill) => skill.name);
  assert.deepEqual(names, ["eidosloom", "eidosloom-plan", "eidosloom-review"]);
  for (const name of names) {
    assert.equal(existsSync(join(repoRoot, "skills", name, "SKILL.md")), true, `${name} SKILL.md should exist`);
  }

  const paths = JSON.parse(run("node", [cli, "paths"]).stdout);
  assert.deepEqual(paths.skills.map((skill) => skill.name), names);
}

{
  const codexHomeRoot = tempWorkspace("eidosloom-install");
  const codexHome = join(codexHomeRoot, "codex home");
  run("node", [cli, "install"], {
    env: {
      ...process.env,
      CODEX_HOME: codexHome,
    },
  });
  for (const name of ["eidosloom", "eidosloom-plan", "eidosloom-review"]) {
    assert.equal(existsSync(join(codexHome, "skills", name, "SKILL.md")), true, `${name} should install`);
  }
}

{
  const workspace = tempWorkspace("eidosloom-plan-scope");
  run(python, [
    scaffold,
    "--workspace",
    workspace,
    "--project",
    "plan-only",
    "--round",
    "0",
    "--phase",
    "plan",
    "--scope",
    "plan",
    "--no-zip",
  ]);
  const root = join(workspace, "work", "eidosloom", "plan-only");
  const manifest = JSON.parse(read(join(root, "round-00", "manifest.json")));
  assert.equal(manifest.scope, "plan");
  assert.equal(existsSync(join(root, "round-00", "plan.md")), true);
  assert.equal(existsSync(join(root, "round-00", "codex-implementation-report.md")), false);
  assert.equal(existsSync(join(root, "paper", "draft.md")), false);
}

{
  const workspace = tempWorkspace("eidosloom-full-scope");
  run(python, [
    scaffold,
    "--workspace",
    workspace,
    "--project",
    "full",
    "--round",
    "0",
    "--phase",
    "plan",
    "--no-zip",
  ]);
  const root = join(workspace, "work", "eidosloom", "full");
  const manifest = JSON.parse(read(join(root, "round-00", "manifest.json")));
  assert.equal(manifest.scope, "full");
  assert.equal(existsSync(join(root, "round-00", "codex-implementation-report.md")), true);
  assert.equal(existsSync(join(root, "paper", "draft.md")), true);
}

{
  const workspace = tempWorkspace("eidosloom-neutral");
  run("node", [
    cli,
    "review-packet",
    "--workspace",
    workspace,
    "--project",
    "smoke",
    "--target",
    "custom",
    "--level",
    "deep",
    "--review-mode",
    "committee",
    "--ui-mode",
    "require-pro",
    "--observed-ui-label",
    "Pro",
    "--ui-selection-status",
    "selected",
    "--ui-selection-verified",
    "true",
    "--caller",
    "humanizer",
    "--rubric",
    "Preserve facts.",
    "--force",
  ]);

  const packet = read(join(workspace, "work", "humanizer", "smoke", "round-00", "chatgpt-review-packet.md"));
  assert.match(packet, /^# Review Packet\n/);
  assert.doesNotMatch(packet, /^# Eidosloom Review Packet\n/);
  assert.match(packet, /- Caller: humanizer/);
  assert.match(packet, /- Requested UI mode: require-pro/);
  assert.match(packet, /- Observed UI label: Pro/);
  assert.match(packet, /- Observed UI label accepted: true/);
  assert.match(packet, /- UI selection status: selected/);
  assert.match(packet, /- UI selection verified: true/);
  assert.match(packet, /- Require-Pro satisfied: true/);
  assert.match(packet, /- Requested gate: accept, revise, reject, or needs-user-decision/);
}

{
  const workspace = tempWorkspace("eidosloom-unverified");
  const out = join(workspace, "packet.md");
  run("node", [
    cli,
    "review-packet",
    "--workspace",
    workspace,
    "--target",
    "custom",
    "--level",
    "deep",
    "--review-mode",
    "committee",
    "--ui-mode",
    "require-pro",
    "--caller",
    "humanizer",
    "--out",
    out,
    "--force",
  ]);
  const packet = read(out);
  assert.match(packet, /- Requested gate: needs-user-decision/);
  assert.match(packet, /- Canonical gate options: needs-user-decision/);
  assert.match(packet, /- Observed UI label accepted: false/);
  assert.match(packet, /- Require-Pro satisfied: false/);
}

{
  const workspace = tempWorkspace("eidosloom-wrong-label");
  const out = join(workspace, "wrong-label.md");
  run("node", [
    cli,
    "review-packet",
    "--workspace",
    workspace,
    "--target",
    "custom",
    "--level",
    "deep",
    "--review-mode",
    "committee",
    "--ui-mode",
    "require-pro",
    "--observed-ui-label",
    "Free",
    "--ui-selection-status",
    "selected",
    "--ui-selection-verified",
    "true",
    "--caller",
    "humanizer",
    "--out",
    out,
    "--force",
  ]);
  const packet = read(out);
  assert.match(packet, /- Observed UI label: Free/);
  assert.match(packet, /- Observed UI label accepted: false/);
  assert.match(packet, /- Requested gate: needs-user-decision/);
  assert.match(packet, /- Canonical gate options: needs-user-decision/);
  assert.match(packet, /- Require-Pro satisfied: false/);
}

{
  const workspace = tempWorkspace("eidosloom-cn-pro-label");
  const out = join(workspace, "cn-pro-label.md");
  run("node", [
    cli,
    "review-packet",
    "--workspace",
    workspace,
    "--target",
    "custom",
    "--level",
    "deep",
    "--review-mode",
    "committee",
    "--ui-mode",
    "require-pro",
    "--observed-ui-label",
    "专业",
    "--ui-selection-status",
    "selected",
    "--ui-selection-verified",
    "true",
    "--caller",
    "humanizer",
    "--out",
    out,
    "--force",
  ]);
  const packet = read(out);
  assert.match(packet, /- Observed UI label: 专业/);
  assert.match(packet, /- Observed UI label accepted: true/);
  assert.match(packet, /- Requested gate: accept, revise, reject, or needs-user-decision/);
  assert.match(packet, /- Require-Pro satisfied: true/);
}

expectFail("node", [cli, "review-packet", "--workspace", tempWorkspace("eidosloom-bad"), "--ui-mdoe", "require-pro"], /Unknown option: --ui-mdoe/);
expectFail("node", [cli, "review-packet", "--workspace", tempWorkspace("eidosloom-bad"), "--ui-mode"], /Missing value for --ui-mode/);
expectFail("node", [cli, "review-packet", "--workspace", tempWorkspace("eidosloom-bad"), "--review-mode"], /Missing value for --review-mode/);
expectFail("node", [cli, "review-packet", "--workspace", tempWorkspace("eidosloom-bad"), "--round", "1abc"], /Invalid round number: 1abc/);
expectFail("node", [cli, "review-packet", "--workspace", tempWorkspace("eidosloom-bad"), "--level", "pro"], /not a review depth/);
expectFail("node", [
  cli,
  "review-packet",
  "--workspace",
  tempWorkspace("eidosloom-bad"),
  "--ui-selection-verified",
  "true",
], /requires --observed-ui-label/);

{
  const workspace = tempWorkspace("eidosloom-legacy");
  const out = join(workspace, "legacy.md");
  const result = run("node", [
    cli,
    "review-packet",
    "--workspace",
    workspace,
    "--target",
    "custom",
    "--level",
    "committee",
    "--caller",
    "humanizer",
    "--out",
    out,
    "--force",
  ]);
  const packet = read(out);
  assert.match(result.stderr, /Legacy --level committee/);
  assert.match(packet, /- Review depth: deep/);
  assert.match(packet, /- Review mode: committee/);
}

{
  const workspace = tempWorkspace("eidosloom-parity");
  const tsOut = join(workspace, "ts.md");
  const pyOut = join(workspace, "py.md");
  const args = [
    "--workspace",
    workspace,
    "--project",
    "parity",
    "--target",
    "custom",
    "--level",
    "deep",
    "--review-mode",
    "committee",
    "--ui-mode",
    "require-pro",
    "--observed-ui-label",
    "Pro",
    "--ui-selection-status",
    "selected",
    "--ui-selection-verified",
    "true",
    "--caller",
    "humanizer",
    "--rubric",
    "Preserve facts.",
    "--title",
    "Parity Review",
  ];

  run("node", [cli, "review-packet", ...args, "--out", tsOut, "--force"]);
  run(python, [pyBuilder, ...args, "--out", pyOut, "--force"]);
  assert.equal(normalizePacket(read(tsOut)), normalizePacket(read(pyOut)));
}

{
  expectFail(python, [
    pyBuilder,
    "--workspace",
    tempWorkspace("eidosloom-py-bad"),
    "--workspace",
    tempWorkspace("eidosloom-py-bad"),
  ], /Duplicate option: --workspace/);
}

{
  const fixtures = join(repoRoot, "skills", "eidosloom-review", "references", "fixtures");
  run(python, [pyContractValidator, "request", join(fixtures, "humanizer-request.json")]);
  run(python, [pyContractValidator, "result", join(fixtures, "humanizer-result.json")]);
  expectFail(
    python,
    [pyContractValidator, "request", join(fixtures, "humanizer-request-missing-invariants.json")],
    /semantic_invariants/,
  );
}

{
  const workspace = tempWorkspace("eidosloom-contract-hash");
  const artifactText = "Codex implemented the helper and ran the tests.\n";
  writeFileSync(join(workspace, "original.md"), artifactText);
  mkdirSync(join(workspace, "reviews"), { recursive: true });
  const request = {
    contract_version: "eidosloom-review-contract.v1",
    request_id: "hash-smoke",
    caller_skill: "humanizer",
    project_id: "style-rewrite",
    round_id: null,
    target: "custom",
    review_depth: "deep",
    review_mode: "committee",
    ui_mode: "require-pro",
    input_artifacts: [
      {
        id: "original",
        path: "original.md",
        sha256: sha256(artifactText),
      },
    ],
    output_dir: "reviews/hash-smoke",
    acceptance_checks: ["No new claims"],
    payload: {
      kind: "text-rewrite",
      original_text: artifactText,
      rewritten_text: "Codex wired up the helper and ran the tests.",
      target_style: "plain technical prose",
      semantic_invariants: ["Preserve the helper implementation claim"],
      forbidden_changes: ["Do not add performance results"],
      audience: "software engineers",
      purpose: "make the paragraph less generic",
      acceptance_checks: ["No new claims"],
    },
  };
  const requestPath = join(workspace, "request.json");
  writeFileSync(requestPath, `${JSON.stringify(request, null, 2)}\n`);
  run(python, [pyContractValidator, "request", requestPath, "--workspace", workspace, "--verify-hashes"]);

  request.input_artifacts[0].sha256 = "0".repeat(64);
  const stalePath = join(workspace, "stale-request.json");
  writeFileSync(stalePath, `${JSON.stringify(request, null, 2)}\n`);
  expectFail(
    python,
    [pyContractValidator, "request", stalePath, "--workspace", workspace, "--verify-hashes"],
    /sha256 mismatch/,
  );
}

console.log("review contract tests passed");
