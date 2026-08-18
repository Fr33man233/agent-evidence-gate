import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const text = [
  "schema_version: aeg-task/v1", "task_id: contract-task", "profile: protected", "allowed_paths: [src]", "denied_paths: []", "sensitive_paths: []",
  "required_checks:", "  - id: unit", "dependency_policy:", "  lockfile_required: true", "  denied: [left-pad]", "budget:", "  tokens: 10", "  duration_ms: 1000", "  enforce: true",
  "test_surface: [test]", "verifier_surface: [.github/workflows]", "claims:", "  - id: C2-verified", "    status: completed", "exceptions: [surface-approved]", "",
].join("\n");
const evidence = adaptEvidence({ source: { kind: "maintainer_ci" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "ci", run_id: "r" }, trust_context: { repository_id: "repo", current_head_sha: "head", workflow_ref: "workflow@main", trusted_workflows: ["workflow@main"] } });

test("preserves every structured manifest policy field without parsing C0 prose", () => {
  const manifest = parseManifestText(text);
  assert.deepEqual(manifest.budget, { tokens: 10, duration_ms: 1000, enforce: true });
  assert.deepEqual(manifest.dependency_policy, { lockfile_required: true, denied: ["left-pad"] });
  assert.deepEqual(manifest.claims, [{ id: "C2-verified", status: "completed" }]);
  assert.deepEqual(manifest.test_surface, ["test"]);
  assert.deepEqual(manifest.verifier_surface, [".github/workflows"]);
});

test("fails known token overage and missing enforced usage in protected profile", () => {
  const manifest = parseManifestText(text);
  const over = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "model_usage", producer: { id: "p" }, data: { total_tokens: 11 } }) + "\n" + JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e2", sequence: 2, timestamp: "2026-08-17T00:00:01.000Z", event_type: "run_finished", producer: { id: "p" }, data: {} }));
  const missing = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "run_finished", producer: { id: "p" }, data: {} }));
  assert.ok(evaluate(manifest, over, evidence).reason_codes.includes("AEG050"));
  assert.ok(evaluate(manifest, missing, evidence).reason_codes.includes("AEG050"));
});

test("blocks denied dependencies and requires review for test surface changes", () => {
  const manifest = parseManifestText(text.replace("profile: protected", "profile: pr"));
  const trace = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "file_written", producer: { id: "p" }, data: { path: "test/new.spec.ts", dependencies: ["left-pad"] } }) + "\n" + JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e2", sequence: 2, timestamp: "2026-08-17T00:00:01.000Z", event_type: "run_finished", producer: { id: "p" }, data: {} }));
  const report = evaluate(manifest, trace, evidence);
  assert.ok(report.reason_codes.includes("AEG040"));
  assert.ok(report.reason_codes.includes("AEG060"));
});
