# 原生 OMK Receipt v3 实施计划

> **供 agentic worker 执行：** 必须使用 `superpowers:executing-plans` 或 `superpowers:subagent-driven-development` 逐项执行。每步使用复选框；任何 production code 之前先运行对应失败测试。

**Goal:** 将 AEG 重置为直接、离线验证原生 OMK EvidenceReceipt v3 的 E1 local gate。

**Architecture:** 以有界路径 preflight 发现 Receipt；独立兼容模块严格解析与校验 OMK v3 immutable core digest；选择 goal/latest check，与 trace 和重采集 Git workspace fingerprint 绑定；policy 只消费 canonical E1 evidence 并生成 `aeg-report/v2`。旧 envelope adapter 整体删除，不提供兼容分支。

**Tech Stack:** TypeScript、Node 24 Action runtime、esbuild、`yaml`、Node test、Git CLI（受限只读调用）。

**Spec:** `docs/superpowers/specs/2026-08-19-native-omk-receipt-v3-design.md`

## Global Constraints

- 只接受 `open-multi-agent-kit@0.96.0` EvidenceReceipt schema v3；未知版本失败封闭。
- 运行时不执行 Receipt/candidate command、package、test 或 script；没有 LLM/API/network/secrets。
- 不读取、回显或保存 credential、claim prose、command、absolute cwd、stdout、stderr、environment、attestation signature 或不可信 parser 文本。
- Receipt 最高 E1，只有 `local` 可通过；`pr`/`protected` 必须因 `AEG070` 失败。
- 新增生产依赖为 0；输入/深度/Receipt 数量上限严格遵守设计文档第 3.4 节。
- 将 Action 固定为 `node24`，不使用 `pull_request_target`、shell 或运行时安装。
- v0.1.3、public tag、Release、Marketplace alias 和 main 不得改动；未获用户确认不得 push、PR 或 Release。

---

### Task 1: v2 manifest 与 Receipt 路径 preflight

**Files:**
- Modify: `src/types.ts`, `src/manifest.ts`, `src/safe.ts`
- Create: `src/receipts.ts`
- Test: `tests/native-manifest-preflight.test.ts`

**Interfaces:**
- Produces `AgentTaskManifest` with `schema_version: "aeg-task/v2"`, `omk_goal_id?: string`, and `RequiredCheck.command: ShellCommand | ArgvCommand`.
- Produces `discoverReceiptPaths(path: string): string[]`, returning ordinal-sorted ordinary `receipt.json` files or throwing `AegInputError("AEG003" | "AEG010")`.

- [x] **Step 1: Write the failing test**

```ts
test("accepts only v2 structured shell command contracts", () => {
  const manifest = parseManifestText([
    "schema_version: aeg-task/v2", "task_id: native", "profile: local",
    "required_checks:", "  - id: version", "    command:",
    "      kind: shell", "      script: node scripts/check.mjs", "      shell: pwsh", "    cwd: .", ""
  ].join("\n"));
  assert.equal(manifest.required_checks[0]?.command.kind, "shell");
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/native-manifest-preflight.test.ts`  
Expected: FAIL because v1 is the only accepted schema and `command` is not present.

- [x] **Step 3: Implement the minimum v2 parser and path discovery**

Define discriminated `ShellCommand`/`ArgvCommand`; reject extra command keys, unsafe `cwd`, empty/duplicate check IDs, absolute paths, links/reparse points, unsafe store IDs, missing `receipt.json`, more than 64 files, and more than 8 MiB total. Use `lstatSync`, not `statSync`, before every input traversal.

- [x] **Step 4: Add bounded negative cases and run target tests**

Run: `node --import tsx --test tests/native-manifest-preflight.test.ts tests/preflight.test.ts`  
Expected: PASS; tests cover unknown v1, malformed descriptor, traversal, link/reparse, ambiguous directory, count/size/depth limits.

### Task 2: OMK v3 receipt parser and official compatibility vector

**Files:**
- Modify: `src/safe.ts`
- Create: `src/omk-receipt.ts`, `tests/fixtures/omk-v0.96.0/receipt-passed.json`, `tests/fixtures/omk-v0.96.0/PROVENANCE.md`
- Test: `tests/omk-receipt.test.ts`

**Interfaces:**
- Produces `parseOmkReceipt(text: string): OmkEvidenceReceiptV3` and `computeOmkCoreDigest(receipt): string`.
- The parsed type exposes only stable IDs, goal ID, receipt ID, command descriptor, status, exitCode, finishedAt, core digest, workspace fingerprints and safe metadata needed downstream.

- [x] **Step 1: Write the failing vector test**

```ts
test("accepts the fixed official OMK v0.96.0 vector and detects a core mutation", () => {
  const receipt = parseOmkReceipt(readFileSync(fixture, "utf8"));
  assert.equal(receipt.schemaVersion, 3);
  assert.equal(computeOmkCoreDigest(receipt), receipt.coreSha256);
  assert.throws(() => parseOmkReceipt(mutatedCoreFixture), (e) => e instanceof AegInputError && e.code === "AEG001");
});
```

