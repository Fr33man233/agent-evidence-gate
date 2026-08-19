import { createHash, timingSafeEqual } from "node:crypto";
import { isAbsolute, posix, win32 } from "node:path";
import { parseDocument } from "yaml";
import { AegInputError, assertJsonDepth } from "./safe.js";

const SHA256 = /^[0-9a-f]{64}$/;
const RECEIPT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const CORE_DOMAIN = "omk:evidence:receipt-v3:core\0";
const CREDENTIAL_PATTERN = /(?:--(?:token|password|secret|api[-_]?key)(?:=|\s)|https?:\/\/[^/\s]+:[^@\s]+@|(?:^|\s)(?:TOKEN|PASSWORD|SECRET|API_KEY)=)/i;
const GIT_COMMIT = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const REDACTION_TYPES = new Set(["api-key-header", "authorization-header", "basic-auth", "bearer-token", "cli-option-inline", "cli-option-value", "cookie-header", "env-assignment", "known-token", "url-credential", "url-query"]);

export interface OmkReceipt {
  core: Record<string, unknown> & { schemaVersion: 3; receiptId: string; goalId: string; command: Record<string, unknown>; cwd: string; status: "passed" | "failed" | "timeout" | "aborted"; exitCode: number | null; finishedAt: string; workspaceAfter: Record<string, unknown> };
  envelope: { coreSha256: string } & Record<string, unknown>;
}

function object(value: unknown, required: string[], optional: string[] = []): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new AegInputError("AEG001", "receipt structure is invalid");
  const result = value as Record<string, unknown>;
  const allowed = new Set([...required, ...optional]);
  if (Object.keys(result).some((key) => !allowed.has(key)) || required.some((key) => !(key in result))) throw new AegInputError("AEG001", "receipt structure is invalid");
  return result;
}

