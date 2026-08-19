import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

export const LIMITS = Object.freeze({
  manifestBytes: 1024 * 1024,
  traceBytes: 20 * 1024 * 1024,
  jsonlLineBytes: 256 * 1024,
  traceEvents: 50_000,
  pathLength: 4_096,
  jsonDepth: 32,
  receiptBytes: 1024 * 1024,
  receiptTotalBytes: 8 * 1024 * 1024,
  receipts: 64,
});

export class AegInputError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "AegInputError";
  }
}

export function readBoundedFile(filePath: string, maximumBytes: number, code: string): string {
  const absolute = resolve(filePath);
  const size = statSync(absolute).size;
  if (size > maximumBytes) throw new AegInputError(code, "input exceeds the configured size limit");
  return readFileSync(absolute, "utf8");
}

export function assertJsonDepth(value: unknown, maximumDepth = LIMITS.jsonDepth): void {
  const visit = (item: unknown, depth: number): void => {
    if (depth > maximumDepth) throw new AegInputError("AEG003", "JSON nesting depth exceeds the configured limit");
    if (Array.isArray(item)) item.forEach((entry) => visit(entry, depth + 1));
    else if (item !== null && typeof item === "object") Object.values(item).forEach((entry) => visit(entry, depth + 1));
  };
  visit(value, 0);
}

export function assertSafeRepoPath(value: unknown, code = "AEG010"): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > LIMITS.pathLength) {
    throw new AegInputError(code, "repository path is missing or outside the configured limit");
  }
  const normalized = value.replaceAll("\\", "/");
  if (normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized) || normalized.split("/").includes("..")) {
    throw new AegInputError(code, "repository path is not relative and normalized");
  }
}

export function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(Object.keys(value as Record<string, unknown>).sort().map((key) => [key, canonicalize((value as Record<string, unknown>)[key])]));
  }
  return value;
}

export function canonicalJson(value: unknown): string {
  return `${JSON.stringify(canonicalize(value))}\n`;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

const FORBIDDEN_KEYS = new Set(["prompt", "source", "raw_output", "stdout", "stderr", "environment", "env", "credential", "credentials", "secret", "token", "password"]);
const PRIVACY_SENTINEL = "AEG_PRIVATE_SENTINEL";

export function assertNoForbiddenFields(value: unknown): void {
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) return item.forEach(visit);
    if (typeof item === "string" && item.includes(PRIVACY_SENTINEL)) throw new AegInputError("AEG050", "input contains a privacy sentinel");
    if (item === null || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey === "stdout" || lowerKey === "stderr") {
        if (child === null || typeof child !== "object" || Array.isArray(child)) throw new AegInputError("AEG050", "raw command output is forbidden");
        const summary = child as Record<string, unknown>; const keys = Object.keys(summary);
        if (keys.some((name) => !["summary", "bytes", "truncated"].includes(name)) || (summary.summary !== undefined && typeof summary.summary !== "string") || (summary.bytes !== undefined && typeof summary.bytes !== "number") || (summary.truncated !== undefined && typeof summary.truncated !== "boolean")) throw new AegInputError("AEG050", "command output must be a bounded summary object");
      } else if (FORBIDDEN_KEYS.has(lowerKey)) throw new AegInputError("AEG050", "input contains a forbidden private field");
      visit(child);
    }
  };
  visit(value);
}
