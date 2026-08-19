# AEG v0.2.0 本地 Quickstart

v0.2.0 直接读取原生 OMK EvidenceReceipt v3、`aeg-task/v2` manifest、`aeg-trace/v1` trace 和 Git workspace。Receipt 最高为 E1，只有 `local` profile 支持通过；`pr` 与 `protected` 会以 `AEG070` 失败。

## CLI

```powershell
node dist/aeg.cjs verify `
  --manifest agent-task.yml `
  --trace agent-trace.jsonl `
  --receipts path/to/receipt.json `
  --repo path/to/repository `
  --json gate-report.json `
  --markdown gate-report.md
```

`--evidence` 已删除，不会自动识别 v0.1 envelope。Receipt 中记录的 command 只用于精确匹配，AEG 永不执行它。

## 输入边界

manifest 的 required check 必须声明 `shell` 或 `argv` command descriptor 与仓库相对 `cwd`。Receipt store 只允许一层安全 ID、`receipt.json`、最多 64 张 Receipt、总计 8 MiB；单张 Receipt 最大 1 MiB。未知 schema、重复 key、raw output、credential、link/junction、scope escape 和 digest 不匹配均失败封闭。

trace 只提供结构化 scope、sensitive access、dependency、resource、test/verifier surface 和 completion 事实。trace `run_id` 必须等于选中 Receipt 的 `goalId`。

## 安全边界

AEG 只读有界输入和 Git 事实，不调用 LLM/API/network，不读取 secrets，不执行候选代码、Receipt command、package、test 或 script，也不使用 `pull_request_target`。报告不回显 claim prose、command、absolute cwd、stdout/stderr、environment 或 credential。
