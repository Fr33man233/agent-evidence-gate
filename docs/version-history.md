# AEG 版本历史与档案审计

> 审计日期：2026-08-19
>
> 性质：后补的事实索引。本文不替代各版本当时的合同、评审或 Release，也不把当前推断伪装成历史原件。

## 1. 证据来源和判定规则

本次审计仅采用以下可验证来源：

1. `git ls-remote --tags origin` 返回的公开 tag target。
2. GitHub Release 的 tag、发布时间和 release body。
3. GitHub Actions 的公开 run、job、step 和 artifact metadata。
4. 对应 commit 的 Git tree、tag-to-tag diff、commit message 和仓库内文件。
5. 当前隔离 worktree 的实际测试结果。

规则：

- 发布 commit 以远端公开 tag target 为准。
- 当时没有独立记录的结果，不根据版本号或相邻版本补写。
- 回顾性总结必须明确标注，不冒充当时已存在的文件。
- 文件从未进入当前 Git 历史且没有可验证副本时，登记为“缺失且不可追溯”，不创建替代正文。

## 2. 阶段和版本总览

| 阶段/版本 | 权威 commit 或证据 | 状态 | 现有主要记录 | 审计结论 |
| --- | --- | --- | --- | --- |
| V0 立项与规格 | v0.1.0 tree 中的 `v0-specification.md`、`v0-closure-review.md`、`spike-contract.md`、`research/spikes/2026-08-17/` | 已闭合并进入 v0.1 | 规格、closure review、spike ADR/测量/报告 | 核心规格与 spike 证据已归档；早期产品草案快照不完整 |
| v0.1.0 | `45abbc88937d4cf0c366e21bdfff06b55c620c7f` | 已公开发布 | MVP 合同、preflight、P0 review、account handoff、release audit | 产品实现可追溯；成功 clean-checkout 验证未完成 |
| v0.1.1 | `e53f68eb8ac12cd0cda9f5882cb93cfa1919bc83` | 已公开发布 | GitHub Release、Git diff、共享 release validation 文档 | 变更可追溯；没有独立成功 controlled run 记录 |
| v0.1.2 | `979b1114e28b757ebda31aa5cceca3f2133e204c` | 已公开发布 | clean-checkout 记录、controlled run `32141322549`、security/privacy review | 发布与验证证据完整，但不构成第三方审计或 real E2 |
| v0.1.3 | `d82c7863f48878bfee66e978e7569c464de48ea2` | 已公开发布 | Marketplace preflight、GitHub Release、controlled run `32211203587`、artifact | 发布后记录已在本次审计补齐；runtime 与 v0.1.2 相同 |
| v0.2.0 | 分支 `codex/v0.2.0-local-handoff`；候选 head `cc37259e642e415fb65e58729aa587b4db154e0a`；设计提交 `1665635cf578a39d6bc71519fc0890946e63cf20` | 本地 RC，未发布 | 原生 OMK Receipt v3 设计、实施计划、本地安全审计、候选交接记录、maintainer run `32343791125` | 本地门禁、bundle 和真实 maintainer-controlled E1 workflow 已验证；第三方审计和外部试点未完成 |

## 3. 公开版本事实

### v0.1.0

- 公开 tag target：`45abbc88937d4cf0c366e21bdfff06b55c620c7f`
- GitHub Release：`Agent Evidence Gate v0.1.0`
- 发布时间：2026-08-18T10:49:46Z
- package version：`0.1.0`
- Action runtime：Node 20
- tag 内 handoff：74项本地测试通过
- 后续验证事实：v0.1.0 clean-checkout smoke 因 pnpm 11 build-policy 失败；不能登记为成功发布验证
- 记录缺口：Release body 只有 Full Changelog 链接，没有详细当时 release notes

### v0.1.1

- 公开 tag target：`e53f68eb8ac12cd0cda9f5882cb93cfa1919bc83`
- GitHub Release 发布时间：2026-08-18T13:07:13Z
- package version：`0.1.1`
- 主要变更：release validation workflow、安全政策、贡献指南、issue templates、发布验证记录和 pnpm workspace 配置
- 记录缺口：未发现单独归属于 v0.1.1 的成功 controlled run 或独立测试结果档案

### v0.1.2

