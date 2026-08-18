import { loadEvidence } from "./adapters.js";
import { readGitFacts } from "./git.js";
import { loadManifest } from "./manifest.js";
import { evaluate } from "./policy.js";
import { AegInputError } from "./safe.js";
import { loadTrace } from "./trace.js";
import type { GateReport, ProfileName } from "./types.js";

export interface VerifyOptions {
  manifestPath: string;
  tracePath: string;
  evidencePath: string;
  repoPath?: string;
  profile?: ProfileName;
}

export function verify(options: VerifyOptions): GateReport {
  if (!options.repoPath) throw new AegInputError("AEG003", "repository context is required for Git state binding");
  const manifest = loadManifest(options.manifestPath);
  const trace = loadTrace(options.tracePath);
  const evidence = loadEvidence(options.evidencePath);
  const gitFacts = readGitFacts(options.repoPath);
  return evaluate({ ...manifest, ...(options.profile ? { profile: options.profile } : {}) }, trace, evidence, gitFacts);
}
