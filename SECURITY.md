# Security Policy

## Supported versions

The `v0.1.x` release line is the currently supported public release line.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting or Security Advisory flow for this repository when available. Do not put secrets, private source, personal data, or a working exploit in a public issue. If private reporting is unavailable, open a minimal issue that asks for a private contact path and includes only a safe reproduction summary.

Include the affected AEG version or commit, operating system, profile, input shape, and the smallest synthetic reproduction that demonstrates the issue. Remove repository contents and credentials from all attachments.

## Security boundaries

AEG is a read-only evidence verifier. Its security contract includes:

- no candidate command, test, package, shell, or workflow execution;
- no runtime LLM, API, or network access;
- no secrets access;
- no `pull_request_target` execution path;
- bounded manifest and trace inputs with fail-closed path and privacy checks;
- `E2-candidate` is a structured trust-context result, not a production attestation.

Changes that weaken these boundaries require an explicit security review and must not be hidden in a feature or refactor.
