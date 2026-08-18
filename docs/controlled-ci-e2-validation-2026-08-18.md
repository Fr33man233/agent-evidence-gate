# Controlled CI / E2 Validation — 2026-08-18

## Intended validation

The public workflow `.github/workflows/release-validation.yml` is a manual-only, read-only synthetic check. It checks out the immutable `v0.1.2` tag, prepares temporary synthetic evidence from read-only Git metadata, invokes the bundled local Action, and uploads only the bounded JSON/Markdown reports.

## Security boundary

- Trigger: `workflow_dispatch` only.
- Permission: `contents: read`.
- Checkout and artifact actions are pinned to immutable commit SHAs.
- No `pull_request_target`, secrets, candidate commands, packages, tests, scripts, or untrusted pull-request content are executed.
- The report may establish only `E2-candidate` under the synthetic trust context; it is not production CI attestation.

## Validation status

The workflow is prepared and statically tested. A manual run must be triggered after the v0.1.1 tag is published. The final record must include the GitHub Actions run URL, job conclusion, report artifact names, exit classification, and any warning or failure reason. Until that run is independently reviewed, real CI/E2 remains `unverified`.
