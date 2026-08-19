import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("public runtime has no v1 evidence adapter or embedded trust upgrade path", () => {
  assert.equal(existsSync("src/adapters.ts"), false);
  const source = ["src/runner.ts", "src/policy.ts", "src/cli.ts", "src/action.ts"].map((path) => readFileSync(path, "utf8")).join("\n");
  assert.doesNotMatch(source, /adaptEvidence|trust_context|maintainer_ci|evidencePath|--evidence/);
});
