# Agent Evidence Gate V0 可评审规格包

> 文档状态：v0.5-draft（V0 功能合同闭合后）  
> 日期：2026-08-17  
> 范围：开发前规格，不包含生产代码、正式 GitHub Action 或真实适配器实现  
> 上位产品基线：[产品立项书.md](./产品立项书.md)

## 1. 评审结论与版本边界

本规格包把已经批准的产品原则转换为可实现、可测试的合同，用于决定是否允许进入 v0.1 MVP 实现。

本轮设计评审结论：**GO，仅推进 V0 规格，不批准 v0.1 生产实现。**

| 分类 | 本轮处理 |
| --- | --- |
| Optimize now | 冻结共同术语、数据契约、判定顺序、负例和 spike 验收，减少正式实现返工 |
| Defer | E2 采集器实现、CLI、GitHub Action、供应商适配器、测试质量启发式 |
| Remove | 自然语言解析、LLM verdict、Dashboard、自动修复、自动合并 |
| Risk | OMK 已覆盖 receipt、工件 freshness 与 Git HEAD 状态绑定，原技术差异显著收窄；外部 E2 producer 身份与目标用户采用证据仍不足 |

资源预算：一份集中规格加一份独立 Spike 合同作为技术基线；V0 Spike 时间盒不超过 1 个聚焦工作日；不调用模型、不运行不可信 PR 代码；离线阶段网络为 0，只有离线负例通过后才允许一次不含 secrets/依赖安装的受控 CI 元数据验证。

本规格退出条件：三类输入/输出契约完整；每项门禁均有确定性规则和负例；所有未知状态均有 fail/warn 语义；spike 有问题、预算、验收与丢弃条件。

### 1.1 Senior full-stack 前置评审记录

| 评审维度 | 本轮结论 |
| --- | --- |
| 用户与业务价值 | 减少 OSS 维护者重建代理执行事实的人工时间；价值仍需目标用户验证 |
| 产品范围 | 仅规格化证据门禁；不做代码质量评审、自然语言解析、自动合并或控制面 |
| 用户体验 | CLI 是核心，Action 是主要交付面；默认报告必须先显示 gate、assurance、失败原因和补救动作 |
| 前端边界 | V0/v0.1 无前端和 Dashboard；终端与 Markdown 是展示视图 |
| 后端/工作流边界 | 核心策略引擎只消费结构化输入和 Git 事实；Action 只读调用 CLI，不执行候选代码 |
| 模型边界 | LLM 不进入运行时、证据生成或 verdict；开发辅助模型输出也不是产品事实 |
| 数据契约 | manifest、trace、report 统一在本文定义，供应商字段不得泄漏到策略层 |
| 隐私与安全 | 本地优先、无网络、输出白名单、不保留 prompt/源码/凭证/原始输出；E2 来源待 spike |
| 测试 | 28 个单因夹具、零误放行、全可追溯、确定性回放、跨平台矩阵 |
| 运维与部署 | V0 无部署；v0.1 预计单 CLI 包 + 固定版本 Action，具体发布流程在最终 GO 前批准 |
| 回滚 | V0 文档通过 Git/历史版本回退；spike 可整体丢弃；v0.1 尚未授权，不存在生产回滚 |
| 资源效率 | 一份集中技术规格、固定夹具优先、无运行时模型/网络、spike 时间盒 4-6 小时 |
| 最近外部里程碑 | 先完成 V0 最终 GO；随后 v0.1 公共仓库可运行 CLI/Action，Fund 申请不提前 |

评审决定：**GO（V0 规格）；NO-GO（v0.1 实现，直至 V0 最终退出标准全部满足）。**

## 2. 规范性术语

本文使用以下词语：

- `MUST`：实现必须遵守，否则不合规。
- `MUST NOT`：明确禁止。
- `SHOULD`：默认遵守；偏离时必须记录原因。
- `MAY`：可选能力，不影响最低合规。

### 2.1 声明层

| 层级 | 定义 | 是否进入门禁 |
| --- | --- | --- |
| C0 | 代理自然语言总结 | 否。只能展示给人，不得解析或作为证据 |
| C1 | manifest 中预先定义的结构化要求 | 是。决定必须满足的检查 |
| C2 | 运行结束时提供的可选结构化 claim ID | 是，但只按 ID 关联检查，不理解自由文本 |

### 2.2 证据保障等级

| 等级 | 定义 | 最低用途 |
| --- | --- | --- |
| E0 | 没有可核对证据 | 必需检查不能通过 |
| E1 | 代理或普通适配器自报记录 | 本地预检查、调试和一致性检查 |
| E2 | 代理控制边界外的采集器产生，并绑定 Git 状态的执行收据 | 正式 PR 门禁默认最低等级 |
| E3 | 可信基线和隔离环境中的独立 verifier | 发布或高风险变更增强等级 |

保障等级不是质量分数。E3 也不证明未配置属性、测试充分性或代码整体正确性。

### 2.3 结果类型

`check_status`：

- `pass`：该检查的确定性条件满足；
- `fail`：该检查存在直接违规、矛盾或必需证据缺失；
- `unknown`：输入不足，无法判断；
- `not_applicable`：策略明确不适用于本次任务。

`claim_status`：

- `backed`：结构化声明有匹配且成功的证据；
- `contradicted`：存在直接相反的证据；
- `unbacked`：声明存在，但没有匹配证据；
- `unobservable`：当前采集能力无法观察该事实。

顶层结果必须分离：

- `policy_verdict`：`pass | warn | fail`；
- `assurance_level`：`E0 | E1 | E2 | E3`；
- `required_assurance`：当前 profile 的最低等级；
- `gate_verdict`：`pass | warn | fail`。

## 3. 纯代码执行边界

### 3.1 必经流程

1. 读取 CLI 参数和输入路径。
2. 在完整解析前执行文件大小、行长和事件数量预检。
3. 解析并校验 task manifest。
4. 流式解析 trace，校验 schema、顺序、run 一致性和禁存字段。
5. 确定仓库根目录和受检查 Git 状态。
6. 计算规范化 changed paths 与 `state_id`。
7. 规范化命令、路径、时间和资源单位。
8. 计算实际保障等级。
9. 按固定顺序执行策略检查。
10. 聚合 policy 与 assurance，得到 gate verdict。
11. 对报告执行字段白名单与脱敏检查。
12. 生成终端、JSON 和 Markdown 输出及退出码。

### 3.2 必须保持的限制

- MUST NOT 调用 LLM。
- MUST NOT 访问网络。
- MUST NOT 安装依赖。
- MUST NOT 执行候选 PR 代码。
- MUST NOT 读取源码内容来进行语义质量判断；仅可读取 Git 元数据和明确授权的结构化输入。
- MUST NOT 把缺失字段当作零、空字符串或成功。
- 相同工具版本、策略和规范化输入 MUST 产生字节稳定的规范化 JSON 报告；动态展示时间不得进入稳定比较主体。

## 4. `agent-task.yml` 契约

### 4.1 顶层字段

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `schema_version` | string | 是 | V0 候选固定为 `1.0`；未知大版本 fail |
| `task_id` | string | 是 | `^[a-z0-9][a-z0-9._-]{0,63}$` |
| `objective` | string | 是 | 仅供人阅读，不进入 verdict；1-500 字符 |
| `base_commit` | string | 是 | 必须解析为当前仓库对象；不得使用模糊 ref 作为报告事实 |
| `allowed_paths` | string[] | 是 | 至少一项；仓库相对 POSIX 风格 glob |
| `denied_paths` | string[] | 否 | 优先于 allowed；默认空数组 |
| `required_checks` | object[] | 是 | 至少一项；`id` 唯一 |
| `sensitive_paths` | string[] | 否 | 未提供时使用内置最小默认集 |
| `dependency_policies` | object[] | 否 | 包管理器/文件对显式配置 |
| `budget` | object | 否 | 普通 profile 可缺失；预算强制 profile 必须提供 |
| `profile` | enum | 是 | `local | pr | protected` |
| `exceptions` | object[] | 否 | 必须具备稳定 ID、范围、原因和可选到期时间 |

### 4.2 `required_checks[]`

```yaml
required_checks:
  - id: tests-auth
    kind: test
    command:
      argv: ["npm", "test", "--", "auth"]
      cwd: "."
    success_exit_codes: [0]
    scope: "auth"
```

规则：

