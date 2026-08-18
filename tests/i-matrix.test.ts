import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence, computeAssurance } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { renderJson } from "../src/report.js";
import { AegInputError } from "../src/safe.js";
import { parseTraceText } from "../src/trace.js";

const stamp = "2026-08-18T00:00:00.000Z";
const trust = { repository_id: "repo", current_head_sha: "head", workflow_ref: "ci@main", trusted_workflows: ["ci@main"] };
const manifest = (profile = "pr", extra: string[] = []) => parseManifestText(["schema_version: aeg-task/v1", "task_id: interop-matrix", `profile: ${profile}`, "allowed_paths: [src]", "required_checks:", "  - id: unit", ...extra, ""].join("\n"));
const line = (event_type: string, sequence: number, data: Record<string, unknown> = {}, event_id = `${event_type}-${sequence}`) => JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "run", event_id, sequence, timestamp: stamp, event_type, producer: { id: "producer" }, data });
const trace = (events: string[] = [line("run_finished", 1)]) => parseTraceText(events.join("\n"));
const evidence = (kind: "omk_v3" | "maintainer_ci" = "maintainer_ci", overrides: Record<string, unknown> = {}) => adaptEvidence({ source: { kind }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: kind, run_id: "run" }, trust_context: trust, ...overrides });

test("I00 OMK without external context remains E1 and fails PR", () => { const ev = evidence("omk_v3", { trust_context: {} }); assert.equal(computeAssurance(ev), "E1"); assert.equal(evaluate(manifest(), trace(), ev).gate_verdict, "fail"); });
test("I01 trusted maintainer CI reaches E2-candidate", () => { const ev = evidence("maintainer_ci"); assert.equal(computeAssurance(ev), "E2-candidate"); assert.equal(evaluate(manifest(), trace(), ev).gate_verdict, "pass"); });
test("I02 OMK self-claim cannot replace trust context", () => { const ev = evidence("omk_v3", { claimed_assurance: "E2", trust_context: {} }); assert.equal(evaluate(manifest(), trace(), ev).gate_verdict, "fail"); });
test("I03 stale head binding fails", () => { const ev = evidence("maintainer_ci", { subject: { repository_id: "repo", head_sha: "old" } }); assert.ok(evaluate(manifest(), trace(), ev).reason_codes.includes("AEG003")); });
test("I04 repository mismatch fails", () => { const ev = evidence("maintainer_ci", { trust_context: { ...trust, repository_id: "other" } }); assert.ok(evaluate(manifest(), trace(), ev).reason_codes.includes("AEG003")); });
test("I05 untrusted workflow is downgraded", () => { const ev = evidence("maintainer_ci", { trust_context: { ...trust, trusted_workflows: ["other@main"] } }); assert.equal(computeAssurance(ev), "E1"); assert.equal(evaluate(manifest(), trace(), ev).gate_verdict, "fail"); });
test("I06 unknown check is fail-closed", () => { const ev = evidence("maintainer_ci", { check: { check_id: "unknown", termination: "completed", exit_code: 0 } }); assert.ok(evaluate(manifest(), trace(), ev).reason_codes.includes("AEG020")); });
test("I07 cancelled or timeout termination cannot pass", () => { const ev = evidence("maintainer_ci", { check: { check_id: "unit", termination: "cancelled", exit_code: null } }); assert.ok(evaluate(manifest(), trace(), ev).reason_codes.includes("AEG020")); });
test("I08 non-zero exit cannot pass", () => { const ev = evidence("maintainer_ci", { check: { check_id: "unit", termination: "completed", exit_code: 7 } }); assert.ok(evaluate(manifest(), trace(), ev).reason_codes.includes("AEG020")); });
test("I09 protected surface change fails without approval", () => { const ev = evidence("maintainer_ci", { trust_context: { ...trust, verifier_surface_changed: true } }); const m = manifest("protected", ["budget:", "  tokens: 10", "  enforce: true"]); const t = trace([line("model_usage", 1, { total_tokens: 1 }), line("run_finished", 2)]); assert.ok(evaluate(m, t, ev).reason_codes.includes("AEG061")); });
test("I10 privacy sentinel is rejected before verdict", () => { assert.throws(() => parseTraceText(line("run_finished", 1, { summary: "AEG_PRIVATE_SENTINEL" })), (error: unknown) => error instanceof AegInputError && error.code === "AEG050"); });
test("I11 OMK and CI adapters share the same core verdict", () => { const t = trace(); assert.equal(evaluate(manifest(), t, evidence("omk_v3")).gate_verdict, evaluate(manifest(), t, evidence("maintainer_ci")).gate_verdict); });
test("I12 canonical report field order is stable across input key order", () => { const first = renderJson(evaluate(manifest(), trace([line("run_finished", 1, { z: 1, a: 2 })]), evidence())); const second = renderJson(evaluate(manifest(), trace([line("run_finished", 1, { a: 2, z: 1 })]), evidence())); assert.equal(first, second); });
test("I13 repeated verification is byte-identical", () => { const m = manifest(); const t = trace(); const ev = evidence(); assert.equal(renderJson(evaluate(m, t, ev)), renderJson(evaluate(m, t, ev))); });
test("I14 malformed, duplicate, and oversized traces fail preflight", () => {
  assert.throws(() => parseTraceText("{"), (error: unknown) => error instanceof AegInputError && error.code === "AEG002");
  const duplicate = line("run_finished", 1).replace("\"data\":{}", "\"data\":{},\"data\":{}");
  assert.throws(() => parseTraceText(duplicate), (error: unknown) => error instanceof AegInputError && error.code === "AEG002");
  assert.throws(() => parseTraceText(line("run_finished", 1, { summary: "x".repeat(262145) })), (error: unknown) => error instanceof AegInputError);
});
test("I15 adapter success cannot override a core non-zero conflict", () => { const ev = evidence("maintainer_ci", { check: { check_id: "unit", termination: "completed", exit_code: 9 } }); assert.equal(computeAssurance(ev), "E2-candidate"); assert.equal(evaluate(manifest(), trace(), ev).gate_verdict, "fail"); });