function nonEmpty(value: unknown): string { if (typeof value !== "string" || value.length === 0 || value.includes("\0")) throw new AegInputError("AEG001", "receipt structure is invalid"); return value; }
function digest(value: unknown): string { if (typeof value !== "string" || !SHA256.test(value)) throw new AegInputError("AEG001", "receipt digest is invalid"); return value; }
function timestamp(value: unknown): string { const result = nonEmpty(value); if (!ISO_TIME.test(result) || Number.isNaN(Date.parse(result))) throw new AegInputError("AEG001", "receipt timestamp is invalid"); return result; }
function integer(value: unknown, positive = false): number { if (typeof value !== "number" || !Number.isSafeInteger(value) || (positive ? value <= 0 : value < 0)) throw new AegInputError("AEG001", "receipt numeric field is invalid"); return value; }
function sha256(value: string): string { return createHash("sha256").update(value, "utf8").digest("hex"); }
function normalizedPath(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.includes("\0") || value.includes("\\") || isAbsolute(value) || win32.isAbsolute(value) || value === "." || posix.normalize(value) !== value || value.split("/").some((part) => part === "" || part === "." || part === "..")) throw new AegInputError("AEG001", "workspace path is invalid");
  return value;
}
function sortedPaths(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) throw new AegInputError("AEG001", "workspace paths are invalid");
  const paths = value.map(normalizedPath);
  for (let index = 1; index < paths.length; index++) if (paths[index - 1]! >= paths[index]!) throw new AegInputError("AEG001", "workspace paths are not sorted and unique");
  return paths;
}
function artifact(value: unknown): Record<string, unknown> {
  const candidate = object(value, ["path", "state"], ["sha256", "size"]);
  normalizedPath(candidate.path);
  if (candidate.state === "missing") {
    if (Object.keys(candidate).some((key) => !["path", "state"].includes(key))) throw new AegInputError("AEG001", "workspace artifact is invalid");
    return { path: candidate.path, state: "missing" };
  }
  if (candidate.state !== "file" || Object.keys(candidate).length !== 4) throw new AegInputError("AEG001", "workspace artifact is invalid");
  digest(candidate.sha256); integer(candidate.size);
  return { path: candidate.path, state: "file", sha256: candidate.sha256, size: candidate.size };
}
function artifactCanonical(value: Record<string, unknown>): Record<string, unknown> {
  return value.state === "file" ? { path: value.path, state: value.state, sha256: value.sha256, size: value.size } : { path: value.path, state: value.state };
}
function validateWorkspace(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new AegInputError("AEG001", "workspace fingerprint is invalid");
  const candidate = value as Record<string, unknown>; const kind = candidate.kind;
  if (kind !== "artifact-set" && kind !== "git") throw new AegInputError("AEG001", "workspace fingerprint kind is invalid");
  const required = kind === "git" ? ["kind", "scope", "artifacts", "git", "manifestSha256"] : ["kind", "scope", "artifacts", "manifestSha256"];
  const workspace = object(value, required);
  const scope = object(workspace.scope, ["root", "artifactPaths"]);
  if (typeof scope.root !== "string" || scope.root.length === 0 || !isAbsolute(scope.root)) throw new AegInputError("AEG001", "workspace root is invalid");
  const scopePaths = sortedPaths(scope.artifactPaths);
  if (!Array.isArray(workspace.artifacts)) throw new AegInputError("AEG001", "workspace artifacts are invalid");
  const artifacts = workspace.artifacts.map(artifact); const artifactPaths = artifacts.map((item) => String(item.path));
  if (artifactPaths.length !== scopePaths.length || artifactPaths.some((path, index) => path !== scopePaths[index])) throw new AegInputError("AEG001", "workspace artifacts do not match scope");
  digest(workspace.manifestSha256);
  if (kind === "artifact-set") {
    const expected = sha256(`omk:evidence:workspace-fingerprint:v1\0${JSON.stringify({ kind: "artifact-set", scope: { root: scope.root, artifactPaths: scopePaths }, artifacts: artifacts.map(artifactCanonical) })}`);
    if (expected !== workspace.manifestSha256) throw new AegInputError("AEG001", "workspace manifest digest does not match");
    return workspace;
  }
  const git = object(workspace.git, ["headCommit", "changedPaths", "stagedDiffSha256", "unstagedDiffSha256", "dirtySha256"]);
  if (git.headCommit !== null && (typeof git.headCommit !== "string" || !GIT_COMMIT.test(git.headCommit))) throw new AegInputError("AEG001", "workspace Git HEAD is invalid");
  const changedPaths = sortedPaths(git.changedPaths); for (const path of changedPaths) if (!scopePaths.some((entry) => path === entry || path.startsWith(`${entry}/`))) throw new AegInputError("AEG001", "workspace changed path escapes scope");
  digest(git.stagedDiffSha256); digest(git.unstagedDiffSha256); digest(git.dirtySha256);
  const expectedDirty = sha256(`omk:evidence:workspace-fingerprint:git-dirty:v1\0${JSON.stringify({ changedPaths, stagedDiffSha256: git.stagedDiffSha256, unstagedDiffSha256: git.unstagedDiffSha256, artifacts: artifacts.map(artifactCanonical) })}`);
  if (expectedDirty !== git.dirtySha256) throw new AegInputError("AEG001", "workspace dirty digest does not match");
  const expectedManifest = sha256(`omk:evidence:workspace-fingerprint:v1\0${JSON.stringify({ kind: "git", scope: { root: scope.root, artifactPaths: scopePaths }, artifacts: artifacts.map(artifactCanonical), git: { headCommit: git.headCommit, changedPaths, stagedDiffSha256: git.stagedDiffSha256, unstagedDiffSha256: git.unstagedDiffSha256, dirtySha256: git.dirtySha256 } })}`);
  if (expectedManifest !== workspace.manifestSha256) throw new AegInputError("AEG001", "workspace manifest digest does not match");
  return workspace;
}
function validateRedaction(value: unknown): void {
  const redaction = object(value, ["policyId", "placeholders"]); nonEmpty(redaction.policyId);
  if (typeof redaction.policyId !== "string" || redaction.policyId.length > 256 || !Array.isArray(redaction.placeholders) || redaction.placeholders.length > 11) throw new AegInputError("AEG001", "command redaction metadata is invalid");
  let previous = ""; let total = 0;
  for (const item of redaction.placeholders) { const placeholder = object(item, ["type", "count"]); if (typeof placeholder.type !== "string" || !REDACTION_TYPES.has(placeholder.type) || placeholder.type <= previous) throw new AegInputError("AEG001", "command redaction metadata is invalid"); previous = placeholder.type; total += integer(placeholder.count, true); }
  if (total > 256) throw new AegInputError("AEG001", "command redaction metadata is invalid");
}
function validateBinding(value: unknown): void {
  const binding = object(value, ["algorithm", "keyId", "nonce", "mac"]);
  if (binding.algorithm !== "hmac-sha256" || typeof binding.keyId !== "string" || !/^[0-9a-f]{16}$/.test(binding.keyId) || typeof binding.nonce !== "string" || !/^[0-9a-f]{32}$/.test(binding.nonce)) throw new AegInputError("AEG001", "command binding is invalid");
  digest(binding.mac);
}

function canonical(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") { if (!Number.isFinite(value) || Object.is(value, -0)) throw new AegInputError("AEG001", "receipt canonical data is invalid"); return JSON.stringify(value); }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value !== "object") throw new AegInputError("AEG001", "receipt canonical data is invalid");
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`).join(",")}}`;
}

export function computeOmkCoreDigest(core: unknown): string {
  return createHash("sha256").update(CORE_DOMAIN, "utf8").update(canonical(core), "utf8").digest("hex");
}

