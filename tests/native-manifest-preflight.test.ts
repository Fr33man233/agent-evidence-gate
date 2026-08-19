import assert from "node:assert/strict";
import test from "node:test";
import { parseManifestText } from "../src/manifest.js";

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
