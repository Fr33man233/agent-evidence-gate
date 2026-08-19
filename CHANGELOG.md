# 变更日志

本文件记录公开产品版本及当前未发布版本。更详细的 commit、Release、验证证据和缺失档案说明见 [版本历史与档案审计](docs/version-history.md)。

## Unreleased — v0.2.0

状态：设计已批准，尚未开始功能实现，尚未发布。

计划中的破坏性变化：

- 删除 v0.1 AEG 自定义 evidence envelope 和 evidence 内嵌 `trust_context`。
- 直接读取原生 OMK EvidenceReceipt v3。
- 所有原生 OMK Receipt 最高限定为 E1；v0.2.0 只承诺可工作的本地门禁。
- Action 计划迁移到 Node 24，但当前公开 v0.1.3 仍使用 Node 20。

设计依据见 [v0.2.0 原生 OMK Receipt v3 设计文档](docs/superpowers/specs/2026-08-19-native-omk-receipt-v3-design.md)。

## v0.1.3 — 2026-08-19

公开 tag：`d82c7863f48878bfee66e978e7569c464de48ea2`

- 补充 GitHub Marketplace 所需的 author 和 branding metadata。
- README 增加 least-privilege、固定版本的 Action 使用示例。
- controlled validation workflow、package version 和 release metadata 对齐到 v0.1.3。
- 增加 Marketplace preflight、rollback 更新和版本一致性自动测试。
- verifier runtime 行为及 CLI/Action bundle 与 v0.1.2 保持不变。
- Release 记录声明 TypeScript、build 和76项测试通过。
- 发布后受控 run `32211203587` 成功，报告为 `pass / E2-candidate`；这不是 production CI identity 证明。

详细记录见 [v0.1.3 发布记录](docs/releases/v0.1.3-release-record.md)。

## v0.1.2 — 2026-08-18

公开 tag：`979b1114e28b757ebda31aa5cceca3f2133e204c`

- 增加 metadata-only synthetic fixture preparation script。
- 修正 pnpm 11 / esbuild build-policy 配置，加入明确的 `allowBuilds.esbuild: true`。
- controlled validation workflow 更新为固定 v0.1.2 tag。
- clean-checkout 验证通过，75项测试通过。
- 受控 run `32141322549` 成功，报告为 `pass / E2-candidate`；real maintainer CI/E2 仍未验证。

证据见 [发布验证记录](docs/release-validation-2026-08-18.md)和[受控 CI 验证记录](docs/controlled-ci-e2-validation-2026-08-18.md)。

## v0.1.1 — 2026-08-18

公开 tag：`e53f68eb8ac12cd0cda9f5882cb93cfa1919bc83`

- 增加 manual-only、read-only release validation workflow。
- 增加 `SECURITY.md`、`CONTRIBUTING.md` 和 issue templates。
- 增加 release-validation 与 Codex Open Source Fund 计划文档。
- 调整 pnpm workspace build-policy 配置。

GitHub Release 存在，但当前仓库和公开 Actions 历史中没有可归属于 v0.1.1 的独立成功 controlled run，因此不补写测试通过结论。随后由 v0.1.2 完成 clean-checkout 和 controlled validation 闭环。

## v0.1.0 — 2026-08-18

公开 tag：`45abbc88937d4cf0c366e21bdfff06b55c620c7f`

- 首次公开 Agent Evidence Gate v0.1 MVP。
- 提供 TypeScript CLI、只读 Node 20 GitHub Action、manifest/trace/evidence 合同、策略引擎、JSON/Markdown report 和退出码。
- 包含 F01–F28、I00–I15 自动化矩阵、synthetic demo、威胁模型、rollback guide 和 V0/V0.1 规格。
- tag 中的 account handoff 记录当时本地74项测试通过。
- 后续 clean-checkout smoke 暴露 pnpm 11 build-policy 不兼容，因此不能把 v0.1.0 记为完成了成功 clean-checkout 发布验证。

GitHub Release 正文只有 Full Changelog 链接，没有更详细的当时 release notes；本节为基于 tag tree、handoff 和后续发布验证记录形成的回顾性摘要，不表示该文件在 v0.1.0 发布时已经存在。
