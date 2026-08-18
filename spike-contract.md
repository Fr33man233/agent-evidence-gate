# Agent Evidence Gate 互操作 Spike 合同

> 合同编号：`AEG-SPK-INT-001`  
> 版本：v1.0  
> 日期：2026-08-17  
> 项目决定：`PIVOT_ACCEPTED`  
> 授权状态：`CONDITIONAL GO`——只允许执行本文定义的可丢弃技术 Spike；不授权 v0.1、公开发布、第三方真实仓库/生产 PR 接入或生产代码实现  
> 上位规格：[v0-specification.md](./v0-specification.md)  
> 证据依据：[竞品运行级深审报告](./research/competitor-runs/2026-08-14/run-level-review.md)

## 1. 合同目的

本 Spike 只回答一个立项问题：

> AEG 能否在不重新发明 receipt、ledger 或 Git state 算法的前提下，把两种不同来源的代理/CI 执行证据转换为统一、确定性、隐私最小化的维护者侧门禁结果，并且不把 producer 自报误当作独立验证？

本合同替代旧 D1/D2/D3 Spike。旧路线中的 TypeScript/Python 竞赛、自研 `state_id`、本地 receipt collector 和 replay ledger 不再执行。

Spike 是一次有时间盒、可整体丢弃的技术实验，不是 MVP 的第一轮开发。

## 2. 已冻结的产品定位

AEG 是位于多种 agent harness、CI 证据生产者与维护者 PR 工作流之间的：

- 跨 harness evidence interoperability profile；
- 外部 producer assurance 判定层；
- 维护者侧只读 PR verifier；
- canonical check 与 verifier-surface 规则执行器；
- 公共最小披露报告生成器。

AEG 不是：

- 代理运行时、编排器或 OMK 插件；
- 新的 receipt/ledger 存储系统；
- 测试执行器；
- 代码正确性证明器；
- 任意自然语言总结解析器；
- 依赖 LLM 的判定系统。

## 3. 决策问题与可证伪假设

| ID | 决策问题 | 通过假设 | 反证条件 |
| --- | --- | --- | --- |
| D1 | 两种来源能否映射到同一个最小 profile？ | OMK v3 receipt 与维护者控制的 CI envelope 可映射到相同核心事实，供应商字段不进入策略层 | 必须为不同来源维护两套 verdict 逻辑，或只能通过丢失关键事实强行统一 |
| D2 | E1/E2 能否由外部事实区分？ | verifier 使用独立 trust context 计算 assurance；producer 自称 E2 不产生升级 | E2 最终仍只能相信 receipt/envelope 自报，或 PR 作者可替换可信上下文而不被发现 |
| D3 | 新鲜度与验证面变化能否 fail-closed？ | 当前 head、稳定 check ID、workflow/verifier surface 均可确定性核对 | 旧 head、未知 check 或被 PR 修改的验证面仍能通过正式门禁 |
| D4 | 公共报告能否保持最小披露？ | verdict、assurance、稳定原因码和补救提示足以支持维护者决策 | 必须公开 command、cwd、源码、prompt、stdout/stderr 或任意私密字面量才能解释结果 |
| D5 | 互操作核心是否保持确定性和低成本？ | 相同语义输入重复运行得到逐字节一致的规范 JSON，运行时模型调用为 0 | verdict 依赖模型、网络查询或人工解释；相同输入输出漂移 |

维护者是否愿意增加 profile/required check 属于采用验证，不由技术 Spike 代替。H3-H5 仍须通过访谈或公开试用验证。

## 4. Spike 输入合同

### 4.1 证据来源 A：OMK v3 receipt fixture

- 使用已固定版本运行所得结构或等价的合成、脱敏 fixture；
- adapter 只做字段解析、规范化和能力声明；
- OMK receipt 单独存在时最高为 E1；
- 不复刻 OMK 的 receipt hash、ledger、Git fingerprint 或 runner；
- 任意 command、cwd、原始输出只可作为不可信输入读取，不得进入公共报告。

### 4.2 证据来源 B：维护者控制的 CI envelope fixture

最小候选字段：

