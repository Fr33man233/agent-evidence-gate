# Agent Evidence Gate v0.2.0 原生 OMK Receipt v3 设计文档

**状态：** 已批准进入实施计划编写阶段

**日期：** 2026-08-19

**分支：** `codex/v0.2.0-omk-native`

**基线：** 公开 v0.1.3 提交 `d82c7863f48878bfee66e978e7569c464de48ea2`

**兼容目标：** `open-multi-agent-kit@0.96.0`

**实现状态：** 本设计提交时尚未开始；当前实现已完成本地候选与审计，公开发布仍未开始（见 [v0.2.0 release candidate record](../../releases/v0.2.0-release-candidate-record.md)）。

## 1. 决策摘要

AEG v0.2.0 是一次有意的破坏性重置。它要交付的第一个独立、必要且可用的用户结果，是针对原生 OMK EvidenceReceipt v3 的确定性、隐私优先本地证据门禁。

本版本不保留 v0.1 的 AEG 自定义证据封装。它会移除名不副实的 `source.kind: omk_v3 | maintainer_ci` adapter 接口以及由证据自身携带的 `trust_context` 路径。AEG 将直接读取原生 OMK Receipt v3，并将其与结构化任务合同、独立的结构化代理 trace 和当前 Git 工作区绑定，最终输出确定性的 JSON、Markdown 报告及退出码。

v0.2 接受的所有 Receipt 最高只能达到 E1。Receipt 完整性不能证明独立 CI 身份、可信证明、replay ledger 成员关系、runner 诚实性、所选工作区范围以外的新鲜度或操作系统隔离。

## 2. 用户结果与最近里程碑

最近的外部里程碑是在“AI项目风险与交付助手”中完成本地试点：

1. OMK 运行声明好的版本一致性检查，并生成真实 Receipt v3。
2. AEG 验证 Receipt 的结构及不可变 core digest。
3. AEG 使用精确的结构化命令匹配 required check，不解析 claim 自然语言。
4. AEG 将所选 Receipt 与 trace run 和当前 Git 状态绑定。
5. AEG 输出 E1 报告及可靠退出码。
6. 检查完成后再修改代码，原 Receipt 必须因过期而导致门禁失败。
7. 重新运行 OMK 检查并生成新 Receipt 后，门禁恢复通过。

“通过 → 修改后失败 → 重跑后通过”是 v0.2 的核心产品证明。

## 3. 资深全栈预检

### 3.1 用户与业务价值

v0.1 已证明确定性策略引擎可以运行，但它不能读取真实 OMK Receipt。v0.2 要补齐这一缺口，使维护者能够先在自己的 OMK 辅助开发流程中实际使用 AEG，再讨论更广泛采用或跨 harness 扩展。

本版本同时修复一个 P0 信任边界问题：v0.1 的 evidence 可以内嵌用于提升自身 assurance 的上下文。v0.2 直接删除这条路径，不为它承担兼容成本。

### 3.2 工作分类

#### 现在优化

- 删除 v0.1 evidence envelope 及重复 normalization 层。
- 删除 evidence 内嵌 trust 的评估路径。
- 增加零新增生产依赖的原生 OMK Receipt v3 parser 和兼容性 validator。
- 使用精确 command descriptor 和仓库相对 cwd 匹配 required check。
- 重新采集与 OMK 兼容的当前工作区事实并执行状态绑定。
- 在语义仍然有效时复用现有 manifest、trace、policy、report 和 Git 抽象。
- 将 Action runtime 和 bundle target 迁移到 Node 24。
- 用原生 OMK 正负测试替换已经过时的 adapter 测试。

#### 暂缓

- E2 或 E2-candidate assurance。
- 加密可信 attestation 验证。
- OMK replay ledger 成员关系及 freshness ordering。
- 将 OMK 内部 session 文件自动转换为 `agent-trace.jsonl`。
- 其他 agent harness adapter。
- v0.1 到 v0.2 的迁移工具。
- Dashboard、service、database、model、API 或网络功能。

#### 删除

- AEG 自定义 `evidence.json` envelope。
- `source.kind: omk_v3 | maintainer_ci` 兼容路由。
- envelope 中的 `subject`、`producer`、`check` 和 `trust_context` 字段。
- 当前 `maintainer_ci` adapter 能力声明。
- 基于 E1 或自带 context 的 PR/protected 成功声明。
- 自然语言 claim 匹配。

