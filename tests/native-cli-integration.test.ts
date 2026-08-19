import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { computeOmkCoreDigest } from "../src/omk-receipt.js";
import { captureWorkspaceFingerprint } from "../src/git.js";

function git(root: string, args: string[]): void {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
}

test("bundled CLI accepts native receipts and rejects removed evidence input", () => {
  const root = mkdtempSync(join(tmpdir(), "aeg-native-cli-repo-"));
  const inputs = mkdtempSync(join(tmpdir(), "aeg-native-cli-inputs-"));
  try {
    git(root, ["init", "--initial-branch=main"]);
    git(root, ["config", "user.email", "aeg-test@example.invalid"]);
    git(root, ["config", "user.name", "AEG Synthetic Test"]);
    mkdirSync(join(root, "src"));
    writeFileSync(join(root, "src", "covered.ts"), "initial\n", "utf8");
    git(root, ["add", "."]); git(root, ["commit", "-m", "fixture"]);

    const workspace = captureWorkspaceFingerprint(root, { root, artifactPaths: ["src/covered.ts"] });
    const core = {
      schemaVersion: 3, receiptId: "cli-fixture-001", goalId: "cli-goal", claim: "synthetic",
      command: { kind: "shell", shell: "pwsh", script: "node scripts/check.mjs" }, cwd: root.replaceAll("\\", "/"),
      timeoutMs: 1000, startedAt: "2026-08-19T00:00:00.000Z", finishedAt: "2026-08-19T00:00:01.000Z", durationMs: 1000,
      status: "passed", exitCode: 0, workspaceBefore: workspace, workspaceAfter: workspace,
      output: { redactionPolicyId: "synthetic", stdout: { sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", byteCount: 0 }, stderr: { sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", byteCount: 0 } },
      executor: "internal",
    };
    writeFileSync(join(inputs, "receipt.json"), JSON.stringify({ core, envelope: { coreSha256: computeOmkCoreDigest(core) } }), "utf8");
    writeFileSync(join(inputs, "agent-task.yml"), [
      "schema_version: aeg-task/v2", "task_id: cli", "profile: local", "omk_goal_id: cli-goal", "required_checks:",
      "  - id: unit", "    command:", "      kind: shell", "      script: node scripts/check.mjs", "      shell: pwsh", "    cwd: .", "",
    ].join("\n"), "utf8");
    writeFileSync(join(inputs, "agent-trace.jsonl"), JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "cli-goal", event_id: "finish", sequence: 1, timestamp: "2026-08-19T00:00:01.000Z", event_type: "run_finished", producer: { id: "synthetic" }, data: {} }), "utf8");

    const bundle = resolve("dist/aeg.cjs");
    const success = spawnSync(process.execPath, [bundle, "verify", "--manifest", join(inputs, "agent-task.yml"), "--trace", join(inputs, "agent-trace.jsonl"), "--receipts", join(inputs, "receipt.json"), "--repo", root], { encoding: "utf8", windowsHide: true });
    assert.equal(success.status, 0, success.stderr);
    assert.equal((JSON.parse(success.stdout) as { gate_verdict: string }).gate_verdict, "pass");

    const removed = spawnSync(process.execPath, [bundle, "verify", "--manifest", join(inputs, "agent-task.yml"), "--trace", join(inputs, "agent-trace.jsonl"), "--evidence", join(inputs, "receipt.json")], { encoding: "utf8", windowsHide: true });
    assert.equal(removed.status, 64);
    assert.match(removed.stderr, /AEG usage error/);
  } finally {
    rmSync(root, { recursive: true, force: true }); rmSync(inputs, { recursive: true, force: true });
  }
});
