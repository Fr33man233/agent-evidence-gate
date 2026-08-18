import { AegInputError, assertJsonDepth, readBoundedFile } from "./safe.js";
import type { AssuranceLevel } from "./types.js";

export interface CanonicalEvidence {
  source_kind: "omk_v3" | "maintainer_ci";
  subject: { repository_id: string; head_sha: string };
  check: { check_id: string; termination: string; exit_code: number | null };
  producer: { id: string; run_id: string; workflow_ref?: string; artifact_digest?: string; observed_at?: string };
  trust: { repository_id?: string; current_head_sha?: string; trusted_workflows?: string[]; workflow_ref?: string; state_fingerprint?: string; policy_digest?: string; verifier_surface_changed?: boolean };
  claimed_assurance?: string;
}

function record(value: unknown, code = "AEG001"): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new AegInputError(code, "structured evidence must be an object");
  return value as Record<string, unknown>;
}
function string(value: unknown, code = "AEG001"): string { if (typeof value !== "string" || value.length === 0) throw new AegInputError(code, "required evidence string is missing"); return value; }

export function adaptEvidence(value: unknown): CanonicalEvidence {
  assertJsonDepth(value); const input = record(value); const source = record(input.source); const subject = record(input.subject); const check = record(input.check); const producer = record(input.producer); const trust = input.trust_context === undefined ? {} : record(input.trust_context);
  const kind = source.kind; if (kind !== "omk_v3" && kind !== "maintainer_ci") throw new AegInputError("AEG001", "unsupported evidence adapter");
  const exit = check.exit_code; if (exit !== null && typeof exit !== "number") throw new AegInputError("AEG001", "check exit_code must be a number or null");
  return {
    source_kind: kind,
    subject: { repository_id: string(subject.repository_id), head_sha: string(subject.head_sha) },
    check: { check_id: string(check.check_id), termination: string(check.termination), exit_code: exit as number | null },
    producer: { id: string(producer.id), run_id: string(producer.run_id), ...(typeof producer.workflow_ref === "string" ? { workflow_ref: producer.workflow_ref } : {}), ...(typeof producer.artifact_digest === "string" ? { artifact_digest: producer.artifact_digest } : {}), ...(typeof producer.observed_at === "string" ? { observed_at: producer.observed_at } : {}) },
    trust: { ...(typeof trust.repository_id === "string" ? { repository_id: trust.repository_id } : {}), ...(typeof trust.current_head_sha === "string" ? { current_head_sha: trust.current_head_sha } : {}), ...(Array.isArray(trust.trusted_workflows) && trust.trusted_workflows.every((x) => typeof x === "string") ? { trusted_workflows: trust.trusted_workflows as string[] } : {}), ...(typeof trust.workflow_ref === "string" ? { workflow_ref: trust.workflow_ref } : {}), ...(typeof trust.state_fingerprint === "string" ? { state_fingerprint: trust.state_fingerprint } : {}), ...(typeof trust.policy_digest === "string" ? { policy_digest: trust.policy_digest } : {}), ...(typeof trust.verifier_surface_changed === "boolean" ? { verifier_surface_changed: trust.verifier_surface_changed } : {}) },
    ...(typeof input.claimed_assurance === "string" ? { claimed_assurance: input.claimed_assurance } : {}),
  };
}

export function loadEvidence(filePath: string): CanonicalEvidence {
  const text = readBoundedFile(filePath, 1024 * 1024, "AEG003");
  try { return adaptEvidence(JSON.parse(text)); } catch (error) { if (error instanceof AegInputError) throw error; throw new AegInputError("AEG001", "evidence JSON is malformed"); }
}

export function computeAssurance(evidence: CanonicalEvidence): AssuranceLevel {
  const trusted = evidence.trust.repository_id === evidence.subject.repository_id && evidence.trust.current_head_sha === evidence.subject.head_sha && typeof evidence.trust.workflow_ref === "string" && evidence.trust.trusted_workflows?.includes(evidence.trust.workflow_ref) === true;
  return trusted ? "E2-candidate" : "E1";
}
