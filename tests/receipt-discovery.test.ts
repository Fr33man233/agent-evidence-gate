import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { discoverReceiptPaths } from "../src/receipts.js";
import { AegInputError } from "../src/safe.js";

test("discovers only ordinal-sorted receipt.json files in an OMK store root", () => {
  const root = mkdtempSync(join(tmpdir(), "aeg-receipts-"));
  try {
    for (const id of ["receipt-b", "receipt-a"]) {
      const directory = join(root, id);
      mkdirSync(directory);
      writeFileSync(join(directory, "receipt.json"), "{}", "utf8");
    }
    assert.deepEqual(discoverReceiptPaths(root).map((path) => path.replaceAll("\\", "/").split("/").slice(-2).join("/")), ["receipt-a/receipt.json", "receipt-b/receipt.json"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects an OMK store entry without a receipt", () => {
  const root = mkdtempSync(join(tmpdir(), "aeg-receipts-"));
  try {
    mkdirSync(join(root, "receipt-a"));
    assert.throws(() => discoverReceiptPaths(root), (error: unknown) => error instanceof AegInputError && error.code === "AEG003");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("rejects a receipt file reached through an ancestor junction", () => {
  const root = mkdtempSync(join(tmpdir(), "aeg-receipts-link-"));
  try {
    const target = join(root, "target");
    const link = join(root, "link");
    mkdirSync(target);
    writeFileSync(join(target, "receipt.json"), "{}", "utf8");
    symlinkSync(target, link, "junction");
    assert.throws(() => discoverReceiptPaths(join(link, "receipt.json")), (error: unknown) => error instanceof AegInputError && error.code === "AEG010");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
