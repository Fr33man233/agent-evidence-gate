import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Action accepts receipts on Node 24 and exposes no legacy evidence input", () => {
  const action = readFileSync("action.yml", "utf8");
  const implementation = readFileSync("src/action.ts", "utf8");
  assert.match(action, /using: node24/);
  assert.match(action, /^  receipts:/m);
  assert.match(action, /^  repo:/m);
  assert.doesNotMatch(action, /^  repository:/m);
  assert.doesNotMatch(action, /^  evidence:/m);
  assert.match(implementation, /receiptsPath/);
  assert.match(implementation, /input\("repo"\)/);
  assert.doesNotMatch(implementation, /input\("repository"\)/);
  assert.doesNotMatch(implementation, /evidencePath/);
  assert.doesNotMatch(`${action}\n${implementation}`, /pull_request_target|secrets|child_process|fetch\(/i);
});