- repository identity；
- workflow identity 与受保护 revision；
- run/job identity；
- subject head SHA；
- stable check ID；
- termination 与显式 exit code；
- evidence artifact digest；
- producer-observed timestamp。

该 envelope 是 Spike 候选输入，不声称是 GitHub 官方格式。它只有在 verifier 能从 producer 记录之外获得并核对可信 CI context 时，才有资格成为 E2 候选。

### 4.3 独立 verifier context

verifier context 必须与被验证 receipt 分离，至少包含：

- expected repository identity；
- expected head SHA；
- required stable check IDs；
- 允许的 workflow identity/revision；
- policy digest；
- 本次 PR 的 verifier-surface 变更清单；
- profile 要求的最低 assurance。

adapter 不得修改这些值，也不得根据 producer 声明生成这些值。

## 5. 最小规范化对象

Spike 只实现足够做决策的候选对象，不冻结正式产品 schema：

| 对象 | 最小字段 |
| --- | --- |
| `source` | `kind`、`format`、`version`、`adapter_id` |
| `subject` | `repository_id`、`head_sha` |
| `check` | `check_id`、`termination`、`exit_code`、`outcome` |
| `producer` | `producer_id`、`run_id`、`workflow_ref`、`artifact_digest` |
| `assurance` | `computed_level`、`basis_codes[]`、`limitation_codes[]` |
| `surface` | `policy_digest`、`verifier_surface_changed` |
| `verdict` | `status`、`reason_codes[]`、`remediation_codes[]` |

规则：

- 核心策略不得读取供应商专有字段；
- 未知字段忽略但不得改变 verdict；
- 缺少强制字段必须产生稳定错误码；
- 不用自然语言、字段数量或 schema 完整度推断 assurance；
- canonical JSON 使用固定字段顺序、UTF-8、稳定数组排序和明确的 `null` 语义。

## 6. Assurance 合同

| 等级 | Spike 语义 | PR profile 处理 |
| --- | --- | --- |
| E0 | 没有可解析的结构化执行证据 | fail |
| E1 | producer/代理可控制或自报的记录；字段完整也不升级 | fail；可在 local profile 中作为 warn/调试信息 |
| E2-candidate | receipt 与 verifier 外部的可信 CI context 匹配，且 workflow/verifier surface 未被候选 PR 改写 | 满足其他规则时可 pass；未完成真实受控 CI 验证时必须标记 `unverified` |
| E3 | 硬件证明、独立签名供应链或更高等级证明 | 本 Spike 不实现、不承诺 |

强制规则：

1. assurance 由核心 verifier 计算，adapter 只能提供事实和能力；
2. `producer.claimed_assurance` 即使存在也不得参与升级；
3. OMK receipt 或任意 agent 文件单独输入时最高 E1；
4. E2-candidate 必须同时绑定 repository、head、workflow、run/job、check 和 artifact；
5. 可信 workflow/verifier surface 被候选 PR 修改时，默认不得通过 protected/pr 门禁；
6. E2 只表示证据生产边界位于代理控制之外，不证明 runner 永不失陷、测试充分或代码正确。

## 7. 固定 Fixture 矩阵

所有 fixture 只使用合成仓库、假 SHA、假 repository ID 和不具备秘密价值的 sentinel。

| ID | 唯一变量 | 预期结果 |
| --- | --- | --- |
| I00 | OMK receipt，字段完整、head 当前，无外部 trust context | assurance=E1；pr fail |
| I01 | CI envelope 与独立 trust context 全部匹配 | E2-candidate；其他规则满足时 pass |
| I02 | 未受信 producer 自称 E2 | 降为 E1；pr fail |
| I03 | receipt/envelope head 与 expected head 不同 | stale fail |
| I04 | repository identity 不同 | subject mismatch fail |
| I05 | workflow identity/revision 不在信任配置中 | producer untrusted fail |
| I06 | stable check ID 缺失或未知 | required check fail |
| I07 | exit code 缺失、`cancelled` 或 `timeout` | malformed/unsatisfied fail |
| I08 | 显式非零 exit code | check failed |
| I09 | policy、adapter、workflow 或 verifier surface 被候选 PR 修改 | protected fail 或 `approval_required`；不得静默 pass |
| I10 | OMK command 中放入 `AEG_PRIVATE_SENTINEL` | JSON/Markdown 公共报告均不得出现 sentinel |
| I11 | 两种来源表达相同 subject/check/outcome，并使用等价的独立 trust context | 核心规范字段、assurance、reason 和 verdict 一致 |
| I12 | 调换 JSON 字段与无关 vendor 字段顺序 | canonical JSON 逐字节一致 |
| I13 | 相同输入连续运行两次 | canonical JSON 与退出码逐字节一致 |
| I14 | 畸形 JSON、重复关键字段或超出候选大小上限 | fail-closed；稳定错误码；不回显原文 |
| I15 | adapter 声称 pass，但核心看到 state/check/assurance 冲突 | 核心规则优先；fail |

