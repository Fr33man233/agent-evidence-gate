import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parse } from "yaml";

test("release validation workflow is manual, read-only, immutable, and synthetic-only", () => {
  const workflow = readFileSync(".github/workflows/release-validation.yml", "utf8");
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /permissions:\s+contents:\s+read/);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /uses: \.\//);
  assert.match(workflow, /run: node scripts\/prepare-release-validation\.mjs/);
  assert.match(workflow, /runner\.temp.*agent-task\.yml/);
  assert.match(workflow, /runner\.temp.*agent-trace\.jsonl/);
  assert.match(workflow, /runner\.temp.*evidence\.json/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|run:\s+.*(npm|pnpm|bash|pwsh|powershell)/i);
  assert.doesNotMatch(workflow, /uses:\s+[^./\s]+\/[^@\s]+@(v|main|master)/i);
});

test("Marketplace metadata and consumer example stay aligned with the release version", () => {
  const action = parse(readFileSync("action.yml", "utf8")) as {
    author?: string;
    branding?: { icon?: string; color?: string };
  };
  const packageManifest = JSON.parse(readFileSync("package.json", "utf8")) as {
    version: string;
  };
  const releaseTag = `v${packageManifest.version}`;
  const workflow = readFileSync(".github/workflows/release-validation.yml", "utf8");
  const readme = readFileSync("README.md", "utf8");

  assert.equal(action.author, "Freeman Huang");
  assert.deepEqual(action.branding, { icon: "shield", color: "green" });
  assert.match(workflow, new RegExp(`ref: ${releaseTag.replaceAll(".", "\\.")}`));
  assert.match(readme, new RegExp(`uses: Fr33man233/agent-evidence-gate@${releaseTag.replaceAll(".", "\\.")}`));
  assert.match(readme, /permissions:\s+contents:\s+read/);
});
