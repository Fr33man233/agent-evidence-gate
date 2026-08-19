import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { stringify } from "yaml";
import { computeOmkCoreDigest, parseOmkReceipt } from "../src/omk-receipt.js";
import { AegInputError } from "../src/safe.js";

const fixture = readFileSync("tests/fixtures/omk-v0.96.0/receipt-passed.json", "utf8");

test("accepts the fixed official OMK v0.96.0 vector and detects a core mutation", () => {
  const receipt = parseOmkReceipt(fixture);
  assert.equal(receipt.core.schemaVersion, 3);
  assert.equal(receipt.envelope.coreSha256, "a81160f2fedbbdf7ebefb172e011931384815809867804d0935b3efe07863116");
  assert.throws(() => parseOmkReceipt(fixture.replace("synthetic receipt", "mutated receipt")), (error: unknown) => error instanceof AegInputError && error.code === "AEG001");
});

test("rejects duplicate keys, unknown envelope fields, and persisted credentials", () => {
  assert.throws(() => parseOmkReceipt(fixture.replace('{"core":', '{"core":{"duplicate":1,"duplicate":2},"core":')));
  assert.throws(() => parseOmkReceipt(fixture.replace('"envelope":{"coreSha256"', '"envelope":{"unexpected":true,"coreSha256"')));
  const credentialReceipt = JSON.parse(fixture) as { core: Record<string, unknown>; envelope: Record<string, unknown> };
  (credentialReceipt.core.command as Record<string, unknown>).script = "node --token=secret scripts/check-version-consistency.mjs";
  credentialReceipt.envelope.coreSha256 = computeOmkCoreDigest(credentialReceipt.core);
  assert.throws(() => parseOmkReceipt(JSON.stringify(credentialReceipt)));
});

test("rejects raw output instead of bounded digest objects", () => {
  assert.throws(() => parseOmkReceipt(fixture.replace('"stdout":{"byteCount":0,"sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}', '"stdout":"private output"')));
  assert.throws(() => parseOmkReceipt(stringify(JSON.parse(fixture))));
});

test("validates workspace digests and command redaction/HMAC metadata", () => {
  const malformedWorkspace = JSON.parse(fixture) as { core: Record<string, unknown>; envelope: Record<string, unknown> };
  ((malformedWorkspace.core.workspaceAfter as Record<string, unknown>).artifacts as Array<Record<string, unknown>>)[0]!.size = 1;
  malformedWorkspace.envelope.coreSha256 = computeOmkCoreDigest(malformedWorkspace.core);
  assert.throws(() => parseOmkReceipt(JSON.stringify(malformedWorkspace)));

  const redacted = JSON.parse(fixture) as { core: Record<string, unknown>; envelope: Record<string, unknown> };
  redacted.core.commandRedaction = { policyId: "omk-command-redaction-v1", placeholders: [{ type: "cli-option-inline", count: 1 }] };
  redacted.envelope.coreSha256 = computeOmkCoreDigest(redacted.core);
  assert.throws(() => parseOmkReceipt(JSON.stringify(redacted)));
  redacted.core.commandBinding = { algorithm: "hmac-sha256", keyId: "0123456789abcdef", nonce: "0123456789abcdef0123456789abcdef", mac: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" };
  redacted.envelope.coreSha256 = computeOmkCoreDigest(redacted.core);
  assert.equal(parseOmkReceipt(JSON.stringify(redacted)).core.schemaVersion, 3);
  (redacted.core.commandBinding as Record<string, unknown>).keyId = "bad";
  redacted.envelope.coreSha256 = computeOmkCoreDigest(redacted.core);
  assert.throws(() => parseOmkReceipt(JSON.stringify(redacted)));
});

test("validates optional ledger and attestation envelope shapes", () => {
  const receipt = JSON.parse(fixture) as { core: Record<string, unknown>; envelope: Record<string, unknown> };
  receipt.envelope.ledgerBinding = { seq: 1, eventHash: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" };
  receipt.envelope.trustedAttestation = { attesterId: "synthetic", keyId: "key-1", algorithm: "ed25519", signature: "signature", issuedAt: "2026-08-19T00:00:01.000Z" };
  assert.equal((parseOmkReceipt(JSON.stringify(receipt)).envelope.ledgerBinding as { seq: number }).seq, 1);
  (receipt.envelope.trustedAttestation as Record<string, unknown>).algorithm = "rsa";
  assert.throws(() => parseOmkReceipt(JSON.stringify(receipt)));
});