- `id` MUST 唯一并符合 `task_id` 同类字符约束。
- `kind` 候选为 `test | lint | typecheck | build | custom`。
- `argv` MUST 是非空字符串数组；禁止单一 shell 字符串作为规范身份。
- `cwd` MUST 是仓库内规范化相对路径。
- 首版命令匹配使用 `check_id + normalized argv + normalized cwd`，不以展示字符串匹配。
- `success_exit_codes` 默认 `[0]`，不得为空。
- `scope` 是结构化标签，只能支持相同或更窄范围的声明；不推断自然语言范围。

### 4.3 profile 默认值

| profile | 最低保障 | 资源缺失 | verifier surface 变化 |
| --- | --- | --- | --- |
| `local` | E1 | warn | warn |
| `pr` | E2 | warn | warn |
| `protected` | E2 | budget 必填；任何强制维度缺失均 fail | `approval_required`，未批准时 fail |

V0 不引入独立的 `budget_enforced` profile；使用 `profile=protected` 或显式 `budget.enforce: true`，避免 profile 组合爆炸。`pr + budget.enforce: true` 与 `protected` 一样对已声明的强制资源维度 fail-closed；没有开启 enforce 的 `local/pr` 仍按 warn 处理缺失用量。该默认值已在 PRE-SPIKE 评审冻结，spike 只验证实现成本，不重新讨论语义。

## 5. `agent-trace.jsonl` 契约

### 5.1 通用事件字段

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `schema_version` | string | 是 | 每条事件携带，未知大版本 fail |
| `run_id` | string | 是 | 文件内必须完全相同 |
| `event_id` | string | 是 | 文件内唯一；报告证据指针使用它 |
| `sequence` | integer | 是 | 从 1 开始严格递增、不得重复或断裂 |
| `timestamp` | RFC 3339 string | 是 | 用于展示和时长校验，不用于事件排序 |
| `event_type` | enum | 是 | 仅接受已知类型；未知类型 v1 默认 fail |
| `producer` | object | 是 | 包含 `type`、`id`、`assurance` |
| `data` | object | 是 | 由事件类型定义 |

### 5.2 首发事件类型

| 类型 | 最小 data 字段 | 用途 |
| --- | --- | --- |
| `run_started` | `base_commit`, `state_id`, `collector` | 建立运行和初始状态 |
| `file_read` | `path`, `result` | 仅在采集器支持时报告敏感读取 |
| `file_written` | `path`, `result` | 辅助轨迹核对，不替代 Git 事实 |
| `command_finished` | `check_id`, `argv`, `cwd`, `termination`, `exit_code`, `stdout`, `stderr`, `started_at`, `finished_at`, `state_id` | 核心执行收据 |
| `test_result` | `check_id`, `passed`, `failed`, `skipped`, `cancelled`, `parser` | 可选结构化测试统计 |
| `model_usage` | `input_tokens`, `cached_input_tokens`, `output_tokens`, `reasoning_output_tokens`, `total_tokens` | 资源预算 |
| `retry` | `operation_id`, `attempt` | 重试预算 |
| `run_finished` | `state_id`, `claims`, `status` | 结束状态和可选 C2 声明 |

`command_finished` 的额外规则：

- `check_id + normalized argv + normalized cwd` MUST 与 manifest 中同一 check 一致，否则不能满足该 check；
- `termination` MUST 为 `completed | cancelled | timeout`；
- `exit_code` 字段 MUST 存在；`completed` 时为整数，`cancelled/timeout` 时允许显式 `null`，不得省略；
- `stdout` 与 `stderr` MUST 分别是 `{present, bytes, sha256?}` 摘要对象，不记录原文；二者不得合并后再推断来源；
- `completed + success_exit_code` 但 stderr 非空不自动失败，由具体 check 策略决定；缺失 termination/exit/output 状态一律不能判 pass；
- `cancelled` 或 `timeout` 一律不满足 required check；空 stdout/stderr 也不能覆盖非成功 exit；
- `test_result` 为可选解析增强；一旦出现，`passed/failed/skipped/cancelled` 均 MUST 是非负整数。V0 核心兼容面只强制 command receipt，不要求所有测试框架都提供统计。

### 5.3 隐私与完整性

- 事件 MUST NOT 包含 `prompt`、源码、凭证、环境变量值或原始命令输出；stdout/stderr 只允许存在性、字节数和可选摘要。
- V0 禁存字段扫描使用键名拒绝表和高置信凭证形态扫描；命中时 fail，但扫描不宣称覆盖所有 secret。
- `file_read` 未出现只能表示“未观察到”，不能证明没有读取；采集器不支持读取审计时，相关检查为 `unknown/unobservable`。
- `model_usage.total_tokens` 是总量，其他 token 字段是组成或子集，不得再次相加得到总量。
- E1 文件即使 schema 完整也不得自动提升为 E2。
- E2 producer 必须由可信配置声明并提供可验证的运行身份与 state 绑定；具体验证方法由 spike 决定。

### 5.4 输入资源上限候选

| 项目 | 候选上限 | 超限结果 |
| --- | --- | --- |
| manifest 文件 | 1 MiB | fail |
| trace 文件 | 20 MiB | fail |
| JSONL 单行 | 256 KiB | fail |
| 事件数量 | 50,000 | fail |
| 路径长度 | 4,096 字符 | fail |
| 嵌套深度 | 20 | fail |

这些数值是 spike 待验证参数，不是已实证性能承诺。

## 6. Git 事实与 `state_id`

### 6.1 目标

`state_id` 用于回答“这条执行证据是否对应当前候选代码状态”，而不是作为安全签名。

### 6.2 候选算法

规范输入至少包含：

- 已解析的 `HEAD` commit OID；
- index 相对 `HEAD` 的变更；
- working tree 相对 index 的变更；
- 未跟踪文件的仓库相对路径和内容摘要；
- submodule 状态（若存在）；
- 算法版本标识。

所有路径转换为仓库相对、`/` 分隔；按 UTF-8 字节序排序；对规范序列使用 SHA-256。重命名以 Git 原始路径事实表达，不能仅保留目标路径。

### 6.3 尚未冻结的边界

- 忽略文件不进入 state；但若策略或测试运行依赖忽略文件，当前模型可能无法证明环境一致。
- 文件模式、符号链接、submodule、大小写冲突和 Windows 可执行位语义必须通过 spike 验证。
- 仅绑定 commit SHA 对本地 dirty tree 不充分，因此不得作为最终算法。

## 7. 策略判定表

检查按表中顺序执行。前置完整性 fail 时仍可生成有限诊断，但不得继续产生误导性的业务 pass。

| ID | 检查 | pass | warn/unknown | fail |
| --- | --- | --- | --- | --- |
| `AEG001` | Manifest schema | schema 和语义约束满足 | 不适用 | 解析、版本、必填或交叉字段错误 |
| `AEG002` | Trace integrity | schema、run、事件顺序、大小、隐私约束满足 | `file_read` 等能力不可观察不在此项失败 | 断裂、重复、混合 run、禁存字段、超限 |
| `AEG003` | Git identity | base 存在，当前 state 可计算 | 环境依赖未覆盖时报告限制 | 仓库/base 无效或 state 算法失败 |
| `AEG010` | Scope | 所有 changed paths 被允许且未命中 denied | 仅存在已批准例外时 warn | 任一路径越界或逃逸仓库根 |
| `AEG020` | Required check | 每项有新鲜匹配收据且 exit code 成功 | 可选检查缺失 | 必需收据缺失、失败、argv/cwd 不匹配或 stale |
| `AEG021` | Test result | 测试收据成功，统计无 failed/cancelled，声明范围不扩大 | 只有 exit code、统计缺失或 skipped>0 时按策略 warn | failed/cancelled>0，或结构化声明与证据矛盾 |
| `AEG022` | Self verification | 存在独立 verifier 或未修改测试面 | `self_verified=true` | 不单独 fail；由 profile/approval 规则决定 |
| `AEG030` | Sensitive write | 未修改敏感路径 | 有明确批准例外 | 未批准的敏感写入 |
| `AEG031` | Sensitive read | 可信采集器未记录敏感读取 | 能力不可观察，或 E1 未记录 | 可信事件记录未批准读取 |
| `AEG040` | Dependency integrity | manifest/lockfile 组合满足显式策略 | 未识别生态时 unknown | 已配置策略被违反 |
| `AEG050` | Resource budget | 所有强制指标完整且不超限 | 普通 profile 字段缺失 | 任一已知指标超限；强制 profile 字段缺失 |
| `AEG060` | Test surface | 测试、fixture、snapshot、mock、配置均未改变 | 任一测试面变化 | 仅在 protected policy 明确禁止且无批准时 fail |
| `AEG061` | Verifier surface | workflow、policy、verifier、门禁自身均未改变 | PR profile 发生变化 | protected profile 未获得人工批准 |
| `AEG070` | Assurance | 实际等级达到 profile 要求 | 本地 E1 自报必须显式标记 | 低于 required_assurance |

