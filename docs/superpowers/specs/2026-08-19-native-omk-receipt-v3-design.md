# Agent Evidence Gate v0.2.0 Native OMK Receipt v3 Design

**Status:** Approved for implementation planning

**Date:** 2026-08-19

**Branch:** `codex/v0.2.0-omk-native`

**Base:** public v0.1.3 commit `d82c7863f48878bfee66e978e7569c464de48ea2`

**Compatibility target:** `open-multi-agent-kit@0.96.0`

**Implementation status:** Not started

## 1. Decision summary

AEG v0.2.0 is an intentional breaking reset whose first independently useful outcome is a real, deterministic, privacy-first local evidence gate for native OMK EvidenceReceipt v3 files.

The release will not preserve the v0.1 AEG-specific evidence envelope. It will remove the misleading `source.kind: omk_v3 | maintainer_ci` adapter surface and the evidence-embedded `trust_context` path. AEG will consume native OMK Receipt v3 files directly, bind them to a structured task contract, a separate structured agent trace, and the live Git worktree, then produce deterministic JSON, Markdown, and exit-code results.

Every accepted v0.2 Receipt remains at assurance level E1. Receipt integrity does not establish an independent CI identity, trusted attestation, replay-ledger membership, runner honesty, freshness outside the selected workspace scope, or OS isolation.

## 2. User outcome and milestone

The nearest external milestone is a local pilot in `AI项目风险与交付助手`:

1. OMK runs a declared version-consistency check and writes a real Receipt v3.
2. AEG validates the Receipt structure and immutable core digest.
3. AEG matches the Receipt to a required check using exact structured command data, never claim prose.
4. AEG binds the selected Receipt to the trace run and the current Git state.
5. AEG emits an E1 report and a reliable exit code.
6. A post-check code change makes the Receipt stale and the gate fail.
7. Rerunning the OMK check produces a fresh Receipt and restores a passing gate.

This pass/fail/re-run loop is the v0.2 product proof.

## 3. Senior full-stack preflight

### 3.1 User and business value

The v0.1 release demonstrates a deterministic policy engine but does not consume a real OMK Receipt. v0.2 closes that gap and makes AEG usable in the maintainer's own OMK-assisted development before broader adoption claims or cross-harness expansion.

The release also corrects a P0 trust-boundary flaw: v0.1 evidence can embed the same context used to upgrade its own assurance. v0.2 removes that path instead of attempting to preserve it.

### 3.2 Scope classification

#### Optimize now

- Remove the v0.1 evidence envelope and its duplicate normalization layer.
- Remove evidence-embedded trust evaluation.
- Add a dependency-free native OMK Receipt v3 parser and compatibility validator.
- Match required checks by exact command descriptor and repository-relative cwd.
- Recompute OMK-compatible current workspace facts for state binding.
- Reuse the existing manifest, trace, policy, report, and Git abstractions where their semantics remain valid.
- Migrate the Action runtime and bundle target to Node 24.
- Replace obsolete adapter tests with native OMK positive and negative coverage.

#### Defer

- E2 or E2-candidate assurance.
- Cryptographic trusted-attestation verification.
- OMK replay-ledger membership and freshness ordering.
- Automatic conversion of OMK internal session files into `agent-trace.jsonl`.
- Additional agent-harness adapters.
- A v0.1-to-v0.2 migration utility.
- Dashboard, service, database, model, API, or network-backed features.

#### Remove

- The AEG-specific `evidence.json` envelope.
- `source.kind: omk_v3 | maintainer_ci` compatibility routing.
- `subject`, `producer`, `check`, and `trust_context` envelope fields.
- The current `maintainer_ci` adapter claim.
- PR/protected success claims based on E1 or self-supplied context.
- Natural-language claim matching.

#### Risks

- The compatibility code must remain byte-compatible with OMK 0.96.0 canonicalization and workspace-digest rules.
- OMK internal Receipt schema changes require an explicit future compatibility review; v0.2 must reject unknown versions.
- A required separate AEG trace means the integration is not yet a one-file plug-in.
- Local E1 evidence can still be fabricated by a malicious local producer; the report must state this limitation.
- Absolute workspace paths make v0.2 state binding intentionally local to the generating checkout.

### 3.3 Boundaries

#### Frontend and UX

There is no graphical UI. The supported surfaces are CLI output, deterministic report files, and a read-only GitHub Action summary.

#### Backend and workflow

The runtime is one fixed Node bundle. It reads bounded local files, invokes only bounded Git inspection, evaluates pure policies, and writes requested reports. It does not execute Receipt commands or candidate code.

