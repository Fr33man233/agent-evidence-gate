import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const evidence = adaptEvidence({ source: { kind: "maintainer_ci" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "ci", run_id: "r" }, trust_context: { repository_id: "repo", current_head_sha: "head", workflow_ref: "workflow@main", trusted_workflows: ["workflow@main"] } });
const finished = (data: Record<string, unknown> = {}) => JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "finish", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "run_finished", producer: { id: "p" }, data });

test("missing sensitive-read observability warns in PR profile", () => {
  const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: f11", "profile: pr", "allowed_paths: [src]", "sensitive_paths: [.env]", "required_checks:", "  - id: unit", ""].join("\n"));
  const report = evaluate(manifest, parseTraceText(finished({ file_read_observable: false })), evidence);
  assert.equal(report.gate_verdict, "warn"); assert.ok(report.reason_codes.includes("AEG031"));
});

test("required lockfile policy fails when trace cannot establish a lockfile", () => {
  const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: f13", "profile: pr", "allowed_paths: [src]", "dependency_policy:", "  lockfile_required: true", "required_checks:", "  - id: unit", ""].join("\n"));
  const report = evaluate(manifest, parseTraceText(finished({ dependencies: ["safe-package"] })), evidence);
  assert.equal(report.gate_verdict, "fail"); assert.ok(report.reason_codes.includes("AEG040"));
});

test("rename crossing allowed and denied scope fails closed", () => {
  const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: f24", "profile: pr", "allowed_paths: [src]", "denied_paths: [docs]", "required_checks:", "  - id: unit", ""].join("\n"));
  const trace = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "rename", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "file_written", producer: { id: "p" }, data: { old_path: "src/old.ts", path: "docs/new.md", change_kind: "rename" } }));
  const report = evaluate(manifest, trace, evidence);
  assert.equal(report.gate_verdict, "fail"); assert.ok(report.reason_codes.includes("AEG010"));
});
