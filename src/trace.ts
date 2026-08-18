import { parseDocument } from "yaml";
import { AegInputError, assertJsonDepth, assertNoForbiddenFields, LIMITS, readBoundedFile } from "./safe.js";
import type { TraceEvent } from "./types.js";

const eventTypes = new Set<TraceEvent["event_type"]>(["run_started", "file_read", "file_written", "command_finished", "test_result", "model_usage", "retry", "run_finished"]);

function parseJsonLine(line: string): unknown {
  try { JSON.parse(line); } catch { throw new AegInputError("AEG002", "trace line is not valid JSON"); }
  const document = parseDocument(line, { uniqueKeys: true, prettyErrors: false });
  if (document.errors.length > 0) throw new AegInputError("AEG002", "trace line contains duplicate keys");
  return document.toJS();
}

export function parseTraceText(text: string): TraceEvent[] {
  const events: TraceEvent[] = [];
  const ids = new Set<string>();
  let runId: string | undefined;
  let expectedSequence = 1;
  let eventCount = 0;
  for (const rawLine of text.split(/\r?\n/)) {
    if (rawLine.length === 0) continue;
    if (Buffer.byteLength(rawLine, "utf8") > LIMITS.jsonlLineBytes) throw new AegInputError("AEG003", "trace line exceeds the configured size limit");
    if (++eventCount > LIMITS.traceEvents) throw new AegInputError("AEG003", "trace event count exceeds the configured limit");
    const item = parseJsonLine(rawLine);
    assertJsonDepth(item);
    assertNoForbiddenFields(item);
    if (item === null || typeof item !== "object" || Array.isArray(item)) throw new AegInputError("AEG002", "trace event must be an object");
    const value = item as Record<string, unknown>;
    if (value.schema_version !== "aeg-trace/v1" || typeof value.run_id !== "string" || typeof value.event_id !== "string" || typeof value.sequence !== "number" || typeof value.timestamp !== "string" || !eventTypes.has(value.event_type as TraceEvent["event_type"]) || value.producer === null || typeof value.producer !== "object" || value.data === null || typeof value.data !== "object") throw new AegInputError("AEG002", "trace event is missing required structured fields");
    if (ids.has(value.event_id) || value.sequence !== expectedSequence) throw new AegInputError("AEG002", "trace event identity or sequence is invalid");
    if (runId !== undefined && runId !== value.run_id) throw new AegInputError("AEG002", "trace contains more than one run_id");
    runId = value.run_id; ids.add(value.event_id); expectedSequence += 1;
    events.push(value as unknown as TraceEvent);
  }
  if (events.length === 0) throw new AegInputError("AEG002", "trace must contain at least one event");
  return events;
}

export function loadTrace(filePath: string): TraceEvent[] {
  return parseTraceText(readBoundedFile(filePath, LIMITS.traceBytes, "AEG003"));
}