负例阻断率必须为 100%。任何应 fail 的 fixture 被放行为 P0 失败。

## 8. 执行范围

允许：

- 在专用 `spike/interop/` 或经验证的临时目录中编写可丢弃探针；
- 使用一种实现语言和标准库完成两个薄 adapter、一个最小规范化层和一个策略探针；
- 读取固定 JSON fixture，输出 canonical JSON 和最小 Markdown；
- 在 Windows 运行全部离线 fixture；
- 离线 fixture 全部通过后，执行一次受控 CI 元数据验证；该运行不得执行候选 PR 代码、安装依赖或使用 secrets；
- 将测量记录和 ADR 保留在 `research/spikes/<date>/`。

禁止：

- 重新实现 receipt hash、ledger、replay database 或自定义全仓 Git state 算法；
- 同时实现 TypeScript 与 Python 候选；
- 开发正式 CLI、GitHub Action、Marketplace 包、Dashboard、服务、数据库或自动合并；
- 接入真实代理账号、模型 API、私有仓库、用户源码或凭据；
- 执行 fork/PR 中的不可信代码；
- 使用 `pull_request_target` 执行候选内容；
- 为了让 fixture 通过而修改冻结的期望；
- 未评审地把 Spike 代码复制到 v0.1。

实现语言只是最低成本实验载体，不构成产品技术栈决定。若现有受控 Node.js 可直接使用，默认使用零第三方依赖的 JavaScript/TypeScript 探针；只有遇到已记录的阻断才允许改用 Python，并停止前一候选，不做双实现比较。

## 9. 执行顺序与时间盒

| 阶段 | 工作 | 时间上限 | 出口 |
| --- | --- | ---: | --- |
| P0 | 环境、路径、安全和 fixture 预检 | 20 分钟 | 预检清单全部通过 |
| P1 | 冻结两个输入样例、trust context 和候选规范对象 | 40 分钟 | 字段来源与禁用字段可追溯 |
| P2 | 两个薄 adapter 与规范化输出 | 80 分钟 | I00、I01、I11、I12 可运行 |
| P3 | assurance、freshness、check、surface 策略探针 | 90 分钟 | I02-I09、I15 可运行 |
| P4 | 隐私、畸形输入、确定性验证 | 50 分钟 | I10、I13、I14 通过 |
| P5 | 单次受控 CI 验证；环境不可用则标记 unverified | 40 分钟 | 形成真实 E2-candidate 证据或明确未证实 |
| P6 | 成本记录、威胁复审和 ADR | 40 分钟 | 给出 GO/PIVOT/NO-GO/UNVERIFIED |

总人工时间盒为 4-6 小时。到时即停止，不通过增加功能延长实验。

## 10. 资源效率合同

