import assert from "node:assert/strict";
import test from "node:test";
import { AegInputError } from "../src/safe.js";
import { compatibilityFingerprint, normalizeChangedPaths } from "../src/git.js";

test("Git compatibility fingerprint is deterministic and path order independent", () => {
  assert.equal(compatibilityFingerprint("head", ["src/b.ts", "src/a.ts"]), compatibilityFingerprint("head", ["src/a.ts", "src/b.ts"]));
});
test("rejects traversal and Windows case collisions", () => {
  assert.throws(() => normalizeChangedPaths(["../escape"]), AegInputError);
  assert.throws(() => normalizeChangedPaths(["SRC/A.ts", "src/a.ts"]), AegInputError);
});
