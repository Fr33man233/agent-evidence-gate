# AEG v0.1 Release Validation and Fund Application Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Validate the public `v0.1.0` artifact in a clean checkout, run one controlled read-only GitHub Action validation, add the minimum public-maintainer files, and prepare a truthful Codex open source fund submission.

**Architecture:** Keep the existing `adapter -> canonical profile -> policy engine -> report renderer` unchanged. Add only release-validation workflow/docs and a local application draft; the workflow uses committed synthetic fixtures and the published action bundle without executing candidate commands or using secrets.

**Tech Stack:** GitHub Actions, Node 20, pnpm frozen lockfile, existing TypeScript/Node bundle, Markdown.

**Spec:** `v0.1-mvp-contract.md`, `docs/release-candidate-audit.md`, and the official Codex open source fund form at `https://openai.com/form/codex-open-source-fund/`.

## Global Constraints

- Runtime LLM/API/network usage inside AEG remains zero.
- The verifier never executes candidate commands, tests, packages, shell, or workflow content.
- No secrets and no `pull_request_target`.
- The GitHub Action is read-only and uses `permissions: contents: read`.
- CI evidence is synthetic and must be labeled `E2-candidate`, never production attestation.
- Do not publish `research/competitor-runs/`, `spike/`, caches, generated reports, or personal information.
- Do not submit the fund form until required personal fields are supplied by the user.

---

### Task 1: Clean-checkout release smoke validation

**Files:**
- Create: `docs/release-validation-2026-08-18.md`
- Read: `README.md`, `package.json`, `examples/synthetic-demo/*`, `v0.1-mvp-contract.md`

**Interfaces:**
- Consumes: public repository `https://github.com/Fr33man233/agent-evidence-gate`, tag `v0.1.0`.
- Produces: reproducible command log, test/build result, bundle hashes, and explicit clean-checkout scope.

- [ ] **Step 1: Clone the immutable release tag into a temporary directory.**

Run:
```powershell
$tmp = Join-Path $env:TEMP ('aeg-v0-1-smoke-' + [guid]::NewGuid().ToString('N'))
git clone --branch v0.1.0 --depth 1 https://github.com/Fr33man233/agent-evidence-gate.git $tmp
```

Expected: checkout succeeds at tag `v0.1.0` with no competitor-run or disposable-spike paths.

- [ ] **Step 2: Install exactly from the lockfile and run the release checks.**

Run from `$tmp`:
```powershell
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm run build
pnpm test
```

Expected: frozen install, TypeScript, build, and all 74 tests pass.

- [ ] **Step 3: Run the offline synthetic demo and record bundle hashes.**

Run from `$tmp`:
```powershell
node dist/aeg.cjs verify --manifest examples/synthetic-demo/agent-task.yml --trace examples/synthetic-demo/agent-trace.jsonl --evidence examples/synthetic-demo/evidence.json --repo . --json gate-report.json --markdown gate-report.md
Get-FileHash dist/aeg.cjs -Algorithm SHA256
Get-FileHash dist/action.cjs -Algorithm SHA256
```

Expected: deterministic report generation completes without network or candidate execution; hashes are recorded in the validation document.

- [ ] **Step 4: Commit the validation record after independently checking the output.**

The document must state the exact tag, commit, commands, results, hashes, and that this is an artifact smoke test rather than real CI/E2 proof.

### Task 2: Controlled read-only GitHub Action validation

**Files:**
- Create: `.github/workflows/release-validation.yml`
- Create: `docs/controlled-ci-e2-validation-2026-08-18.md`
- Modify: `tests/action-security.test.ts` only if a new static assertion is needed for the workflow boundary.

**Interfaces:**
- Consumes: committed synthetic fixtures and `action.yml` from the current repository.
- Produces: a manually triggered GitHub Actions run with JSON/Markdown reports and an `E2-candidate` result.

- [ ] **Step 1: Add a manual-only workflow with read-only permissions.**

