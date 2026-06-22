import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const cli = join(repoRoot, "dist", "cli.js");
const pyBuilder = join(repoRoot, "skills", "eidosloom-review", "scripts", "build_review_packet.py");
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
  return text.replace(/- Created at: .+/g, "- Created at: <timestamp>");
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
  assert.match(packet, /- Require-Pro satisfied: false/);
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

console.log("review contract tests passed");
