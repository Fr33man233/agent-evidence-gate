# Contributing to Agent Evidence Gate

AEG accepts focused changes that preserve deterministic, privacy-first verification. 开始当前版本开发前，请同时阅读 [v0.2.0 原生 OMK 设计](docs/superpowers/specs/2026-08-19-native-omk-receipt-v3-design.md)和[版本历史与档案审计](docs/version-history.md)。历史安全边界仍见 [threat model](docs/threat-model.md)、[v0.1 contract](v0.1-mvp-contract.md)和 [release rollback guide](docs/release-rollback.md)。

## Local checks

Use Node 24 (or the package-supported Node >=22.19 <25) and a current pnpm release that supports `allowBuilds`. Install from the lockfile, then run:

```powershell
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm run build
pnpm test
```

The test suite must remain deterministic and use synthetic fixtures. Do not add secrets, private repository contents, candidate source, network calls, LLM calls, or candidate execution to tests or examples.

## Change boundaries

- v0.2.0 直接读取原生 OMK Receipt v3；不得重新引入 v0.1 evidence envelope、`maintainer_ci` adapter 或 evidence 内嵌 trust context。
- Keep the CLI and Action read-only with no candidate command execution.
- 所有 Receipt 仅为 E1，只有 `local` profile 可通过；不得把 Action 或 Receipt 描述为 E2、独立 CI 或生产 attestation。
- Add a regression test for every policy, privacy, determinism, or data-boundary change.
- Do not use `pull_request_target` or grant write permissions to validation workflows.
- 一版本一任务：每项产品版本必须在 AEG 项目中使用独立 Codex 任务。本任务只负责 v0.2.0；开始 v0.3.0 或后续版本前，必须新建任务、完成新的 preflight 和批准设计，不得继续堆叠到本任务。

## Pull requests

Describe the user or maintainer problem, the exact evidence or contract change, security and privacy impact, compatibility impact, and the commands you ran. Keep unrelated refactors out of the pull request. A maintainer may request a synthetic fixture or a rollback note before merging.
