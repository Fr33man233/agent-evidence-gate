import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { assertWorkspaceMatches, captureWorkspaceFingerprint } from "../src/git.js";
import { AegInputError } from "../src/safe.js";

function git(root: string, args: string[]): void {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
}

test("passes current state then rejects a covered file mutation", () => {
  const root = mkdtempSync(join(tmpdir(), "aeg-omk-git-"));
  try {
    git(root, ["init", "--initial-branch=main"]); git(root, ["config", "user.email", "aeg-test@example.invalid"]); git(root, ["config", "user.name", "AEG Synthetic Test"]);
    mkdirSync(join(root, "src")); writeFileSync(join(root, "src", "covered.ts"), "initial\n", "utf8"); git(root, ["add", "."]); git(root, ["commit", "-m", "fixture"]);
    const scope = { root, artifactPaths: ["src/covered.ts"] };
    const initial = captureWorkspaceFingerprint(root, scope);
    assert.doesNotThrow(() => assertWorkspaceMatches(initial, captureWorkspaceFingerprint(root, scope)));
    writeFileSync(join(root, "src", "covered.ts"), "changed\n", "utf8");
    assert.throws(() => assertWorkspaceMatches(initial, captureWorkspaceFingerprint(root, scope)), (error: unknown) => error instanceof AegInputError && error.code === "AEG003");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