#### 风险

- 兼容代码必须与 OMK 0.96.0 的 canonicalization 和 workspace digest 规则保持字节级一致。
- OMK Receipt schema 发生变化时，必须重新进行显式兼容性评审；v0.2 必须拒绝未知版本。
- 仍需独立 AEG trace，因此集成尚不是单文件即插即用。
- 恶意本地 producer 仍可伪造 E1 证据；报告必须明确此限制。
- 绝对 workspace 路径使 v0.2 状态绑定有意限定在生成 Receipt 的本地 checkout。

### 3.3 系统边界

#### 前端与用户体验

本版本不提供图形界面。支持的交互面是 CLI 输出、确定性报告文件和只读 GitHub Action summary。

#### 后端与工作流

运行时是固定的 Node bundle。它只读取有界本地文件、执行有界 Git 事实检查、运行纯策略评估并写入指定报告。它不执行 Receipt 中记录的命令，也不执行候选代码。

#### 模型边界

AEG 不进行任何 model、LLM、embedding 或外部 API 调用。OMK 可能在 AEG 运行前使用模型，但这位于 AEG 运行时和信任边界之外。

#### 数据边界

输入仅包括 AEG task manifest、AEG trace、原生 OMK Receipt 文件和所选仓库的 Git 事实。报告仅公开稳定标识符、digest、状态、固定摘要和 remediation 文本。

#### 安全与隐私

AEG 不使用 secrets，不读取 credential store，不跟随输入 symlink/junction，不发送网络请求，也不回显不可信 claim、command、绝对 cwd、stdout、stderr、environment 或疑似 credential 数据。

#### 部署与回滚

开发在隔离 worktree 中进行。公开 v0.1.3 tag 保持不变。在全部退出标准通过且用户再次确认前，不更新 Marketplace alias、GitHub release 或公开分支。

### 3.4 资源预算

| 资源 | 基线 | v0.2 目标 | 硬上限 | 验证方式 |
| --- | ---: | ---: | ---: | --- |
| 生产依赖 | 1 个（`yaml`） | 不增加 | 总数最多 1 个 | package 与 lock 审计 |
| CLI bundle | 297,638 bytes | 不超过 500 KiB | 1 MiB | 检查构建产物大小 |
| Action bundle | 296,699 bytes | 不超过 500 KiB | 1 MiB | 检查构建产物大小 |
| 完整测试 | 76 项通过，约 1.36–2.1 秒 | 不超过 5 秒 | 超过 10 秒必须调查 | 固定本地 Node 运行 |
| 单次 Receipt 数量 | 不适用 | 不超过 64 | 64 | 边界测试 |
| 单张 Receipt | 不适用 | 不超过 1 MiB | 1 MiB | 有界读取 |
| Receipt 总量 | 不适用 | 不超过 8 MiB | 8 MiB | preflight 计数 |
| JSON 深度 | 已有有界 parser | 不超过 32 层 | 32 | 负向 fixture |
| 运行时网络/model/API | 0 | 0 | 0 | 静态与集成审计 |

预期效率收益来自删除重复 envelope 解析和兼容测试。验证方法是：adapter surface 更小、不增加生产依赖、bundle 不超预算、完整测试不超过五秒。

### 3.5 预检结论

**GO：** 可以进入设计文档及实施计划阶段。只有在本文档经过用户审阅并且实施计划获批后，才允许开始代码实现。

任何 P0 安全、隐私、确定性或数据边界失败都会使版本回到发布 **NO-GO** 状态。

## 4. 兼容性 spike 证据

受控 spike 仅使用合成、非敏感数据检查 npm 发布的 `open-multi-agent-kit@0.96.0` 归档。

- npm 版本：`0.96.0`
- tarball：`https://registry.npmjs.org/open-multi-agent-kit/-/open-multi-agent-kit-0.96.0.tgz`
- 已验证 integrity：`sha512-ZSnKjxCiVoETcf9oHblB7iWW4c1VIctaum9jYRjD5YBaP3CDGvR6MuQWIkskuIK1w0Q1ydhYNoqY4ZiH+O79bw==`
- tarball 大小：6,759,921 bytes
- 解压大小：21,274,617 bytes，共 1,645 个文件
- package Node 要求：`>=22.19.0`
- 已检查的最小 Receipt 校验闭包：4 个发布 JavaScript module，共 87,315 bytes