- 公开 tag target：`979b1114e28b757ebda31aa5cceca3f2133e204c`
- GitHub Release 发布时间：2026-08-18T13:15:05Z
- package version：`0.1.2`
- clean-checkout：Node `v24.19.0`、pnpm `11.19.0`，type check、build 和75项测试通过
- controlled run：[`32141322549`](https://github.com/Fr33man233/agent-evidence-gate/actions/runs/32141322549)，成功
- 报告：`pass / E2-candidate`，real maintainer CI/E2 未验证
- 安全评审：仓库内 focused review；不是第三方审计或 production certification

### v0.1.3

- 公开 tag target：`d82c7863f48878bfee66e978e7569c464de48ea2`
- GitHub Release 发布时间：2026-08-19T03:06:58Z
- package version：`0.1.3`
- 主要变化：Marketplace metadata、README 安装示例、rollback/preflight、release metadata 一致性测试
- Release 声明：TypeScript、build 和76项测试通过；CLI/Action bundle 与 v0.1.2 字节一致
- controlled run：[`32211203587`](https://github.com/Fr33man233/agent-evidence-gate/actions/runs/32211203587)，2026-08-19T03:10:40Z 启动，job `verify-synthetic` 成功
- artifact：`aeg-release-validation-report`，626 bytes，digest `sha256:47e2c70c594dbc453090a72765cd56be6a0cb1e729f4252ee7ec8777df1b0855`
- artifact 报告：`gate_verdict: pass`、`policy_verdict: pass`、`assurance_level: E2-candidate`、无 reason code
- 限制：不是 production-proven independent CI identity，也没有第三方 security review

详细记录见 [v0.1.3 发布记录](releases/v0.1.3-release-record.md)。

## 4. 当前 v0.2.0 状态

- 基线：公开 v0.1.3 commit `d82c7863f48878bfee66e978e7569c464de48ea2`
- 隔离分支：`codex/v0.2.0-local-handoff`
- 设计文档：[原生 OMK Receipt v3 设计](superpowers/specs/2026-08-19-native-omk-receipt-v3-design.md)
- 当前决定：破坏性删除 v0.1 evidence envelope，直接消费原生 OMK Receipt v3，最高 E1，本地门禁优先
- 实现状态：已完成本地实现与审计；32/32 测试、TypeScript、可复现 bundle 和链接检查通过
- 发布状态：没有 v0.2.0 tag 或 Release
- 发布门槛：maintainer-controlled E1 workflow 已通过；第三方安全审计和外部试点未验证，且 E1 不升级为 E2；公开发布仍为 NO-GO
- 候选记录：[v0.2.0 release candidate record](releases/v0.2.0-release-candidate-record.md)

## 5. 不可追溯项

### 5.1 产品立项书早期草案

当前 `产品立项书.md` 的附录列出了 `v0.1-draft` 至 `v0.10-draft` 的摘要，但该文件在当前 Git 历史中首次出现时已经是汇总后的版本。没有找到这些草案各自的 Git commit 或独立快照，因此无法还原逐版本正文、精确 diff 或原始评审批注。

处理：保留现有摘要表，明确它是后来的汇总记录；不创建 `v0.1-draft.md` 至 `v0.9-draft.md` 等伪历史文件。

### 5.2 竞品运行级深审原文

以下路径在三个文档中被引用：

```text
research/competitor-runs/2026-08-14/run-level-review.md
```

该路径当前不存在，`git log --all -- <path>` 和 `git rev-list --objects --all` 均未找到历史对象。本次审计没有取得其他可验证副本。

处理：登记为“当前仓库内缺失且不可追溯”，修正失效链接；不根据产品立项书的摘要反向生成所谓原始深审报告。

### 5.3 v0.1.1 独立验证档案

v0.1.1 有公开 tag、Release 和明确文件 diff，但公开 Actions 历史只有 v0.1.2 与 v0.1.3 两次成功 controlled run。无法证明 v0.1.1 曾独立完成相同 run。

处理：只记录可验证的发布与变更，不补写测试数、run ID 或 pass verdict。

## 6. 本地 tag 漂移

本次审计发现：

| 版本 | 本地 tag target | 远端公开 tag target | 是否一致 |
| --- | --- | --- | --- |
| v0.1.0 | `45abbc88937d4cf0c366e21bdfff06b55c620c7f` | 同左 | 是 |
| v0.1.1 | `e17818076cc18648dafbf0cddcf9f79ce209dc14` | `e53f68eb8ac12cd0cda9f5882cb93cfa1919bc83` | 否 |
| v0.1.2 | `48df84ec24161faf08edbd4978634eea50f6c5b1` | `979b1114e28b757ebda31aa5cceca3f2133e204c` | 否 |
| v0.1.3 | `d82c7863f48878bfee66e978e7569c464de48ea2` | 同左 | 是 |

这些本地 tag 看起来是在远端 patch 最终同步完成前创建的历史对象。本次审计不删除、不强制覆盖或重写 tag；所有发布档案以 `git ls-remote --tags origin` 的远端 target 为准。后续进行 release 验证时必须显式使用远端 commit SHA，不能只依赖本地 `v0.1.1` 或 `v0.1.2` 名称。

## 7. 归档维护规则

从 v0.2.0 起，每个产品版本至少维护：

1. 发布前 senior full-stack preflight 或明确链接。
2. 设计/合同及实施计划。
3. `CHANGELOG.md` 条目。
4. immutable tag/commit 和 GitHub Release 链接。
5. 测试、bundle、隐私/安全及受控验证结果。
6. 已知限制、未完成验证和 rollback 路径。
7. 若版本未发布，明确标记 `Unreleased`，不得预写发布成功。

历史文档以增补归档提示和后继链接为主，不覆盖其当时的结论。