#### Model boundary

AEG makes zero model, LLM, embedding, or external API calls. OMK may have used a model before AEG runs; that is outside AEG's runtime and trust boundary.

#### Data boundary

Inputs are an AEG task manifest, an AEG trace, native OMK Receipt files, and Git facts from the selected repository. Reports expose stable identifiers, digests, statuses, fixed summaries, and remediation text only.

#### Security and privacy

AEG uses no secrets, reads no credential store, follows no input symlink/junction, makes no network request, and never echoes untrusted claim, command, absolute cwd, stdout, stderr, environment, or credential-shaped data.

#### Deployment and rollback

Development occurs in an isolated worktree. The public v0.1.3 tag remains unchanged. No Marketplace alias, GitHub release, or public branch is updated until the full exit criteria pass and the user separately confirms publication.

### 3.4 Resource budget

| Resource | Baseline | v0.2 target | Hard limit | Validation |
| --- | ---: | ---: | ---: | --- |
| Production dependencies | 1 (`yaml`) | no new dependency | at most 1 total | package and lock audit |
| CLI bundle | 297,638 bytes | at most 500 KiB | 1 MiB | build artifact size |
| Action bundle | 296,699 bytes | at most 500 KiB | 1 MiB | build artifact size |
| Full tests | 76 pass, about 1.36–2.1 s | at most 5 s | 10 s investigation threshold | fixed local Node run |
| Receipts per run | n/a | at most 64 | 64 | boundary tests |
| Receipt bytes | n/a | at most 1 MiB each | 1 MiB | bounded read |
| Total Receipt bytes | n/a | at most 8 MiB | 8 MiB | preflight accounting |
| JSON depth | existing bounded parser | at most 32 | 32 | negative fixture |
| Runtime network/model/API | 0 | 0 | 0 | static and integration audit |

The expected efficiency improvement is removal of duplicate envelope parsing and compatibility tests. The validation method is a smaller adapter surface, no new production dependency, a bundle within budget, and a full suite within five seconds.

### 3.5 Preflight decision

**GO** for design documentation and implementation planning. Code implementation is permitted only after this document is reviewed and an implementation plan is approved. Any P0 security, privacy, determinism, or data-boundary failure returns the version to **NO-GO** for release.

## 4. Compatibility spike evidence

The controlled spike inspected the npm-published `open-multi-agent-kit@0.96.0` archive using synthetic, non-sensitive data only.

- npm version: `0.96.0`
- tarball: `https://registry.npmjs.org/open-multi-agent-kit/-/open-multi-agent-kit-0.96.0.tgz`
- verified integrity: `sha512-ZSnKjxCiVoETcf9oHblB7iWW4c1VIctaum9jYRjD5YBaP3CDGvR6MuQWIkskuIK1w0Q1ydhYNoqY4ZiH+O79bw==`
- tarball size: 6,759,921 bytes
- unpacked size: 21,274,617 bytes across 1,645 files
- package Node requirement: `>=22.19.0`
- minimal inspected Receipt validation closure: 87,315 bytes across four published JavaScript modules

The public package exports `validateEvidenceReceipt`, `createEvidenceReceipt`, `computeEvidenceReceiptCoreSha256`, `captureWorkspaceFingerprint`, and `evidenceReceiptToObservation`. The full package is too large and dependency-heavy for AEG's fixed Action bundle.

An official `createEvidenceReceipt()` call produced a valid schema-3 synthetic Receipt. Changing only `core.claim` caused official validation to fail with `evidence receipt core digest mismatch`. This proves the release artifact and core-digest validation path are executable before AEG implementation begins.

OMK's own protocol documentation explicitly states that Receipt digest validation does not prove ledger membership, trusted attestation, runner honesty, freshness, or OS isolation. AEG preserves this boundary.

## 5. Architecture

```text
agent-task.yml (aeg-task/v2)
agent-trace.jsonl (aeg-trace/v1)
OMK receipt.json or receipts directory
current Git repository
              |
              v
bounded input and path preflight
              |
              v
native OMK Receipt v3 validation
              |
              v
goal selection + exact check matching
              |
              v
OMK-compatible current-state recapture
              |
              v
canonical E1 evidence collection
              |
              v
policy engine -> report renderer -> exit code
```

The processing order is fixed. No policy or report may consume a Receipt that has not passed structure, digest, goal, command, trace, and current-state binding.

## 6. Public input contract

### 6.1 CLI

