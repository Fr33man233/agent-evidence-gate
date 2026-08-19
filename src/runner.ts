import { collectNativeEvidence } from "./evidence.js";
import { assertWorkspaceMatches, captureWorkspaceFingerprint, type GitScope, type OmkWorkspaceFingerprint } from "./git.js";
import { loadManifest } from "./manifest.js";
import { parseOmkReceipt, type OmkReceipt } from "./omk-receipt.js";
import { evaluate } from "./policy.js";
import { discoverReceiptPaths } from "./receipts.js";
import { AegInputError, LIMITS, readBoundedFile } from "./safe.js";
import { loadTrace } from "./trace.js";
import type { GateReport } from "./types.js";

export interface VerifyOptions { manifestPath: string; tracePath: string; receiptsPath: string; repoPath?: string; }

function workspaceAfter(receipt: OmkReceipt): OmkWorkspaceFingerprint {
  const value = receipt.core.workspaceAfter;
  if (value.kind !== "git" || value.scope === null || typeof value.scope !== "object" || Array.isArray(value.scope)) throw new AegInputError("AEG003", "selected receipt lacks a Git workspace fingerprint");
  const scope = value.scope as Record<string, unknown>;
  if (typeof scope.root !== "string" || !Array.isArray(scope.artifactPaths) || !scope.artifactPaths.every((path) => typeof path === "string")) throw new AegInputError("AEG003", "selected receipt workspace scope is invalid");
  return value as unknown as OmkWorkspaceFingerprint;
}

export function verify(options: VerifyOptions): GateReport {
  if (!options.repoPath) throw new AegInputError("AEG003", "repository context is required for Git state binding");
  const manifest = loadManifest(options.manifestPath);
  const trace = loadTrace(options.tracePath);
  const receipts = discoverReceiptPaths(options.receiptsPath).map((path) => parseOmkReceipt(readBoundedFile(path, LIMITS.receiptBytes, "AEG003")));
  const evidence = collectNativeEvidence(manifest, trace, receipts, options.repoPath);
  for (const id of evidence.receipt_ids) {
    const receipt = receipts.find((item) => item.core.receiptId === id);
    if (receipt === undefined) throw new AegInputError("AEG020", "selected receipt is unavailable");
    const expected = workspaceAfter(receipt); const scope = expected.scope as GitScope;
    assertWorkspaceMatches(expected, captureWorkspaceFingerprint(options.repoPath, scope));
  }
  return evaluate(manifest, trace, evidence);
}