The workflow must contain:
```yaml
name: Release validation
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  verify-synthetic:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
        with:
          ref: v0.1.0
      - name: Run AEG against committed synthetic evidence
        uses: ./
        with:
          manifest: examples/synthetic-demo/agent-task.yml
          trace: examples/synthetic-demo/agent-trace.jsonl
          evidence: examples/synthetic-demo/evidence.json
          repository: ${{ github.workspace }}
          json: gate-report.json
          markdown: gate-report.md
      - name: Upload reports
        if: always()
        uses: actions/upload-artifact@65c4c4a1ddee5b72f698fdd19549f0f0fb45cf08
        with:
          name: aeg-release-validation-report
          path: |
            gate-report.json
            gate-report.md
```

The workflow must not use `pull_request_target`, secrets, untrusted checkout refs, candidate scripts, or networked test commands.

- [ ] **Step 2: Add static boundary tests or assertions before triggering the run.**

Verify the workflow text contains `workflow_dispatch`, `contents: read`, immutable action SHAs, and no forbidden execution path. Run the targeted security test.

- [ ] **Step 3: Commit and push the workflow, then trigger it manually from the public repository.**

The run must use the committed `v0.1.0` fixtures only. Save the run URL, job conclusion, exit classification, report metadata, and artifact availability in the validation document.

- [ ] **Step 4: Classify the result.**

Pass means the workflow executes the read-only action and produces reports. The document must call the result `E2-candidate` and explicitly state that producer identity and production CI trust remain unverified.

### Task 3: Public maintainer baseline

**Files:**
- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `.github/ISSUE_TEMPLATE/bug-report.md`
- Create: `.github/ISSUE_TEMPLATE/feature-request.md`
- Modify: `README.md` with links to the new files and the controlled-validation status.

**Interfaces:**
- Consumes: threat model, rollback guide, README, and frozen v0.1 security constraints.
- Produces: public reporting, contribution, and issue-triage entry points without promising unsupported capabilities.

- [ ] **Step 1: Write `SECURITY.md`.**

State supported versions (`v0.1.x`), report privately through the repository's GitHub Security tab when available, do not include secrets/private source in public issues, and list the hard boundaries: no candidate execution, no runtime LLM/API/network, no secrets, no `pull_request_target`, and `E2-candidate` is not production attestation.

- [ ] **Step 2: Write `CONTRIBUTING.md`.**

Require Node 20+, pnpm frozen install, `pnpm exec tsc --noEmit`, `pnpm run build`, `pnpm test`, deterministic fixtures, no secrets, and no changes that weaken read-only or candidate-execution boundaries. Explain how to submit issues and pull requests.

- [ ] **Step 3: Add issue templates.**

Bug template fields: environment, AEG version/commit, profile, minimal synthetic reproduction, expected/actual report, and confirmation that no private data is included. Feature template fields: maintainer problem, evidence source, policy impact, privacy/security impact, compatibility, and acceptance criteria.

- [ ] **Step 4: Update README and run documentation checks.**

Link the new files, the release validation record, and the controlled CI report. Do not claim broad adoption, real E2, or production attestation.

### Task 4: Fund application draft and submission gate

**Files:**
- Create: `docs/codex-open-source-fund-application-draft.md`

**Interfaces:**
- Consumes: public repository URL, v0.1 feature scope, validation records, and the official fund form fields.
- Produces: a truthful, copy-ready draft without personal information or credentials.

- [ ] **Step 1: Draft the required project fields.**

Use the project name `Agent Evidence Gate (AEG)`; repository URL `https://github.com/Fr33man233/agent-evidence-gate`; describe AEG as a deterministic, privacy-first verifier for structured agent delivery evidence; state that it uses no runtime LLM/API/network and never executes candidate code.

- [ ] **Step 2: Draft the API-credit use case.**

Explain that credits would support maintainer-facing development and validation of read-only agent evidence adapters, reproducible CI fixtures, compatibility testing, security review tooling, and documentation; explicitly state that credits are not needed for AEG runtime verification and will not be used to execute candidate code.

- [ ] **Step 3: Record the submission gate.**

Mark first name, last name, and email as user-supplied required fields. Do not submit until the user confirms those values and reviews the final text. The official form states applications are reviewed on an ongoing basis and grants may be up to $25,000 in API credits.

- [ ] **Step 4: Submit only after user confirmation.**

Use the official form `https://openai.com/form/codex-open-source-fund/`. Save the submission timestamp and confirmation evidence without storing credentials or private personal data in the repository.

---
