import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { normalizeChangedPaths } from "../src/git.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { renderJson } from "../src/report.js";
import { AegInputError, LIMITS } from "../src/safe.js";
import { parseTraceText } from "../src/trace.js";

const stamp = "2026-08-18T00:00:00.000Z";
const trusted = { repository_id: "repo", current_head_sha: "head", workflow_ref: "ci@main", trusted_workflows: ["ci@main"] };
const evidence = (overrides: Record<string, unknown> = {}) => adaptEvidence({ source: { kind: "maintainer_ci" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "ci", run_id: "run" }, trust_context: trusted, ...overrides });
function manifest(profile = "pr", lines: string[] = []): ReturnType<typeof parseManifestText> { return parseManifestText(["schema_version: aeg-task/v1", "task_id: matrix", `profile: ${profile}`, "allowed_paths: [src, tests]", "required_checks:", "  - id: unit", ...lines, ""].join("\n")); }
function event(event_type: string, sequence: number, data: Record<string, unknown> = {}, event_id = `${event_type}-${sequence}`): string { return JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "run", event_id, sequence, timestamp: stamp, event_type, producer: { id: "producer" }, data }); }
function trace(events: string[] = [event("run_finished", 1)]): ReturnType<typeof parseTraceText> { return parseTraceText(events.join("\n")); }
function report(profile = "pr", lines: string[] = [], events: string[] = [event("run_finished", 1)], ev = evidence()) { return evaluate(manifest(profile, lines), trace(events), ev); }
function expectInputFailure(fn: () => unknown, code?: string): void { assert.throws(fn, (error: unknown) => error instanceof AegInputError && (code === undefined || error.code === code)); }

