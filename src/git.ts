import { spawnSync } from "node:child_process";
import { AegInputError, assertSafeRepoPath, canonicalJson, sha256 } from "./safe.js";

export interface GitFacts { algorithm: "aeg-git-facts/v1"; head: string; changed_paths: string[]; dirty: boolean; fingerprint: string; }

function git(root: string, args: string[]): string {
  const result = spawnSync("git", ["-C", root, ...args], { encoding: "utf8", shell: false, windowsHide: true });
  if (result.status !== 0) throw new AegInputError("AEG003", "Git facts are unavailable for the verifier context");
  return result.stdout;
}
export function normalizeChangedPaths(paths: string[]): string[] {
  const output = paths.map((path) => path.replaceAll("\\", "/").normalize("NFC")).sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
  const folded = new Set<string>();
  for (const path of output) { assertSafeRepoPath(path, "AEG010"); const key = path.toLocaleLowerCase("en-US"); if (folded.has(key)) throw new AegInputError("AEG010", "changed paths have a cross-platform case collision"); folded.add(key); }
  return output;
}
export function compatibilityFingerprint(head: string, changedPaths: string[]): string { return sha256(canonicalJson({ algorithm: "aeg-git-facts/v1", changed_paths: normalizeChangedPaths(changedPaths), head })); }
export function readGitFacts(root: string): GitFacts {
  const head = git(root, ["rev-parse", "HEAD"]).trim();
  const changed = git(root, ["diff", "--name-only", "--no-ext-diff", "HEAD"]).split(/\r?\n/).filter(Boolean);
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean);
  const changed_paths = normalizeChangedPaths([...changed, ...untracked]);
  return { algorithm: "aeg-git-facts/v1", head, changed_paths, dirty: changed_paths.length > 0, fingerprint: compatibilityFingerprint(head, changed_paths) };
}
