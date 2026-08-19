import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { collectNativeEvidence } from "../src/evidence.js";
import { parseManifestText } from "../src/manifest.js";
import { parseOmkReceipt } from "../src/omk-receipt.js";
import { parseTraceText } from "../src/trace.js";
import { AegInputError } from "../src/safe.js";

const manifest = parseManifestText([
  "schema_version: aeg-task/v2", "task_id: native", "profile: local", "omk_goal_id: fixture-goal",
  "required_checks:", "  - id: version-consistency", "    command:",
  "      kind: shell", "      script: node scripts/check-version-consistency.mjs", "      shell: pwsh", "    cwd: .", "",
].join("\n"));
const receipt = parseOmkReceipt(readFileSync("tests/fixtures/omk-v0.96.0/receipt-passed.json", "utf8"));
const trace = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "fixture-goal", event_id: "finish", sequence: 1, timestamp: "2026-08-19T00:00:01.000Z", event_type: "run_finished", producer: { id: "synthetic" }, data: {} }));

test("selects an exact native receipt check and keeps assurance at E1", () => {
  const evidence = collectNativeEvidence(manifest, trace, [receipt], "C:/synthetic-omk-workspace");
  assert.equal(evidence.assurance_level, "E1");
  assert.deepEqual(evidence.receipt_ids, ["fixture-receipt-001"]);
});

test("rejects a trace run that differs from the selected OMK goal", () => {
  const wrongTrace = parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "different-goal", event_id: "finish", sequence: 1, timestamp: "2026-08-19T00:00:01.000Z", event_type: "run_finished", producer: { id: "synthetic" }, data: {} }));
  assert.throws(() => collectNativeEvidence(manifest, wrongTrace, [receipt], "C:/synthetic-omk-workspace"), (error: unknown) => error instanceof AegInputError && error.code === "AEG002");
});
