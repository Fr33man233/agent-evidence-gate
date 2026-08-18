import assert from "node:assert/strict";
import test from "node:test";
import { parseManifestText } from "../src/manifest.js";
import { parseTraceText } from "../src/trace.js";
import { AegInputError, LIMITS } from "../src/safe.js";

const manifest = [
  "schema_version: aeg-task/v1", "task_id: synthetic-task", "profile: pr",
  "allowed_paths: [src/app.ts]", "denied_paths: [.github/workflows]", "sensitive_paths: [.env]",
  "required_checks:", "  - id: unit", "    argv: [node, --test]", "",
].join("\n");
const event = JSON.stringify({ schema_version: "aeg-trace/v1", run_id: "run-1", event_id: "event-1", sequence: 1, timestamp: "2026-08-17T00:00:00.000Z", event_type: "run_started", producer: { id: "synthetic" }, data: {} });

test("accepts bounded structured manifest and trace", () => {
  assert.equal(parseManifestText(manifest).task_id, "synthetic-task");
  assert.equal(parseTraceText(event).length, 1);
});

test("rejects duplicate manifest keys and trace event ids", () => {
  assert.throws(() => parseManifestText(`${manifest}task_id: duplicate\n`), AegInputError);
  assert.throws(() => parseTraceText(`${event}\n${event.replace('"sequence":1', '"sequence":2')}`), AegInputError);
});

test("rejects traversal, raw output, and oversized JSONL lines", () => {
  assert.throws(() => parseManifestText(manifest.replace("src/app.ts", "../escape.ts")), AegInputError);
  const privateEvent = event.replace("\"data\":{}", "\"data\":{\"stdout\":\"private\"}");
  assert.throws(() => parseTraceText(privateEvent), AegInputError);
  assert.throws(() => parseTraceText("x".repeat(LIMITS.jsonlLineBytes + 1)), AegInputError);
});
