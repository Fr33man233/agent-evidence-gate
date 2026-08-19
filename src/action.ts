import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { verify } from "./runner.js";
import { renderJson, renderMarkdown, exitCode, preflightFailure } from "./report.js";

function input(name: string): string { return process.env[`INPUT_${name.toUpperCase()}`] ?? ""; }
function repository(): string { return input("repo") || process.env.GITHUB_WORKSPACE || ""; }
function write(path: string, text: string): void { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text, "utf8"); }

let code = 1;
try {
  const report = verify({ manifestPath: input("manifest"), tracePath: input("trace"), receiptsPath: input("receipts"), repoPath: repository() });
  const json = renderJson(report); write(input("json") || "gate-report.json", json); write(input("markdown") || "gate-report.md", renderMarkdown(report)); process.stdout.write(json); code = exitCode(report);
} catch (error) {
  const reason = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : "AEG001";
  const report = preflightFailure("pr", reason); const json = renderJson(report); write(input("json") || "gate-report.json", json); write(input("markdown") || "gate-report.md", renderMarkdown(report)); process.stdout.write(json);
}
process.exitCode = code;