- [x] **Step 2: Run vector test to verify it fails**

Run: `node --import tsx --test tests/omk-receipt.test.ts`  
Expected: FAIL because no native parser exists.

- [x] **Step 3: Implement strict, domain-separated canonical validation**

Use only the reviewed OMK 0.96.0 domain separator/canonical JSON rules. Reject duplicate/unknown/accessor/non-data fields, invalid receipt ID/timestamp/duration/status-exit combination, malformed command/redaction/HMAC shape, invalid workspace/output/ledger/attestation shape, persisted credentials, raw output, output bytes above 64 KiB and invalid core digest. Do not import or bundle OMK.

- [x] **Step 4: Run mutation suite**

Run: `node --import tsx --test tests/omk-receipt.test.ts`  
Expected: PASS with field-by-field mutation, unknown version/key, duplicate key, deep JSON and privacy-sentinel cases fail-closed.

### Task 3: OMK-compatible workspace fingerprint and state binding

**Files:**
- Replace: `src/git.ts`
- Test: `tests/omk-git-state.test.ts`

**Interfaces:**
- Produces `captureWorkspaceFingerprint(repoPath: string, scope: GitScope): OmkWorkspaceFingerprint`.
- `assertWorkspaceMatches(receiptFingerprint, currentFingerprint): void` throws `AEG003` without exposing values.

- [x] **Step 1: Write the failing state lifecycle test**

```ts
test("passes current state then rejects a covered file mutation", () => {
  const initial = captureWorkspaceFingerprint(repo, scope);
  assert.doesNotThrow(() => assertWorkspaceMatches(initial, captureWorkspaceFingerprint(repo, scope)));
  writeFileSync(join(repo, "src", "covered.ts"), "changed\n");
  assert.throws(() => assertWorkspaceMatches(initial, captureWorkspaceFingerprint(repo, scope)), (e) => e instanceof AegInputError && e.code === "AEG003");
});
```

- [x] **Step 2: Run it to verify failure**

Run: `node --import tsx --test tests/omk-git-state.test.ts`  
Expected: FAIL because the v0.1 compatibility fingerprint lacks OMK fields.

- [x] **Step 3: Implement bounded Git and artifact collection**

Use deterministic Git args, `--no-ext-diff`, timeouts, output limits and sanitized environment. Collect HEAD, normalized changed paths, staged/unstaged SHA-256, direct artifact missing/file/size/SHA-256 state, dirty digest and manifest digest. Require `workspaceAfter.kind === "git"`, identical canonical repository root and complete changed-path scope coverage.

- [x] **Step 4: Run integration negatives**

Run: `node --import tsx --test tests/omk-git-state.test.ts tests/git-integration.test.ts`  
Expected: PASS for HEAD/staged/unstaged/untracked/missing/case-collision/undercoverage/out-of-scope/mutation cases.

### Task 4: Goal, check and trace binding into canonical E1 evidence

**Files:**
- Delete: `src/adapters.ts`
- Modify: `src/runner.ts`, `src/trace.ts`, `src/types.ts`
- Create: `src/evidence.ts`
- Test: `tests/receipt-selection.test.ts`, `tests/trace-goal-binding.test.ts`

**Interfaces:**
- Produces `collectCanonicalEvidence(manifest, trace, receipts, repo): CanonicalE1Evidence`.
- Result always has `assurance_level: "E1"` and contains only safe IDs/digests/status needed by policy/report.

- [x] **Step 1: Write failing selection tests**

```ts
test("uses the newest exact command and cwd receipt for the selected goal", () => {
  const evidence = collectCanonicalEvidence(manifestWithGoal, traceForGoal, receipts, repo);
  assert.equal(evidence.selectedCheckIds[0], "version-consistency");
  assert.equal(evidence.assurance_level, "E1");
});
```

- [x] **Step 2: Run them to verify failure**

Run: `node --import tsx --test tests/receipt-selection.test.ts tests/trace-goal-binding.test.ts`  
Expected: FAIL because the legacy adapter only handles one envelope.

- [x] **Step 3: Implement deterministic selection**

Require a single trace run and equality with selected `goalId`; select explicit `omk_goal_id`, otherwise only one discovered goal. For each check match exact descriptor and canonical absolute cwd, order by `finishedAt`, reject equal latest timestamps and duplicate receipt IDs, and require passed/zero final outcome. All discovered receipts must parse/validate before selection.

- [x] **Step 4: Run target negatives**

Run: `node --import tsx --test tests/receipt-selection.test.ts tests/trace-goal-binding.test.ts`  
Expected: PASS for missing/multiple goal, stale latest failure, exact shell/argv/cwd mismatch, trace mismatch, duplicate ID and timestamp ambiguity.

### Task 5: E1-only policy and report v2

