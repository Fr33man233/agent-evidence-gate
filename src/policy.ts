import type { CanonicalE1Evidence } from "./evidence.js";
import { assertSafeRepoPath } from "./safe.js";
import type { AgentTaskManifest, Finding, GateReport, TraceEvent, Verdict } from "./types.js";
import { requiredAssurance } from "./report.js";

function finding(id: string, status: Verdict, summary: string, remediation = "Correct the evidence and rerun verification."): Finding { return { id, status, severity: status === "fail" ? "error" : status === "warn" || status === "approval_required" ? "warning" : "info", summary, evidence_refs: [], remediation_code: `AEG-REMEDIATION-${id}`, remediation, limitations: [] }; }
function matches(path: string, rules: string[]): boolean { return rules.some((rule) => path === rule || path.startsWith(`${rule.replace(/\/$/, "")}/`)); }
function eventPaths(events: TraceEvent[], eventType: string): string[] { return events.filter((event) => event.event_type === eventType).flatMap((event) => typeof event.data.path === "string" ? [event.data.path] : []); }
function sumUsage(events: TraceEvent[], field: string): number | undefined { const values = events.filter((event) => event.event_type === "model_usage").map((event) => event.data[field]).filter((value): value is number => typeof value === "number" && Number.isFinite(value)); return values.length ? values.reduce((sum, value) => sum + value, 0) : undefined; }
function declaredDependencies(events: TraceEvent[]): string[] { return events.flatMap((event) => Array.isArray(event.data.dependencies) ? event.data.dependencies.filter((value): value is string => typeof value === "string") : []); }

