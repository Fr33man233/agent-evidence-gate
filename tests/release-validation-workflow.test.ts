import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("release validation workflow is manual, read-only, immutable, and synthetic-only", () => {
  const workflow = readFileSync(".github/workflows/release-validation.yml", "utf8");
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /permissions:\s+contents:\s+read/);
  assert.match(workflow, /actions\/checkout@[0-9a-f]{40}/);
  assert.match(workflow, /actions\/upload-artifact@[0-9a-f]{40}/);
  assert.match(workflow, /uses: \.\//);
  assert.match(workflow, /ref: v0\.1\.1/);
  assert.match(workflow, /examples\/synthetic-demo\/agent-task\.yml/);
  assert.match(workflow, /examples\/synthetic-demo\/agent-trace\.jsonl/);
  assert.match(workflow, /examples\/synthetic-demo\/evidence\.json/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|run:\s+.*(npm|pnpm|node|bash|pwsh|powershell)/i);
});