公开 package 导出了 `validateEvidenceReceipt`、`createEvidenceReceipt`、`computeEvidenceReceiptCoreSha256`、`captureWorkspaceFingerprint` 和 `evidenceReceiptToObservation`。完整 package 体积和依赖均不适合进入 AEG 固定 Action bundle。

通过官方 `createEvidenceReceipt()` 生成的 schema-3 合成 Receipt 能正常通过校验。仅修改 `core.claim` 后，官方 validator 返回 `evidence receipt core digest mismatch`。这证明在 AEG 实现开始前，发布归档和 core digest 校验路径已经实际运行。

OMK 自身协议文档明确说明：Receipt digest 校验不能证明 ledger membership、trusted attestation、runner honesty、freshness 或 OS isolation。AEG 必须保持这一边界。

## 5. 架构

```text
agent-task.yml (aeg-task/v2)
agent-trace.jsonl (aeg-trace/v1)
OMK receipt.json 或 receipts 目录
当前 Git 仓库
              |
              v
有界输入与路径 preflight
              |
              v
原生 OMK Receipt v3 校验
              |
              v
goal 选择 + 精确 check 匹配
              |
              v
与 OMK 兼容的当前状态重采集
              |
              v
canonical E1 evidence collection
              |
              v
policy engine -> report renderer -> exit code
```

处理顺序固定。任何 Receipt 在通过结构、digest、goal、command、trace 和当前状态绑定前，都不能进入 policy 或 report。

## 6. 公开输入合同

### 6.1 CLI

```text
aeg verify \
  --manifest agent-task.yml \
  --trace agent-trace.jsonl \
  --receipts <receipt.json-or-receipts-directory> \
  --repo <repository> \
  [--json gate-report.json] \
  [--markdown gate-report.md]
```

删除旧 `--evidence` 选项，不自动识别旧格式。

### 6.2 Action

Action 输入改为 `manifest`、`trace`、`receipts`、`repo`、`json` 和 `markdown`。bundle 使用 `runs.using: node24`，不接收 secret input，不请求写权限，不运行 shell 或候选命令。

### 6.3 Manifest

破坏性 manifest schema 为 `aeg-task/v2`。仍然适用的现有 policy 字段继续保留。required check 增加结构化 command 合同：

```yaml
schema_version: aeg-task/v2
task_id: version-consistency-pilot
profile: local
omk_goal_id: optional-explicit-goal

allowed_paths:
  - scripts
  - tests
  - docs
sensitive_paths:
  - .env

required_checks:
  - id: version-consistency
    command:
      kind: shell
      script: node scripts/check-version-consistency.mjs
      shell: pwsh
    cwd: .
```

支持以下 command descriptor：

- `shell`：精确 script bytes；可选精确 shell identity。
- `argv`：精确 executable 字符串和精确 argv 元素边界。

`cwd` 必须是安全的仓库相对路径。AEG 在 canonical repository root 下解析它，并与 Receipt 的 canonical absolute cwd 比较。如果省略 `shell`，script 和 cwd 仍须精确匹配；报告会记录 shell identity 未受约束，但不会输出其值。

### 6.4 Trace

`aeg-trace/v1` 的结构化事件语义仍然有效，因此继续使用；这不代表保留已删除的 evidence envelope。trace 继续负责 scope、sensitive access、dependency、test/verifier surface、completion 和 resource budget 等 producer 行为记录。

trace 只能包含一个 `run_id`。选择 OMK goal 后，`trace.run_id` 必须等于所选 Receipt `goalId`，否则在 policy evaluation 前失败。

## 7. Receipt 发现与选择

### 7.1 单文件

直接输入路径必须解析为普通、非链接文件，大小不得超过 1 MiB。

### 7.2 目录

目录输入只能被解释为 OMK `EvidenceReceiptStore` 根目录：

```text
receipts/
  <safe-receipt-id>/
    receipt.json
```

