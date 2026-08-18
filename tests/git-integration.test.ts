import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { readGitFacts } from "../src/git.js";

function runGit(root: string, args: string[]): string {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", windowsHide: true });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("reads HEAD and normalized changed paths from a synthetic committed repository", () => {
  const root = mkdtempSync(join(tmpdir(), "aeg-git-"));
  try {
    runGit(root, ["init", "--initial-branch=main"]);
    runGit(root, ["config", "user.email", "aeg-test@example.invalid"]);
    runGit(root, ["config", "user.name", "AEG Synthetic Test"]);
    writeFileSync(join(root, "README.md"), "synthetic\n", "utf8"); runGit(root, ["add", "README.md"]); runGit(root, ["commit", "-m", "fixture"]);
    writeFileSync(join(root, "changed.txt"), "changed\n", "utf8");
    const facts = readGitFacts(root);
    assert.match(facts.head, /^[0-9a-f]{40}$/); assert.deepEqual(facts.changed_paths, ["changed.txt"]); assert.equal(facts.dirty, true); assert.match(facts.fingerprint, /^[0-9a-f]{64}$/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
