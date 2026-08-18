import { computeAssurance, type CanonicalEvidence } from "./adapters.js";
import type { GitFacts } from "./git.js";
import { assertSafeRepoPath } from "./safe.js";
import type { AgentTaskManifest, Finding, GateReport, TraceEvent, Verdict } from "./types.js";
import { requiredAssurance } from "./report.js";

const rank = { E0: 0, E1: 1, "E2-candidate": 2, E3: 3 } as const;
function finding(id: string, status: Verdict, summary: string, remediation = "Correct the evidence and rerun verification."): Finding { return { id, status, severity: status === "fail" ? "error" : status === "warn" || status === "approval_required" ? "warning" : "info", summary, evidence_refs: [], remediation_code: `AEG-REMEDIATION-${id}`, remediation, limitations: [] }; }
function matches(path: string, rules: string[]): boolean { return rules.some((rule) => path === rule || path.startsWith(`${rule.replace(/\/$/, "")}/`)); }
function eventPaths(events: TraceEvent[], eventType: string): string[] { return events.filter((event) => event.event_type === eventType).flatMap((event) => typeof event.data.path === "string" ? [event.data.path] : []); }
function sumUsage(events: TraceEvent[], field: string): number | undefined { const values = events.filter((event) => event.event_type === "model_usage").map((event) => event.data[field]).filter((value): value is number => typeof value === "number" && Number.isFinite(value)); return values.length ? values.reduce((sum, value) => sum + value, 0) : undefined; }
function declaredDependencies(events: TraceEvent[]): string[] { return events.flatMap((event) => Array.isArray(event.data.dependencies) ? event.data.dependencies.filter((value): value is string => typeof value === "string") : []); }
function commandReceiptFindings(manifest: AgentTaskManifest, trace: TraceEvent): boolean { const check = manifest.required_checks.find((item) => item.id === trace.data.check_id); if (!check) return false; const argv = trace.data.argv; const cwd = trace.data.cwd; return Array.isArray(argv) && JSON.stringify(argv) === JSON.stringify(check.argv ?? []) && cwd === (check.cwd ?? ".") && trace.data.termination === "completed" && trace.data.exit_code === (check.success_exit_code ?? 0); }

export function evaluate(manifest: AgentTaskManifest, trace: TraceEvent[], evidence: CanonicalEvidence, gitFacts?: GitFacts): GateReport {
  const findings: Finding[] = [];
  const assurance = computeAssurance(evidence); const required = requiredAssurance(manifest.profile);
  if (evidence.subject.repository_id !== evidence.trust.repository_id || evidence.subject.head_sha !== evidence.trust.current_head_sha) findings.push(finding("AEG003", "fail", "Evidence subject does not match the current verifier context."));
  if (gitFacts && (evidence.subject.head_sha !== gitFacts.head || evidence.trust.state_fingerprint !== gitFacts.fingerprint)) findings.push(finding("AEG003", "fail", "Evidence state binding is incompatible with current Git facts."));
  if (rank[assurance] < rank[required]) findings.push(finding("AEG070", "fail", "Evidence assurance is below the profile requirement."));
  else if (assurance === "E1" && manifest.profile === "local") findings.push(finding("AEG070", "warn", "Local verification is self-reported and does not establish external assurance."));
  const check = manifest.required_checks.find((candidate) => candidate.id === evidence.check.check_id);
  if (!check) findings.push(finding("AEG020", "fail", "Evidence names an unknown required check."));
  if (evidence.check.termination !== "completed" || evidence.check.exit_code !== 0) findings.push(finding("AEG020", "fail", "Required check did not complete successfully."));
  const commandEvents = trace.filter((event) => event.event_type === "command_finished");
  if (commandEvents.length > 0 && !commandEvents.some((event) => commandReceiptFindings(manifest, event))) findings.push(finding("AEG020", "fail", "Trace command receipt does not match the declared required check."));
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
  if (evidence.trust.verifier_surface_changed) {
    const approved = manifest.exceptions?.includes("surface-approved") === true;
    findings.push(finding("AEG061", approved ? "warn" : manifest.profile === "protected" ? "fail" : "approval_required", approved ? "Verifier or protected workflow surface changed with an explicit approval." : "Verifier or protected workflow surface changed."));
  }
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
  const traceableFindings = findings.map((item) => item.evidence_refs.length > 0 ? item : { ...item, evidence_refs: ["manifest", "trace", "evidence"] });
  return { schema_version: "aeg-report/v1", policy_verdict: verdict, assurance_level: assurance, required_assurance: required, gate_verdict: verdict, profile: manifest.profile, reason_codes: traceableFindings.map((item) => item.id).sort(), findings: traceableFindings.sort((a, b) => a.id.localeCompare(b.id)), limitations: ["E2-candidate is not evidence of a production-proven independent CI identity."] };
}
