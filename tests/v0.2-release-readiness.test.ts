import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("v0.2 release metadata identifies an unpublished 0.2.0 candidate", () => {
  const packageManifest = JSON.parse(readFileSync("package.json", "utf8")) as { version?: string; dependencies?: Record<string, string> };
  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const history = readFileSync("docs/version-history.md", "utf8");
  assert.equal(packageManifest.version, "0.2.0");
  assert.equal(packageManifest.dependencies?.yaml, "2.8.3");
  assert.match(changelog, /Unreleased — v0\.2\.0/);
  assert.match(changelog, /32 项测试/);
  assert.match(history, /v0\.2\.0[\s\S]*本地 RC/);
  assert.doesNotMatch(history, /v0\.2\.0[\s\S]*实现状态：尚未开始/);
});
