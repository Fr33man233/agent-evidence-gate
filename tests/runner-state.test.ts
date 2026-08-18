import assert from "node:assert/strict";
import test from "node:test";
import { AegInputError } from "../src/safe.js";
import { verify } from "../src/runner.js";

test("verification requires an explicit repository context for Git state binding", () => {
  assert.throws(() => verify({ manifestPath: "missing.yml", tracePath: "missing.jsonl", evidencePath: "missing.json" }), AegInputError);
});
