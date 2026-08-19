import { lstatSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { AegInputError, assertNoLinkAncestors, LIMITS } from "./safe.js";

function regularFile(path: string): number {
  assertNoLinkAncestors(path);
  let details: ReturnType<typeof lstatSync>;
  try {
    details = lstatSync(path);
  } catch {
    throw new AegInputError("AEG003", "receipt input is unavailable");
  }
  if (details.isSymbolicLink() || !details.isFile()) throw new AegInputError("AEG010", "receipt input must be an ordinary file");
  if (details.size > LIMITS.receiptBytes) throw new AegInputError("AEG003", "receipt input exceeds the configured size limit");
  return details.size;
}

function safeReceiptId(id: string): boolean {
  return /^[A-Za-z0-9._-]+$/.test(id) && id !== "." && id !== "..";
}

export function discoverReceiptPaths(inputPath: string): string[] {
  const root = resolve(inputPath);
  assertNoLinkAncestors(root);
  let input: ReturnType<typeof lstatSync>;
  try {
    input = lstatSync(root);
  } catch {
    throw new AegInputError("AEG003", "receipt input is unavailable");
  }
  if (input.isSymbolicLink()) throw new AegInputError("AEG010", "receipt input must not be a link");
  if (input.isFile()) {
    regularFile(root);
    return [root];
  }
  if (!input.isDirectory()) throw new AegInputError("AEG003", "receipt input must be a file or store directory");

  let entries: string[];
  try {
    entries = readdirSync(root).sort((left, right) => Buffer.compare(Buffer.from(left), Buffer.from(right)));
  } catch {
    throw new AegInputError("AEG003", "receipt store cannot be enumerated");
  }
  if (entries.length > LIMITS.receipts) throw new AegInputError("AEG003", "receipt store exceeds the configured count limit");
  let totalBytes = 0;
  const receipts: string[] = [];
  for (const id of entries) {
    const directory = join(root, id);
    let details: ReturnType<typeof lstatSync>;
    try {
      details = lstatSync(directory);
    } catch {
      throw new AegInputError("AEG003", "receipt store entry is unavailable");
    }
    if (!safeReceiptId(id) || details.isSymbolicLink() || !details.isDirectory()) throw new AegInputError("AEG010", "receipt store structure is unsafe");
    const receiptPath = join(directory, "receipt.json");
    totalBytes += regularFile(receiptPath);
    if (totalBytes > LIMITS.receiptTotalBytes) throw new AegInputError("AEG003", "receipt store exceeds the configured size limit");
    receipts.push(receiptPath);
  }
  return receipts;
}
