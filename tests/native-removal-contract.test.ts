import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("public runtime has no v1 evidence adapter or embedded trust upgrade path", () => {
  assert.equal(existsSync("src/adapters.ts"), false);
  const source = ["src/runner.ts", "src/policy.ts", "src/cli.ts", "src/action.ts"].map((path) => readFileSync(path, "utf8")).join("\n");
  assert.doesNotMatch(source, /adaptEvidence|trust_context|maintainer_ci|evidencePath|--evidence/);
});

test("runner rereads receipts through the bounded link-safe input path", () => {
  const runner = readFileSync("src/runner.ts", "utf8");
  assert.match(runner, /readBoundedFile/);
  assert.doesNotMatch(runner, /readFileSync\(path/);
});

test("workspace artifact reads do not collapse arbitrary I/O errors into missing", () => {
  const git = readFileSync("src/git.ts", "utf8");
  assert.match(git, /errorCode === "ENOENT"/);
  assert.match(git, /if \(errorCode === "ENOENT" \|\| errorCode === "ENOTDIR"\) return \{ path: artifactPath, state: "missing" \}/);
  assert.match(git, /throw new AegInputError\("AEG003", "artifact state is unavailable"\)/);
});
