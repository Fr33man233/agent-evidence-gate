# ADR: Interop Spike Exit Decision

Status: `CONDITIONAL_GO`  
Date: 2026-08-17  
Contract: `AEG-SPK-INT-001`

## Decision

The offline interop core is technically viable enough for the next V0 review step, but the project must not claim a verified E2 producer. The one user-authorized P5 attempt could not run because this project has no repository/workflow/CI identity. The Spike does not authorize v0.1 implementation.

## Evidence

- `SPK-INT-I00` and `SPK-INT-I02`: complete OMK-shaped records and explicit E2 self-claims remain E1 and fail a PR profile requiring E2.
- `SPK-INT-I01` and `SPK-INT-I11`: two source shapes map to the same core projection when an equivalent external trust context is supplied; the candidate verdict is deterministic.
- `SPK-INT-I03` through `SPK-INT-I09`: stale subject, untrusted workflow, unknown check, missing exit, failed execution, and verifier-surface change are blocked.
- `SPK-INT-I10` and `SPK-INT-I14`: public output remains minimal and malformed/duplicate/oversized input is rejected without echoing input.
- `SPK-INT-I12` and `SPK-INT-I13`: unknown field ordering and repeated execution produce equal canonical reports.
- `SPK-INT-I15`: a producer's claimed pass cannot override a non-zero exit code.

## Cost and boundary

- One Node.js probe, built-in modules only.
- 4-6 hour contract budget not exceeded; one implementation retry consumed and recorded.
- Offline network calls: 0. Model/API calls: 0. New runtime dependencies: 0.
- No real repository, user source, credentials, untrusted PR execution, or external write.

## Rejected or deferred

- No receipt hash, ledger, replay database, or custom Git state algorithm.
- No TypeScript/Python comparison.
- No third adapter, formal CLI, GitHub Action, Marketplace package, service, or dashboard.
- Real E2/CI identity remains `unverified`: the user authorized one attempt, but the current project has no remote, workflow, or CI run identity from which to derive external metadata.

## Residual risks

- The CI envelope is a candidate internal profile, not an official GitHub attestation format.
- E2-candidate demonstrates the trust-boundary logic only; it does not prove a runner is uncompromised, tests are sufficient, or code is correct.
- Maintainer adoption and five-minute configuration cost remain unvalidated H3-H5 questions.

## Disposition

`CONDITIONAL_GO`: preserve the evidence and do not infer E2 from local simulation. If a suitable maintainer-controlled workflow becomes available, its metadata may be validated under a new explicit execution decision; otherwise proceed to H3-H5 adoption validation and V0 final review with E2 marked `unverified`. Do not start v0.1 from this ADR alone.