test("F01 scope and trusted E2-candidate pass", () => assert.equal(report().gate_verdict, "pass"));
test("F02 local E1 is an explicit warning", () => assert.equal(report("local", [], [event("run_finished", 1)], evidence({ trust_context: { repository_id: "repo", current_head_sha: "head" } })).gate_verdict, "warn"));
test("F03 PR E1 fails assurance gate", () => assert.equal(report("pr", [], [event("run_finished", 1)], evidence({ trust_context: {} })).gate_verdict, "fail"));
test("F04 unknown required check fails", () => assert.ok(report("pr", [], [event("run_finished", 1)], evidence({ check: { check_id: "unknown", termination: "completed", exit_code: 0 } })).reason_codes.includes("AEG020")));
test("F05 non-zero check fails", () => assert.ok(report("pr", [], [event("run_finished", 1)], evidence({ check: { check_id: "unit", termination: "completed", exit_code: 9 } })).reason_codes.includes("AEG020")));
test("F06 stale subject fails state binding", () => assert.ok(report("pr", [], [event("run_finished", 1)], evidence({ subject: { repository_id: "repo", head_sha: "old" } })).reason_codes.includes("AEG003")));
test("F07 claim IDs must match", () => assert.ok(report("pr", ["claims:", "  - id: claim-a", "    status: completed"], [event("run_finished", 1, { claims: ["claim-b"] })]).reason_codes.includes("AEG021")));
test("F08 changed path outside scope fails", () => assert.ok(report("pr", [], [event("file_written", 1, { path: "docs/readme.md" }), event("run_finished", 2)]).reason_codes.includes("AEG010")));
test("F09 traversal path fails closed", () => assert.ok(report("pr", [], [event("file_written", 1, { path: "../escape" }), event("run_finished", 2)]).reason_codes.includes("AEG010")));
test("F10 sensitive write fails without exception", () => assert.ok(report("pr", ["sensitive_paths: [.env]"], [event("file_written", 1, { path: ".env" }), event("run_finished", 2)]).reason_codes.includes("AEG030")));
test("F11 unavailable sensitive-read observability warns", () => assert.ok(report("pr", ["sensitive_paths: [.env]"], [event("run_finished", 1, { file_read_observable: false })]).reason_codes.includes("AEG031")));
test("F12 sensitive read fails without exception", () => assert.ok(report("pr", ["sensitive_paths: [.env]"], [event("file_read", 1, { path: ".env" }), event("run_finished", 2)]).reason_codes.includes("AEG031")));
test("F13 lockfile policy fails when unobserved", () => assert.ok(report("pr", ["dependency_policy:", "  lockfile_required: true"], [event("run_finished", 1)]).reason_codes.includes("AEG040")));
test("F14 ordinary budget missing usage warns", () => assert.equal(report("pr", ["budget:", "  tokens: 10"]).gate_verdict, "warn"));
test("F15 protected budget missing usage fails", () => assert.equal(report("protected", ["budget:", "  tokens: 10", "  enforce: true"]).gate_verdict, "fail"));
test("F15 protected budget with no measurable dimension fails", () => assert.ok(report("protected", ["budget:", "  enforce: true"]).reason_codes.includes("AEG050")));
test("F16 known token overage fails", () => assert.ok(report("pr", ["budget:", "  tokens: 1"], [event("model_usage", 1, { total_tokens: 2 }), event("run_finished", 2)]).reason_codes.includes("AEG050")));
test("F17 test-surface change warns in PR", () => assert.ok(report("pr", ["test_surface: [tests]"], [event("file_written", 1, { path: "tests/new.test.ts" }), event("run_finished", 2)]).reason_codes.includes("AEG060")));
test("F18 protected verifier-surface change fails without approval", () => assert.ok(report("protected", ["budget:", "  tokens: 10", "  enforce: true"], [event("model_usage", 1, { total_tokens: 1 }), event("run_finished", 2)], evidence({ trust_context: { ...trusted, verifier_surface_changed: true } })).reason_codes.includes("AEG061")));
test("F19 protected verifier-surface approval is visible warning", () => assert.equal(report("protected", ["budget:", "  tokens: 10", "  enforce: true", "exceptions: [surface-approved]"], [event("model_usage", 1, { total_tokens: 1 }), event("run_finished", 2)], evidence({ trust_context: { ...trusted, verifier_surface_changed: true } })).gate_verdict, "warn"));
test("F20 duplicate identity or sequence is rejected", () => expectInputFailure(() => parseTraceText([event("run_started", 1, {}, "same"), event("run_finished", 1, {}, "same")].join("\n")), "AEG002"));
test("F21 forbidden raw/private trace field is rejected", () => expectInputFailure(() => parseTraceText(event("run_finished", 1, { prompt: "do not store" })), "AEG050"));
test("F22 oversized JSONL line is rejected", () => expectInputFailure(() => parseTraceText(event("run_finished", 1, { summary: "x".repeat(LIMITS.jsonlLineBytes) })), "AEG003"));
test("F23 Windows case collision is rejected", () => expectInputFailure(() => normalizeChangedPaths(["src/File.ts", "src/file.ts"]), "AEG010"));
test("F24 rename crossing scope fails", () => assert.ok(report("pr", ["denied_paths: [docs]"], [event("file_written", 1, { old_path: "src/old.ts", path: "docs/new.md", change_kind: "rename" }), event("run_finished", 2)]).reason_codes.includes("AEG010")));
test("F25 skipped tests warn", () => assert.ok(report("pr", [], [event("test_result", 1, { skipped: 1 }), event("run_finished", 2)]).reason_codes.includes("AEG021")));
test("F26 cancelled tests fail", () => assert.ok(report("pr", [], [event("test_result", 1, { cancelled: 1 }), event("run_finished", 2)]).reason_codes.includes("AEG021")));
test("F27 untrusted E2 claim cannot upgrade assurance", () => assert.ok(report("pr", [], [event("run_finished", 1)], evidence({ claimed_assurance: "E2", trust_context: {} })).reason_codes.includes("AEG070")));
test("F28 equivalent input renders byte-identical JSON", () => assert.equal(renderJson(report()), renderJson(report())));
