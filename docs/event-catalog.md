# OpenCode V2 event catalog (Phase 0 spike)

Findings from recording a real OpenCode **2.1.3** session with the disposable plugin in
[`spike/`](../spike). This is the input for the `src/events.ts` state machine.

## How it was captured

```sh
cd spike
opencode run -m <model> --auto "Create hello.txt ... then list the files here"
opencode run -m <model>          "Run the shell command: echo hello-pixel"   # permission ask (non-interactive -> rejected)
opencode run -m <model> --auto   "Use the task tool to spawn a subagent ..." # child session
```

Log: `spike/events.jsonl` (gitignored), one JSON object per line, analyzed with
`spike/analyze.mjs` and `spike/sample.mjs`. 771 events recorded.

## Setup facts

- The plugin default-exports `{ id, setup }` — the documented V2 shape — and loads from
  `<project>/.opencode/plugins/event-log/index.ts` with no config entry.
- `setup(ctx)` runs inside the OpenCode **background service**, so `process.cwd()` is *not*
  the project directory (`C:\Users\danie` in our capture). Derive paths from `import.meta.url`.
- `ctx.location` = `{ directory, project }` — the project the plugin instance was loaded for.
- **`ctx.event.subscribe()` is a global stream**: while loaded for `D:\opencode-pixel\spike`,
  it also delivered events for a session running in `D:\Instagram Cortes`. Group by
  `event.location.directory` (present on most events).
- `ctx` domains available in 2.1.3: `agent, aisdk, app, command, credential, event, experimental,
  generate, integration, location, mcp, model, options, permission, plugin, provider, reference,
  rpc, session, shell, skill, storage, tool, vcs, websearch, worktree`.

## Event envelope

```jsonc
{
  "id": "evt_...",              // event id (some events also carry "durable": { aggregateID, seq, version })
  "created": 1792709059081,     // ms epoch
  "type": "session.tool.called",
  "location": { "directory": "D:\\opencode-pixel\\spike" },
  "data": { /* per-type payload; often includes sessionID */ }
}
```

## Catalog observed in a real session

### Session / turn lifecycle

| Event | Payload keys | Meaning | Office mapping |
| --- | --- | --- | --- |
| `session.created` | `sessionID, projectID, location, subpath, slug, model, version` (+ `parentID, title, agent` for subagents) | New session, or a **child session when `parentID` is present** | Spawn character (subagent character if `parentID`) |
| `session.inbox.enqueued` | `sessionID, inboxID, item{type,payload{text,files},delivery}` | User prompt admitted | Bubble "new task", character wakes |
| `session.inbox.delivered` | `sessionID, inboxID` | Prompt handed to the agent | Start "thinking" |
| `session.execution.started` | `sessionID` | Agent loop started | Working |
| `session.step.started` | `sessionID, assistantMessageID, agent, model, snapshot, started` | One model step begins | Working / typing |
| `session.step.ended` | `..., finish, rawFinish, cost, tokens{input,output,reasoning,cache}` | Step finished; `finish: "tool-calls" \| "stop" \| ...` | `tool-calls` → keep working; `stop` → turn done |
| `session.step.streamed` | `sessionID, assistantMessageID` | Streaming boundary | (ignore) |
| `session.execution.succeeded` | `sessionID` | **Turn completed** — the "done/idle" signal | Character sits, "Done" |
| `session.execution.failed` | `sessionID, error` | Turn aborted with error | Red bubble + error |
| `session.step.failed` | `..., error, files, snapshot` | Step-level failure | Red bubble |
| `session.usage.updated` | `cost, sessionID, tokens` | Token/cost accounting | Optional HUD |

### Tools

| Event | Payload keys | Meaning | Office mapping |
| --- | --- | --- | --- |
| `session.tool.input.started` | `sessionID, assistantMessageID, id, name` | Model began streaming tool args | "Preparing…" |
| `session.tool.input.ended` | `..., text` | Tool args complete | — |
| `session.tool.called` | `..., id, input, executed` | **Tool invoked** (`id` = call id, `input` = args) | Walk to station; status from `name`/`input` |
| `session.tool.progress` | `..., id, metadata` | Progress ticks (e.g. long shell) | Keep "busy" |
| `session.tool.success` | `..., id, content, metadata` | Tool result (`metadata.exit`, `status`) | Tool done; next status |
| `session.tool.failed` | `..., id, error{type,message}, executed` | Tool failed (e.g. `permission.rejected`) | Red bubble |

Tool names observed via hooks: `write`, `shell`, `subagent` (the V2 spelling differs from V1's
`Write`/`Bash`/`Task` — map both spellings case-insensitively).

### Permissions

| Event | Payload keys | Meaning | Office mapping |
| --- | --- | --- | --- |
| `permission.asked` | `sessionID, id, action, resources[], save[], source{type,messageID,id}` | **Agent is blocked waiting for the user** | "Waiting for permission" bubble + chime |
| `permission.replied` | `sessionID, requestID, reply` (`accept` \| `reject` \| ...) | Resolved | Clear bubble |

### Shell

| Event | Payload keys | Meaning |
| --- | --- | --- |
| `shell.created` | `info{id,status,command,cwd,shell,file,metadata.sessionID,time.started}` | A shell command started (this is how the `shell` tool runs) |
| `shell.exited` | `id, exit, status` | Shell command finished |

### Streaming (throttle these — 153 `session.reasoning.delta` in one short session)

`session.text.started/delta/ended`, `session.reasoning.started/delta/ended`,
`session.instructions.updated`, `session.step.streamed`.

Use them only as a "still working" heartbeat (e.g. typing animation), never as render triggers.

### Environment noise (observed, not needed for characters)

`command.updated`, `agent.updated`, `model.updated`, `provider.updated`, `plugin.updated`,
`skill.updated`, `reference.updated`, `integration.updated`, `websearch.updated`,
`project.updated`, `config.updated`, `vcs.branch.updated`, `mcp.status.changed`,
`mcp.resources.changed`, `session.diff` (not observed, referenced by V1 projects).

## Tool hooks (registered successfully)

```ts
await ctx.tool.hook("execute.before", (event) => {})  // event: { tool, id, input, sessionID, messageID, agent }
await ctx.tool.hook("execute.after",  (event) => {})  // same shape, runs after execution
```

Useful complement to the event stream: fires exactly when a tool starts, includes the parsed
`input` (e.g. `{ path, content }` for `write`, `{ command }` for `shell`) and the tool name
spelled in V2 form.

## Subagents

A subagent is a **child session**: `session.created` with `parentID` pointing at the parent
session, plus `title` (e.g. `"Create sub.txt file"`) and `agent` (e.g. `"desenvolvedor"`).
Its events (`session.execution.*`, `session.tool.*`) carry the child `sessionID`, so the office
can render it as a separate character linked to the parent.

## Not observed (handle defensively)

- `session.deleted` / any session-removal event (sessions persisted after `opencode run` exited).
- `session.compacted`, `session.error`, `session.diff`.
- Todo events (todos are behind the `experimental.todo` flag in V2).

Suggested policy: keep characters for sessions that emitted events, drop them after an idle
timeout when the underlying session is gone, and treat unknown event types as no-ops.

## Design implications

1. **One global stream is enough.** A single plugin instance sees every session on the machine,
   so the dashboard hub can be process-wide instead of per-project.
2. **`session.execution.succeeded` is the "done" signal** and `permission.asked` is the
   "waiting for you" signal — the two states the office must never confuse.
3. **Throttle deltas**; drive visuals from `*tool.*`, `execution.*`, `permission.*`, `shell.*`.
4. **Group by `location.directory`** to place characters in project areas.
