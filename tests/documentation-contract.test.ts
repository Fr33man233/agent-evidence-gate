import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public docs describe v0.2 native receipts and the one-version-one-task rule", () => {
  const readme = readFileSync("README.md", "utf8");
  const contributing = readFileSync("CONTRIBUTING.md", "utf8");
  assert.match(readme, /--receipts/);
  assert.match(readme, /E1/);
  assert.doesNotMatch(readme, /maintainer-CI envelope/);
  assert.match(contributing, /一版本一任务/);
  assert.match(contributing, /v0\.2\.0/);
});
