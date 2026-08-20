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
  assert.match(workflow, /Fr33man233\/agent-evidence-gate@d82c7863f48878bfee66e978e7569c464de48ea2/);
  assert.doesNotMatch(workflow, /uses: \.\//);
  assert.match(workflow, /run: node scripts\/prepare-release-validation\.mjs/);
  assert.match(workflow, /runner\.temp.*agent-task\.yml/);
  assert.match(workflow, /runner\.temp.*agent-trace\.jsonl/);
  assert.match(workflow, /runner\.temp.*evidence\.json/);
  assert.match(workflow, /v0\.1\.3 historical|published v0\.1\.3/i);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|run:\s+.*(npm|pnpm|bash|pwsh|powershell)/i);
  assert.doesNotMatch(workflow, /uses:\s+[^./\s]+\/[^@\s]+@(v|main|master)/i);
});

test("Marketplace metadata and historical consumer example stay explicit during v0.2 pre-release", () => {
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
  assert.match(workflow, /ref: v0\.1\.3/);
  assert.equal(releaseTag, "v0.2.0");
  assert.match(readme, /历史 v0\.1\.3 consumer 示例/);
  assert.match(readme, /uses: Fr33man233\/agent-evidence-gate@v0\.1\.3/);
  assert.doesNotMatch(readme, /uses: Fr33man233\/agent-evidence-gate@v0\.2\.0/);
  assert.match(readme, /permissions:\s+contents:\s+read/);
});

test("v0.2 native validation workflow is manual, read-only, and runs only the local action", () => {
  const workflow = readFileSync(".github/workflows/v0.2-native-validation.yml", "utf8");
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /permissions:\s+contents:\s+read/);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /uses:\s+\.\//);
  assert.match(workflow, /prepare-v0\.2-native-validation\.mjs/);
  assert.match(workflow, /github\.sha/);
  assert.doesNotMatch(workflow, /pull_request|pull_request_target|secrets\.|npm install|pnpm install|npm test|pnpm test/i);
  assert.doesNotMatch(workflow, /uses:\s+[^./\s]+\/[^@\s]+@(v|main|master)/i);
});
