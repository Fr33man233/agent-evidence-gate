# AEG v0.1 Threat Model and Capability Boundary

## Protected assets

The gate protects maintainer trust in required-check results, repository/head binding, scope and sensitive-path policy, dependency and resource budgets, test/verifier surface changes, and public report privacy.

## Threats addressed

- stale evidence is replayed against a different head or repository;
- an unknown, failed, cancelled, or mismatched check is presented as success;
- a trace escapes scope, traverses the repository boundary, or records sensitive reads/writes;
- a producer self-claims E2 without independent trust context;
- a candidate changes tests or verifier workflow without the profile's approval;
- raw prompt/source/credential/output data leaks into the trace or report;
- malformed, duplicate, oversized, deeply nested, or case-colliding input causes ambiguous evaluation.

## Explicit non-goals

AEG does not sandbox or execute candidate code, prove test quality, prove dependency provenance, verify an external CI identity cryptographically, detect every secret by heuristic, reconstruct a replay ledger, or replace OMK's execution control plane. `E2-candidate` is intentionally not called E2 production proof. E3 is not implemented.

## GitHub boundary

Use `pull_request` or another workflow that does not execute untrusted PR content with write credentials. Pin the verifier action to a reviewed release and grant `contents: read`. Never use `pull_request_target` to execute candidate content. The included Action has no shell, child-process, network, secret, or package-install path.

## Residual risks

Maintainers must review trust configuration, policy exceptions, workflow provenance, dependency changes, and semantic weakening of tests. A clean deterministic report only means the declared, observable facts satisfied the configured rules. Real CI/E2 producer assurance remains unverified in this MVP.

