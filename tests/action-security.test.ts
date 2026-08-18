import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Action is a fixed Node bundle surface with no unsafe trigger or command execution", () => {
  const action = readFileSync("action.yml", "utf8"); const implementation = readFileSync("src/action.ts", "utf8");
  assert.match(action, /using: node20/); assert.match(action, /main: dist\/action\.cjs/); assert.doesNotMatch(action, /pull_request_target|runs-on|secrets/i);
  assert.doesNotMatch(implementation, /child_process|exec\(|spawn\(|npm |shell|fetch\(|https?:\/\//i);
  assert.match(implementation, /GITHUB_WORKSPACE|repository/);
});
