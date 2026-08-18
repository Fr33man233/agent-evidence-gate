export const ASSURANCE_LEVELS = ["E0", "E1", "E2-candidate", "E3"] as const;
export type AssuranceLevel = (typeof ASSURANCE_LEVELS)[number];
export const PROFILES = ["local", "pr", "protected"] as const;
export type ProfileName = (typeof PROFILES)[number];
export type Verdict = "pass" | "warn" | "fail" | "approval_required";
export type Severity = "info" | "warning" | "error";

export interface RequiredCheck {
  id: string;
  kind?: string;
  argv?: string[];
  cwd?: string;
  success_exit_code?: number;
  scope?: string[];
}

export interface Budget {
  tokens?: number;
  duration_ms?: number;
  tool_calls?: number;
  retries?: number;
  enforce?: boolean;
}

export interface AgentTaskManifest {
  schema_version: "aeg-task/v1";
  task_id: string;
  objective?: string;
  base_commit?: string;
  profile: ProfileName;
  allowed_paths: string[];
  denied_paths: string[];
  sensitive_paths: string[];
  required_checks: RequiredCheck[];
  dependency_policy?: { lockfile_required?: boolean; allowed?: string[]; denied?: string[] };
  budget?: Budget;
  verifier_surface?: string[];
  test_surface?: string[];
  claims?: Array<{ id: string; status?: string }>;
  exceptions?: string[];
}

export interface TraceEvent {
  schema_version: "aeg-trace/v1";
  run_id: string;
  event_id: string;
  sequence: number;
  timestamp: string;
  event_type: "run_started" | "file_read" | "file_written" | "command_finished" | "test_result" | "model_usage" | "retry" | "run_finished";
  producer: { id: string; kind?: string };
  data: Record<string, unknown>;
}

export interface Finding {
  id: string;
  status: Verdict;
  severity: Severity;
  summary: string;
  evidence_refs: string[];
  remediation_code: string;
  remediation: string;
  limitations: string[];
}

export interface GateReport {
  schema_version: "aeg-report/v1";
  policy_verdict: Verdict;
  assurance_level: AssuranceLevel;
  required_assurance: AssuranceLevel;
  gate_verdict: Verdict;
  profile: ProfileName;
  reason_codes: string[];
  findings: Finding[];
  limitations: string[];
}