**Files:**
- Modify: `src/policy.ts`, `src/report.ts`, `src/types.ts`
- Delete: `tests/command-receipt.test.ts`
- Replace: `tests/f-matrix.test.ts`, `tests/i-matrix.test.ts`, `tests/determinism.test.ts`, `tests/reason-code-contract.test.ts`

- [x] **Step 1: Write failing local-only report test**

```ts
test("native receipts are E1 and only local profile can pass", () => {
  assert.equal(evaluate(localManifest, trace, evidence).gate_verdict, "pass");
  assert.equal(evaluate(prManifest, trace, evidence).reason_codes.includes("AEG070"), true);
  assert.equal(evaluate(localManifest, trace, evidence).schema_version, "aeg-report/v2");
});
```

- [x] **Step 2: Run it to verify failure**

Run: `node --import tsx --test tests/i-matrix.test.ts`  
Expected: FAIL because v0.1 permits trust-context E2-candidate and emits v1.

- [x] **Step 3: Implement minimal E1 policy integration**

Remove trust and external assurance ranks. Preserve trace-derived C0-C2/scope/sensitive/dependency/budget/test/verifier findings. Add `AEG070` for PR/protected; use v2 report with stable allowed fields and fixed summaries/remediations. Preflight reports must not echo rejected input.

- [x] **Step 4: Run policy, determinism and privacy tests**

Run: `node --import tsx --test tests/f-matrix.test.ts tests/i-matrix.test.ts tests/determinism.test.ts tests/reason-code-contract.test.ts`  
Expected: PASS; repeated JSON/Markdown byte-identical and every sentinel absent from stdout/stderr/reports/errors.

### Task 6: CLI and Node 24 Action migration

**Files:**
- Modify: `src/cli.ts`, `src/action.ts`, `action.yml`, `package.json`
- Replace: `tests/cli-integration.test.ts`, `tests/action-security.test.ts`

- [x] **Step 1: Write failing CLI/Action contract tests**

```ts
test("CLI accepts --receipts and rejects removed --evidence", () => {
  assert.equal(run(["verify", "--receipts", receipt, ...required]).status, 0);
  assert.equal(run(["verify", "--evidence", receipt, ...required]).status, 64);
});
test("Action is Node 24 and has no execution surface", () => {
  assert.match(readFileSync("action.yml", "utf8"), /using: node24/);
});
```

- [x] **Step 2: Run them to verify failure**

Run: `node --import tsx --test tests/cli-integration.test.ts tests/action-security.test.ts`  
Expected: FAIL because current CLI/Action use `--evidence` and Node 20.

- [x] **Step 3: Implement the contract migration**

Rename option/input to `receipts`; keep `repo`, `json`, `markdown`; remove profile override if it enables bypass of manifest. Build targets Node 24, package engines are compatible with OMK's Node floor, and Action continues to call only internal TypeScript bundle logic.

- [x] **Step 4: Run CLI/Action tests and build**

Run: `pnpm run build; node --import tsx --test tests/cli-integration.test.ts tests/action-security.test.ts`  
Expected: build exits 0; CLI and static Action boundary tests pass.

### Task 7: Documentation, maintenance rule, complete regression and RC audit

**Files:**
- Modify: `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/quickstart.md`, `docs/threat-model.md`, `docs/release-rollback.md`, `v0.1-account-handoff.md`
- Create: `docs/reviews/2026-08-19-v0.2.0-rc-security-privacy-determinism.md`
- Test: existing full suite plus link checker

- [x] **Step 1: Write failing documentation contract test**

```ts
test("public docs describe v0.2 native receipts and the one-version-one-task rule", () => {
  const readme = readFileSync("README.md", "utf8");
  assert.match(readme, /--receipts/);
  assert.match(readme, /E1/);
  assert.doesNotMatch(readme, /maintainer-CI envelope/);
});
```

- [x] **Step 2: Run it to verify failure**

Run: `node --import tsx --test tests/documentation-contract.test.ts`  
Expected: FAIL because v0.1 docs describe `--evidence`, Node 20 and E2-candidate.

- [x] **Step 3: Update docs and audit record**

Document native Receipt input, local-only E1, Node 24, all removal/non-goals, disposable pilot artifacts, and this required rule: every product version starts in a distinct Codex task and this task owns only v0.2.0. Record the selected dependency verification layout, actual build/test timings, bundle sizes, negative static security checks and rollback state.

- [x] **Step 4: Run final evidence commands**

Run: `pnpm exec tsc --noEmit; pnpm run build; pnpm test; git diff --check`  
Expected: all commands exit 0. Then run the repository Markdown relative-link checker and targeted static search proving no legacy adapter, `trust_context`, `--evidence`, Node 20, `pull_request_target`, secret input, runtime `fetch`, runtime package install or candidate command path remains.

- [x] **Step 5: Run the isolated local pilot only after all local gates pass**

Run the documented three-state sequence in the separate pilot worktree: fresh pass, covered mutation fail, new OMK Receipt pass. Preserve generated receipts/traces/reports locally only. If it fails for any design reason, stop and revise the design; do not weaken verification.
