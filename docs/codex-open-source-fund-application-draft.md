# Codex Open Source Fund Application Draft

This draft is for the official form at <https://openai.com/form/codex-open-source-fund/>. It intentionally contains no personal information, credentials, or private usage data.

## Project

- Project name: Agent Evidence Gate (AEG)
- GitHub repository: <https://github.com/Fr33man233/agent-evidence-gate>
- Public release: `v0.1.2` patch release (MIT)

## Brief description

Agent Evidence Gate is a deterministic, privacy-first verifier for structured evidence produced by AI-agent harnesses and maintainer-controlled CI. It checks bounded task manifests, traces, Git state, policy claims, command receipts, dependency and resource budgets, and test/verifier surfaces, then emits stable JSON and Markdown gate reports. AEG never calls an LLM or runtime API, accesses secrets, executes candidate code, or infers a verdict from natural-language prose.

## Other contributors

Currently maintained by the project owner. No additional contributors are being represented in this submission.

## How API credits would be used

API credits would support maintainer-facing development and validation of read-only evidence adapters, reproducible CI fixtures, compatibility testing, security and privacy review tooling, and public documentation. Credits would not be required for AEG's runtime verification and would not be used to execute candidate code. The project will keep runtime verification deterministic and offline while using credits only for bounded development, review, and validation work around open-source maintenance workflows.

## Evidence and limitations

The public repository includes the full v0.1 MVP, 74 automated tests, a synthetic demo, a read-only Action, a threat model, rollback guidance, and a controlled-validation workflow. Current CI/E2 evidence is intentionally classified as `E2-candidate`; producer identity and production attestation remain unverified. The project is seeking support to validate whether this evidence boundary is useful in real maintainer workflows and to improve interoperability without weakening privacy or execution boundaries.

## Required user-supplied fields before submission

- First name: supplied by user at submission time
- Last name: supplied by user at submission time
- Email address: supplied by user at submission time
- LinkedIn URL: optional
- Personal GitHub URL: optional
