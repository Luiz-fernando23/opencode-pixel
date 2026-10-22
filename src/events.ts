/**
 * OpenCode V2 event -> office state reducer.
 *
 * The catalog this is based on lives in docs/event-catalog.md (captured from a real
 * 2.1.3 session). Unknown event types are ignored on purpose: OpenCode emits a lot of
 * environment noise (`model.updated`, `mcp.status.changed`, ...) that has no office meaning.
 */
import type { AgentState, AgentTool, AgentStatus } from "./types.ts"

/** The subset of an OpenCode event envelope this reducer reads. */
export interface OpenCodeEvent {
  id?: string
  created?: number
  type?: string
  location?: { directory?: string }
  data?: Record<string, unknown>
}

const MAX_STATUS_TEXT = 80

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function basename(filePath: string): string {
  const parts = filePath.split(/[\\/]/)
  return parts[parts.length - 1] || filePath
}

function clip(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim()
  return oneLine.length > MAX_STATUS_TEXT ? oneLine.slice(0, MAX_STATUS_TEXT - 1) + "\u2026" : oneLine
}

/** Tool names are lowercase in V2 (`write`, `shell`, `subagent`) but be defensive. */
function toolKey(name: string): string {
  return name.toLowerCase()
}

/** "Editing app.ts", "Running: npm test", ... shown in the office bubble. */
export function formatToolStatus(name: string, input?: unknown): string {
  const args = asRecord(input) ?? {}
  const file = asString(args.path) ?? asString(args.filePath) ?? asString(args.file)
  switch (toolKey(name)) {
    case "read":
      return file ? `Reading ${basename(file)}` : "Reading"
    case "write":
      return file ? `Writing ${basename(file)}` : "Writing"
    case "edit":
    case "patch":
      return file ? `Editing ${basename(file)}` : "Editing"
    case "glob":
      return "Searching files"
    case "grep":
      return "Searching code"
    case "shell":
    case "bash": {
      const command = asString(args.command)
      return command ? `Running: ${clip(command)}` : "Running a command"
    }
    case "task":
    case "subagent": {
      const description = asString(args.description) ?? asString(args.prompt)
      return description ? `Subtask: ${clip(description)}` : "Running a subtask"
    }
    case "webfetch":
      return "Fetching web content"
    case "websearch":
      return "Searching the web"
    case "todowrite":
      return "Updating the plan"
    default:
      return `Using ${name}`
  }
}

function sessionIDOf(event: OpenCodeEvent): string | undefined {
  return asString(event.data?.sessionID)
}

export interface ReduceResult {
  /** Sessions whose state changed (touched with a new status), by session id. */
  changed: string[]
  /** Session ids that should be removed from the office. */
  removed: string[]
}

/**
 * Apply one OpenCode event to the map of known agents.
 * Mutates `agents` in place; returns which sessions changed.
 */
