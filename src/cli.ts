#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { verify } from "./runner.js";
import { preflightFailure, renderJson, renderMarkdown, exitCode } from "./report.js";
import type { ProfileName } from "./types.js";

interface Arguments { manifest?: string; trace?: string; evidence?: string; repo?: string; json?: string; markdown?: string; profile?: ProfileName; }
function parseArguments(values: string[]): Arguments {
  if (values[0] !== "verify") throw new Error("usage");
  const output: Arguments = {};
  for (let index = 1; index < values.length; index += 2) {
    const key = values[index]; const value = values[index + 1]; if (!value) throw new Error("usage");
    if (key === "--manifest") output.manifest = value; else if (key === "--trace") output.trace = value; else if (key === "--evidence") output.evidence = value; else if (key === "--repo") output.repo = value; else if (key === "--json") output.json = value; else if (key === "--markdown") output.markdown = value; else if (key === "--profile" && (value === "local" || value === "pr" || value === "protected")) output.profile = value; else throw new Error("usage");
  }
  return output;
}
function write(path: string | undefined, content: string): void { if (path) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, content, "utf8"); } }
function main(): number {
  let args: Arguments; try { args = parseArguments(process.argv.slice(2)); } catch { process.stderr.write("AEG usage error\n"); return 64; }
  let profile = args.profile ?? "pr";
  try {
    if (!args.manifest || !args.trace || !args.evidence) throw new Error("missing input");
    const report = verify({ manifestPath: args.manifest, tracePath: args.trace, evidencePath: args.evidence, ...(args.repo ? { repoPath: args.repo } : {}), ...(args.profile ? { profile: args.profile } : {}) }); profile = report.profile; const json = renderJson(report); write(args.json, json); write(args.markdown, renderMarkdown(report)); process.stdout.write(json); return exitCode(report);
  } catch (error) {
    const code = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "AEG001";
    const report = preflightFailure(profile, code); const json = renderJson(report); write(args.json, json); write(args.markdown, renderMarkdown(report)); process.stdout.write(json); return exitCode(report);
  }
}
process.exitCode = main();
