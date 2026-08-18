import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence, computeAssurance } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: interop", "profile: protected", "allowed_paths: [src]", "required_checks:", "  - id: unit", "budget:", "  tokens: 20", "  enforce: true", "claims:", "  - id: tested-auth", "    status: completed", ""].join("\n"));
const trust = { repository_id: "repo", current_head_sha: "head", workflow_ref: "workflow@main", trusted_workflows: ["workflow@main"] };
const ci = adaptEvidence({ source: { kind: "maintainer_ci" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "ci", run_id: "r" }, trust_context: trust });
const omk = adaptEvidence({ source: { kind: "omk_v3" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "omk", run_id: "r" }, trust_context: trust });
const trace = parseTraceText([JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "run_finished", producer: { id: "p" }, data: { claims: ["tested-auth"] } })].join("\n"));

test("OMK and maintainer CI with equivalent independent trust context compute the same assurance", () => {
  assert.equal(computeAssurance(omk), "E2-candidate"); assert.equal(computeAssurance(ci), "E2-candidate");
  assert.equal(evaluate(manifest, trace, omk).gate_verdict, evaluate(manifest, trace, ci).gate_verdict);
});

test("protected verifier-surface change fails without approval and warns with approval", () => {
  const changed = { ...ci, trust: { ...ci.trust, verifier_surface_changed: true } };
  assert.equal(evaluate(manifest, trace, changed).gate_verdict, "fail");
  const approvedManifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: interop", "profile: protected", "allowed_paths: [src]", "required_checks:", "  - id: unit", "budget:", "  tokens: 20", "  enforce: true", "exceptions: [surface-approved]", ""].join("\n"));
  const usageTrace = parseTraceText([JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "usage", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "model_usage", producer: { id: "p" }, data: { total_tokens: 1 } }), JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "finish", sequence: 2, timestamp: "2026-08-17T00:00:01.000Z", event_type: "run_finished", producer: { id: "p" }, data: { claims: ["tested-auth"] } })].join("\n"));
  assert.equal(evaluate(approvedManifest, usageTrace, changed).gate_verdict, "warn");
});

test("C2 claims are matched by stable ID, not natural-language text", () => {
  const missing = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: "e1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "run_finished", producer: { id: "p" }, data: { claims: ["different-id"], summary: "tested auth completely" } }));
  const report = evaluate(manifest, missing, ci);
  assert.equal(report.gate_verdict, "fail"); assert.ok(report.reason_codes.includes("AEG021"));
});
