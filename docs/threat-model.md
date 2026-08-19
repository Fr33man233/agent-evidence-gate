# AEG v0.2.0 威胁模型与能力边界

## 保护对象

AEG 保护维护者对结构化 required check、Receipt 完整性、目标 goal、trace identity、Git workspace 状态、scope/sensitive policy 和报告隐私的信任。

## 处理的威胁

- 旧 Receipt 被重放到不同 Git HEAD、artifact 或 dirty state；
- 未知、失败、超时、含糊或 command/cwd 不匹配的 check 被当作成功；
- Receipt 或 trace 穿越仓库 scope、使用 link/junction 或泄露 raw output/credential；
- 生产者通过 claim、attestation metadata 或本地字段伪造 E2；
- 重复 key、未知字段、超大/过深输入造成不确定性；
- 候选输入诱导 verifier 执行 command、shell、package、test、network 或 secret 路径。

## 明确非目标

AEG 不创建 OMK Receipt，不实现 OMK ledger、replay database、runner、attestation trust anchor 或执行控制面；不执行候选代码；不把 Receipt digest 当作独立 CI identity、runner honesty、ledger membership、全局 freshness 或 OS isolation 证明。v0.2.0 不提供 v0.1 envelope 兼容层，也不实现 E2。

## GitHub 边界

Action 使用 Node 24、只读权限和固定 bundle；不使用 `pull_request_target`、secrets、shell、child process、网络或 runtime package installation。消费者应固定 reviewed tag 或完整 commit SHA，并授予最小 `contents: read` 权限。

## 残余风险

恶意本地 producer 仍可伪造 E1 结构化证据；绝对 workspace root 使状态绑定限定在生成 Receipt 的本地 checkout。真实 maintainer CI/E2 和第三方安全审计仍未验证。