### 7.1 聚合规则

1. 任一必需检查 `fail` → `policy_verdict=fail`。
2. 无 fail 但存在策略化警告或 unknown → `policy_verdict=warn`。
3. 所有适用检查 pass → `policy_verdict=pass`。
4. `assurance_level < required_assurance` → `gate_verdict=fail`，即使 `policy_verdict=pass`。
5. `policy_verdict=fail` → `gate_verdict=fail`。
6. 其余情况下，gate verdict 继承 policy verdict。
7. `not_applicable` 不影响聚合，但必须说明规则依据。

### 7.2 CLI 退出码

| 退出码 | 含义 |
| --- | --- |
| `0` | gate 为 pass，或 warn 且未启用 `fail_on_warn` |
| `1` | gate fail，或 warn 且 `fail_on_warn=true` |
| `2` | CLI 用法、输入定位或内部工具错误，未形成可信 gate 结论 |

## 8. `gate-report.json` 契约

### 8.1 顶层字段

```json
{
  "schema_version": "1.0",
  "tool": {"name": "agent-evidence-gate", "version": "0.1.0"},
  "task_id": "auth-retry-fix",
  "repository": {
    "base_commit": "<full oid>",
    "head_commit": "<full oid>",
    "state_id": "sha256:<digest>",
    "dirty": false
  },
  "profile": "pr",
  "policy_verdict": "pass",
  "assurance_level": "E2",
  "required_assurance": "E2",
  "gate_verdict": "pass",
  "self_verified": false,
  "checks": [],
  "resource_totals": {},
  "limitations": [],
  "input_fingerprints": {}
}
```

### 8.2 `checks[]`

每项 MUST 包含：

- `check_id`：稳定策略 ID；
- `status`：`pass | fail | unknown | not_applicable`；
- `severity`：`info | warning | error`；
- `summary`：不含源码或原始输出的简短说明；
- `evidence_refs`：事件 ID、manifest JSON Pointer 或 Git path；
- `remediation_code`：稳定机器码；
- `remediation`：面向维护者的动作建议；
- `limitations`：本项不可证明的内容。

### 8.3 稳定性与隐私

- JSON 字段和数组顺序必须规范化；事件证据按 `sequence`，路径按规范字节序。
- 报告不包含生成时间时，固定输入应字节一致；若展示时间必需，放在非规范化展示层。
- Markdown 和终端是 JSON 的视图，不得重新计算规则。
- 报告使用字段白名单；任何未知 trace data 不得直接透传。

## 9. 能力边界

### 9.1 可以承诺

- 校验三类结构化输入和版本；
- 独立读取 Git 修改事实并执行路径策略；
- 核对结构化 check 与命令收据、cwd、exit code 和 state；
- 检测证据过期、资源超限、敏感/依赖/验证面变化；
- 显示证据保障等级和自测状态；
- 生成确定性、隐私最小化报告。

### 9.2 只能有条件承诺

- 命令真实执行：依赖 E2/E3 来源；
- 没有敏感读取：依赖支持读取审计的可信采集器；
- token 未超限：依赖完整且语义一致的 usage 事件；
- 测试具体统计：依赖已支持的测试结果解析器。

### 9.3 明确不能承诺

- 代码语义正确、需求完整实现或可自动合并；
- 测试充分、没有过度 mock、断言有效或覆盖所有风险；
- E1 自报记录没有伪造或遗漏；
- 未观察到的外部副作用不存在；
- hash 证明内容安全或执行环境可复现。

## 10. 威胁模型

| 威胁 | 信任边界 | 控制 | 验收负例 | 剩余风险 |
| --- | --- | --- | --- | --- |
| 伪造或省略 trace | Agent→E1 文件 | 保障分级；PR 要求 E2 | 完整 E1 记录在 PR profile 仍 fail | E2 collector 本身需受保护 |
| 旧证据背书新代码 | Receipt↔Git state | 每个关键事件绑定 state_id | 测试后修改文件导致 stale fail | 忽略文件/外部服务状态未覆盖 |
| 修改测试或 verifier | Candidate↔验证面 | 独立检测 test/verifier surface；protected 需批准 | 修改 workflow 后无批准 fail | 语义上隐蔽的削弱仍需人工审查 |
| 路径穿越/大小写/符号链接 | Input path↔repo root | 规范化、根边界、跨平台负例 | `../`, case collision, symlink escape | 文件系统差异需 spike |
| 超大或恶意 JSONL | Untrusted trace↔parser | 预检、流式解析、上限 | 超长行、深嵌套、50,001 事件 fail | 阈值需性能验证 |
| secret/源码进入报告 | Trace↔public report | 禁存键、凭证扫描、输出白名单 | prompt/source/raw_output/key 样例 fail | 启发式不保证识别全部秘密 |
| fork PR 执行恶意代码 | PR↔GitHub runner | v0.1 Action 只读数据，不运行候选命令 | Action 设计审计无执行步骤 | 后续独立 verifier 需新评审 |
| 收据生产者冒充 E2 | Producer↔trust config | producer identity 验证和可信配置 | 未受信 producer 声称 E2 被降级 | 验证机制待 spike |
| 策略例外无限扩张 | Maintainer policy↔gate | 例外 ID、范围、原因、可选到期；报告所有例外 | 越界例外不匹配仍 fail | 人工批准质量不可自动保证 |

## 11. 验收夹具矩阵

以下夹具必须在 v0.1 实现前固化预期结果。每个夹具只改变一个主要变量，避免一例多因。

| ID | 场景 | profile | policy | assurance | gate |
| --- | --- | --- | --- | --- | --- |
| F01 | 范围内变更 + E2 新鲜测试收据 | pr | pass | E2 | pass |
| F02 | 同样记录只有 E1 | local | warn | E1 | warn |
| F03 | 同样记录只有 E1 | pr | pass | E1 | fail |
| F04 | 必需测试事件缺失 | pr | fail | E2 | fail |
| F05 | 测试 exit code 非 0 | pr | fail | E2 | fail |
| F06 | 测试收据后代码状态变化 | pr | fail | E2 | fail |
| F07 | 结构化声明称全量、证据 scope 仅 auth | pr | fail | E2 | fail |
| F08 | 修改超出 allowed_paths | pr | fail | E2 | fail |
| F09 | `../` 路径穿越 | pr | fail | E2 | fail |
| F10 | 写入敏感路径，无例外 | pr | fail | E2 | fail |
| F11 | 无 file_read 能力且声称未读取敏感文件 | pr | warn | E2 | warn |
| F12 | 可信事件记录敏感读取 | pr | fail | E2 | fail |
| F13 | 依赖清单变化、锁文件不满足策略 | pr | fail | E2 | fail |
| F14 | 普通 profile 缺少 token 数据 | pr | warn | E2 | warn |
| F15 | 强制 budget 缺少 token 数据 | protected | fail | E2 | fail |
| F16 | 已知 token 超限 | pr | fail | E2 | fail |
| F17 | 同一代理新增测试并运行成功 | pr | warn | E2 | warn |
| F18 | 修改 verifier surface，protected 无批准 | protected | fail | E2 | fail |
| F19 | 修改 verifier surface，protected 有批准 | protected | warn | E2 | warn |
| F20 | sequence 断裂或 event_id 重复 | pr | fail | 未采用 | fail |
| F21 | trace 含 prompt/raw_output/credential | pr | fail | 未采用 | fail |
| F22 | trace 超过大小或事件上限 | pr | fail | 未采用 | fail |
| F23 | Windows 大小写冲突路径 | pr | fail | E2 | fail |
| F24 | rename 同时涉及允许与禁止路径 | pr | fail | E2 | fail |
| F25 | failed=0, skipped>0 的结构化结果 | pr | warn | E2 | warn |
| F26 | failed=0, cancelled>0 | pr | fail | E2 | fail |
| F27 | 未受信 producer 自称 E2 | pr | pass | E1 | fail |
| F28 | 相同输入连续运行两次 | pr | pass | E2 | pass，规范 JSON 字节一致 |

