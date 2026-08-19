# Agent Evidence Gate (AEG) v0.1

Agent Evidence Gate is a deterministic, privacy-first verifier for structured evidence produced by agent harnesses and maintainer-controlled CI. It converts an `agent-task.yml`, bounded `agent-trace.jsonl`, Git facts, and an OMK v3 or maintainer-CI envelope into a small JSON/Markdown gate report.

AEG is a verifier, not an agent runtime. It does not call an LLM or network, execute candidate commands, inspect prompts/source, or infer a verdict from natural language.

## What v0.1 provides

- C0/C1/C2 separation: prose is display-only, policy uses structured manifest fields, and C2 claims match stable IDs only.
- E0/E1/E2-candidate assurance levels with `local`, `pr`, and `protected` profiles. `E2-candidate` is a trust-context rule result, not a production attestation; real CI/E2 remains unverified.
- Scope, sensitive read/write, required check and command receipt, Git state compatibility, dependency, budget, test-surface, verifier-surface, freshness, and privacy checks.
- OMK v3 and maintainer-CI adapters with one canonical policy engine.
- Stable JSON/Markdown reports and exit codes: `0=pass`, `1=fail`, `2=warn or approval_required`, `64=usage error`.
- A read-only Node 20 GitHub Action. It never uses `pull_request_target`, secrets, candidate PR commands, or shell/network execution.

## Quickstart

Use Node 20+ and the locked dependencies. The verifier consumes files; it does not run the command named in a receipt.

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
pnpm test
node dist/aeg.cjs verify `
  --manifest path/to/agent-task.yml `
  --trace path/to/agent-trace.jsonl `
  --evidence path/to/evidence.json `
  --repo path/to/a-committed-repository `
  --json gate-report.json `
  --markdown gate-report.md
```

The synthetic demo is intentionally offline and contains no secrets or real project source; it is a schema fixture, not a production pass. See [docs/quickstart.md](docs/quickstart.md) for the input contracts and profile choices.

## GitHub Action

Pin a released commit or tag of this repository and grant only `contents: read`. Check out the workspace using a workflow appropriate for your trust boundary, then invoke the action with the three evidence paths. A workflow template is in [examples/read-only-workflow.yml](examples/read-only-workflow.yml). Do not use a local `./` action from an untrusted pull request when the verifier itself is under review.

```yaml
permissions:
  contents: read

steps:
  - uses: actions/checkout@11bd71901bbe5b1630ceea73d27597364c9af683
  - uses: Fr33man233/agent-evidence-gate@v0.1.3
    with:
      manifest: agent-task.yml
      trace: agent-trace.jsonl
      evidence: evidence.json
```

For a higher-assurance consumer workflow, replace the release tag with the reviewed full commit SHA.

## Security and limitations

Read [docs/threat-model.md](docs/threat-model.md) before using AEG as a required check. Read [docs/release-rollback.md](docs/release-rollback.md) for version pinning and rollback. AEG can establish structured consistency and policy findings; it cannot prove that a producer, test, dependency, or verifier is honest merely because a receipt says so.

## Maintainer resources

- [Security policy](SECURITY.md) for private vulnerability reporting and hard security boundaries.
- [Contributing guide](CONTRIBUTING.md) for deterministic tests, review expectations, and safe change boundaries.
- [Release validation record](docs/release-validation-2026-08-18.md) for clean-checkout verification.
- [Controlled CI/E2 validation](docs/controlled-ci-e2-validation-2026-08-18.md) for the read-only synthetic workflow and its `E2-candidate` limitation.
- [Security and privacy review](docs/security-privacy-review-2026-08-18.md) for the release gate and residual risks.

## License

MIT. See [LICENSE](LICENSE).
