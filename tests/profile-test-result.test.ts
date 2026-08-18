import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const evidence = adaptEvidence({ source: { kind: "omk_v3" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "omk", run_id: "r" }, trust_context: { repository_id: "repo", current_head_sha: "head" } });
function manifest(profile: "local" | "pr" | "protected") { return parseManifestText(["schema_version: aeg-task/v1", "task_id: profile", `profile: ${profile}`, "allowed_paths: [src]", "required_checks:", "  - id: unit", ...(profile === "protected" ? ["budget:", "  tokens: 20", "  enforce: true"] : []), ""].join("\n")); }
function trace(data: Record<string, unknown>) { return parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "test_result", producer: { id: "p" }, data }) + "\n" + JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e2", sequence: 2, timestamp: "2026-08-17T00:00:01.000Z", event_type: "run_finished", producer: { id: "p" }, data: {} })); }

test("local E1 is warn while PR and protected E1 fail", () => {
  assert.equal(evaluate(manifest("local"), trace({ failed: 0, skipped: 0, cancelled: 0 }), evidence).gate_verdict, "warn");
  assert.equal(evaluate(manifest("pr"), trace({ failed: 0, skipped: 0, cancelled: 0 }), evidence).gate_verdict, "fail");
  assert.equal(evaluate(manifest("protected"), trace({ failed: 0, skipped: 0, cancelled: 0 }), evidence).gate_verdict, "fail");
});

test("skipped tests warn and failed or cancelled tests fail", () => {
  assert.ok(evaluate(manifest("pr"), trace({ failed: 0, skipped: 2, cancelled: 0 }), evidence).reason_codes.includes("AEG021"));
  assert.equal(evaluate(manifest("pr"), trace({ failed: 1, skipped: 0, cancelled: 0 }), evidence).gate_verdict, "fail");
  assert.equal(evaluate(manifest("pr"), trace({ failed: 0, skipped: 0, cancelled: 1 }), evidence).gate_verdict, "fail");
});