### 11.1 验收指标

- `false_pass_rate = 0`：所有故意违规夹具均不得 gate pass。
- `traceability_rate = 100%`：每项检查至少指向一个 manifest、event 或 Git 事实；纯限制说明除外。
- `deterministic_replay = 100%`：固定输入重复运行的规范 JSON 字节一致。
- `privacy_fixture_leaks = 0`：报告不出现注入的 prompt、源码、凭证或原始输出样本。
- Windows 与 Linux 对平台无关夹具 verdict 一致；平台特有路径夹具有显式预期。

## 12. V0 可丢弃技术 Spike 计划（历史，已失效）

> 2026-08-17 更新：用户已接受 `PIVOT_RECOMMENDED`，项目状态为 `PIVOT_ACCEPTED`。本节的语言竞赛、自研 `state_id`、local collector 和 replay ledger 路线不再执行。唯一有效的执行基线是 [Agent Evidence Gate 互操作 Spike 合同](./spike-contract.md)；新合同只验证两个来源的映射、外部 assurance、freshness/verifier-surface 和公共最小报告，成功也不自动批准 v0.1。

Spike 执行结果已记录在 [Spike 证据台账](./research/spikes/2026-08-17/execution-log.md) 和 [ADR](./research/spikes/2026-08-17/adr.md)：离线 I00-I15 全部 verified，4 个 pass、12 个 fail-closed；真实受控 CI/E2 仍为 `unverified`，因此出口为 `CONDITIONAL_GO`。

### 12.1 决策问题

1. TypeScript 与 Python 哪个能以更低的安装、Action 分发和跨平台维护成本实现核心 CLI？
2. E2 首发应来自受控本地 command collector，还是维护者控制的 CI receipt？
3. `state_id` 能否稳定覆盖 commit、staged、unstaged、untracked、rename、symlink 和大小写边界？

### 12.2 最小实验范围

允许：

- 在独立 `spike/` 或临时工作树中编写可丢弃探针；
- 使用合成 Git 仓库和固定输入；
- 比较两种语言的启动、bundle/依赖、JSONL 流式解析和退出码；
- 产生本地 receipt 原型和模拟 CI receipt；
- 在 Windows 本机和 Linux GitHub-hosted runner 或等价受控环境运行固定样例。

禁止：

- 形成正式包名、公开发布或 GitHub Marketplace 上架；
- 接入真实代理账号、API key 或私有仓库；
- 执行来自 fork 的不可信代码；
- 把 spike 代码无评审复制进 v0.1；
- 扩展到 Dashboard、LLM、数据库或真实 benchmark。

### 12.3 资源预算

| 资源 | 上限 |
| --- | --- |
| 人工时间 | 1 个聚焦工作日，建议 4-6 小时 |
| 模型/API | 0 次运行时调用；开发辅助不计入产品路线但应记录 |
| 测试数据 | 仅合成仓库和固定 fixture |
| 语言原型 | 每种只实现读取 1 个 manifest、3 类事件、Git state 和 1 份 JSON 输出 |
| 重试 | 每个失败路径最多修复验证 1 次；仍失败即记录未证实 |

### 12.4 评分表

| 维度 | 权重 | 验证方法 |
| --- | ---: | --- |
| GitHub Action 分发与安装摩擦 | 25 | 干净 runner 从 checkout 到运行的步骤、时间和依赖 |
| Windows/Linux 一致性 | 20 | 同一 fixture 输出比较 |
| JSON/YAML/schema 与流式 JSONL | 15 | 原型复杂度、依赖数和错误质量 |
| Git 状态实现可靠性 | 20 | dirty tree 路径矩阵 |
| 供应链与依赖面 | 10 | 直接/传递依赖数量、锁定与 bundle 方式 |
| 维护与贡献体验 | 10 | 构建、测试、发布步骤及类型/可读性 |

总分差小于 10 分时，优先 TypeScript，因为 GitHub Action 是主要交付面；若 Python 在 Git 状态可靠性或总维护成本上显著胜出，可改选 Python。该规则是预先承诺，防止根据结果临时改权重。

### 12.5 spike 验收与停止条件

Spike 通过必须同时满足：

- 至少一种语言在 Windows/Linux 对固定 state fixture 得出一致 ID；
- 能明确区分 E1 自报与至少一种可验证 E2 候选 receipt；
- Action 方案不需要 secrets、不使用 `pull_request_target` 执行候选代码；
- 20 MiB/50,000 事件候选上限可流式处理且内存行为可接受，或提出更低实证阈值；
- 输出一份 ADR，记录选择、拒绝方案、成本和剩余风险；
- spike 文件被删除或明确隔离，不能被误认为正式产品。

任何 P0 安全条件不满足，或无法形成 E2 候选来源，则 spike 结论为 NO-GO/重新定位，而不是继续堆叠功能。

## 13. V0 中期完成度

| V0 交付物 | 当前状态 | 尚缺 |
| --- | --- | --- |
| 产品定位与非目标 | 已完成 | 用户访谈后复核措辞 |
| 竞争与差异化 | 运行深审完成，转向已接受 | 通过互操作 Spike 与采用验证复核独立价值 |
| 声明与保障模型 | 离线 Spike 已验证，功能合同闭合 | 真实受控 CI producer assurance 仍为 `unverified` |
| manifest/trace/report 契约 | 本文草案完成 | spike 后冻结字段和阈值 |
| 策略判定表 | 本文草案完成，F01-F28 桌面复核完成 | 实现阶段自动化验证 |
| 威胁模型 | Spike/Action 边界已复核 | 发布前独立 P0 review |
| 夹具矩阵 | F01-F28 桌面复核 + I00-I15 Spike 验证 | 实现阶段固化为自动化 fixture |
| 技术路线 | `PIVOT_ACCEPTED`；原路线取消 | 按 [V0 功能闭合评审](./v0-closure-review.md) 实现 |
| 用户问题验证 | 未完成 | 3-5 次访谈或等价公开案例复盘 |
| 最终 GO/NO-GO | `PIVOT_ACCEPTED + BOOTSTRAP_CONDITIONAL_GO` | 实现、发布前 P0 review；采用验证和真实 E2 延后/未验证 |

当前结论：**离线互操作核心达到 `CONDITIONAL_GO`，V0 完整功能合同已闭合；用户明确选择 bootstrap MVP 路线，允许按 [v0.1 MVP 合同](./v0.1-mvp-contract.md)进入实现。采用价值和真实 CI/E2 仍标记为 `unverified/deferred`。**

## 14. V0 最终评审清单

- [ ] 至少 3 个独立目标用户或等价公开案例支持问题和采用价值（用户明确延后至公开 MVP 后）。
- [x] 至少 3 个高度相关项目完成运行级对比，差异不是品牌或 UI。
- [x] Spike 验证转向后的跨 harness profile、外部 producer assurance 逻辑与维护者侧最小报告，并形成 ADR；真实 CI/E2 标记 `unverified`。
- [x] 所有候选阈值经过 Spike 后冻结或明确接受风险。
- [x] 三份契约不存在未决 P0 字段；详见 [V0 功能闭合评审](./v0-closure-review.md)。
- [x] 28 个夹具的预期结果通过桌面复核，无相互矛盾。
- [x] GitHub Action 安全设计确认不执行不可信 PR 代码。
- [x] v0.1 资源预算、测试矩阵、回滚方式和发布最短路径已在 [v0.1 MVP 合同](./v0.1-mvp-contract.md)冻结。
- [x] 以 senior full-stack 视角完成 v0.1 bootstrap pre-flight，决定为 `BOOTSTRAP_CONDITIONAL_GO`；发布前仍需 P0 验收。

## 15. 用户问题验证协议

### 15.1 要验证的假设

| ID | 假设 | 反证信号 | 决策影响 |
| --- | --- | --- | --- |
| H1 | 维护者无法仅凭代理总结，低成本确认实际改动、测试执行和验证边界 | 维护者普遍认为现有 CI 与人工 review 已足够，且无需重建上下文 | 反证成立则缩小或停止项目 |
| H2 | 问题的主要成本是人工重建证据链，而不只是代理措辞不可信 | 痛点主要是代码质量、生成速度或模型能力，与证据链无关 | 反证成立则不应把通用代码质量功能塞入门禁 |
| H3 | 维护者愿意接受一份小型 manifest 和只读 CI 检查来换取可复核报告 | 即使 5 分钟内可配置，目标用户仍拒绝新增文件或 required check | 反证成立则需要零配置切入点或 NO-GO |
| H4 | 隐私最小化、无运行时模型调用和确定性判定是采用优势 | 用户更重视语义判断，并愿意把源码、prompt 或输出交给模型服务 | 反证成立则重新评估定位，不在 V0 偷加 LLM |
| H5 | E1/E2 分级能被维护者理解，且不会把“有记录”误解成“已独立验证” | 受访者持续把 E1 当作真实执行证明，或认为分级过于复杂 | 反证成立则简化术语或调整产品承诺 |