AEG 以确定性 ordinal 顺序执行有界的一层枚举。以下情况全部拒绝：symlink、junction、reparse point traversal、不安全 ID、缺少 `receipt.json`、结构含糊、超过64张 Receipt 或总输入超过8 MiB。

所有发现的 Receipt 都必须成功解析和校验。不能静默忽略无关但无效的文件，否则目录评估结果将依赖攻击者控制的过滤行为。

### 7.3 Goal 选择

- manifest 中存在 `omk_goal_id` 时，选择完全相同的 goal；不存在时失败。
- 未声明 `omk_goal_id` 且所有有效 Receipt 只有一个 goal 时，选择该 goal。
- 存在多个 goal 时失败，并要求用户设置 `omk_goal_id`。

`task_id` 是 AEG task identity，不要求等于 `goalId`。报告记录两个稳定 ID，但不把它们视为 trust evidence。

### 7.4 Required check 匹配

绝不解析或匹配 Receipt claim 自然语言。

每个 required check 的候选 Receipt 必须同时满足：

- 属于所选 `goalId`；
- command descriptor 完全匹配；
- canonical cwd 与声明的仓库相对 cwd 匹配。

同一检查执行多次时，AEG 按 `finishedAt` 排序，采用最后一次执行，使常见的“失败—修复—重跑”流程可以通过。更早的结果仍可作为计数证据，但不能覆盖最后一次结果。

同一检查存在两张时间完全相同的最新 Receipt 时，结果视为含糊并拒绝。Receipt ID 重复始终拒绝。

最终 Receipt 必须为 `status: passed` 且 `exitCode: 0`。failed、timeout 和 aborted 都会阻断 required check。

## 8. 原生 Receipt 校验

validator 固定兼容 OMK 0.96.0 发布的 EvidenceReceipt schema version 3。以下情况必须失败封闭：

- 未知 schema version；
- 缺失、额外、accessor 或非 data 字段；
- JSON duplicate keys；
- 不安全 Receipt ID；
- 时间戳畸形或 duration 不一致；
- status 与 exitCode 组合无效；
- command descriptor 畸形；
- 持久化 command 含 credential；
- command redaction metadata 与 HMAC binding shape 不一致；
- workspace fingerprint 或内部 workspace digest 畸形；
- output 含原文而不是仅含 digest；
- 声明的 stdout/stderr 总字节数超过64 KiB；
- ledger 或 attestation envelope metadata 畸形；
- immutable core digest 不匹配。

兼容模块仅使用 OMK v3 domain separator 和 canonical JSON 规则验证原生 Receipt 合同。它不创建 AEG Receipt、hash ledger、replay database、runner 或 execution control plane。

不安装或打包完整 OMK package。实现必须使用由固定官方 package 生成的 sanitized fixture 进行独立对照测试，并记录上游版本、integrity 和 fixture provenance。

## 9. 当前状态绑定

### 9.1 Fingerprint 类型要求

Receipt 在结构上可以包含 artifact-set 或 Git workspace fingerprint。v0.2 的最终 required-check Receipt 必须使用 `workspaceAfter.kind: git`，并且其 canonical repository root 必须与传给 AEG 的仓库相同。只有 artifact-set 的证据虽然是有效 OMK 数据，但不足以完成本版本的 Git 状态绑定，因此必须失败并给出 remediation。

### 9.2 状态重采集

AEG 使用与 OMK 0.96.0 兼容的规则重新采集同一 scope：

- Git HEAD object ID；
- 排序、去重的仓库相对 changed paths；
- staged diff SHA-256；
- unstaged diff SHA-256；
- 每个所选 artifact 的直接状态，包括 missing/file、size 和 SHA-256；
- Git dirty digest；
- workspace manifest digest。

调用 Git 时必须限制输出、设置 timeout、使用确定性参数、禁用 external diff，并移除可能重定向 Git 的不安全环境变量。AEG 不执行 Receipt 中的任何命令。

重采集 fingerprint 必须与 Receipt `workspaceAfter` 相等。所选 artifact、diff、changed-path set 或 HEAD 在检查后的任何变化都会使证据过期。

### 9.3 覆盖范围