| 成本项 | 当前风险/成本 | 本 Spike 的预期改进 | 验证方法 |
| --- | --- | --- | --- |
| 重复底层实现 | OMK 已覆盖 receipt、freshness 和 Git state；继续自研会增加长期维护 | 自研 receipt/state/ledger 代码为 0 | diff 与交付清单审计 |
| 双语言比较 | 两套探针会重复 fixture、测试和判断成本 | 只使用一种最低成本实验语言 | 运行记录只有一个实现候选 |
| 适配器扩张 | 为多个 agent 工具写适配器会在价值未证实时扩大范围 | 仅两个输入来源 | fixture/source 数量固定为 2 |
| 模型与 token | 确定性门禁调用模型会增加费用和波动 | 产品/Spike 运行时模型调用 0 | 运行记录 `model_calls=0` |
| 网络与供应链 | 在线依赖会降低可复现性并增加供应链面 | 离线阶段网络 0、新增依赖 0 | 锁定日志；出现下载立即停止 |
| 重复端到端运行 | 大量 CI 重跑不增加早期决策信息 | 离线负例先行；真实 CI 最多一次，失败修复后最多重跑一次 | CI run 数与原因写入台账 |
| 人工返工 | 未冻结规则就开发会把概念争议变成代码返工 | 先冻结 fixture 和停止条件 | fixture hash/清单先于实现记录 |

每条失败路径最多一次修复重试。第二次仍失败则记录 `failed` 或 `unverified`，不得继续调参。

## 11. 安全、隐私和数据边界

- 离线阶段网络调用为 0；受控 CI 阶段不得主动访问外部 API 或下载依赖；
- 模型/API 调用为 0；
- secrets、token、个人数据、私有源码和真实 prompt 为 0；
- verifier 以只读方式消费 fixture，不修改候选仓库；
- 公共输出采用字段白名单，不采用事后黑名单脱敏；
- 公共报告不得包含 command、argv、cwd、源码片段、原始 stdout/stderr、环境变量或 receipt 原文；
- 错误报告只输出稳定 reason code、字段路径和补救动作，不回显不可信值；
- 临时目录必须解析为项目内专用目录或系统临时目录，禁止指向项目根、用户目录或宽泛路径；
- 删除临时数据前必须再次验证解析后的绝对路径；重要证据台账与 ADR 不随探针删除。

## 12. 验收标准

Spike 技术通过必须同时满足：

1. 两个来源都可进入同一个候选规范对象，核心策略无供应商条件分支；
2. I00-I15 全部得到预期结果，负例无误放行；
3. adapter 或 producer 自报不能把 E1 提升为 E2；
4. 至少一种 E2-candidate 的 assurance 依赖 receipt 之外的 trust context；
5. stale head、未知 check、失败/取消/超时和 verifier-surface 变化均 fail-closed；
6. `AEG_PRIVATE_SENTINEL` 不出现在 canonical public JSON、Markdown、错误文本或测量日志；
7. 相同语义、等价 trust context 和相同输入的规范输出逐字节一致；
8. 离线运行新增依赖 0、网络 0、模型调用 0；
9. 探针不执行候选 PR 代码，也不需要 secrets 或高权限；
10. 形成证据台账、威胁边界复审和 ADR；
11. 探针与产品目录隔离，并标记为 disposable；
12. 所有未验证能力在报告中明确为 `unverified`，不得推断为通过。

性能不作为本 Spike 的主要差异点。只记录固定 fixture 的 wall time 和输入字节数；除非小 fixture 已出现明显问题，不运行大规模 benchmark。

## 13. 立即停止条件

出现任一情况立即停止，不用功能堆叠掩盖：

- E1/E2 只能依赖 producer 自我声明区分；
- 必须执行不可信 PR 代码、使用 secrets、宿主高权限或付费 API 才能成立；
- 必须公开 prompt、源码、命令或原始输出才能给出可用报告；
- 两个来源必须使用不同策略引擎才能得出 verdict；
- stale、check mismatch 或 verifier-surface change 任一负例被放行；
- 出现路径越界、敏感数据泄漏或不可恢复的数据修改；
- 超出 6 小时时间盒或单路径重试上限；
- 实验开始形成完整 CLI/Action、发布流程或第三个 adapter；
- 发现成熟项目已以更低采用成本完整覆盖本合同的组合价值。

## 14. 交付物与证据格式

Spike 执行后必须交付：

1. disposable 探针及 `DISPOSABLE.md`；
2. I00-I15 fixture 与黄金期望；
3. 两个 adapter 的字段映射表；
4. assurance basis/limitation 对照表；
5. canonical JSON 与公共 Markdown 示例；
6. 运行台账；
7. 隐私 sentinel 扫描结果；
8. ADR：选择、拒绝项、成本、风险和处置决定。

