# AEG-SPK-INT-001 P0 Preflight

Date: 2026-08-17

## Environment

| Capability | Observed value | Decision |
| --- | --- | --- |
| Node.js | `v24.19.0` from Codex bundled runtime | Use; no install |
| Python | `3.12.13` from Codex bundled runtime | Not selected; no dual-language comparison |
| Git | `2.53.0.windows.3` from Codex bundled runtime | Available for evidence metadata only |
| Project repository | Current workspace has no role as a fixture | Do not read or modify it from probe |
| Network | Offline phase required | No network calls |
| Secrets/API | None supplied or required | No credentials |
| Model calls | Not used | `model_calls=0` |

## Safety checks

- [x] Dedicated disposable directory: `spike/interop/`
- [x] Dedicated evidence directory: `research/spikes/2026-08-17/`
- [x] Synthetic fixture plan frozen before probe implementation
- [x] No third-party dependencies
- [x] Probe reads only its own fixture file
- [x] Probe never executes fixture command, workflow, or PR code
- [x] Public report uses an allowlist and excludes raw command/output fields
- [x] P0 stop conditions and one-retry limit accepted

P0 result: `PASS`