当前每个 changed path 都必须等于某个 `workspaceAfter.scope.artifactPaths` 项，或位于该项之下。这可以防止 Receipt 只证明当前变更中方便的一小部分。变更过多、超出 OMK 有界 scope 时必须失败，要求拆分任务或用足够 scope 重跑。

`workspaceBefore` 只进行严格内部一致性校验，不与当前状态比较。

## 10. Assurance 与策略行为

所有原生 OMK Receipt 最高只能产生 E1。

- `local` 是唯一具有受支持通过路径的 profile。
- `pr` 和 `protected` 不能取得 v0.2 passing assurance。
- Action 可以 advisory 方式运行并展示 policy failure，但文档不得称其为独立 CI proof 或 protected-branch control。
- envelope 中的 `ledgerBinding`、`trustedAttestation`、executor identity、timestamp、claim 或其他 producer 字段都不能提升 assurance。

当独立 trace 提供所需结构化事实时，现有 scope、sensitive path、dependency、resource、test surface、verifier surface、C0-C2 和 self-verification 策略继续适用。缺少必要可观察性时，遵循现有 fail/warn 合同，绝不从 Receipt prose 虚构事实。

## 11. 隐私与报告

由于 evidence model 是破坏性变化，report schema 升级为 `aeg-report/v2`。

报告可以包含：

- task ID；
- 所选 OMK goal ID；
- check ID；
- Receipt ID；
- core digest reference；
- 状态、assurance level、reason code、固定 summary 和 remediation code；
- 仅在现有 policy finding 必须展示且已通过安全检查时，输出仓库相对路径。

报告不得包含：

- Receipt claim prose；
- command、script、argv 或 shell 值；
- absolute cwd 或 workspace root；
- stdout/stderr 或 output excerpt；
- environment variable；
- attestation signature 值；
- credential、token、prompt、source 或原始私密字段；
- 来源于不可信输入的 parser exception 文本。

输入失败只生成最小固定报告。错误信息描述字段类别，不展示被拒绝的值。

## 12. 稳定失败分类

保留可识别的顶层 reason family，同时使 v0.2 summary 更精确：

| 代码 | v0.2 用途 |
| --- | --- |
| `AEG001` | manifest、trace、Receipt JSON、Receipt schema 或结构校验失败 |
| `AEG002` | trace identity、ordering、terminal event 或 goal/run binding 失败 |
| `AEG003` | 资源边界、目录含糊、Git 重采集、workspace root、状态兼容或覆盖失败 |
| `AEG010` | 不安全路径、scope escape、case collision、link、junction 或 reparse point 失败 |
| `AEG020` | required check 缺失、command/cwd 不匹配、最新结果含糊或最终 disposition 未通过 |
| `AEG021`–`AEG061` | 仍然适用的现有结构化策略 finding |
| `AEG070` | E1 assurance 限制或不受支持的 PR/protected 成功尝试 |

所有输入错误都必须失败封闭并输出确定性报告，且不回显不可信内容。

## 13. 验证策略

### 13.1 单元覆盖

- 严格解析 Receipt core、envelope、command、output、workspace、ledger 和 attestation；
- 官方 canonicalization 与 domain-separated digest vector；
- 每种 disposition 与 timestamp invariant；
- command redaction 与 command binding invariant；
- 单文件及目录路径安全；
- 确定性的 goal 与最新 Receipt 选择；
- 精确 shell/argv/cwd 匹配；
- 隐私安全错误渲染。

### 13.2 Mutation 与负向覆盖

对有效官方 fixture 逐字段变异。core 变异必须因 digest 失败；即使重新计算 digest，结构无效的 core 仍须失败。未知版本、未知 key、duplicate key、link、超大文件、深层 JSON、ID collision、冲突时间和多个 goal 都必须失败封闭。

### 13.3 Git 集成覆盖

临时仓库覆盖：

- 有效当前 Git fingerprint；
- HEAD mismatch；
- staged 与 unstaged change；
- untracked 与 missing file；
- changed-path order normalization；
- case collision；
- scope undercoverage；
- out-of-scope change；
- Receipt 生成后的 mutation；
- 按“覆盖所有当前变更”规则拒绝 scope 外的额外 mutation；
- Windows 与 POSIX path behavior。

### 13.4 合同覆盖

