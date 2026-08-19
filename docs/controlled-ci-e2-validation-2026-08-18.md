# Controlled CI / E2 Validation — 2026-08-18

> 归档说明：本文记录 v0.1.2 的受控 synthetic run。v0.1.3 的独立后继 run 与 artifact 见 [v0.1.3 发布记录](releases/v0.1.3-release-record.md)，完整索引见 [版本历史与档案审计](version-history.md)。两者均只达到 `E2-candidate`，不是 production CI identity 证明。

## Intended validation

The public workflow `.github/workflows/release-validation.yml` is a manual-only, read-only synthetic check. It checks out the immutable `v0.1.2` tag, prepares temporary synthetic evidence from read-only Git metadata, invokes the bundled local Action, and uploads only the bounded JSON/Markdown reports.

## Security boundary

- Trigger: `workflow_dispatch` only.
- Permission: `contents: read`.
- Checkout and artifact actions are pinned to immutable commit SHAs.
- No `pull_request_target`, secrets, candidate commands, packages, tests, scripts, or untrusted pull-request content are executed.
- The report may establish only `E2-candidate` under the synthetic trust context; it is not production CI attestation.

## Validation result

- Run: [32141322549](https://github.com/Fr33man233/agent-evidence-gate/actions/runs/32141322549)
- Head: `979b1114e28b757ebda31aa5cceca3f2133e204c`
- Job: `verify-synthetic`, success; all five workflow steps succeeded.
- Reports: `gate-report.json` and `gate-report.md` uploaded as `aeg-release-validation-report`.
- Gate result: `pass`, policy `pass`, assurance `E2-candidate`, reason codes: none.

This is a successful controlled synthetic validation, not production attestation. Producer identity and real maintainer-controlled CI/E2 remain `unverified`.
