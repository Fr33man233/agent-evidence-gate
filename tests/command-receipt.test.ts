import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: receipt", "profile: pr", "allowed_paths: [src]", "required_checks:", "  - id: unit", "    argv: [node, --test]", "    cwd: .", ""].join("\n"));
const evidence = adaptEvidence({ source: { kind: "maintainer_ci" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "ci", run_id: "r" }, trust_context: { repository_id: "repo", current_head_sha: "head", workflow_ref: "workflow@main", trusted_workflows: ["workflow@main"] } });
const event = (data: Record<string, unknown>) => JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "command_finished", producer: { id: "p" }, data });

test("accepts only structured command receipt summaries matching the manifest", () => {
  const trace = parseTraceText(event({ check_id: "unit", argv: ["node", "--test"], cwd: ".", termination: "completed", exit_code: 0, stdout: { summary: "redacted", bytes: 4 }, stderr: { summary: "empty", bytes: 0 } }) + "\n" + JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e2", sequence: 2, timestamp: "2026-08-17T00:00:01.000Z", event_type: "run_finished", producer: { id: "p" }, data: {} }));
  assert.equal(evaluate(manifest, trace, evidence).gate_verdict, "pass");
});

test("rejects command receipts with mismatched argv or raw output", () => {
  const mismatch = parseTraceText(event({ check_id: "unit", argv: ["npm", "test"], cwd: ".", termination: "completed", exit_code: 0 }) + "\n" + JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e2", sequence: 2, timestamp: "2026-08-17T00:00:01.000Z", event_type: "run_finished", producer: { id: "p" }, data: {} }));
  assert.ok(evaluate(manifest, mismatch, evidence).reason_codes.includes("AEG020"));
  assert.throws(() => parseTraceText(event({ check_id: "unit", argv: ["node", "--test"], cwd: ".", termination: "completed", exit_code: 0, stdout: "private output" })), (error: unknown) => error instanceof Error && "code" in error && error.code === "AEG050");
});
