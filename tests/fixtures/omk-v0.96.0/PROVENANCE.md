# OMK v0.96.0 清洗 Receipt fixture 来源

- 上游 package：`open-multi-agent-kit@0.96.0`
- 官方 tarball integrity：`sha512-ZSnKjxCiVoETcf9oHblB7iWW4c1VIctaum9jYRjD5YBaP3CDGvR6MuQWIkskuIK1w0Q1ydhYNoqY4ZiH+O79bw==`
- 生成方法：在隔离工作树中用该固定发布包的 `createEvidenceReceipt()` 和 `serializeEvidenceReceipt()` 对纯合成、无候选代码、无秘密的 artifact-set 输入生成。
- 保留字段：仅 Receipt v3 的结构、摘要、固定 ID 和合成 command descriptor；无 workspace 实际路径、stdout/stderr、credential、claim 以外的隐私数据或 attestation。
- 不引入上游 package、其依赖或其源码到 AEG production runtime。
