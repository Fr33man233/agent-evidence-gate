import { canonicalJson } from "./safe.js";
import type { AssuranceLevel, GateReport, ProfileName } from "./types.js";

export function requiredAssurance(_profile: ProfileName): AssuranceLevel { return "E1"; }

export function preflightFailure(profile: ProfileName, code: string): GateReport {
  return { schema_version: "aeg-report/v2", policy_verdict: "fail", assurance_level: "E0", required_assurance: requiredAssurance(profile), gate_verdict: "fail", profile, reason_codes: [code], findings: [{ id: code, status: "fail", severity: "error", summary: "Evidence input was rejected before policy evaluation.", evidence_refs: [], remediation_code: "AEG-REMEDIATION-FIX-INPUT", remediation: "Correct the structured input and rerun verification.", limitations: ["Untrusted input content is intentionally not echoed."] }], limitations: ["No policy or assurance decision was made after input rejection."] };
}

export function preflightSuccess(profile: ProfileName): GateReport {
  return { schema_version: "aeg-report/v2", policy_verdict: "warn", assurance_level: "E0", required_assurance: requiredAssurance(profile), gate_verdict: "warn", profile, reason_codes: ["AEG-PREFLIGHT-ONLY"], findings: [{ id: "AEG-PREFLIGHT-ONLY", status: "warn", severity: "warning", summary: "Structured inputs passed preflight; policy evaluation is not yet enabled.", evidence_refs: [], remediation_code: "AEG-REMEDIATION-CONTINUE-INTEGRATION", remediation: "Provide native OMK receipts after the core policy engine is enabled.", limitations: ["This checkpoint deliberately makes no pass claim."] }], limitations: ["Preflight-only report; no evidence assurance has been established."] };
}

export function renderMarkdown(report: GateReport): string {
  return ["# Agent Evidence Gate report", "", `- Gate verdict: \`${report.gate_verdict}\``, `- Policy verdict: \`${report.policy_verdict}\``, `- Assurance: \`${report.assurance_level}\` (required: \`${report.required_assurance}\`)`, `- Reason codes: ${report.reason_codes.map((code) => `\`${code}\``).join(", ") || "none"}`, "", "## Findings", "", ...report.findings.map((finding) => `- \`${finding.id}\` — ${finding.summary} (${finding.remediation_code})`), "", "## Limitations", "", ...report.limitations.map((limitation) => `- ${limitation}`,), ""].join("\n");
}

export function renderJson(report: GateReport): string { return canonicalJson(report); }
export function exitCode(report: GateReport): number { return report.gate_verdict === "pass" ? 0 : report.gate_verdict === "warn" || report.gate_verdict === "approval_required" ? 2 : 1; }