```text
aeg verify \
  --manifest agent-task.yml \
  --trace agent-trace.jsonl \
  --receipts <receipt.json-or-receipts-directory> \
  --repo <repository> \
  [--json gate-report.json] \
  [--markdown gate-report.md]
```

The old `--evidence` option is removed. There is no automatic old-format detection.

### 6.2 Action

The Action inputs become `manifest`, `trace`, `receipts`, `repo`, `json`, and `markdown`. The bundle uses `runs.using: node24`, receives no secret input, requests no write permission, and runs no shell or candidate command.

### 6.3 Manifest

The breaking manifest schema is `aeg-task/v2`. Existing policy fields remain when their semantics are still applicable. Required checks gain a structured command contract:

```yaml
schema_version: aeg-task/v2
task_id: version-consistency-pilot
profile: local
omk_goal_id: optional-explicit-goal

allowed_paths:
  - scripts
  - tests
  - docs
sensitive_paths:
  - .env

required_checks:
  - id: version-consistency
    command:
      kind: shell
      script: node scripts/check-version-consistency.mjs
      shell: pwsh
    cwd: .
```

Supported command descriptors are:

- `shell`: exact script bytes and an optional exact shell identity.
- `argv`: exact executable string and exact argv element boundaries.

`cwd` is a safe repository-relative path. AEG resolves it under the canonical repository root and compares it with the canonical absolute Receipt cwd. If `shell` is omitted, the script and cwd must still match exactly and the report records that shell identity was not constrained without printing the shell value.

### 6.4 Trace

`aeg-trace/v1` remains because its structured event semantics are still useful; retaining it does not imply support for the removed evidence envelope. The trace remains a separate producer record for scope, sensitive access, dependency, test/verifier surface, completion, and resource-budget policies.

The trace has one `run_id`. After OMK goal selection, `trace.run_id` must equal the selected Receipt `goalId`. A mismatch fails before policy evaluation.

## 7. Receipt discovery and selection

### 7.1 Direct file

A direct path must resolve to a regular, non-link file no larger than 1 MiB.

### 7.2 Directory

A directory input is interpreted only as an OMK `EvidenceReceiptStore` root:

```text
receipts/
  <safe-receipt-id>/
    receipt.json
```

AEG performs a bounded one-level enumeration in deterministic ordinal order. It rejects symlinks, junctions, reparse-point traversal, unsafe IDs, missing `receipt.json`, unexpected ambiguous structure, more than 64 Receipts, or more than 8 MiB total input.

Every discovered Receipt must parse and validate. An invalid unrelated file cannot be silently ignored because that would make directory evaluation dependent on attacker-controlled filtering.

### 7.3 Goal selection

- If `omk_goal_id` is present, AEG selects that exact goal and reports a missing goal as failure.
- If it is absent and all valid Receipts share one goal, AEG selects that goal.
- If multiple goals remain, AEG fails and asks the user to set `omk_goal_id`.

`task_id` remains the AEG task identity and does not have to equal `goalId`. The report records both stable IDs without treating either as trust evidence.

### 7.4 Required-check matching

Receipt claim prose is never parsed or matched.

For each required check, candidate Receipts must have:

- the selected `goalId`;
- an exact matching command descriptor;
- a canonical cwd matching the declared repository-relative cwd.

When the same check ran more than once, AEG orders matching Receipts by `finishedAt`. The latest execution is authoritative so a normal fail-fix-rerun sequence can pass. Earlier outcomes remain countable evidence but cannot override the latest result.

If two different Receipts for the same check have the same latest timestamp, AEG rejects the result as ambiguous. Duplicate Receipt IDs are always rejected.

The authoritative Receipt must have `status: passed` and `exitCode: 0`. Failed, timeout, and aborted outcomes block the required check.

## 8. Native Receipt validation

The validator is pinned to OMK EvidenceReceipt schema version 3 as published in OMK 0.96.0. It must fail closed on:

- unknown schema versions;
- missing, additional, accessor, or non-data fields;
- duplicate JSON keys;
- unsafe Receipt IDs;
- malformed timestamps or inconsistent duration;
- invalid status/exit-code combinations;
- malformed command descriptors;
- credential-bearing persisted commands;
- inconsistent command-redaction metadata and HMAC binding shapes;
- malformed workspace fingerprints or internal workspace digests;
- raw output instead of digest-only output capture;
- more than 64 KiB combined declared output bytes;
- malformed ledger or attestation envelope metadata;
- a mismatched immutable core digest.

The compatibility module uses the OMK v3 domain separator and canonical JSON rules solely to validate the native Receipt contract. It does not introduce an AEG Receipt, hash ledger, replay database, runner, or execution control plane.