F01–F28 和 I00–I15 背后仍然适用的结果继续自动化。已经过时的 v0.1 envelope 和 `maintainer_ci` case 要用原生 Receipt、goal、command、state、privacy 和 E1 case 替换，而不是只删除测试。

### 13.5 确定性与隐私

相同输入重复运行必须生成字节级一致的 JSON 和 Markdown。在每个不可信文本位置放入 privacy sentinel 后，该 sentinel 不得出现在 stdout、stderr、JSON、Markdown、throw error 或 Action output 中。

### 13.6 Action 验证

Node 24 Action 必须通过静态 trigger/permission 检查以及一次受控合成运行。它必须保持只读，不使用 `pull_request_target`、secrets、网络、package installation、shell execution 或 candidate command。

## 14. 试点计划

试点项目为 `C:\Users\win\Documents\ChatGPT\AI项目风险与交付助手`，使用独立隔离分支。

可提交的试点资产仅限 policy/configuration、确定性只读版本一致性检查器、测试、文档及必要的 sanitized fixture。每次运行产生的 OMK Receipt、trace 和 AEG report 保持本地并加入 gitignore。

试点步骤：

1. 运行干净基线检查；
2. 由 OMK 执行声明的版本一致性命令；
3. AEG 原生验证 Receipt 并产生 E1 pass；
4. 在不重跑检查的情况下对一个受覆盖文件做受控修改；
5. AEG 因状态过期按预期失败；
6. 重新运行 OMK 检查；
7. AEG 按预期再次通过；
8. 清理或撤销受控修改；
9. 最后运行完整、干净的项目测试。

试点不调用或修改 Dify、Plane、Activepieces、GitHub、生产数据或外部服务。

## 15. 交付顺序

实施计划必须遵循以下顺序：

1. schema 与有界路径 preflight；
2. 原生 Receipt parser 和官方兼容 vector；
3. OMK workspace digest 与实时 Git 状态绑定；
4. goal/check/trace 选择和 canonical evidence collection；
5. policy 与 report v2 集成；
6. CLI 与 Node 24 Action；
7. 替换 F/I 矩阵并运行完整 regression suite；
8. 文档与本地试点；
9. release candidate 的安全、隐私、确定性、体积和回滚审计。

必须采用测试驱动开发。任何实现步骤都要先出现失败的 acceptance test，再编写 production code。

## 16. 退出标准

只有全部满足以下条件，v0.2.0 才能成为 release candidate：

- v0.1 的自带 trust 升级路径已不存在；
- public runtime 中不再存在 v0.1 evidence envelope parser 或误导性的 maintainer-CI adapter；
- 固定官方 OMK 0.96.0 正向 fixture 通过；
- schema、digest、command、goal、trace、state、coverage、resource、link 和 privacy 负向 case 全部失败封闭；
- 所有选择的 Receipt 始终保持 E1；
- 重复报告字节级一致；
- privacy sentinel 零泄漏；
- 不存在运行时 model、API、network、secret、package installation 或 candidate command 路径；
- 生产依赖、bundle 和测试时长预算通过；
- Node 24 Action 受控验证通过；
- 真实试点展示“通过、过期失败、重跑后通过”；
- 所有适用的自动验收和 regression test 通过；
- 文档明确说明 E1 和 local-only 边界，不进行更广泛宣传；
- 独立 code review 未发现 P0/P1；
- 用户再次确认外部发布。

## 17. 回滚

- 整个开发期间保持 v0.1.3 及其公开 tag 不变。
- 在明确确认前，不移动公开 alias、不创建 release、不更新 Marketplace metadata。
- AEG v0.2 与试点分别使用独立 branch/worktree。
- 出现 P0 隐私、安全、确定性或数据丢失问题时停止发布，并保留最后一个已验证 commit 作为证据。
- 如果试点因架构原因失败，删除试点 branch/worktree 并返回本文档修订，不通过削弱门禁来获得通过。
- 本地生成的 Receipt、trace 和 report 均为 disposable，并排除在版本控制之外。

## 18. 最终设计决策

**GO：** 用户审阅并批准这份已提交设计文档后，进入实施计划编写。

**NO-GO：** 未经额外批准，不得在 v0.2 中增加 E2 trust、ledger/replay ownership、model/network runtime 或 backward compatibility 工作。
