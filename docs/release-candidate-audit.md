# AEG v0.1 Release Candidate Audit

Date: 2026-08-18  
Decision: `PUBLISHED_V0.1.0` / `EXTERNAL_CI_AND_INDEPENDENT_REVIEW_PENDING`

## Local artifact checks

- Required release files are present: README, MIT license, Action metadata, package manifest and lockfile, CLI/Action bundles, Quickstart, threat model, rollback guide, P0 review, read-only workflow template, and synthetic demo.
- `pnpm exec tsc --noEmit` passed.
- `pnpm run build` passed with the pinned esbuild toolchain.
- `pnpm test` passed: 74 tests, including F01-F28, I00-I15, CLI committed-repository integration, Action static-security checks, determinism, privacy sentinel, and budget regressions.
- CLI bundle SHA-256: `21799D562EF1A7EA1D61DF0709EBA0F7619A5EAFA8C7F25C0BAC4C33F43BF1A6`.
- Action bundle SHA-256: `EC8C4CAFE5E5DB366AA53C8BB355970E7D6C8E1E20C4D60975463D3A3FA4F4DE`.

Consumers should recompute hashes after checkout rather than rely on a recorded hash.

## Static boundary checks

- No `pull_request_target` execution path.
- No candidate command, test, package, shell, or workflow execution in the verifier.
- No runtime LLM/API/network path or secrets access.
- `src/git.ts` uses a read-only Git facts subprocess only; it does not execute candidate-provided argv.
- The example workflow pins checkout to an immutable commit and grants `contents: read`.

## Publication record

- Public repository: https://github.com/Fr33man233/agent-evidence-gate
- Visibility: public; default branch: `main`.
- Release commit: `45abbc88937d4cf0c366e21bdfff06b55c620c7f`.
- Published tag: `v0.1.0`.
- Published branches: `main`, `agent/v0-1-initial-release`.

## Remaining external boundaries

1. A genuinely independent security/privacy review has not yet been performed.
2. Real maintainer-controlled CI producer identity and E2 remain unverified.

The public release scope intentionally excludes `research/competitor-runs/`, disposable `spike/`, `node_modules/`, `.pnpm-store/`, generated reports, and the local Word product-plan copy. The formal specifications and `research/spikes/` decision records remain eligible for publication.

## Next authorized actions

Perform a read-only controlled CI/E2 validation and independent security/privacy review. Keep the release wording limited to `E2-candidate` until that validation is independently reviewed.