No complete OMK package is installed or bundled. The implementation must be independently tested against sanitized fixtures generated by the pinned official package, with upstream version, integrity, and fixture provenance recorded.

## 9. Current-state binding

### 9.1 Required fingerprint kind

A Receipt can be structurally valid with either an artifact-set or Git workspace fingerprint. For the v0.2 gate, the authoritative required-check Receipt must use `workspaceAfter.kind: git` and name the same canonical repository root supplied to AEG. Artifact-set-only evidence is valid OMK data but insufficient for this release's Git-state binding and fails with remediation.

### 9.2 Recapture

AEG recaptures the same selected scope using OMK 0.96.0-compatible rules:

- Git HEAD object ID;
- sorted, unique, repository-relative changed paths;
- staged diff SHA-256;
- unstaged diff SHA-256;
- direct state of each selected artifact, including missing/file, size, and SHA-256;
- Git dirty digest;
- workspace manifest digest.

Git is invoked with bounded output, a timeout, deterministic arguments, disabled external diff, and unsafe redirecting Git environment variables removed. AEG executes no command from the Receipt.

The recaptured fingerprint must equal the Receipt `workspaceAfter` fingerprint. Any post-check change to a selected artifact, diff, changed-path set, or HEAD makes the evidence stale.

### 9.3 Coverage

Every current changed path must be equal to, or be below, at least one selected `workspaceAfter.scope.artifactPaths` entry. This prevents a Receipt from proving only a convenient subset of the current changes. More than OMK's bounded scope can cover fails closed and requires splitting the task or rerunning with an adequate scope.

`workspaceBefore` is strictly validated for internal consistency but is not compared to current state.

## 10. Assurance and policy behavior

All native OMK Receipts produce at most E1.

- `local` is the only profile with a supported passing path.
- `pr` and `protected` cannot be used to obtain a v0.2 passing assurance result.
- The Action may run in advisory mode and surface a policy failure, but documentation must not call it independent CI proof or a protected-branch control.
- Envelope `ledgerBinding`, `trustedAttestation`, executor identity, timestamps, claims, or producer-controlled fields never upgrade assurance.

Existing deterministic policies for scope, sensitive paths, dependencies, resources, test surface, verifier surface, C0-C2 structure, and self-verification remain where their required structured trace facts are available. Missing required observability follows the existing fail/warn contract and is never invented from Receipt prose.

## 11. Privacy and reporting

The report schemas advance to `aeg-report/v2` because the evidence model is breaking.

Reports may contain:

- task ID;
- selected OMK goal ID;
- check ID;
- Receipt ID;
- core digest reference;
- status, assurance level, reason codes, fixed summaries, and remediation codes;
- repository-relative paths only when an existing policy finding requires them and they pass path safety checks.

Reports must not contain:

- Receipt claim prose;
- command, script, argv, or shell values;
- absolute cwd or workspace root;
- stdout/stderr or output excerpts;
- environment variables;
- attestation signature values;
- credential, token, prompt, source, or raw private fields;
- parser exception text derived from untrusted input.

Input failures produce a minimal fixed report. Error messages describe the field class, not the rejected value.

## 12. Stable failure classes

The existing top-level reason families remain recognizable while their v0.2 summaries are made precise:

| Code | v0.2 use |
| --- | --- |
| `AEG001` | manifest, trace, Receipt JSON, Receipt schema, or structural validation failure |
| `AEG002` | trace identity, ordering, required terminal event, or goal/run binding failure |
| `AEG003` | resource bound, directory ambiguity, Git recapture, workspace root, state compatibility, or coverage failure |
| `AEG010` | unsafe path, scope escape, case collision, link, junction, or reparse-point failure |
| `AEG020` | required check missing, command/cwd mismatch, ambiguous latest run, or non-passing latest disposition |
| `AEG021`–`AEG061` | existing applicable structured policy findings |
| `AEG070` | E1 assurance limitation or unsupported PR/protected success attempt |

All input errors are fail-closed and render deterministic reports. Untrusted content is not echoed.

## 13. Verification strategy

### 13.1 Unit coverage

- strict Receipt core, envelope, command, output, workspace, ledger, and attestation parsing;
- official canonicalization and domain-separated digest vectors;
- each disposition and timestamp invariant;
- command-redaction and command-binding invariants;
- direct-file and directory path safety;
- deterministic goal and latest-Receipt selection;
- exact shell/argv/cwd matching;
- privacy-safe error rendering.

### 13.2 Mutation and negative coverage

