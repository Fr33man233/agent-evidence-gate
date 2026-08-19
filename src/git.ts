import { spawnSync } from "node:child_process";
import { createHash, timingSafeEqual } from "node:crypto";
import { lstatSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import { AegInputError, assertNoLinkAncestors, assertSafeRepoPath } from "./safe.js";

const GIT_ENV_BLOCKLIST = new Set(["GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_CEILING_DIRECTORIES", "GIT_COMMON_DIR", "GIT_DIFF_OPTS", "GIT_DIR", "GIT_EXTERNAL_DIFF", "GIT_INDEX_FILE", "GIT_NAMESPACE", "GIT_OBJECT_DIRECTORY", "GIT_PREFIX", "GIT_WORK_TREE"]);
const MAX_GIT_OUTPUT = 16 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/;

export interface ArtifactState { path: string; state: "missing" | "file"; sha256?: string; size?: number; }
export interface GitScope { root: string; artifactPaths: string[]; }
export interface OmkWorkspaceFingerprint { kind: "git"; scope: GitScope; artifacts: ArtifactState[]; git: { headCommit: string; changedPaths: string[]; stagedDiffSha256: string; unstagedDiffSha256: string; dirtySha256: string }; manifestSha256: string; }

function digest(value: string | Buffer): string { return createHash("sha256").update(value).digest("hex"); }
function canonicalRoot(root: string): string { const resolved = resolve(root); const details = lstatSync(resolved); if (details.isSymbolicLink() || !details.isDirectory()) throw new AegInputError("AEG010", "repository root is unsafe"); return realpathSync(resolved); }
function cleanEnv(): NodeJS.ProcessEnv { return Object.fromEntries(Object.entries(process.env).filter(([key]) => !GIT_ENV_BLOCKLIST.has(key))); }
function git(root: string, args: string[]): Buffer {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "buffer", shell: false, windowsHide: true, timeout: 30_000, maxBuffer: MAX_GIT_OUTPUT, env: cleanEnv() });
  if (result.error || result.status !== 0 || result.stdout.length > MAX_GIT_OUTPUT || result.stderr.length > MAX_GIT_OUTPUT) throw new AegInputError("AEG003", "Git state capture is unavailable");
  return result.stdout;
}
function normalized(path: string): string { assertSafeRepoPath(path, "AEG010"); return path.replaceAll("\\", "/").normalize("NFC"); }
function within(path: string, artifactPaths: string[]): boolean { return artifactPaths.some((entry) => path === entry || path.startsWith(`${entry}/`)); }
function readArtifact(root: string, artifactPath: string): ArtifactState {
  const target = join(root, artifactPath); const relativePath = relative(root, target).replaceAll("\\", "/");
  if (relativePath === "" || relativePath.startsWith("../") || isAbsolute(relativePath)) throw new AegInputError("AEG010", "artifact path escapes repository root");
  assertNoLinkAncestors(target);
  try {
    const details = lstatSync(target);
    if (details.isSymbolicLink() || !details.isFile()) throw new AegInputError("AEG010", "artifact state is unsafe");
    const bytes = readFileSync(target);
    return { path: artifactPath, state: "file", sha256: digest(bytes), size: bytes.length };
  } catch (error) {
    if (error instanceof AegInputError) throw error;
    const errorCode = error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : undefined;
    if (errorCode === "ENOENT" || errorCode === "ENOTDIR") return { path: artifactPath, state: "missing" };
    throw new AegInputError("AEG003", "artifact state is unavailable");
  }
}
function parseStatus(output: Buffer, paths: string[]): string[] {
  const changed = new Set<string>();
  for (const entry of output.toString("utf8").split("\0")) { if (entry === "") continue; if (entry.length < 4 || entry[2] !== " ") throw new AegInputError("AEG003", "Git status output is malformed"); const path = normalized(entry.slice(3)); if (!within(path, paths)) throw new AegInputError("AEG003", "current changes are outside the receipt scope"); changed.add(path); }
  return [...changed].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
}
function equal(left: string, right: string): boolean { return SHA256.test(left) && SHA256.test(right) && timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex")); }

export function captureWorkspaceFingerprint(repositoryRoot: string, inputScope: GitScope): OmkWorkspaceFingerprint {
  const root = canonicalRoot(repositoryRoot); if (!isAbsolute(inputScope.root) || canonicalRoot(inputScope.root) !== root) throw new AegInputError("AEG003", "receipt workspace root does not match repository");
  const reportedRoot = git(root, ["rev-parse", "--show-toplevel"]).toString("utf8").trim(); if (canonicalRoot(reportedRoot) !== root) throw new AegInputError("AEG003", "repository is not a Git worktree root");
  const artifactPaths = [...new Set(inputScope.artifactPaths.map(normalized))].sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right))); if (artifactPaths.length !== inputScope.artifactPaths.length) throw new AegInputError("AEG003", "receipt scope has duplicate paths");
  const headCommit = git(root, ["rev-parse", "--verify", "HEAD^{commit}"]).toString("utf8").trim(); if (!/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(headCommit)) throw new AegInputError("AEG003", "Git HEAD is invalid");
  const changedPaths = parseStatus(git(root, ["-c", "core.fsmonitor=false", "status", "--porcelain=v1", "-z", "--untracked-files=all", "--no-renames", "--ignore-submodules=none"]), artifactPaths);
  const pathspecs = artifactPaths.map((path) => `:(literal)${path}`); const diffArgs = ["--full-index", "--binary", "--no-color", "--no-ext-diff", "--no-textconv", "--no-renames", "--ignore-submodules=none", "--src-prefix=a/", "--dst-prefix=b/", "--", ...pathspecs];
  const stagedDiffSha256 = digest(git(root, ["diff", "--cached", ...diffArgs])); const unstagedDiffSha256 = digest(git(root, ["diff", ...diffArgs])); const artifacts = artifactPaths.map((path) => readArtifact(root, path));
  const canonicalArtifacts = artifacts.map((artifact) => artifact.state === "file" ? { path: artifact.path, state: artifact.state, sha256: artifact.sha256, size: artifact.size } : { path: artifact.path, state: artifact.state });
  const dirtySha256 = digest(`omk:evidence:workspace-fingerprint:git-dirty:v1\0${JSON.stringify({ changedPaths, stagedDiffSha256, unstagedDiffSha256, artifacts: canonicalArtifacts })}`);
  const scope = { root, artifactPaths }; const manifestSha256 = digest(`omk:evidence:workspace-fingerprint:v1\0${JSON.stringify({ kind: "git", scope: { root: scope.root, artifactPaths: scope.artifactPaths }, artifacts: canonicalArtifacts, git: { headCommit, changedPaths, stagedDiffSha256, unstagedDiffSha256, dirtySha256 } })}`);
  return { kind: "git", scope, artifacts, git: { headCommit, changedPaths, stagedDiffSha256, unstagedDiffSha256, dirtySha256 }, manifestSha256 };
}

export function assertWorkspaceMatches(receipt: OmkWorkspaceFingerprint, current: OmkWorkspaceFingerprint): void { if (!equal(receipt.manifestSha256, current.manifestSha256)) throw new AegInputError("AEG003", "receipt workspace state is stale"); }
