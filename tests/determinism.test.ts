import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { renderJson, exitCode } from "../src/report.js";
import { parseTraceText } from "../src/trace.js";

const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: deterministic", "profile: pr", "allowed_paths: [src]", "required_checks:", "  - id: unit", ""].join("\n"));
const evidence = adaptEvidence({ source: { kind: "maintainer_ci" }, subject: { head_sha: "head", repository_id: "repo" }, check: { exit_code: 0, termination: "completed", check_id: "unit" }, producer: { run_id: "r", id: "ci" }, trust_context: { current_head_sha: "head", repository_id: "repo", workflow_ref: "workflow@main", trusted_workflows: ["workflow@main"] } });
const trace = parseTraceText('{"data":{},"producer":{"id":"p"},"event_type":"run_finished","timestamp":"2026-08-17T00:00:01.000Z","sequence":1,"event_id":"e1","run_id":"r","schema_version":"aeg-trace/v1"}');

test("canonical JSON and exit code are byte-identical across repeated evaluation", () => {
  const first = evaluate(manifest, trace, evidence); const second = evaluate(manifest, trace, evidence);
  assert.equal(renderJson(first), renderJson(second)); assert.equal(exitCode(first), exitCode(second));
  assert.ok(first.findings.every((finding) => finding.evidence_refs.length > 0));
});
