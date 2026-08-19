# AEG 版本记录审计与补档实施计划

> **供 agentic worker 执行：** 必须使用 `superpowers:executing-plans` 在当前隔离 worktree 中逐项执行。每个步骤使用复选框跟踪，禁止根据聊天记忆补写无法由 Git、GitHub Release、Actions run 或现存文件证明的历史事实。

**目标：** 建立 AEG 从 V0 规格阶段到 v0.2.0 设计阶段的可追溯中文版本索引，补齐能由现有证据证明的发布记录，并显式登记无法追溯的缺失文件。

**方法：** 以远端公开 tag target、GitHub Release、GitHub Actions run、Git commit/file tree 和当前受控文档为证据源。`CHANGELOG.md` 面向使用者记录版本变化，`docs/version-history.md` 作为审计索引记录证据、缺口和归档状态；既有历史文档仅增加归档提示或后继链接，不重写当时结论。

**技术栈：** Markdown、Git、GitHub CLI 只读查询、PowerShell 链接检查、Node 测试套件

**规格：** `docs/superpowers/specs/2026-08-19-native-omk-receipt-v3-design.md`、`v0.1-mvp-contract.md`、`v0-closure-review.md`

## 全局约束

- 所有新增或修订文档使用中文；命令、schema、文件名和必要技术术语保留英文。
- 远端公开 tag target 是发布版本 commit 的权威来源；不得用漂移的本地 annotated tag 覆盖它。
- 任何回顾性记录必须标明“后补审计”，不得伪装成当时已存在的文件。
- 从未进入 Git 且没有其他可验证副本的文件只能登记为“缺失且不可追溯”。
- 不修改公开 tag、Release、Marketplace、远端分支或 GitHub Actions 历史。
- 不改变 v0.1.3 runtime、policy、bundle 或报告行为。
- v0.2.0 仍处于设计/实施计划阶段，不得写成已发布或已实现。

---

### 任务 1：建立版本事实索引和公开 CHANGELOG

**文件：**

- 新建：`CHANGELOG.md`
- 新建：`docs/version-history.md`
- 新建：`docs/releases/v0.1.3-release-record.md`

**输入：**

- 远端 tag target：
  - `v0.1.0` → `45abbc88937d4cf0c366e21bdfff06b55c620c7f`
  - `v0.1.1` → `e53f68eb8ac12cd0cda9f5882cb93cfa1919bc83`
  - `v0.1.2` → `979b1114e28b757ebda31aa5cceca3f2133e204c`
  - `v0.1.3` → `d82c7863f48878bfee66e978e7569c464de48ea2`
- GitHub Release publishedAt 与 release body。
- v0.1.2 run `32141322549` 和 v0.1.3 run `32211203587`。
- v0.1.3 artifact digest `sha256:47e2c70c594dbc453090a72765cd56be6a0cb1e729f4252ee7ec8777df1b0855`。

- [x] **步骤 1：写入 `CHANGELOG.md`**

使用 `Unreleased / v0.2.0`、`v0.1.3`、`v0.1.2`、`v0.1.1`、`v0.1.0` 五个部分。只记录 tag、release body 和 tag-to-tag diff 能证明的变化；v0.1.0 的 release body 只有 Full Changelog 链接，应明确发布说明较少。

- [x] **步骤 2：写入 `docs/version-history.md`**

建立包含“阶段/版本、commit、公开状态、证据文件、归档状态、已知缺口”的矩阵，并单列：

```text
产品立项书 v0.1-draft 至 v0.9-draft：只有当前汇总表；Git 中没有历史快照，无法还原逐版正文。
research/competitor-runs/2026-08-14/run-level-review.md：从未进入 Git，当前没有可验证副本，缺失且不可追溯。
本地 v0.1.1/v0.1.2 tag target 与远端不一致：保留现状，不把本地 target 当作发布依据。
```

- [x] **步骤 3：写入 v0.1.3 发布后记录**

`docs/releases/v0.1.3-release-record.md` 必须记录公开 tag、Release 时间、Marketplace 目的、76 项测试声明、受控 run/job、artifact metadata、报告 verdict、E2-candidate 限制和未进行第三方审计的边界。

- [x] **步骤 4：检查三份新文档无矛盾**

运行：

```powershell
rg -n "v0\.1\.[0-3]|d82c786|32211203587|不可追溯|E2-candidate" CHANGELOG.md docs/version-history.md docs/releases/v0.1.3-release-record.md
```

预期：所有公开版本和缺口均可定位；v0.2.0 只标记为未发布。

### 任务 2：归档既有发布文档并修正当前 handoff

**文件：**

- 修改：`v0.1-account-handoff.md`
- 修改：`docs/release-candidate-audit.md`
- 修改：`docs/release-validation-2026-08-18.md`
- 修改：`docs/controlled-ci-e2-validation-2026-08-18.md`
- 修改：`docs/security-privacy-review-2026-08-18.md`
- 修改：`docs/v0.1.3-marketplace-preflight.md`

**输出：** 历史文档的原始结论不变，但范围和后继记录明确；当前 handoff 指向 v0.1.3 与 v0.2.0 设计分支。

