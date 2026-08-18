# Contributing to Agent Evidence Gate

AEG accepts focused changes that preserve deterministic, privacy-first verification. Before opening a pull request, read the [threat model](docs/threat-model.md), [v0.1 contract](v0.1-mvp-contract.md), and [release rollback guide](docs/release-rollback.md).

## Local checks

Use Node 20 or newer within the supported range and a current pnpm release that supports `allowBuilds`. Install from the lockfile, then run:

```powershell
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm run build
pnpm test
```

The test suite must remain deterministic and use synthetic fixtures. Do not add secrets, private repository contents, candidate source, network calls, LLM calls, or candidate execution to tests or examples.

## Change boundaries

- Preserve the `adapter -> canonical profile -> policy engine -> report renderer` flow.
- Keep the CLI and Action read-only with no candidate command execution.
- Keep `E2-candidate` wording separate from production attestation.
- Add a regression test for every policy, privacy, determinism, or data-boundary change.
- Do not use `pull_request_target` or grant write permissions to validation workflows.

## Pull requests

Describe the user or maintainer problem, the exact evidence or contract change, security and privacy impact, compatibility impact, and the commands you ran. Keep unrelated refactors out of the pull request. A maintainer may request a synthetic fixture or a rollback note before merging.
