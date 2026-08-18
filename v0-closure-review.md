# Agent Evidence Gate V0 功能合同闭合评审

> 日期：2026-08-17  
> 决定：`V0_FUNCTIONAL_CONTRACT_CLOSED`  
> 路线：`BOOTSTRAP_CONDITIONAL_GO`  
> 采用价值：延后至 MVP 发布后验证  
> 真实 CI/E2：`unverified`

## 1. 评审结论

用户选择跳过前置使用价值调研，但没有降低已冻结的 V0 功能要求。v0.1 必须实现 `v0-specification.md` 第 2-11 节的完整功能面；互操作 Spike 的 I00-I15 是新增互操作夹具，不替代原 F01-F28。

允许进入实现的条件：

- C0-C2、E0-E3、local/pr/protected、manifest/trace/Git/report 契约保留；
- AEG001-AEG070 规定的适用策略保留；
- F01-F28 和 I00-I15 均为发布前验收范围；
- P5 仍必须以 `unverified` 对外表达，不得虚构真实 E2；
- Action 必须只读、无 secrets、不执行候选 PR 代码。

## 2. 冻结输入上限

以下值从候选值升级为 v0.1 默认上限。它们是防止资源耗尽的产品边界，不是性能承诺；超过即 fail，不能静默截断。

| 输入 | 上限 | 超限结果 | 理由 |
| --- | ---: | --- | --- |
| manifest 文件 | 1 MiB | fail | 足够表达任务、检查和策略；限制解析面 |
| trace 文件 | 20 MiB | fail | 保持本地/Action 内存与等待可控 |
| JSONL 单行 | 256 KiB | fail | 防止单事件占满解析缓冲 |
| 事件数量 | 50,000 | fail | 防止事件循环和报告索引失控 |
| 仓库相对路径长度 | 4,096 字符 | fail | 统一跨平台根边界与报告安全 |
| JSON 嵌套深度 | 20 | fail | 防止递归解析耗尽 |

验证要求：每个上限至少有一个边界内和一个超限 fixture；实现必须在完整解析前执行大小、行长和事件数预检。

## 3. 未决 P0 语义闭合

### 3.1 声明与保障

- C0 自然语言只展示，不解析、不进入 verdict；
- C1 manifest 结构化要求决定检查；
- C2 只按稳定 claim ID 关联，不理解自由文本；
- E1 记录即使 schema 完整也不得升级；
- E2-candidate 需要 receipt 之外的 trust context；真实 CI/E2 仍为 `unverified`；
- E3 不在 v0.1 实现。

### 3.2 Profile

- `local`：最低 E1，资源缺失和 surface 变化按 warn；
- `pr`：最低 E2，缺失必需证据或 assurance 不足导致 gate fail；
- `protected`：最低 E2，强制 budget 缺失 fail，surface 变化未经批准 fail；
- `approval_required` 只能表示需要维护者确认，不得被当作 pass。

### 3.3 State binding 决策

AEG 不重新发明 OMK receipt hash、ledger 或独立 replay 数据库。v0.1 采用兼容性验证：

- 读取 Git HEAD、规范化 changed paths、必要的 index/worktree/submodule 元数据；
- 验证 receipt/envelope 的 subject、state binding、policy digest 与当前 verifier context；
- producer 提供的 `state_id` 只作为外部事实，不得单独被信任；
- 规范化摘要使用固定算法版本和字节排序，属于 verifier compatibility fingerprint，不宣称是签名或恶意防篡改证明；
- 如果某个来源无法提供可验证的 state binding，降级为 E1 或 fail，不以自报补齐。

这保留 stale/changed-state 功能，同时避免复制 OMK 的执行控制面。

### 3.4 Manifest 解析

`agent-task.yml` 是产品输入契约。v0.1 允许使用一个版本固定、锁文件固定、构建时打包的 YAML 解析器；运行时不下载依赖、不联网。解析器只负责语法和结构，策略仍由 AEG 确定性代码执行。

### 3.5 报告契约