每条运行记录至少包含：

| 字段 | 内容 |
| --- | --- |
| `evidence_id` | `SPK-INT-*` |
| `decision_id` | `D1 | D2 | D3 | D4 | D5` |
| `source_kind` | `omk_v3 | maintainer_ci` |
| `fixture_id` | I00-I15 |
| `runtime` / `platform` | 精确版本和执行环境 |
| `input_bytes` / `duration_ms` | 资源成本 |
| `exit_code` / `verdict` | 原始确定性结果 |
| `assurance_computed` | E0/E1/E2-candidate |
| `output_sha256` | 规范输出摘要 |
| `network_calls` / `model_calls` | 预期均为 0；受控 CI 平台自身通信单独说明 |
| `observation` | 仅事实描述 |
| `limitation` | 未验证边界 |
| `status` | `verified | failed | unverified` |

ADR 只能引用台账中的 `verified` 或 `failed` 记录，不得把计划、推断或工具自报当作完成证据。

## 15. 出口决定

| 结果 | 条件 | 后续权限 |
| --- | --- | --- |
| `TECHNICAL_GO` | 全部验收条件满足，且真实 E2-candidate 已验证 | 只允许进入 V0 最终 full-stack 评审；不自动批准 v0.1 |
| `CONDITIONAL_GO` | 离线合同全部满足，但真实受控 CI/E2 仍为 unverified | 只允许补做一次明确的 E2 验证，不扩展功能 |
| `PIVOT` | 互操作可行，但 assurance、报告或采用形态需要改变 | 先重写合同和边界，再决定是否实验 |
| `NO-GO` | 核心负例误放行、只能自报 assurance、隐私边界不成立或高度同质化 | 停止独立产品路线，评估向现有项目贡献 |
| `UNVERIFIED` | 环境或时间盒不足，无法形成证据 | 不得进入 v0.1；保留未知并决定是否值得补证 |

即使得到 `TECHNICAL_GO`，进入 v0.1 仍须同时完成：

- H3-H5 维护者采用验证；
- 转向后数据契约冻结；
- 安全、隐私、部署、回滚和资源预算复审；
- 最近外部里程碑与 Fund 申请证据计划；
- 一次独立的 V0 最终 `GO` 决定。

## 16. Senior full-stack PRE-SPIKE 评审

| 评审面 | 决定 | 分类 |
| --- | --- | --- |
| 用户与业务价值 | 只验证互操作、外部 assurance 和最小报告是否形成独立价值；采用意愿另行验证 | Optimize now |
| 产品范围 | 两个来源、一个规范对象、一个策略探针、两种报告 | Optimize now |
| UX | 只验证维护者能否从 gate/assurance/reason/remediation 理解结果 | Optimize now |
| 前端 | 无前端、Dashboard 或可视化 | Remove |
| 后端/工作流 | 无服务、数据库、队列和外部写入 | Remove |
| 模型边界 | 确定性代码执行；运行时模型调用为 0 | Optimize now |
| 数据合同 | 只做候选最小 profile；正式 schema 在 Spike 后冻结 | Optimize now |
| 隐私与安全 | 合成数据、只读、字段白名单、负例优先 | Optimize now |
| 测试 | I00-I15、100% 负例 fail-closed、重复运行确定性 | Optimize now |
| 运维/部署 | 不部署、不发布；受控 CI 只验证元数据边界 | Defer |
| 回滚 | 探针整体删除；保留台账和 ADR | Optimize now |
| 资源效率 | 单语言、零新依赖、先离线后一次 CI、4-6 小时时间盒 | Optimize now |
| 最近外部里程碑 | 完成技术 ADR，再结合维护者采用证据做 V0 最终 GO/NO-GO | Optimize now |
| 主要风险 | E2 仍可能需要平台级身份/证明；跨 harness 映射可能只是格式转换而非足够价值 | Risk |

资源预算和退出条件已在第 9、10、12、13 节冻结。

PRE-SPIKE 决定：**CONDITIONAL GO——合同成立，但只有在用户另行明确下达“开始 Spike”后才执行。v0.1 保持 NO-GO。**
