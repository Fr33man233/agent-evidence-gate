# AEG-SPK-INT-001 Execution Log

Date: 2026-08-17  
Contract: `AEG-SPK-INT-001`  
Data: synthetic only

| Attempt | Phase | Observation | Status |
| --- | --- | --- | --- |
| 1 | P0 | System PATH did not expose Node/Python; bundled runtime was located and versioned | verified |
| 1 | P2-P4 | I01 exposed an implementation defect: the comparison table did not map profile requirement `E2` to candidate level `E2-candidate` | failed; no fixture or expected result changed |
| 2 | P2-P4 | Fixed only the assurance rank mapping; reran all I00-I15 | verified |
| 2 | P2-P4 | 16/16 fixtures verified; 4 pass, 12 fail-closed; negative blocking 100% | verified |
| 2 | P4 | Privacy sentinel stayed in input fixture only; generated report artifacts did not contain it | verified |
| 1 | P5 | No GitHub-hosted CI identity, workflow run, or authorized external CI context is available in this local task | unverified |
| 3 | P2-P4 | Added stable trust-context reason codes (`PRODUCER_SELF_ASSERTED`, `WORKFLOW_UNTRUSTED`, etc.); reran the fixed matrix to refresh generated reports; verdicts unchanged | verified |
| 4 | P5 | User authorized one controlled CI metadata validation; entry check found no remote, HEAD, workflow, or CI identity, so no external run was attempted | unverified |

The single implementation retry permitted by the contract was consumed by the I01 defect. No further retry is authorized without a new decision.

## P0-P4 command boundary

- Runtime: bundled Node.js `v24.19.0`.
- New runtime dependencies: 0.
- Network calls: 0.
- Model/API calls: 0.
- Fixture command/workflow execution: 0.
- Current project source: not read by the probe.
