import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadManifest, parseManifestText } from "../src/manifest.js";
import { AegInputError } from "../src/safe.js";

test("accepts only v2 structured shell command contracts", () => {
  const manifest = parseManifestText([
    "schema_version: aeg-task/v2",
    "task_id: native",
    "profile: local",
    "required_checks:",
    "  - id: version-consistency",
    "    command:",
    "      kind: shell",
    "      script: node scripts/check-version-consistency.mjs",
    "      shell: pwsh",
    "    cwd: .",
    "",
  ].join("\n"));

  assert.equal(manifest.schema_version, "aeg-task/v2");
  assert.deepEqual(manifest.required_checks[0]?.command, {
    kind: "shell",
    script: "node scripts/check-version-consistency.mjs",
    shell: "pwsh",
  });
});

test("rejects directory junctions before bounded input reads", () => {
  const root = mkdtempSync(join(tmpdir(), "aeg-manifest-link-"));
  try {
    const target = join(root, "target");
    const link = join(root, "link");
    mkdirSync(target);
    writeFileSync(join(target, "agent-task.yml"), "schema_version: aeg-task/v2\ntask_id: link\nprofile: local\nrequired_checks: []\n", "utf8");
    symlinkSync(target, link, "junction");
    assert.throws(() => loadManifest(link), (error: unknown) => error instanceof AegInputError && error.code === "AEG010");
    assert.throws(() => loadManifest(join(link, "agent-task.yml")), (error: unknown) => error instanceof AegInputError && error.code === "AEG010");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
