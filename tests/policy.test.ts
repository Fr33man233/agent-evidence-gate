import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: task", "profile: pr", "allowed_paths: [src]", "denied_paths: [.github/workflows]", "sensitive_paths: [.env]", "required_checks:", "  - id: unit", ""].join("\n"));
const trace = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "run_finished", producer: { id: "p" }, data: { termination: "completed", exit_code: 0 } }));
const base = { source: { kind: "maintainer_ci" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "ci", run_id: "r" }, trust_context: { repository_id: "repo", current_head_sha: "head", workflow_ref: "workflow@main", trusted_workflows: ["workflow@main"] } };

test("allows equivalent trusted CI evidence in PR profile", () => {
  const report = evaluate(manifest, trace, adaptEvidence(base));
  assert.equal(report.gate_verdict, "pass"); assert.equal(report.assurance_level, "E2-candidate");
});
test("does not upgrade OMK self-report to E2 candidate", () => {
  const report = evaluate(manifest, trace, adaptEvidence({ ...base, source: { kind: "omk_v3" }, claimed_assurance: "E2", trust_context: { repository_id: "repo", current_head_sha: "head" } }));
  assert.equal(report.gate_verdict, "fail"); assert.ok(report.reason_codes.includes("AEG070"));
});
test("fails stale state and failed command", () => {
  const report = evaluate(manifest, trace, adaptEvidence({ ...base, subject: { repository_id: "repo", head_sha: "old" }, check: { check_id: "unit", termination: "completed", exit_code: 1 } }));
  assert.equal(report.gate_verdict, "fail"); assert.deepEqual(report.reason_codes, ["AEG003", "AEG020", "AEG070"]);
});
