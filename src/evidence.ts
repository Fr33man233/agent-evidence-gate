import { resolve } from "node:path";
import { AegInputError } from "./safe.js";
import type { AgentTaskManifest, CommandDescriptor, TraceEvent } from "./types.js";
import type { OmkReceipt } from "./omk-receipt.js";

export interface CanonicalE1Evidence {
  assurance_level: "E1";
  goal_id: string;
  receipt_ids: string[];
  check_ids: string[];
  core_digests: string[];
}

function canonicalPath(value: string): string { return resolve(value).replaceAll("\\", "/"); }

function commandMatches(expected: CommandDescriptor, actual: Record<string, unknown>): boolean {
  if (expected.kind !== actual.kind) return false;
  if (expected.kind === "shell") return actual.script === expected.script && (expected.shell === undefined || actual.shell === expected.shell);
  return actual.executable === expected.executable && Array.isArray(actual.argv) && actual.argv.length === expected.argv.length && actual.argv.every((item, index) => item === expected.argv[index]);
}

function selectGoal(manifest: AgentTaskManifest, receipts: OmkReceipt[]): string {
  const goals = [...new Set(receipts.map((receipt) => receipt.core.goalId))];
  if (manifest.omk_goal_id !== undefined) {
    if (!goals.includes(manifest.omk_goal_id)) throw new AegInputError("AEG020", "selected receipt goal is unavailable");
    return manifest.omk_goal_id;
  }
  if (goals.length !== 1) throw new AegInputError("AEG020", "receipt goals are ambiguous");
  return goals[0] as string;
}

export function collectNativeEvidence(manifest: AgentTaskManifest, trace: TraceEvent[], receipts: OmkReceipt[], repositoryRoot: string): CanonicalE1Evidence {
  if (receipts.length === 0) throw new AegInputError("AEG020", "no receipts were supplied");
  const ids = new Set<string>();
  for (const receipt of receipts) { if (ids.has(receipt.core.receiptId)) throw new AegInputError("AEG020", "receipt identities are ambiguous"); ids.add(receipt.core.receiptId); }
  const goal = selectGoal(manifest, receipts);
  if (trace.length === 0 || trace[0]?.run_id !== goal || trace.some((event) => event.run_id !== goal)) throw new AegInputError("AEG002", "trace does not bind to selected goal");
  const root = canonicalPath(repositoryRoot);
  const selected: Array<{ check: string; receipt: OmkReceipt }> = [];
  for (const check of manifest.required_checks) {
    const expectedCwd = canonicalPath(resolve(root, check.cwd ?? "."));
    const matches = receipts.filter((receipt) => receipt.core.goalId === goal && commandMatches(check.command, receipt.core.command) && canonicalPath(receipt.core.cwd) === expectedCwd).sort((left, right) => left.core.finishedAt.localeCompare(right.core.finishedAt));
    const latest = matches.at(-1);
    if (latest === undefined || (matches.length > 1 && matches.at(-2)?.core.finishedAt === latest.core.finishedAt)) throw new AegInputError("AEG020", "required receipt check is missing or ambiguous");
    if (latest.core.status !== "passed" || latest.core.exitCode !== 0) throw new AegInputError("AEG020", "latest required receipt did not pass");
    selected.push({ check: check.id, receipt: latest });
  }
  return { assurance_level: "E1", goal_id: goal, receipt_ids: selected.map((item) => item.receipt.core.receiptId), check_ids: selected.map((item) => item.check), core_digests: selected.map((item) => item.receipt.envelope.coreSha256) };
}
