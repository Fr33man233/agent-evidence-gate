import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { collectNativeEvidence } from "../src/evidence.js";
import { parseManifestText } from "../src/manifest.js";
import { parseOmkReceipt } from "../src/omk-receipt.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const receipt = parseOmkReceipt(readFileSync("tests/fixtures/omk-v0.96.0/receipt-passed.json", "utf8"));
const trace = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "fixture-goal", event_id: "finish", sequence: 1, timestamp: "2026-08-19T00:00:01.000Z", event_type: "run_finished", producer: { id: "synthetic" }, data: {} }));
function manifest(profile: "local" | "pr") { return parseManifestText(["schema_version: aeg-task/v2", "task_id: native", `profile: ${profile}`, "omk_goal_id: fixture-goal", "required_checks:", "  - id: version-consistency", "    command:", "      kind: shell", "      script: node scripts/check-version-consistency.mjs", "      shell: pwsh", "    cwd: .", ""].join("\n")); }

test("native E1 evidence passes locally and produces report v2", () => {
  const task = manifest("local");
  const evidence = collectNativeEvidence(task, trace, [receipt], "C:/synthetic-omk-workspace");
  const report = evaluate(task, trace, evidence);
  assert.equal(report.schema_version, "aeg-report/v2");
  assert.equal(report.assurance_level, "E1");
  assert.equal(report.gate_verdict, "pass");
});

test("native E1 evidence cannot pass in a PR profile", () => {
  const task = manifest("pr");
  const report = evaluate(task, trace, collectNativeEvidence(task, trace, [receipt], "C:/synthetic-omk-workspace"));
  assert.equal(report.gate_verdict, "fail");
  assert.ok(report.reason_codes.includes("AEG070"));
});