- [x] **步骤 1：给 v0.1.2 及更早文档增加归档范围提示**

在标题之后增加不改变原结论的提示：

```markdown
> 归档说明：本文记录截至 v0.1.2 的当时状态。v0.1.3 的发布后事实见对应发布记录，完整索引见版本历史与档案审计；写入目标文档时使用相对于目标文件的真实路径。
```

- [x] **步骤 2：给 v0.1.3 preflight 增加发布后结果链接**

明确 preflight 已由公开 tag、Release 和受控 run 完成，但不把它改写为第三方 review。

- [x] **步骤 3：更新 account handoff**

把“v0.1.2 已发布、未进行 Marketplace”修正为“v0.1.3 已发布并上架 Marketplace”；记录 run `32211203587`、76 项基线测试和当前 `codex/v0.2.0-omk-native` 设计状态。保留 real CI/E2 与第三方 review 未完成的限制。

- [x] **步骤 4：核对过期语句**

运行：

```powershell
rg -n "v0\.1\.2 is published|no Marketplace|未进行 Marketplace|75 tests|75 项" v0.1-account-handoff.md docs
```

预期：历史归档文件可保留其当时的75项测试事实；当前 handoff 不再包含过期状态。

### 任务 3：处理不可追溯文件和失效链接

**文件：**

- 修改：`产品立项书.md`
- 修改：`v0-specification.md`
- 修改：`spike-contract.md`

**输出：** 三个指向不存在文件的链接被替换为明确的缺失声明，并链接到版本审计，而不是创建伪造的竞品深审文件。

- [x] **步骤 1：替换三个失效链接**

使用一致表述：

```markdown
原始 `research/competitor-runs/2026-08-14/run-level-review.md` 未进入当前 Git 历史，现无可验证副本，不能补造；缺失情况见版本历史与档案审计，写入目标文档时使用真实相对路径。
```

相对链接按文件所在目录正确调整。

- [x] **步骤 2：运行全仓 Markdown 相对链接检查**

使用 PowerShell 提取 `[]()` 相对链接并逐项 `Test-Path`。预期：不存在上述三个失效链接；若发现新的缺失项，先核查 Git 历史，再决定修正或登记，不创建内容占位文件。

### 任务 4：更新当前项目基线与维护入口

**文件：**

- 修改：`产品立项书.md`
- 修改：`README.md`
- 修改：`CONTRIBUTING.md`
- 修改：`docs/release-rollback.md`
- 修改：`examples/read-only-workflow.yml`

**输出：** 当前项目阶段、维护者入口、版本示例和归档入口一致。

- [x] **步骤 1：更新立项书文档头和修订记录**

把当前阶段更新为 v0.2.0 设计/实施计划，最近更新改为 2026-08-19，增加 v0.11-draft 修订行，并链接 v0.2 设计及版本历史。不得把 v0.2 写成已实现。

- [x] **步骤 2：增加 README 维护者入口**

在 maintainer resources 中加入 `CHANGELOG.md`、`docs/version-history.md` 和 v0.1.3 发布记录。

- [x] **步骤 3：更新贡献与回滚入口**

`CONTRIBUTING.md` 增加当前 v0.2 设计文档；`docs/release-rollback.md` 增加版本索引链接，不改变 v0.1 stateless rollback 语义。

- [x] **步骤 4：修正 workflow 示例版本**

将 `OWNER/REPO@v0.1.0` 更新为 `OWNER/REPO@v0.1.3`，保持 generic owner/repo 和 least-privilege 示例，不提前引用未发布 v0.2。

### 任务 5：验证、复核与提交

**文件：**

- 检查：所有本轮新增和修改文件
- 测试：`tests/**/*.test.ts`

- [x] **步骤 1：执行格式与占位扫描**

```powershell
git diff --check
rg -n "TBD|TODO|待补|稍后补充|假定已" CHANGELOG.md docs/version-history.md docs/releases/v0.1.3-release-record.md
```

预期：无格式错误；无把缺失历史留给未来补造的占位语句。

- [x] **步骤 2：重复版本与链接审计**

核对 package `0.1.3`、Action `node20`、README `v0.1.3`、workflow `v0.1.3` 和 example `v0.1.3`。Action 升级 Node 24 属于 v0.2 实现，不在本次补档中提前修改。

- [x] **步骤 3：运行完整测试**

```powershell
& 'C:\Users\win\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' --import tsx --test --test-reporter=spec 'tests/**/*.test.ts'
```

预期：76 项测试全部通过。若文档示例测试因 v0.1.3 更新而先失败，只修改对应版本一致性断言，不改变 runtime 行为。

- [x] **步骤 4：最终事实复核**

逐条比较新文档中的 commit、run、artifact、测试数和缺失声明与只读审计输出。无法再次验证的事实从正文移除或标记为不可追溯。

- [x] **步骤 5：提交**

```powershell
git add CHANGELOG.md README.md CONTRIBUTING.md examples/read-only-workflow.yml 产品立项书.md v0-specification.md spike-contract.md v0.1-account-handoff.md docs
git commit -m "docs: audit and archive version records"
```
