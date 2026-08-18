import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const evidence = adaptEvidence({ source: { kind: "maintainer_ci" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "ci", run_id: "run" }, trust_context: { repository_id: "repo", current_head_sha: "head", workflow_ref: "ci@main", trusted_workflows: ["ci@main"] } });
const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: self", "profile: pr", "allowed_paths: [src]", "budget:", "  retries: 2", "required_checks:", "  - id: unit", ""].join("\n"));
const line = (event_type: string, sequence: number, data: Record<string, unknown>) => JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "run", event_id: `${event_type}-${sequence}`, sequence, timestamp: "2026-08-18T00:00:00.000Z", event_type, producer: { id: "producer" }, data });

test("AEG022 surfaces a self-verification claim without treating it as independent proof", () => {
  const trace = parseTraceText(line("run_finished", 1, { self_verified: true }));
  const report = evaluate(manifest, trace, evidence);
  assert.equal(report.gate_verdict, "warn"); assert.ok(report.reason_codes.includes("AEG022"));
});

test("retry budget counts retry events deterministically", () => {
  const trace = parseTraceText([line("retry", 1, { attempt: 1 }), line("retry", 2, { attempt: 2 }), line("run_finished", 3, {})].join("\n"));
  assert.equal(evaluate(manifest, trace, evidence).gate_verdict, "pass");
  const over = parseTraceText([line("retry", 1, { attempt: 1 }), line("retry", 2, { attempt: 2 }), line("retry", 3, { attempt: 3 }), line("run_finished", 4, {})].join("\n"));
  assert.equal(evaluate(manifest, over, evidence).gate_verdict, "fail");
});

