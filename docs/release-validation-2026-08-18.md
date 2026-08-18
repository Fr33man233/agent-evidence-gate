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

## v0.1.2 clean-checkout result

- Source: public tag `v0.1.2`, commit `979b1114e28b757ebda31aa5cceca3f2133e204c`.
- Runtime: Node `v24.19.0`, pnpm `11.19.0`.
- Frozen install: passed; esbuild postinstall completed under explicit `allowBuilds`.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm run build`: passed.
- `pnpm test`: 75 passed, 0 failed.
- Synthetic demo CLI invocation: expected `AEG003` preflight failure because the demo is a schema-only zero-SHA fixture, not a committed repository. The real state-bound validation is covered by the controlled GitHub Action run.
- CLI bundle SHA-256: `21799D562EF1A7EA1D61DF0709EBA0F7619A5EAFA8C7F25C0BAC4C33F43BF1A6`.
- Action bundle SHA-256: `EC8C4CAFE5E5DB366AA53C8BB355970E7D6C8E1E20C4D60975463D3A3FA4F4DE`.

The clean-checkout release gate passed after the v0.1.2 configuration correction.
