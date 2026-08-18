# AEG v0.1 Quickstart

## Inputs

`agent-task.yml` declares the task ID, profile, allowed/denied/sensitive paths, required check IDs and canonical argv/cwd, dependency policy, resource budgets, test/verifier surfaces, and stable C2 claim IDs.

`agent-trace.jsonl` is bounded JSONL. Every event has a schema version, run ID, event ID, sequence, timestamp, producer, and structured data. Raw prompt, source, credentials, environment, and unbounded command output are rejected.

The evidence JSON is either an OMK v3 receipt or a maintainer-CI envelope. Both adapters map into the same canonical fields. A trusted workflow and current repository/head context are required for `E2-candidate`; producer self-claims never upgrade E1.

## Profiles

| Profile | Minimum assurance | Missing ordinary evidence | Surface changes |
| --- | --- | --- | --- |
| `local` | E1 | warning | warning |
| `pr` | E2-candidate | warning | warning/approval |
| `protected` | E2-candidate | fail for enforced dimensions | fail without explicit approval |

## Exit codes

The JSON report is the source of truth. Exit code `0` means pass, `1` means fail, and `2` means warning or approval required. Input rejection is reported as a fail with the stable preflight reason code.

## Safe operating boundary

AEG reads only the named evidence files and Git metadata. It never executes a candidate command, test, package script, workflow, shell, or network request. The command recorded in a trace is evidence to compare against the manifest, not an instruction to run.