A valid official fixture is mutated one field at a time. Core mutations must fail digest validation; digest repair around a structurally invalid core must still fail shape validation. Unknown versions, keys, duplicate keys, links, oversized files, deep JSON, ID collisions, conflicting timestamps, and multiple goals must fail closed.

### 13.3 Git integration coverage

Temporary repositories cover:

- a valid current Git fingerprint;
- HEAD mismatch;
- staged and unstaged changes;
- untracked and missing files;
- changed-path order normalization;
- case collisions;
- scope undercoverage;
- out-of-scope changes;
- a post-Receipt mutation;
- an unrelated outside-scope mutation that is nevertheless rejected by the all-current-changes coverage rule;
- Windows and POSIX path behavior.

### 13.4 Contract coverage

The applicable outcomes behind F01-F28 and I00-I15 remain automated. Obsolete v0.1 envelope and `maintainer_ci` cases are replaced with native Receipt, goal, command, state, privacy, and E1 cases rather than merely deleted.

### 13.5 Determinism and privacy

Repeated evaluation of identical inputs must produce byte-identical JSON and Markdown. A privacy sentinel placed in every untrusted text-bearing position must never appear in stdout, stderr, JSON, Markdown, thrown error text, or Action output.

### 13.6 Action validation

The Node 24 Action must pass static trigger/permission inspection and one controlled synthetic run. It must remain read-only and must not use `pull_request_target`, secrets, network, package installation, shell execution, or candidate commands.

## 14. Pilot plan

The pilot project is `C:\Users\win\Documents\ChatGPT\AI项目风险与交付助手` on its own isolated branch.

Committed pilot assets are limited to policy/configuration, a deterministic read-only version-consistency checker, its tests, documentation, and sanitized fixtures when needed. Per-run OMK Receipts, traces, and AEG reports remain local and gitignored.

The pilot performs:

1. a clean baseline check;
2. OMK execution of the declared version-consistency command;
3. AEG native Receipt verification and an E1 pass;
4. one controlled covered-file mutation without rerunning the check;
5. an expected AEG stale-state failure;
6. a fresh OMK rerun;
7. an expected AEG pass;
8. cleanup or reversal of the controlled mutation;
9. a final clean project test run.

The pilot does not call or modify Dify, Plane, Activepieces, GitHub, production data, or external services.

## 15. Delivery sequence

Implementation planning must preserve this order:

1. schema and bounded-path preflight;
2. native Receipt parser and official compatibility vectors;
3. OMK workspace digest and live Git state binding;
4. goal/check/trace selection and canonical evidence collection;
5. policy and report v2 integration;
6. CLI and Node 24 Action;
7. replaced F/I matrices and full regression suite;
8. documentation and local pilot;
9. release-candidate security, privacy, determinism, size, and rollback audit.

Test-driven development is required. No implementation step begins with production code before its failing acceptance test.

## 16. Exit criteria

v0.2.0 becomes a release candidate only when all of the following are true:

- the v0.1 self-supplied trust upgrade path is absent;
- no v0.1 evidence-envelope parser or misleading maintainer-CI adapter remains in the public runtime;
- pinned official OMK 0.96.0 positive fixtures pass;
- schema, digest, command, goal, trace, state, coverage, resource, link, and privacy negative cases fail closed;
- all selected Receipts remain E1;
- repeated reports are byte-identical;
- no privacy sentinel leaks;
- no runtime model, API, network, secret, package-install, or candidate-command path exists;
- production dependency, bundle, and test-duration budgets pass;
- the Node 24 Action controlled validation passes;
- the real pilot demonstrates pass, stale failure, and pass after rerun;
- all applicable automated acceptance and regression tests pass;
- documentation states the E1 and local-only boundary without broader claims;
- independent code review finds no P0/P1 issue;
- the user separately confirms external publication.

## 17. Rollback

- Keep v0.1.3 and its public tag unchanged throughout development.
- Do not move public aliases, create a release, or update Marketplace metadata before explicit confirmation.
- Keep AEG v0.2 and the pilot in separate isolated branches/worktrees.
- If a P0 privacy, security, determinism, or data-loss issue appears, stop the release and retain the last verified commit as evidence.
- If the pilot fails for an architectural reason, remove the pilot branch/worktree and return to this design rather than weakening the gate.
- Generated local Receipts, traces, and reports are disposable and excluded from version control.

## 18. Final design decision

**GO** to implementation planning after user review of this committed design document.

**NO-GO** to implementation or publication if any unapproved expansion attempts to add E2 trust, ledger/replay ownership, model/network runtime, or backward-compatibility work to v0.2.
