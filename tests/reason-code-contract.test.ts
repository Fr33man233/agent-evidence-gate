import assert from "node:assert/strict";
import test from "node:test";
import { adaptEvidence } from "../src/adapters.js";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const manifest = parseManifestText(["schema_version: aeg-task/v1", "task_id: codes", "profile: pr", "allowed_paths: [src]", "sensitive_paths: [.env]", "required_checks:", "  - id: unit", ""].join("\n"));
const evidence = adaptEvidence({ source: { kind: "omk_v3" }, subject: { repository_id: "repo", head_sha: "head" }, check: { check_id: "unit", termination: "completed", exit_code: 0 }, producer: { id: "omk", run_id: "r" }, trust_context: { repository_id: "repo", current_head_sha: "head" } });

test("scope and sensitive access use the frozen reason-code contract", () => {
  const line = (id: string, sequence: number, event_type: string, path: string) => JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "r", event_id: id, sequence, timestamp: "2026-08-17T00:00:00.000Z", event_type, producer: { id: "p" }, data: { path } });
  const trace = parseTraceText([line("write", 1, "file_written", "outside.ts"), line("sensitive", 2, "file_written", ".env"), line("read", 3, "file_read", ".env"), line("finish", 4, "run_finished", "")].join("\n"));
  const report = evaluate(manifest, trace, evidence);
  assert.ok(report.reason_codes.includes("AEG010")); assert.ok(report.reason_codes.includes("AEG030")); assert.ok(report.reason_codes.includes("AEG031"));
});