export function evaluate(manifest: AgentTaskManifest, trace: TraceEvent[], evidence: CanonicalE1Evidence): GateReport {
  const findings: Finding[] = [];
  const assurance = evidence.assurance_level; const required = requiredAssurance(manifest.profile);
  if (manifest.profile !== "local") findings.push(finding("AEG070", "fail", "Native OMK receipt assurance is supported only for local verification."));
  for (const event of trace.filter((item) => item.event_type === "test_result")) {
    const failed = typeof event.data.failed === "number" ? event.data.failed : 0;
    const cancelled = typeof event.data.cancelled === "number" ? event.data.cancelled : 0;
    const skipped = typeof event.data.skipped === "number" ? event.data.skipped : 0;
    if (failed > 0 || cancelled > 0) findings.push(finding("AEG021", "fail", "Structured test results include failed or cancelled tests."));
    else if (skipped > 0) findings.push(finding("AEG021", "warn", "Structured test results include skipped tests."));
  }
  for (const path of eventPaths(trace, "file_written")) { try { assertSafeRepoPath(path); } catch { findings.push(finding("AEG010", "fail", "Trace contains an unsafe repository path.")); continue; } if (matches(path, manifest.denied_paths) || (manifest.allowed_paths.length > 0 && !matches(path, manifest.allowed_paths))) findings.push(finding("AEG010", "fail", "Trace writes outside the declared scope.")); if (matches(path, manifest.sensitive_paths) && !manifest.exceptions?.includes(`sensitive-write:${path}`)) findings.push(finding("AEG030", "fail", "Trace writes a sensitive path without an exception.")); }
  const reads = eventPaths(trace, "file_read");
  if (manifest.sensitive_paths.length > 0 && reads.length === 0 && trace.some((event) => event.data.file_read_observable === false)) findings.push(finding("AEG031", manifest.profile === "protected" ? "fail" : "warn", "Sensitive-read observability is unavailable."));
  for (const path of reads) { if (matches(path, manifest.sensitive_paths) && !manifest.exceptions?.includes(`sensitive-read:${path}`)) findings.push(finding("AEG031", manifest.profile === "local" ? "warn" : "fail", "Trace reads a sensitive path without an exception.")); }
  const dependencies = declaredDependencies(trace);
  if (manifest.dependency_policy?.lockfile_required && !trace.some((event) => event.data.lockfile_present === true)) findings.push(finding("AEG040", "fail", "Required lockfile presence is not established by evidence."));
  if (manifest.dependency_policy?.denied?.some((name) => dependencies.includes(name))) findings.push(finding("AEG040", "fail", "Trace declares a dependency prohibited by manifest policy."));
  if (manifest.dependency_policy?.allowed && dependencies.some((name) => !manifest.dependency_policy?.allowed?.includes(name))) findings.push(finding("AEG040", "fail", "Trace declares a dependency outside the manifest allowlist."));
  const testSurface = manifest.test_surface;
  if (testSurface && eventPaths(trace, "file_written").some((path) => matches(path, testSurface))) findings.push(finding("AEG060", manifest.profile === "protected" ? "fail" : "warn", "Trace changes the declared test surface."));
  const finishedClaims = trace.find((event) => event.event_type === "run_finished")?.data.claims;
  if (manifest.claims && (!Array.isArray(finishedClaims) || manifest.claims.some((claim) => !finishedClaims.includes(claim.id)))) findings.push(finding("AEG021", "fail", "Structured C2 claims do not match the manifest claim IDs."));
  const finishedData = trace.find((event) => event.event_type === "run_finished")?.data;
  if (finishedData?.self_verified === true && finishedData.independent_verifier !== true) findings.push(finding("AEG022", "warn", "The producer marked the run as self-verified; no independent verifier evidence was supplied."));
  const budget = manifest.budget;
  if (budget) {
    const metrics: Array<[keyof typeof budget, string]> = [["tokens", "total_tokens"], ["duration_ms", "duration_ms"], ["tool_calls", "tool_calls"], ["retries", "attempt"]];
    for (const [limitKey, traceKey] of metrics) {
      const limit = budget[limitKey]; if (typeof limit !== "number") continue;
      const used = limitKey === "retries" ? trace.filter((event) => event.event_type === "retry").length : sumUsage(trace, traceKey);
      if (used === undefined || used === 0 && limitKey !== "retries" && !trace.some((event) => event.event_type === "model_usage")) { const enforced = manifest.profile === "protected" || budget.enforce === true; findings.push(finding("AEG050", enforced ? "fail" : "warn", "Declared resource budget has no observable usage.")); }
      else if (used > limit) findings.push(finding("AEG050", "fail", "Observed resource usage exceeds the declared budget."));
    }
  } else if (manifest.profile === "protected") findings.push(finding("AEG050", "fail", "Protected profile requires a resource budget."));
  if (budget && manifest.profile === "protected" && !(["tokens", "duration_ms", "tool_calls", "retries"] as const).some((key) => typeof budget[key] === "number")) findings.push(finding("AEG050", "fail", "Protected profile requires at least one declared resource budget dimension."));
  const finished = trace.find((event) => event.event_type === "run_finished");
  if (!finished) findings.push(finding("AEG002", "fail", "Trace has no run_finished event."));
  const failures = findings.filter((item) => item.status === "fail"); const approvals = findings.filter((item) => item.status === "approval_required"); const warnings = findings.filter((item) => item.status === "warn");
  const verdict: Verdict = failures.length ? "fail" : approvals.length ? "approval_required" : warnings.length ? "warn" : "pass";
  const traceableFindings = findings.map((item) => item.evidence_refs.length > 0 ? item : { ...item, evidence_refs: ["manifest", "trace", "receipt"] });
  return { schema_version: "aeg-report/v2", policy_verdict: verdict, assurance_level: assurance, required_assurance: required, gate_verdict: verdict, profile: manifest.profile, reason_codes: traceableFindings.map((item) => item.id).sort(), findings: traceableFindings.sort((a, b) => a.id.localeCompare(b.id)), limitations: ["E1 native OMK receipts do not establish independent CI, attestation, replay membership, freshness outside the selected workspace, or runner honesty."] };
}
