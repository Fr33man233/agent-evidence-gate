# Security and Privacy Review — 2026-08-18

> 归档说明：本文是针对 v0.1.2 candidate 的仓库内 focused review，不是 v0.1.3 的独立评审或第三方审计。v0.1.3 的发布事实和未扩张的安全边界见 [v0.1.3 发布记录](releases/v0.1.3-release-record.md)。

## Review scope

This is a focused release review of the v0.1.2 candidate, covering the verifier boundary, read-only Action, controlled validation workflow, metadata-only fixture preparation, input privacy, and public repository scope. It is an in-thread technical review, not a third-party audit or a production security certification.

## Evidence checked

- `pnpm exec tsc --noEmit`: passed.
- `pnpm test`: 75 passed, 0 failed, including privacy, determinism, path, policy, Action, and workflow-boundary tests.
- Clean v0.1.2 snapshot install under Node `v24.19.0` / pnpm `11.19.0`: passed with frozen lockfile and esbuild build approval.
- Public workflow run `32141322549`: success; all five job steps succeeded; report was `pass / E2-candidate` with no reason codes.
- Remote tree inspection: no `research/competitor-runs/`, disposable `spike/`, cache, or Word product-plan paths.

## Findings

### P0/P1 findings

None observed in this review.

### Boundary confirmations

- The verifier uses fixed read-only Git facts and does not execute candidate argv, tests, packages, shell, or workflow content.
- Runtime LLM/API/network and secrets access are absent from the verifier and Action implementation.
- The validation workflow is manual-only, grants `contents: read`, pins checkout and artifact actions to immutable SHAs, and does not use `pull_request_target`.
- The preparation script invokes only fixed `git rev-parse HEAD` metadata collection and writes bounded temporary synthetic inputs; it does not consume candidate source or execute candidate commands.
- Structured inputs reject forbidden private fields, raw output, traversal, oversized data, and privacy sentinels before policy evaluation.
- The report retains the limitation that `E2-candidate` is not proof of an independent production CI identity.

## Residual risks and actions

1. Producer identity and real maintainer-controlled CI trust remain unverified. Keep all release wording at `E2-candidate`.
2. No third-party security audit has been obtained. Treat this review as a release gate, not a certification.
3. Dependency vulnerability scanning beyond frozen-install policy was not performed in this review. Re-run an approved scanner before adding dependencies or making a production adoption claim.
4. Public users may supply sensitive repository metadata to their own local runs. The security policy and issue template instruct users not to upload secrets or private source.

## Decision

`GO_FOR_PUBLIC_MVP_AND_CONTROLLED_CI_CANDIDATE`; `NO-GO_FOR_PRODUCTION_ATTESTATION` until an independent maintainer-controlled producer identity and external security review exist.