export function reduce(agents: Map<string, AgentState>, event: OpenCodeEvent): ReduceResult {
  const changed: string[] = []
  const removed: string[] = []
  const type = event.type ?? ""
  const at = asNumber(event.created) ?? Date.now()
  const data = event.data ?? {}
  const sessionID = sessionIDOf(event)

  const touch = (id: string, mutate: (agent: AgentState) => void): void => {
    const agent = agents.get(id)
    if (!agent) return
    mutate(agent)
    agent.lastEventAt = at
    changed.push(id)
  }

  const setStatus = (id: string, status: AgentStatus, statusText?: string): void => {
    touch(id, (agent) => {
      agent.status = status
      if (statusText !== undefined) agent.statusText = statusText
      if (status !== "tool") agent.tool = undefined
      if (status !== "waiting") agent.permission = undefined
    })
  }

  switch (type) {
    case "session.created": {
      const id = sessionID
      if (!id) break
      const existing = agents.get(id)
      const parentID = asString(data.parentID)
      const model = asRecord(data.model)
      const state: AgentState = existing ?? {
        sessionID: id,
        directory: asString(data.subpath)
          ? (asString(event.location?.directory) ?? "")
          : (asString(event.location?.directory) ?? ""),
        status: "idle",
        statusText: "Idle",
        firstSeenAt: at,
        lastEventAt: at,
      }
      state.parentID = parentID ?? state.parentID
      state.title = asString(data.title) ?? state.title
      state.slug = asString(data.slug) ?? state.slug
      state.agent = asString(data.agent) ?? state.agent
      state.model = asString(model?.id) ?? state.model
      state.directory = asString(event.location?.directory) ?? state.directory
      agents.set(id, state)
      changed.push(id)
      break
    }

    case "session.inbox.enqueued": {
      if (!sessionID) break
      setStatus(sessionID, "thinking", "New task received")
      break
    }

    case "session.execution.started":
    case "session.step.started": {
      if (!sessionID) break
      setStatus(sessionID, "thinking", "Thinking")
      break
    }

    case "session.tool.input.started": {
      if (!sessionID) break
      const name = asString(data.name) ?? "tool"
      setStatus(sessionID, "tool", formatToolStatus(name))
      break
    }

    case "session.tool.called": {
      if (!sessionID) break
      const callID = asString(data.id) ?? "?"
      const name = asString(data.name) ?? "tool"
      const tool: AgentTool = { name, callID, input: data.input, startedAt: at }
      touch(sessionID, (agent) => {
        agent.status = "tool"
        agent.statusText = formatToolStatus(name, data.input)
        agent.tool = tool
        agent.permission = undefined
      })
      break
    }

    case "session.tool.success": {
      if (!sessionID) break
      touch(sessionID, (agent) => {
        agent.tool = undefined
        agent.status = "thinking"
        agent.statusText = "Working"
      })
      break
    }

    case "session.tool.failed": {
      if (!sessionID) break
      const error = asRecord(data.error)
      const message = asString(error?.message) ?? "Tool failed"
      setStatus(sessionID, "error", clip(message))
      break
    }

    case "permission.asked": {
      if (!sessionID) break
      const id = asString(data.id) ?? "?"
      const action = asString(data.action) ?? "action"
      const resources = Array.isArray(data.resources)
        ? data.resources.filter((item): item is string => typeof item === "string")
        : []
      touch(sessionID, (agent) => {
        agent.status = "waiting"
        agent.permission = { id, action, resources, askedAt: at }
        agent.statusText = resources.length
          ? `Waiting: ${clip(resources.join(", "))}`
          : `Waiting for permission (${action})`
      })
      break
    }

    case "permission.replied": {
      if (!sessionID) break
      const reply = asString(data.reply) ?? "replied"
      touch(sessionID, (agent) => {
        agent.permission = undefined
        agent.status = reply === "reject" ? "error" : "thinking"
        agent.statusText = reply === "reject" ? "Permission denied" : "Working"
      })
      break
    }

    case "session.step.ended": {
      if (!sessionID) break
      const tokens = asRecord(data.tokens)
      const finish = asString(data.finish)
      const cost = asNumber(data.cost)
      touch(sessionID, (agent) => {
        agent.finish = finish ?? agent.finish
        agent.cost = cost ?? agent.cost
        if (tokens) {
          agent.tokens = {
            input: asNumber(tokens.input) ?? 0,
            output: asNumber(tokens.output) ?? 0,
            reasoning: asNumber(tokens.reasoning) ?? 0,
          }
        }
      })
      break
    }

    case "session.execution.succeeded": {
      if (!sessionID) break
      setStatus(sessionID, "done", "Done")
      break
    }

    case "session.execution.failed": {
      if (!sessionID) break
      const error = asRecord(data.error)
      const message = asString(error?.message) ?? "Turn failed"
      setStatus(sessionID, "error", clip(message))
      break
    }

    case "session.step.failed": {
      if (!sessionID) break
      const error = asRecord(data.error)
      const message = asString(error?.message) ?? "Step failed"
      setStatus(sessionID, "error", clip(message))
      break
    }

    case "session.deleted": {
      if (!sessionID) break
      agents.delete(sessionID)
      removed.push(sessionID)
      break
    }

    default:
      break
  }

  return { changed, removed }
}