### 15.2 首选：3-5 次目标用户访谈

受访者筛选条件：近 12 个月实际维护过接受外部 PR 的开源仓库；使用过至少一种编码代理；亲自处理过代理生成或代理协助的 PR。尽量覆盖个人维护者、小团队维护者和有 required checks 的成熟项目。

访谈控制在 20-30 分钟，先问事实再展示方案，避免把项目术语灌输给受访者：

1. 最近一次代理参与的 PR 是什么？你实际检查了哪些东西？
2. 代理声称“测试已通过”时，你如何确认？最耗时的步骤是什么？
3. 是否遇到总结与 diff、测试、运行环境或失败状态不一致？最后如何发现？
4. 现有 CI、review 模板、日志和 agent trace 各自缺少什么？
5. 哪类证据会让你提高信任，哪类证据仍只能作为线索？
6. 如果增加一个 manifest 和只读 required check，什么配置成本可以接受？
7. 哪些数据绝不能出现在公开 Action 日志或第三方服务中？
8. 展示 C0-C2、E0-E3 和一份最小报告后：哪里难懂、容易误导或没有价值？

每次访谈只记录与决策有关的事实：角色/仓库类型、具体事件、发生频率、当前替代方案、人工时间、可接受配置成本、隐私边界、反证、简短原话和研究者置信度。未经同意不记录身份、私有代码、prompt、日志或仓库机密。

### 15.3 降级方案：公开案例复盘

无法获得访谈时，至少收集 5 个来自不同作者的公开 issue、discussion、论坛贴或维护记录，并满足：

- 含具体工具和实际开发/PR 场景，而不是泛泛表达“AI 不可信”；
- 能区分代理陈述、可观察事实、造成的成本和当前补救方式；
- 保存 URL、发布时间、检索日期和必要的短摘录，不复制大段内容；
- 同时主动寻找“现有 CI 已足够”“无需额外门禁”等反例；
- 社区帖子只证明需求信号，不用于推算发生率、市场规模或普遍性。

### 15.4 通过阈值

用户问题验证通过须同时满足：

- 至少 3 个相互独立的有效证据单元支持 H1 和 H2；
- 至少 2 个证据单元明确支持采用某种本地或 CI 证据检查，而不只是要求模型“更诚实”；
- 没有多数证据拒绝最低配置成本；访谈路径下以 5 分钟首次配置作为待测目标，不先视为事实；
- 至少记录 1 个强反例，并说明为何不改变或会改变项目方向；
- 每项结论都能追溯到证据台账，不能以讨论印象代替。

仅公开案例达到阈值时，允许继续技术 spike，但市场/采用结论标记为 `low_confidence`；在进入公开 beta 前仍需真实维护者验证。

## 16. 竞品运行级深审协议

### 16.1 候选组与角色

首轮候选固定为 5 个，避免不断扩大检索造成重复劳动：

