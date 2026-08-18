import { parseDocument } from "yaml";
import { AegInputError, assertJsonDepth, assertSafeRepoPath, LIMITS, readBoundedFile } from "./safe.js";
import type { AgentTaskManifest, ProfileName, RequiredCheck } from "./types.js";

const profiles = new Set<ProfileName>(["local", "pr", "protected"]);

function asStringArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) throw new AegInputError("AEG001", `${field} must be an array of strings`);
  value.forEach((path) => assertSafeRepoPath(path, "AEG001"));
  return [...value];
}

function parseChecks(value: unknown): RequiredCheck[] {
  if (!Array.isArray(value)) throw new AegInputError("AEG001", "required_checks must be an array");
  const ids = new Set<string>();
  return value.map((candidate) => {
    if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) throw new AegInputError("AEG001", "required check must be an object");
    const check = candidate as Record<string, unknown>;
    if (typeof check.id !== "string" || !/^[A-Za-z0-9._-]+$/.test(check.id) || ids.has(check.id)) throw new AegInputError("AEG001", "required check id must be unique and stable");
    ids.add(check.id);
    if (check.argv !== undefined && (!Array.isArray(check.argv) || !check.argv.every((part) => typeof part === "string"))) throw new AegInputError("AEG001", "check argv must be an array of strings");
    if (check.cwd !== undefined) assertSafeRepoPath(check.cwd, "AEG001");
    return { id: check.id, ...(typeof check.kind === "string" ? { kind: check.kind } : {}), ...(Array.isArray(check.argv) ? { argv: check.argv as string[] } : {}), ...(typeof check.cwd === "string" ? { cwd: check.cwd } : {}), ...(typeof check.success_exit_code === "number" ? { success_exit_code: check.success_exit_code } : {}) };
  });
}

function parseBudget(value: unknown): AgentTaskManifest["budget"] {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new AegInputError("AEG001", "budget must be an object");
  const budget = value as Record<string, unknown>;
  const number = (key: "tokens" | "duration_ms" | "tool_calls" | "retries"): number | undefined => {
    const item = budget[key]; if (item === undefined) return undefined;
    if (typeof item !== "number" || !Number.isFinite(item) || item < 0) throw new AegInputError("AEG001", "budget values must be non-negative numbers"); return item;
  };
  if (budget.enforce !== undefined && typeof budget.enforce !== "boolean") throw new AegInputError("AEG001", "budget enforce must be boolean");
  const output: NonNullable<AgentTaskManifest["budget"]> = {};
  const tokens = number("tokens"); if (tokens !== undefined) output.tokens = tokens;
  const duration = number("duration_ms"); if (duration !== undefined) output.duration_ms = duration;
  const toolCalls = number("tool_calls"); if (toolCalls !== undefined) output.tool_calls = toolCalls;
  const retries = number("retries"); if (retries !== undefined) output.retries = retries;
  if (typeof budget.enforce === "boolean") output.enforce = budget.enforce;
  return output;
}

function parseDependencyPolicy(value: unknown): AgentTaskManifest["dependency_policy"] {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new AegInputError("AEG001", "dependency_policy must be an object");
  const policy = value as Record<string, unknown>;
  if (policy.lockfile_required !== undefined && typeof policy.lockfile_required !== "boolean") throw new AegInputError("AEG001", "dependency lockfile_required must be boolean");
  const names = (field: "allowed" | "denied"): string[] | undefined => policy[field] === undefined ? undefined : asStringArray(policy[field], `dependency_policy.${field}`);
  const output: NonNullable<AgentTaskManifest["dependency_policy"]> = {};
  if (typeof policy.lockfile_required === "boolean") output.lockfile_required = policy.lockfile_required;
  const allowed = names("allowed"); if (allowed !== undefined) output.allowed = allowed;
  const denied = names("denied"); if (denied !== undefined) output.denied = denied;
  return output;
}

function parseClaims(value: unknown): AgentTaskManifest["claims"] {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new AegInputError("AEG001", "claims must be an array");
  const ids = new Set<string>();
  return value.map((claim) => { if (claim === null || typeof claim !== "object" || Array.isArray(claim) || typeof (claim as Record<string, unknown>).id !== "string") throw new AegInputError("AEG001", "claims require stable ids"); const item = claim as Record<string, unknown>; if (ids.has(item.id as string)) throw new AegInputError("AEG001", "claim ids must be unique"); ids.add(item.id as string); return { id: item.id as string, ...(typeof item.status === "string" ? { status: item.status } : {}) }; });
}

export function parseManifestText(text: string): AgentTaskManifest {
  const document = parseDocument(text, { uniqueKeys: true, prettyErrors: false });
  if (document.errors.length > 0) throw new AegInputError("AEG001", "manifest is malformed or contains duplicate keys");
  const input = document.toJS();
  assertJsonDepth(input);
  if (input === null || typeof input !== "object" || Array.isArray(input)) throw new AegInputError("AEG001", "manifest must be an object");
  const value = input as Record<string, unknown>;
  if (value.schema_version !== "aeg-task/v1" || typeof value.task_id !== "string" || value.task_id.length === 0) throw new AegInputError("AEG001", "manifest schema_version and task_id are required");
  if (!profiles.has(value.profile as ProfileName)) throw new AegInputError("AEG001", "manifest profile must be local, pr, or protected");
  const dependencyPolicy = parseDependencyPolicy(value.dependency_policy);
  const budget = parseBudget(value.budget);
  const claims = parseClaims(value.claims);
  return {
    schema_version: "aeg-task/v1",
    task_id: value.task_id,
    ...(typeof value.objective === "string" ? { objective: value.objective } : {}),
    ...(typeof value.base_commit === "string" ? { base_commit: value.base_commit } : {}),
    profile: value.profile as ProfileName,
    allowed_paths: asStringArray(value.allowed_paths ?? [], "allowed_paths"),
    denied_paths: asStringArray(value.denied_paths ?? [], "denied_paths"),
    sensitive_paths: asStringArray(value.sensitive_paths ?? [], "sensitive_paths"),
    required_checks: parseChecks(value.required_checks ?? []),
    ...(dependencyPolicy === undefined ? {} : { dependency_policy: dependencyPolicy }),
    ...(budget === undefined ? {} : { budget }),
    ...(value.test_surface !== undefined ? { test_surface: asStringArray(value.test_surface, "test_surface") } : {}),
    ...(value.verifier_surface !== undefined ? { verifier_surface: asStringArray(value.verifier_surface, "verifier_surface") } : {}),
    ...(claims === undefined ? {} : { claims }),
    ...(value.exceptions !== undefined ? { exceptions: asStringArray(value.exceptions, "exceptions") } : {}),
  };
}

export function loadManifest(filePath: string): AgentTaskManifest {
  return parseManifestText(readBoundedFile(filePath, LIMITS.manifestBytes, "AEG003"));
}