function validateCommand(value: unknown): void {
  const command = object(value, ["kind"], ["shell", "script", "executable", "argv"]);
  if (command.kind === "shell") {
    if (Object.keys(command).some((key) => !["kind", "shell", "script"].includes(key))) throw new AegInputError("AEG001", "receipt command is invalid");
    nonEmpty(command.shell); const script = nonEmpty(command.script); if (CREDENTIAL_PATTERN.test(script)) throw new AegInputError("AEG001", "receipt command contains credential material"); return;
  }
  if (command.kind === "argv") {
    if (Object.keys(command).some((key) => !["kind", "executable", "argv"].includes(key)) || !Array.isArray(command.argv)) throw new AegInputError("AEG001", "receipt command is invalid");
    nonEmpty(command.executable); command.argv.forEach((part) => { const value = nonEmpty(part); if (CREDENTIAL_PATTERN.test(value)) throw new AegInputError("AEG001", "receipt command contains credential material"); }); return;
  }
  throw new AegInputError("AEG001", "receipt command is invalid");
}

function validateCore(value: unknown): OmkReceipt["core"] {
  const core = object(value, ["schemaVersion", "receiptId", "goalId", "claim", "command", "cwd", "timeoutMs", "startedAt", "finishedAt", "durationMs", "status", "exitCode", "workspaceBefore", "workspaceAfter", "output", "executor"], ["laneId", "toolCallId", "commandRedaction", "commandBinding"]);
  if (core.schemaVersion !== 3 || !RECEIPT_ID.test(String(core.receiptId))) throw new AegInputError("AEG001", "receipt core is invalid");
  nonEmpty(core.goalId); nonEmpty(core.claim); validateCommand(core.command); nonEmpty(core.cwd);
  if (core.timeoutMs !== null) integer(core.timeoutMs, true);
  const startedAt = timestamp(core.startedAt); const finishedAt = timestamp(core.finishedAt); if (Date.parse(finishedAt) < Date.parse(startedAt) || integer(core.durationMs) !== Date.parse(finishedAt) - Date.parse(startedAt)) throw new AegInputError("AEG001", "receipt timing is invalid");
  if (core.status === "passed" ? core.exitCode !== 0 : core.status === "failed" ? !Number.isSafeInteger(core.exitCode) || core.exitCode === 0 : (core.status !== "timeout" && core.status !== "aborted") || core.exitCode !== null) throw new AegInputError("AEG001", "receipt disposition is invalid");
  const output = object(core.output, ["redactionPolicyId", "stdout", "stderr"]); nonEmpty(output.redactionPolicyId);
  for (const item of [output.stdout, output.stderr]) { const result = object(item, ["sha256", "byteCount"]); digest(result.sha256); integer(result.byteCount); }
  const stdout = output.stdout as Record<string, unknown>; const stderr = output.stderr as Record<string, unknown>; if ((stdout.byteCount as number) + (stderr.byteCount as number) > 64 * 1024) throw new AegInputError("AEG001", "receipt output is invalid");
  validateWorkspace(core.workspaceBefore); validateWorkspace(core.workspaceAfter);
  if (core.executor !== "bash-tool" && core.executor !== "ci-runner" && core.executor !== "mcp" && core.executor !== "internal") throw new AegInputError("AEG001", "receipt executor is invalid");
  if (core.commandRedaction !== undefined) validateRedaction(core.commandRedaction);
  if (core.commandBinding !== undefined) validateBinding(core.commandBinding);
  if (core.commandBinding !== undefined && core.commandRedaction === undefined) throw new AegInputError("AEG001", "command binding requires redaction metadata");
  if (core.commandRedaction !== undefined && Array.isArray((core.commandRedaction as Record<string, unknown>).placeholders) && ((core.commandRedaction as Record<string, unknown>).placeholders as unknown[]).length > 0 && core.commandBinding === undefined) throw new AegInputError("AEG001", "redaction metadata requires command binding");
  return core as OmkReceipt["core"];
}

export function parseOmkReceipt(text: string): OmkReceipt {
  let value: unknown;
  try { const document = parseDocument(text, { uniqueKeys: true, prettyErrors: false }); if (document.errors.length > 0) throw new Error(); JSON.parse(text); value = document.toJS(); } catch { throw new AegInputError("AEG001", "receipt JSON is malformed"); }
  assertJsonDepth(value, 32);
  const receipt = object(value, ["core", "envelope"]);
  const core = validateCore(receipt.core);
  const envelope = object(receipt.envelope, ["coreSha256"], ["ledgerBinding", "trustedAttestation"]);
  if (envelope.ledgerBinding !== undefined) { const ledger = object(envelope.ledgerBinding, ["seq", "eventHash"]); integer(ledger.seq, true); digest(ledger.eventHash); }
  if (envelope.trustedAttestation !== undefined) { const attestation = object(envelope.trustedAttestation, ["attesterId", "keyId", "algorithm", "signature", "issuedAt"]); nonEmpty(attestation.attesterId); nonEmpty(attestation.keyId); if (attestation.algorithm !== "ed25519") throw new AegInputError("AEG001", "trusted attestation is invalid"); nonEmpty(attestation.signature); timestamp(attestation.issuedAt); }
  const actual = digest(envelope.coreSha256); const expected = computeOmkCoreDigest(core);
  if (!timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))) throw new AegInputError("AEG001", "receipt digest does not match");
  return { core, envelope: envelope as OmkReceipt["envelope"] };
}
