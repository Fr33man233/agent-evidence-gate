import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { isAbsolute, join, resolve } from "node:path";

const outputDir = process.argv[2];
const repository = process.argv[3];
if (!outputDir || !repository || !isAbsolute(outputDir) || !isAbsolute(repository) || outputDir.split(/[\\/]/).includes("..")) throw new Error("explicit absolute paths are required");

const root = realpathSync(execFileSync("git", ["-C", repository, "rev-parse", "--show-toplevel"], { encoding: "utf8", windowsHide: true }).trim());
const head = execFileSync("git", ["-C", root, "rev-parse", "--verify", "HEAD^{commit}"], { encoding: "utf8", windowsHide: true }).trim();
const expectedHead = process.env.AEG_EXPECTED_SHA;
if (!expectedHead || expectedHead !== head) throw new Error("workflow SHA does not match checked-out HEAD");
if (execFileSync("git", ["-C", root, "status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames", "--ignore-submodules=none"], { encoding: "utf8", windowsHide: true }).length !== 0) throw new Error("checkout must be clean");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonical = (value) => {
  if (value === null || typeof value === "boolean" || typeof value === "string" || typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};
const emptySha = sha256(Buffer.alloc(0));
const artifactBytes = readFileSync(join(root, "action.yml"));
const artifacts = [{ path: "action.yml", state: "file", sha256: sha256(artifactBytes), size: artifactBytes.length }];
const scope = { root, artifactPaths: ["action.yml"] };
const changedPaths = [];
const dirtySha256 = sha256(`omk:evidence:workspace-fingerprint:git-dirty:v1\0${JSON.stringify({ changedPaths, stagedDiffSha256: emptySha, unstagedDiffSha256: emptySha, artifacts })}`);
const workspace = {
  kind: "git",
  scope,
  artifacts,
  git: { headCommit: head, changedPaths, stagedDiffSha256: emptySha, unstagedDiffSha256: emptySha, dirtySha256 },
};
workspace.manifestSha256 = sha256(`omk:evidence:workspace-fingerprint:v1\0${JSON.stringify({ ...workspace, scope, artifacts })}`);

const core = {
  schemaVersion: 3,
  receiptId: "v0.2-native-validation-001",
  goalId: "v0.2-native-validation",
  claim: "synthetic native receipt validation",
  command: { kind: "argv", executable: "synthetic-check", argv: [] },
  cwd: root,
  timeoutMs: 1000,
  startedAt: "2026-08-20T00:00:00.000Z",
  finishedAt: "2026-08-20T00:00:01.000Z",
  durationMs: 1000,
  status: "passed",
  exitCode: 0,
  workspaceBefore: workspace,
  workspaceAfter: workspace,
  output: { redactionPolicyId: "synthetic", stdout: { sha256: emptySha, byteCount: 0 }, stderr: { sha256: emptySha, byteCount: 0 } },
  executor: "internal",
};
const coreSha256 = sha256(`omk:evidence:receipt-v3:core\0${canonical(core)}`);
const manifest = [`schema_version: aeg-task/v2`, `task_id: v0.2-native-validation`, `omk_goal_id: v0.2-native-validation`, `base_commit: ${head}`, `profile: local`, `allowed_paths:`, `  - action.yml`, `denied_paths:`, `  - .github/workflows`, `sensitive_paths:`, `  - .env`, `required_checks:`, `  - id: synthetic`, `    command:`, `      kind: argv`, `      executable: synthetic-check`, `      argv: []`, `    cwd: .`, `claims:`, `  - id: native-receipt`, `    status: completed`, ""].join("\n");
const trace = [
  { schema_version: "aeg-trace/v1", run_id: "v0.2-native-validation", event_id: "event-001", sequence: 1, timestamp: "2026-08-20T00:00:00.000Z", event_type: "run_started", producer: { id: "synthetic", kind: "fixture" }, data: {} },
  { schema_version: "aeg-trace/v1", run_id: "v0.2-native-validation", event_id: "event-002", sequence: 2, timestamp: "2026-08-20T00:00:01.000Z", event_type: "run_finished", producer: { id: "synthetic", kind: "fixture" }, data: { termination: "completed", exit_code: 0, claims: ["native-receipt"] } },
].map((event) => JSON.stringify(event)).join("\n") + "\n";
mkdirSync(resolve(outputDir), { recursive: true });
writeFileSync(join(outputDir, "agent-task.yml"), manifest, "utf8");
writeFileSync(join(outputDir, "agent-trace.jsonl"), trace, "utf8");
writeFileSync(join(outputDir, "receipt.json"), JSON.stringify({ core, envelope: { coreSha256 } }) + "\n", "utf8");
