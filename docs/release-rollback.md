# Release and Rollback

## Local release checklist

1. Run `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm run build`, and `pnpm test` with the fixed Node bundle.
2. Review `gate-report` JSON and Markdown determinism, Action static-security tests, and the F/I matrix.
3. Review the threat model and confirm no real E2/market-acceptance claim is made.
4. Pin consumers to an immutable commit or reviewed tag; do not consume a moving branch.

## Rollback

Rollback is a consumer-side pin change to the previous reviewed commit/tag. Because AEG is stateless and performs no external writes, rollback does not require database migration, receipt-ledger repair, credential rotation, or queue draining. Preserve the failing report as a local CI artifact, then rerun the previous pinned verifier against the same inputs.

## Public release boundary

The public release target is `https://github.com/Fr33man233/agent-evidence-gate`. Marketplace publication improves discovery but does not change AEG's runtime trust boundary, establish verified-creator status, or prove production CI identity. Each published release must remain traceable to a reviewed immutable tag and must retain the real CI/E2 limitation.
