# Release and Rollback

公开版本身份、验证记录和已知本地 tag 漂移统一索引在[版本历史与档案审计](version-history.md)。验证 v0.1.1 或 v0.1.2 时，应使用其中记录的远端 commit SHA，不应只依赖本地 tag 名称。

## Local release checklist

1. Run `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm run build`, and `pnpm test` with the fixed Node bundle.
2. Review `gate-report` JSON and Markdown determinism, Node 24 Action static-security tests, native F/I matrix, Receipt negative cases and privacy sentinel checks.
3. Review the threat model and confirm the report remains E1/local-only; no real E2/market-acceptance claim is made.
4. Pin consumers to an immutable commit or reviewed tag; do not consume a moving branch.

## v0.2.0 candidate checklist

当前候选 package version 为 `0.2.0`，但没有公开 tag 或 Release。发布操作前必须由授权的 maintainer 在干净 checkout 中重新完成：

1. 固定 reviewed immutable commit，确认公开 `v0.1.3` tag、Release、Marketplace alias 和 `main` 未改变。
2. 使用 lockfile 安装依赖并运行 TypeScript、完整测试、Node 24 bundle 两次构建、链接检查和 runtime 边界扫描；若 pnpm 依赖布局触发清理提示，不得把直接 Node fallback 的结果伪装成 pnpm 通过。
3. 运行真实 maintainer-controlled CI/E2 验证，并将结果保持为真实可证明的范围；E1 Receipt 不得升级为 E2 或独立 CI 身份声明。
4. 完成第三方安全审计和不包含私有数据的外部试点，记录通过、过期失败、重跑后通过三态证据。
5. 只有上述证据和用户明确授权同时存在时，才创建 v0.2.0 tag/Release 或更新 Marketplace；否则保持本地 RC NO-GO。

## Rollback

Rollback is a consumer-side pin change to the previous reviewed commit/tag. Because AEG is stateless and performs no external writes, rollback does not require database migration, receipt-ledger repair, credential rotation, or queue draining. Preserve the failing report as a local CI artifact, then rerun the previous pinned verifier against the same inputs.

## Public release boundary

The public release target is `https://github.com/Fr33man233/agent-evidence-gate`. Marketplace publication improves discovery but does not change AEG's runtime trust boundary, establish verified-creator status, or prove production CI identity. Each published release must remain traceable to a reviewed immutable tag and must retain the real CI/E2 limitation.
