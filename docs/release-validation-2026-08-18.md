# Release Validation — 2026-08-18

## Scope

This record covers a clean public snapshot check and the follow-up patch required to make dependency installation reproducible. It does not establish real CI producer trust or production E2 attestation.

## Initial v0.1.0 result

- Source: public tag `v0.1.0` from `https://github.com/Fr33man233/agent-evidence-gate`.
- Snapshot acquisition: GitHub codeload tarball, not the working tree.
- `pnpm install --frozen-lockfile` under pnpm `11.19.0` stopped because the legacy `onlyBuiltDependencies` setting did not authorize esbuild's postinstall script.
- This was a release reproducibility failure, not an AEG policy or candidate-execution failure.

## v0.1.2 candidate correction

The candidate adds the explicit pnpm 11-compatible setting:

```yaml
allowBuilds:
  esbuild: true
```

The validation environment uses the bundled Node runtime at `C:\Users\win\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin` because the Codex terminal does not expose `node` on PATH by default.

Candidate local checks completed:

- `pnpm exec tsc --noEmit`: passed.
- `pnpm run build`: passed.
- `pnpm test`: 75 passed, 0 failed.
- New workflow boundary test: passed.
- The controlled workflow uses a trusted metadata-only fixture preparation script; it does not execute candidate commands or source.

## Release gate

The candidate is not called a passing clean-checkout release until the v0.1.1 public snapshot is installed and tested from a new temporary directory. After that run, record the exact tag, commit, runtime versions, test count, and CLI/Action SHA-256 values here.
