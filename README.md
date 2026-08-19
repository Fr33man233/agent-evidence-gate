# Agent Evidence Gate (AEG) v0.2.0

AEG 是一个确定性、隐私优先、只读的本地证据门禁。v0.2.0 直接读取原生 OMK EvidenceReceipt v3，将它与 `aeg-task/v2`、`aeg-trace/v1` 和当前 Git workspace 绑定，并输出 `aeg-report/v2` JSON/Markdown 报告。

## 当前状态

v0.2.0 尚未发布。所有 Receipt 最高为 E1，只有 `local` profile 支持通过；`pr` 和 `protected` 不提供 E2 或独立 CI proof。公开 v0.1.3 tag、Release、Marketplace alias 和 main 保持不变。

历史 v0.1.3 consumer 示例（仅用于解释已发布基线，不是 v0.2.0 的输入合同）：

```yaml
uses: Fr33man233/agent-evidence-gate@v0.1.3
permissions:
  contents: read
```

## Quickstart

使用固定 Node 24 runtime 和 lockfile 依赖：

```powershell
pnpm install --frozen-lockfile --ignore-scripts
pnpm run build
pnpm test
node dist/aeg.cjs verify `
  --manifest agent-task.yml `
  --trace agent-trace.jsonl `
  --receipts path/to/receipt.json `
  --repo path/to/repository `
  --json gate-report.json `
  --markdown gate-report.md
```

`--evidence`、v0.1 custom envelope、`maintainer_ci` adapter 和 evidence 内嵌 `trust_context` 已删除。AEG 永不执行 Receipt 中记录的 command。

## Action

隔离实现中的 Action 使用 Node 24，只读接收 `manifest`、`trace`、`receipts`、`repo`、`json` 和 `markdown`。v0.2.0 尚未发布，因此不能用公开 v0.1.3 tag 调用这些新输入；发布前必须固定 reviewed immutable commit，不得使用 untrusted local action 或 `pull_request_target`。

## 安全边界

AEG 不调用 LLM/API/network，不读取 secrets，不执行候选代码、shell、package、test 或 script。输入 link/junction、未知 schema、重复 key、credential、raw output、scope escape 和 digest 不匹配均失败封闭。报告不回显 claim prose、command、absolute cwd、stdout/stderr、environment 或 credential。

## 维护资源

- [v0.2.0 设计](docs/superpowers/specs/2026-08-19-native-omk-receipt-v3-design.md)
- [实施计划](docs/superpowers/plans/2026-08-19-native-omk-receipt-v3-implementation.md)
- [Quickstart](docs/quickstart.md)
- [Threat model](docs/threat-model.md)
- [Release and rollback](docs/release-rollback.md)
- [版本历史](docs/version-history.md)
- [v0.1.3 发布记录](docs/releases/v0.1.3-release-record.md)

## License

MIT. See [LICENSE](LICENSE).