JSON 是唯一规范结果；终端和 Markdown 只能渲染 JSON，不重新计算策略。顶层必须分离：

- `policy_verdict`；
- `assurance_level`；
- `required_assurance`；
- `gate_verdict`。

每项 check 必须含稳定 ID、status、severity、summary、evidence refs、remediation code、remediation 和 limitations。

## 4. F01-F28 桌面复核

| 分组 | 夹具 | 复核结论 |
| --- | --- | --- |
| 基本收据 | F01-F06 | 通过；E2 新鲜成功可 pass，E1、缺失、失败和 stale 均不会误放行 |
| 声明/范围 | F07-F09 | 通过；scope 不扩大，越界和路径穿越 fail |
| 敏感/依赖 | F10-F13 | 通过；未批准敏感写入、敏感读、依赖策略违反 fail；不可观察敏感读按 unknown/warn |
| 资源预算 | F14-F16 | 通过；普通 profile 缺失按 warn，protected 强制缺失和已知超限 fail |
| 自测/验证面 | F17-F19 | 通过；代理新增测试和 surface 变化按 profile warn/fail/approval |
| Trace/隐私/上限 | F20-F22 | 通过；sequence、重复 ID、禁存字段和超限 fail |
| 跨平台/路径 | F23-F24 | 通过；大小写冲突和允许/禁止混合 rename fail 或显式不适用 |
| 测试统计 | F25-F26 | 通过；skipped 按策略 warn，cancelled fail |
| Assurance/确定性 | F27-F28 | 通过；未受信 E2 降级并 fail，重复输入规范 JSON 一致 |

无 F01-F28 之间的预期矛盾。`F02` 的 local warn 与 `F03` 的 pr fail 是 profile 差异，不是冲突。

## 5. GitHub Action 安全设计

- 触发与 required check 由维护者控制的 workflow 配置；不使用 `pull_request_target` 执行候选内容；
- Action 只读取输入文件、Git 元数据和事件元数据；不执行 manifest/trace 中的 argv、shell、npm、构建或测试；
- 权限默认 `contents: read`，只有读取 PR 元数据确有必要时才增加最小只读权限；
- 不使用 secrets，不向外部服务发送源码、prompt、trace 原文或环境变量；
- Action 包固定版本，依赖锁定并在发布前做供应链审查；
- required check 消费稳定退出码和 gate_verdict；报告中的 `approval_required` 不得转化为 pass；
- fork PR 只作为不可信数据验证，任何需执行候选代码的功能另立安全评审。

## 6. V0 剩余事项关闭状态

| 事项 | 状态 | 说明 |
| --- | --- | --- |
| 候选阈值 | 已关闭 | 采用第 2 节默认值，接受性能边界风险 |
| 三份契约 P0 字段 | 已关闭 | C0-C2、E0-E3、profile、manifest/trace/report 统一引用 V0 规格 |
| F01-F28 预期结果 | 已关闭 | 完成桌面复核；实现阶段必须自动化 |
| Action 安全设计 | 已关闭 | 只读、无 secrets、不执行候选 PR 代码 |
| 维护者采用价值 | 延后 | 发布后用公开使用信号验证，不写成已验证事实 |
| 真实 CI/E2 | 未验证 | 继续显示 `unverified`，不影响实现候选路径，但影响产品承诺措辞 |

## 7. 实现顺序

1. 输入预检、manifest/trace schema 和规范化 JSON；
2. Git facts、state binding compatibility 和路径边界；
3. policy engine 与 AEG001-AEG070；
4. OMK/CI 两个 adapter 与 assurance 降级；
5. JSON/Markdown/terminal renderer 与退出码；
6. F01-F28、I00-I15 自动化测试；
7. 只读 GitHub Action、权限和供应链审查；
8. Quickstart、synthetic demo、限制说明、release/rollback 和独立 P0 review。

V0 功能合同闭合结论：`GO_FOR_IMPLEMENTATION`。这不是市场 GO，也不解除真实 E2、采用价值和 Fund 结果的不确定性。