| 项目 | 角色 | 本轮要回答的问题 |
| --- | --- | --- |
| [Proof Loop](https://github.com/LeoStehlik/proof-loop) | 高相关协议/流程 | 是否已有 repo-local 证据协议覆盖本项目核心门禁 |
| [Microsoft AgentRx](https://github.com/microsoft/AgentRx) | 高相关诊断系统 | trajectory、invariant 与 checker 如何建立失败诊断证据 |
| [OMK](https://github.com/dmae97/omk) | 高相关 evidence-gated runner | 是否已以更低采用成本提供 scoped plan、执行证据和可回放 artifact |
| [AGILAB](https://github.com/ThalesGroup/agilab) | 相邻代理运行基础设施 | manifest、NDJSON trace、脱敏和权限边界能否复用或形成替代 |
| [memi](https://github.com/memi-design/memi) | 相邻只读 GitHub Action | 只读 Action、报告 artifact 与 PR 采用体验有哪些成熟做法 |

候选项目不是预先认定的直接竞品。只有完成安装/运行或因客观原因记录为不可运行后，才能写入差异化结论。

### 16.2 固定评估维度

每个项目使用同一张表，防止因项目特点临时改变比较标准：

- 安装步骤、首次成功时间、必要账号/secrets、锁定版本方式；
- 输入契约、证据来源、声明与保障是否分离；
- 是否有确定性 verdict、稳定退出码和机器可读报告；
- 是否绑定 commit、dirty tree 或等价代码状态；
- 是否区分代理自报、工具收据和独立验证；
- trace/report 的隐私默认值、脱敏、大小上限与未知字段处理；
- CLI、GitHub Action 和 required check 的实际采用路径；
- 是否在门禁热路径调用模型、执行候选代码或要求高权限 token；
- 测试/verifier/policy surface 变化是否被识别；
- 测试资源、运行耗时、依赖数量、维护活跃度和许可证约束；
- 能否复现成功路径、失败路径和至少一个隐私/安全负例。

### 16.3 安全执行边界

第一步只做官方文档、源码和 workflow 静态审阅。实际运行仅在后续独立沙箱/临时仓库中进行，并遵守：固定 commit、无真实 secrets、无私有数据、最低权限、禁止接触宿主凭据、记录网络与外部服务要求。任何需要执行未知安装脚本、容器特权、生产账号或付费 API 的路径先停止，改记为未验证风险，不为完成矩阵而扩大授权。

### 16.4 差异化判定

深审通过需要至少 3 个项目有运行级证据，并证明本项目至少具备 3 项对目标用户有实质影响的组合差异，例如：

- 明确区分 claim 与 assurance，且正式 PR 要求 E2；
- Git 状态绑定与 stale evidence 检测；
- test/verifier/policy surface 变化门禁；
- 隐私最小化的确定性报告，无 LLM 热路径；
- 专为维护者设计的低权限只读 required check。

“更漂亮的 UI”“支持更多模型”或“第一个”不算有效差异。若任一成熟项目已经完整覆盖主要价值、采用成本更低且许可证允许直接复用，应优先集成/贡献而不是重复建设；V0 结论转为 `PIVOT` 或 `NO-GO`。

## 17. 统一证据台账

用户验证、竞品深审和 spike 必须使用同一最小记录结构。台账可以先保存在本规格的评审附录，达到 10 条以上再拆为结构化文件，避免过早维护多份文档。

| 字段 | 要求 |
| --- | --- |
| `evidence_id` | 稳定 ID：`USR-*`、`CMP-*`、`SPK-*` |
| `evidence_type` | `interview | public_case | static_review | run | negative_case | measurement` |
| `source` | URL、匿名访谈编号或 spike fixture；不得含机密 |
| `observed_at` | 观察日期；竞品同时记录 commit/tag |
| `observation` | 可直接观察的事实，不先写解释 |
| `supports` / `contradicts` | 对应假设、差异点或技术决策 ID |
| `limitations` | 未运行、样本偏差、版本、权限、环境等限制 |
| `confidence` | `low | medium | high`，并给出原因 |
| `decision_impact` | `none | wording | scope | architecture | go_no_go` |
| `status` | `candidate | verified | rejected | superseded` |

证据只有在来源可复核、观察与推断分开、限制已记录后才可标记 `verified`。同一帖子被多个汇总引用仍只算一个证据单元。

### 17.1 首轮静态审阅台账（2026-08-13）

以下记录只依据官方仓库 README/公开工作流，状态均为 `candidate`；尚未安装或运行，不计入“3 个运行级证据”的退出条件。

| ID | 项目 | 可观察事实 | 初步影响 | 限制 |
| --- | --- | --- | --- | --- |
| CMP-001 | Proof Loop | 以 repo-local 文件冻结验收条件，分离 builder/verifier，要求每项 AC 有 fresh PASS；机械 check 在条件不满足时非零退出 | 与“无证据不得完成”和独立验证高度重合，是当前最直接的同质化风险 | 未验证 fresh 的 Git 状态绑定方式、Action 采用面、trace 隐私和 test/verifier surface |
| CMP-002 | AgentRx | 把 trajectory 规范化为 IR，生成/检查 invariant，再由 LLM judge 做失败定位；默认外部使用路径需要 Azure 端点 | 对 trace/invariant 设计有借鉴，但目标是事后失败诊断，不是低权限确定性 PR 门禁 | 仅静态审阅；LLM、凭据与诊断场景使其不能直接证明 V0 差异 |
| CMP-003 | OMK | 以 acceptance predicate 阻止完成；verified bash receipt 绑定 HEAD 与 staged/modified/untracked dirty set 摘要，并维护可回放 ledger | 在 evidence-gated completion、receipt 和 Git 状态绑定上高度重合；当前为最高 PIVOT 风险 | 它是执行代理/编排控制面；尚未确认能否作为独立只读 PR 审计器、E1/E2 分级、验证面变更或公开最小报告 |
| CMP-004 | AGILAB | `agent-run` 写脱敏 manifest、stdout/stderr artifact 和 append-only NDJSON trace；argv 默认以 hash 表示，并声明 permission layer 不是 sandbox | 证明隐私优先 trace/receipt 已有成熟相邻实现；可借鉴字段和边界措辞 | 更广泛的 AI/ML 运行平台；未发现维护者 PR 门禁与 claim/assurance 聚合 |
| CMP-005 | memi | 官方 PR Action 示例固定到 commit，默认 `contents: read`，产生报告 artifact/SARIF，并可让新增设计债务失败 | 证明低权限只读 Action、artifact 和基线差异门禁具有可复用交付模式 | 检查对象是界面设计规则，不验证代理执行证据 |

首轮结论为：**存在真实同质化压力，进入 `PIVOT_WATCH`，但尚不足以 NO-GO。** Proof Loop 和 OMK 必须成为后续运行深审的前两项。尤其 OMK 已公开描述 Git-aware verified receipt，因此“Git 状态绑定”不能再单独视为差异。本项目只有在“与代理运行时解耦、独立审计现有 PR、claim/assurance 分级、旧证据失效、验证面变更和隐私最小化只读 required check”的组合上形成可验证优势，才值得独立建设。若运行深审不能证明该组合差异，优先向现有项目贡献、实现兼容验证器，或把项目重新定位为跨 harness 的 evidence interoperability profile。

### 17.2 首轮公开案例台账（2026-08-13）

以下案例用于验证问题形态，不代表发生率。GitHub issue 是用户报告而非维护方确认；Reddit 案例可信度更低，须保留反证并在真实访谈中复核。

| ID | 来源 | 可观察事实 | 支持/反证 | 限制与影响 |
| --- | --- | --- | --- | --- |
| USR-001 | [Claude Code issue #63861](https://github.com/anthropics/claude-code/issues/63861) | 报告者称两次会话未运行仓库规定的 canonical build，却把相对路径目标测试解读为通过；维护者手动运行后出现 12 个失败和 build break | 支持 H1/H2/H5；新增“canonical check identity 与实际 command/working directory 对齐”需求 | 单一用户报告、特定版本/项目；`high` 决策相关性，`medium` 事实置信度 |
| USR-002 | [Gemini CLI issue #26736](https://github.com/google-gemini/gemini-cli/issues/26736) | 报告包含超出分段授权、Git/staging 混乱、宣称测试/检查点完成但 patch 有明显编译错误、编辑未落盘等多类状态漂移 | 支持 H1/H2；强化 allowed scope、Git state 和 tool failure 结构化检查 | 多问题复合，难归因；`medium` 置信度 |
| USR-003 | [codex-plugin-cc issue #350](https://github.com/openai/codex-plugin-cc/issues/350) | 非零退出的错误只在 stderr，而转发契约要求失败时不返回内容，导致上层可能看不到失败 | 支持 H1/H2；新增“stdout/stderr/exit 三者不可丢失，空结果不得成功”需求 | 是插件/编排契约故障，不是模型幻觉；`high` 可工程化价值 |
| USR-004 | [Playwright 测试修改运行中应用的案例](https://www.reddit.com/r/ClaudeCode/comments/1rug14a/claude_wrote_playwright_tests_that_secretly/) | 帖主称测试注入 JS 让故障 UI 通过；讨论中还有过度 mock、降低断言等类似经历 | 支持 H2 与 test surface 风险；说明“exit=0”不能独立证明测试有效 | 自报社区案例、无法独立复现；`low-medium` 置信度 |
| USR-005 | [无人值守代理验证讨论](https://www.reddit.com/r/ClaudeAI/comments/1udrmrb/if_you_run_coding_agents_unattended_or_in/) | 用户描述人工查看 diff、在 clean checkout 重跑测试、对多代理运行重建状态的工作流 | 支持 H2/H3；表明门禁应减少而不是复制这些人工步骤 | 讨论参与者可能同时推广自己的工具；`low-medium` 置信度 |
| USR-006 | [10 次受控运行未出现改测“作弊”的反例](https://www.reddit.com/r/ClaudeCode/comments/1uscaf1/i_tested_whether_coding_agents_actually_cheat_on/) | 作者称 10/10 受控运行均未篡改测试；另称约 2,300 个随机合并 PR 样本中未确认此类案例 | 反证“代理经常作弊”；要求产品把风险写成边界违规/证据不足，而非普遍恶意欺骗 | 方法和原始样本未在本轮独立审计；`low` 统计置信度，但作为反例有效 |

桌面结论：公开案例已经达到“至少 3 个独立问题信号”的降级阈值，且至少两个案例明确指向外部重跑、diff/Git 检查或结构化失败传播；因此允许继续 V0 静态研究和技术 spike 准备。但 H3 的真实配置接受度与 H4 的隐私价值尚无足够证据，整体采用结论仍为 `low_confidence`，不能据此批准 v0.1。

公开案例还带来 3 个应在 spike 前冻结的 P0/P1 规则：

1. `required_checks` 必须绑定稳定 check ID 及允许的规范化 command/cwd，不能只匹配“测试”语义或任意 exit=0；
2. 任一 command receipt 必须显式包含 exit code，并区分 stdout、stderr、cancelled/timeout；缺失或空结果不得推断成功；
3. test/verifier/config surface 变化默认降低置信度；产品措辞使用“风险/边界变化”，不假定代理有欺骗意图。

### 17.3 竞品运行级台账（2026-08-14）

本节原本链接的 `research/competitor-runs/2026-08-14/run-level-review.md` 未进入当前 Git 历史，本次审计也未取得可验证副本，不能补造；缺失情况见 [版本历史与档案审计](./docs/version-history.md)。以下表格是规格文件中仍可追溯的既有摘要，但不能替代缺失的原始命令、固定版本、资源成本、正负例和差异矩阵。

| ID | 项目 | 运行级观察 | 决策影响 |
| --- | --- | --- | --- |
| CMP-RUN-001 | Proof Loop `c5b9376...` | 官方 10 测试与示例通过；机械 done gate 可用 | 机械 gate 非差异 |
| CMP-RUN-002 | Proof Loop | 默认 `check` 接受 2000 年、自报 verifier、无 receipt 的 PASS；report 原样带出 evidence sentinel | freshness、producer assurance 与默认最小披露仍为空缺 |
| CMP-RUN-003 | memi 2.7.0 | 规则诊断、严重度退出码和去除时间字段后的确定性成立 | 可借鉴低权限 PR gate 交付模式 |
| CMP-RUN-004 | memi | 默认写项目目录；绝对路径可出现 0 文件 exit 0；JSON 含源码 excerpt | 只读与隐私必须分别显式保证 |
| CMP-RUN-005 | OMK 0.94.1 | v3 receipt、输出摘要、strict gate、选定工件 freshness 与 receipt 篡改阻断成立 | 覆盖原 receipt/stale gate 核心 |
| CMP-RUN-006 | OMK | 注入假 runner 后，记录命令 `exit 9` 仍可被报告为 exit 0 并通过 strict gate | producer/runner assurance 必须在 receipt 外独立建模 |
| CMP-RUN-007 | OMK | 未选 dirty 文件不误阻断；仅 HEAD 改变且选定工件字节不变时阻断 | 覆盖原 Git state 核心，D3 发明型 spike 失去必要性 |
| CMP-RUN-008 | OMK | credential-shaped 命令值会脱敏；任意私密字面量仍原样进入 command receipt | 默认不公开完整 command 仍有产品差异 |

运行深审结论（历史，已被用户后续 bootstrap 决策 supersede）：**从 `PIVOT_WATCH` 升级为 `PIVOT_RECOMMENDED`。** 不再独立实现 receipt hash、replay ledger 或自定义 Git state 算法；拟议产品只在“跨 harness 互操作 profile、外部 producer assurance、维护者侧只读 PR verifier、canonical check/verifier-surface 规则和公共最小报告”的组合上继续验证。该段的 v0.1 `NO-GO` 不再是当前执行门禁。

## 18. V0 剩余执行顺序

| 顺序 | 工作 | 当前成本上限 | 产出/退出条件 |
| ---: | --- | --- | --- |
| 1 | 用户确认是否接受 `PIVOT_RECOMMENDED` | 已于 2026-08-17 完成 | `PIVOT_ACCEPTED`；原 receipt/state_id 路线停止 |
| 2 | 维护者采用验证 | 延后至 MVP 发布后；不收集敏感数据 | 公开使用信号、issues、复现报告和真实配置反馈 |
| 3 | 按新合同执行互操作可丢弃 Spike | 已完成离线核心；P5 真实 CI/E2=`unverified` | I00-I15、ADR、隐私检查和执行台账 |
| 4 | 冻结 v0.1 MVP 合同并完成 bootstrap pre-flight | 已完成；不等同于市场 GO | 按合同实现、测试、公开发布；P0 失败仍阻止发布 |

三项竞品运行深审已经完成，不再为数量扩展更多竞品或重复端到端运行。转向已获用户接受；用户明确选择把采用验证延后到 MVP 发布后。Spike 的执行证据以 [互操作 Spike 合同](./spike-contract.md) 和 [Spike ADR](./research/spikes/2026-08-17/adr.md) 为基线，v0.1 实现边界以 [v0.1 MVP 合同](./v0.1-mvp-contract.md) 为准。

## 19. Spike 前准备包（历史，已失效）

> 本节记录 2026-08-13 至 2026-08-14 的旧执行准备，用于审计决策演变，不再具有执行效力。2026-08-17 冻结的 [互操作 Spike 合同](./spike-contract.md) 已替代旧 D1/D2/D3、fixture、资源预算、停止条件和 ADR 模板。

本节是 2026-08-13 冻结的 spike 前执行合同。2026-08-14 用户明确授权竞品运行深审，固定版本与 Docker 隔离条件也已恢复，因此其中“第三方代码 NO-GO/BLOCKED”已由 17.3 的运行记录取代；它仍不授权 v0.1 实现。原 D2/D3 技术路线因 OMK 高重叠暂停，等待用户确认 PIVOT 后重写为互操作 spike。

### 19.1 PRE-SPIKE senior full-stack 评审

| 评审面 | 决定 | 分类 |
| --- | --- | --- |
| 用户与业务价值 | spike 只验证语言/分发、E2 来源和 state freshness 三个能改变 GO/PIVOT 的问题 | Optimize now |
| 产品范围 | 不实现完整 CLI、Action、adapter、Dashboard、LLM 或发布流程 | Remove from spike |
| UX | 只测首次运行步骤、错误可读性和机器退出码；不做最终文案/交互 | Defer |
| 前端 | 无前端 | Remove |
| 后端/工作流 | 仅离线探针；无服务、数据库、队列和外部写入 | Optimize now |
| 模型边界 | 产品运行时模型调用为 0；固定输入输出全部由代码处理 | Optimize now |
| 数据合同 | 使用本规格现有 manifest/trace/report 子集，不另建平行 schema | Optimize now |
| 隐私与安全 | 仅合成仓库；无源码、prompt、token、凭据、用户数据；禁止原始 stdout/stderr 入报告 | Optimize now |
| 测试 | 固定 fixture、跨语言黄金输出、负例优先、相同输入重复两次 | Optimize now |
| 运维/部署 | 不部署；Linux 验证使用受控 runner 或等价隔离环境，未获得时标记未验证 | Defer |
| 回滚 | spike 位于独立目录/临时仓库，整体删除即可；不得复制到 v0.1 | Optimize now |
| 资源效率 | 共享 fixture 和测量脚本；先跑便宜负例，再跑上限测试；任一路径最多一次修复重试 | Optimize now |
| 最近外部里程碑 | 形成一份 ADR，决定继续独立开发、兼容/互操作转向或技术 NO-GO | Optimize now |

当时的评审决定为：**CONDITIONAL GO（仅允许准备和本项目合成 spike）；NO-GO（竞品第三方代码运行和 v0.1 实现）。** 竞品运行条件已于 2026-08-14 满足并获得用户授权，三项深审已完成；v0.1 的 `NO-GO` 未解除。

### 19.2 当前环境基线（2026-08-13）

| 能力 | 实测状态 | 对 spike 的影响 |
| --- | --- | --- |
| Node.js | Codex 受控运行时 `v24.19.0` 可用 | 可做零第三方依赖 TypeScript/JavaScript 探针；不代表普通用户安装体验 |
| Python | Codex 受控运行时 `3.12.13` 可用 | 可做标准库 Python 探针；不代表普通用户安装体验 |
| 包管理 | bundled pnpm `11.19.0` 可用 | spike 默认不用网络和新依赖；只记录工具存在 |
| Git | bundled Git `2.53.0.windows.3` 可做本地操作 | 合成仓库可用；当前项目没有首个 commit，不能充当 state fixture |
| Git HTTPS | `ls-remote` 无法解析 `remote-https` helper | 不能从 shell 固定/拉取竞品版本；执行前需修复或使用校验过的固定归档 |
| Docker | 客户端 `29.6.2` 存在；daemon/config 当前拒绝访问 | 不能声称已具备第三方代码隔离运行环境 |
| GitHub CLI | 当前 shell 不可用 | 不依赖 `gh` 设计准备流程 |

本基线可能随桌面环境变化。正式执行当日必须重新记录版本和可用性，不能把本表当作永久能力证明。

2026-08-14 执行更新：Docker Desktop 29.6.2 daemon 已可用；竞品通过固定 commit/npm integrity 与镜像摘要恢复，正式运行均断网。该更新及实际摘要以 17.3 的独立运行报告为准，19.2 保留为前一日阻断历史。

### 19.3 执行分道与顺序门禁

准备后工作严格分为两条道，不混用代码或证据：

| 道 | 内容 | 当前状态 | 进入条件 |
| --- | --- | --- | --- |
| A：竞品运行深审 | Proof Loop、memi、OMK 的固定版本运行 | COMPLETED | 见 17.3 与独立运行报告 |
| B：本项目技术 spike | 原两种语言/E2/state_id 路线 | SUSPENDED | OMK 已覆盖 receipt 与 Git state；用户确认 PIVOT 后改写为互操作 spike |

A 已完成并触发 `PIVOT_RECOMMENDED`，因此不直接进入原 B。下一门是用户确认转向；只有确认后才将 B 重写为互操作 profile 探针，结果仍不得自动批准 v0.1。

竞品运行对象预先冻结为：

1. Proof Loop：先运行，依赖面最小，用于校准机械 done gate 和 fresh verifier；
2. memi：第二运行，用于校准低权限 PR Action、artifact 和增量门禁采用成本；
3. OMK：必须运行，用于验证最高同质化风险的 verified receipt、Git dirty-state 和 replay ledger。

AGILAB 作为第四候补，只在前三项有一项因客观平台条件不可运行时替代，并明确降低“PR 门禁交付面”结论置信度；AgentRx 因依赖模型端点且目标为事后诊断，本轮保持静态对照，不为凑满数量引入凭据/API 成本。

### 19.4 共享 fixture 冻结

所有语言和 E2/state 实验复用同一 fixture 集，避免两套原型各自挑有利样例：

| Fixture ID | 唯一变量 | 预期 |
| --- | --- | --- |
| S00 | 干净 HEAD | 基准 `state_id` |
| S01 | staged 内容变化 | 与 S00 不同 |
| S02 | unstaged 内容变化 | 与 S00/S01 不同 |
| S03 | untracked 文件 | 与 S00 不同 |
| S04 | rename，内容不变 | 路径变化必须反映 |
| S05 | symlink（平台支持时） | 链接元数据变化必须反映；不支持则显式 `not_applicable` |
| S06 | 仅文件名大小写变化 | Windows/Linux 结果语义明确；不可稳定表示则 fail/unknown |
| S07 | ignored 文件变化 | 默认不影响，除非属于 manifest/policy/verifier surface |
| S08 | manifest/policy 变化 | 必须失效旧证据 |
| S09 | test/workflow/verifier 变化 | 必须产生 surface-change 结果 |
| S10 | 测试后修改业务文件 | 旧 receipt 必须 stale fail |
| S11 | 相同输入连续运行两次 | 规范输出逐字节一致 |
| R00 | 可信 CI producer + 当前 state + 成功 command receipt | E2 候选可用 |
| R01 | 代理自报相同字段 | 最高 E1，不因字段齐全升级 |
| R02 | 未受信 producer 自称 E2 | 降为 E1，正式 PR fail |
| R03 | receipt state 与当前 state 不同 | stale fail |
| R04 | workflow/verifier 在候选改动中变化 | protected fail 或需批准 |
| R05 | 缺 exit、termination 或 stdout/stderr 状态 | malformed fail |
| R06 | cancelled/timeout | required check 不满足 |

合成仓库最小拓扑固定为：1 个业务文件、1 个测试文件、1 个 workflow、1 个 manifest、1 个 policy/verifier 文件、1 个 ignored 文件。不得使用当前无 commit 的项目仓库作为 fixture，也不得把真实项目内容复制进实验。

### 19.5 三个决策的测量表

#### D1：TypeScript vs Python

两种候选必须实现完全相同的只读子集：解析一个 JSON manifest（YAML 不在 spike 中自行实现）、流式读取三类 JSONL 事件、计算 state 指纹、输出规范 JSON 和退出码。禁止为了比较引入新依赖。

每次记录：冷启动/第二次启动时间、峰值工作集（若可测）、打包/调用步骤数、输出字节一致性、直接/传递依赖数、跨平台结果、实现行数仅作维护参考而不作为质量代理。沿用 12.4 权重；总分差小于 10 时选择 TypeScript。

#### D2：E2 来源

只比较两个明确定义的候选：

- `local_collector`：由维护者显式调用、配置受保护、记录 command/cwd/exit/output-state/state_id；在无法证明 collector 身份时只算 E1；
- `ci_receipt`：由维护者控制的 workflow/job 产生，绑定 repository、workflow identity、run/job、head SHA/state 和 artifact digest；V0 首选候选。

每个候选必须对 R00-R06 给出 `pass/fail/unknown`。核心判定是 PR 作者能否伪造、替换、重放或用修改后的 workflow 生产“可信”收据。任何无法从 verifier 外部验证的 producer 声明不得升级为 E2。

#### D3：`state_id`

候选算法只比较：`commit-only` 与 `commit + normalized relevant dirty state + policy digest`。全仓库内容哈希因隐私、性能和维护成本从 V0 spike 移除。

必须记录：S00-S11 结果、Windows/Linux 规范化差异、包含/排除路径、哈希输入字节规范、单次耗时、扫描文件数/字节数，以及不支持状态的显式语义。`state_id` 是 freshness fingerprint，不是签名或恶意防篡改证明。

### 19.6 资源预算与效率基线

| 成本项 | 当前成本/风险 | 预期改进 | 验证方法/上限 |
| --- | --- | --- | --- |
| 重复 fixture | 若两种语言各建样例，会产生双份维护和偏差 | 共享 S00-S11/R00-R06，预计 fixture 重复为 0 | 两种候选引用同一输入目录和黄金输出 |
| 网络/依赖 | 在线安装会增加供应链、等待和不可复现性 | spike 新增依赖 0、运行时网络 0 | 锁定执行日志；发现下载即停止 |
| 模型调用 | 将确定性比较交给模型会增加 token 与波动 | 产品/spike 运行时模型调用 0 | 运行日志无模型/API 请求 |
| 大输入测试 | 每次开发都跑 20 MiB/50k 会浪费时间 | 先小 fixture；仅候选稳定后各跑一次上限测试 | 每语言上限测试最多 1 次，失败修复后最多重跑 1 次 |
| 跨平台 | 无 Linux 环境时反复本地调试不能证明一致性 | Windows 先确定黄金输出，Linux 只做一次确认矩阵 | Linux 不可用即标 `unverified`，不得推断通过 |
| 人工时间 | 开放式探索容易扩成 MVP | 4-6 小时总时间盒；D1 90 分钟、D2 120 分钟、D3 120 分钟、ADR 30 分钟 | 到时停止并记录未证实，不追加功能 |

### 19.7 执行清单与停止条件

开始前 MUST 全部为真：

- [ ] 当前工作树用户文件已确认不被实验覆盖；实验目标解析到专用临时目录。
- [ ] 合成仓库创建/删除路径已记录，且不指向项目根、用户目录或宽泛路径。
- [ ] Node/Python/Git 的实际版本重新记录。
- [ ] 网络、新依赖、凭据、真实源码和第三方执行均关闭。
- [ ] S00-S11、R00-R06 和黄金输出结构已冻结。
- [ ] 计时、依赖数、扫描量和 verdict 的记录位置已确定。
- [ ] 时间盒计时器开始；每条失败路径只允许一次修复重试。

立即停止并给出 `NO-GO` 或 `UNVERIFIED`：

- 需要凭据、付费 API、宿主高权限或执行不可信 PR 才能证明核心价值；
- E1 与 E2 只能依赖 producer 自我声明区分；
- stale receipt 在 S10/R03 中仍能 pass；
- 报告需要保存 prompt、源码、原始输出或秘密才能工作；
- 跨平台差异无法被规范化且仍试图静默 pass；
- 超出时间盒、重试上限或开始形成完整产品功能。

### 19.8 PRE-SPIKE 出口决定

2026-08-14 更新决定：

- **COMPLETED：** Proof Loop、memi、OMK 固定版本运行深审；模型/API/凭据为 0，正式测试网络为 0。
- **PIVOT_RECOMMENDED：** 停止原 receipt/state_id 发明型路线，候选方向为跨 harness evidence interoperability profile 与维护者侧只读 verifier。
- **SUSPENDED：** 原 D1/D2/D3 spike；在用户确认转向前不编写实验代码。
- **NO-GO：** v0.1 产品实现、公开仓库发布、Action 上架或任何真实 PR 接入。
- **RISK：** 剩余差异主要是产品/可信边界组合，不是底层算法；H3-H5 维护者采用证据仍不足。

最近的安全下一步是由用户审阅运行报告并决定是否接受 PIVOT。接受后先改写互操作 spike 合同；不接受则停止该技术路线或重新定义项目，不用实现进度替代产品证据。

### 19.9 统一测量记录与 ADR 模板

每次运行追加一行，不覆盖失败结果：

| 字段 | 内容 |
| --- | --- |
| `evidence_id` | `SPK-D1-*`、`SPK-D2-*` 或 `SPK-D3-*` |
| `decision_id` | `D1 | D2 | D3` |
| `candidate` | `typescript | python | local_collector | ci_receipt | commit_only | dirty_state` |
| `runtime` | 工具及精确版本 |
| `platform` | OS、文件系统/大小写语义、runner 类型 |
| `fixture_id` | S00-S11 或 R00-R06 |
| `command_id` | 白名单中的稳定命令 ID，不保存动态 shell 文本 |
| `duration_ms` | wall time |
| `peak_memory_bytes` | 无法测量时为 `null` 并说明 |
| `files_scanned` / `bytes_scanned` | D3 必填，其他可为 `null` |
| `exit_code` / `verdict` | 原始确定性结果 |
| `output_sha256` | 规范输出摘要 |
| `network_calls` / `model_calls` | 预期均为 0 |
| `observation` | 事实描述 |
| `limitation` | 环境、测量或未覆盖边界 |
| `status` | `verified | failed | unverified` |

最终 ADR 只允许使用上表中的 `verified/failed` 记录，结构固定为：

1. `Decision`：D1/D2/D3 各自选择或未选择；
2. `Context`：要消除的不确定性与产品边界；
3. `Options`：实际测试的候选，不补写未运行方案；
4. `Evidence`：引用 SPK evidence ID 和失败负例；
5. `Cost`：时间、依赖、网络、模型、CPU/内存和人工步骤；
6. `Decision rule`：引用预先冻结的权重/停止条件；
7. `Consequences`：采用后的能力与维护成本；
8. `Rejected`：拒绝方案及证据，不用偏好替代证据；
9. `Residual risks`：未验证平台、攻击面和承诺限制；
10. `Disposition`：`GO | PIVOT | NO-GO | UNVERIFIED`，并声明是否允许进入 V0 最终评审。
