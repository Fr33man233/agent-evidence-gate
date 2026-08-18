# Release and Rollback

## Local release checklist

1. Run `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm run build`, and `pnpm test` with the fixed Node bundle.
2. Review `gate-report` JSON and Markdown determinism, Action static-security tests, and the F/I matrix.
3. Review the threat model and confirm no real E2/market-acceptance claim is made.
4. Pin consumers to an immutable commit or reviewed tag; do not consume a moving branch.

## Rollback

Rollback is a consumer-side pin change to the previous reviewed commit/tag. Because AEG is stateless and performs no external writes, rollback does not require database migration, receipt-ledger repair, credential rotation, or queue draining. Preserve the failing report as a local CI artifact, then rerun the previous pinned verifier against the same inputs.

## Release boundary for this workspace

This workspace has no configured GitHub remote or repository-specific publish target. The local v0.1 package is release-ready as an artifact, but repository creation, push, tag, Action Marketplace publication, and real CI/E2 validation still require the target repository details and a final write confirmation.
