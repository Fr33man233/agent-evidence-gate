import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const outputDir = process.argv[2];
if (!outputDir || outputDir.includes("..")) throw new Error("output directory must be an explicit temporary path");
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const state = JSON.stringify({ algorithm: "aeg-git-facts/v1", changed_paths: [], head });
const fingerprint = createHash("sha256").update(`${state}\n`, "utf8").digest("hex");
mkdirSync(outputDir, { recursive: true });

const manifest = `schema_version: aeg-task/v1
task_id: release-validation
objective: Validate the read-only action against a synthetic trust context.
base_commit: ${head}
profile: pr
allowed_paths:
  - src
denied_paths:
  - .github/workflows
sensitive_paths:
  - .env
required_checks:
  - id: synthetic
    kind: test
    argv: [synthetic-check]
    cwd: .
    success_exit_code: 0
claims:
  - id: structured-evidence
    status: completed
`;
const trace = [
  { schema_version: "aeg-trace/v1", run_id: "release-validation", event_id: "event-001", sequence: 1, timestamp: "2026-08-18T00:00:00.000Z", event_type: "run_started", producer: { id: "synthetic", kind: "fixture" }, data: {} },
  { schema_version: "aeg-trace/v1", run_id: "release-validation", event_id: "event-002", sequence: 2, timestamp: "2026-08-18T00:00:01.000Z", event_type: "run_finished", producer: { id: "synthetic", kind: "fixture" }, data: { termination: "completed", exit_code: 0, claims: ["structured-evidence"] } },
].map((event) => JSON.stringify(event)).join("\n") + "\n";
const evidence = {
  source: { kind: "maintainer_ci" },
  subject: { repository_id: "release-validation", head_sha: head },
  check: { check_id: "synthetic", termination: "completed", exit_code: 0 },
  producer: { id: "synthetic-ci", run_id: "release-validation" },
  trust_context: { repository_id: "release-validation", current_head_sha: head, workflow_ref: "aeg-release-validation@main", trusted_workflows: ["aeg-release-validation@main"], state_fingerprint: fingerprint },
};
writeFileSync(join(outputDir, "agent-task.yml"), manifest, "utf8");
writeFileSync(join(outputDir, "agent-trace.jsonl"), trace, "utf8");
writeFileSync(join(outputDir, "evidence.json"), `${JSON.stringify(evidence)}\n`, "utf8");
