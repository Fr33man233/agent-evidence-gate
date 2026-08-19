import assert from "node:assert/strict";
import test from "node:test";
import { parseManifestText } from "../src/manifest.js";
import { evaluate } from "../src/policy.js";
import { parseTraceText } from "../src/trace.js";

const evidence = { assurance_level: "E1" as const, goal_id: "goal", receipt_ids: ["receipt"], check_ids: ["unit"], core_digests: ["0".repeat(64)] };
const manifest = (profile: "local" | "pr" = "local") => parseManifestText(["schema_version: aeg-task/v2", "task_id: native", `profile: ${profile}`, "required_checks:", "  - id: unit", "    command:", "      kind: argv", "      executable: node", "      argv: [--test]", ""].join("\n"));
const trace = (data: Record<string, unknown> = {}) => parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "goal", event_id: "finish", sequence: 1, timestamp: "2026-08-19T00:00:00.000Z", event_type: "run_finished", producer: { id: "synthetic" }, data }));

test("F01 local E1 native evidence passes", () => assert.equal(evaluate(manifest(), trace(), evidence).gate_verdict, "pass"));
test("F03 PR E1 native evidence fails closed", () => assert.ok(evaluate(manifest("pr"), trace(), evidence).reason_codes.includes("AEG070")));
test("F21 raw privacy fields still fail before policy", () => assert.throws(() => parseTraceText(JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "goal", event_id: "finish", sequence: 1, timestamp: "2026-08-19T00:00:00.000Z", event_type: "run_finished", producer: { id: "synthetic" }, data: { prompt: "private" } }))));
test("I13 native reports remain byte-identical", () => { const first = JSON.stringify(evaluate(manifest(), trace(), evidence)); const second = JSON.stringify(evaluate(manifest(), trace(), evidence)); assert.equal(first, second); });
