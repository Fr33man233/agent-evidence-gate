import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";
import { readGitFacts } from "../src/git.js";

function git(root: string, args: string[]): void { const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true }); assert.equal(result.status, 0, result.stderr); }

test("bundled CLI verifies a committed repository with JSON and Markdown reports", () => {
  const root = mkdtempSync(join(tmpdir(), "aeg-cli-repo-"));
  const inputs = mkdtempSync(join(tmpdir(), "aeg-cli-inputs-"));
  try {
    git(root, ["init", "--initial-branch=main"]); git(root, ["config", "user.email", "aeg-test@example.invalid"]); git(root, ["config", "user.name", "AEG Synthetic Test"]);
    writeFileSync(join(root, "README.md"), "synthetic\n", "utf8"); git(root, ["add", "README.md"]); git(root, ["commit", "-m", "fixture"]);
    const facts = readGitFacts(root);
    writeFileSync(join(inputs, "agent-task.yml"), ["schema_version: aeg-task/v1", "task_id: cli", "profile: pr", "allowed_paths: [src]", "required_checks:", "  - id: unit", ""].join("\n"), "utf8");
    writeFileSync(join(inputs, "agent-trace.jsonl"), JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "run", event_id: "finish", sequence: 1, timestamp: "2026-08-18T00:00:00.000Z", event_type: "run_finished", producer: { id: "ci" }, data: {} }), "utf8");
    writeFileSync(join(inputs, "evidence.json"), JSON.stringify({ source: { kind: "maintainer_ci" }, subject: { repository_id: "repo", head_sha: facts.head }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "ci", run_id: "run" }, trust_context: { repository_id: "repo", current_head_sha: facts.head, workflow_ref: "ci@main", trusted_workflows: ["ci@main"], state_fingerprint: facts.fingerprint } }), "utf8");
    const jsonPath = join(inputs, "gate-report.json"); const markdownPath = join(inputs, "gate-report.md");
    const result = spawnSync(process.execPath, [resolve("dist/aeg.cjs"), "verify", "--manifest", join(inputs, "agent-task.yml"), "--trace", join(inputs, "agent-trace.jsonl"), "--evidence", join(inputs, "evidence.json"), "--repo", root, "--json", jsonPath, "--markdown", markdownPath], { encoding: "utf8", windowsHide: true });
    assert.equal(result.status, 0, result.stderr); const report = JSON.parse(result.stdout) as { gate_verdict: string; assurance_level: string }; assert.equal(report.gate_verdict, "pass"); assert.equal(report.assurance_level, "E2-candidate"); assert.match(readFileSync(jsonPath, "utf8"), /gate_verdict/); assert.match(readFileSync(markdownPath, "utf8"), /Agent Evidence Gate report/);
  } finally { rmSync(root, { recursive: true, force: true }); rmSync(inputs, { recursive: true, force: true }); }
});

