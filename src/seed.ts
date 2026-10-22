/**
 * Seed the office with sessions that already exist, so a freshly loaded plugin shows the
 * sessions that started before it (the event stream only reports new activity).
 *
 * The API response is treated as untrusted shape on purpose: `ctx.session.list()` is typed
 * by the client schema, but a plugin must keep working if the server adds or renames fields.
 */
import type { AgentState } from "./types.ts"
import type { OfficeStore } from "./state.ts"

type Unknown = Record<string, unknown>

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined
}

function asRecord(value: unknown): Unknown | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Unknown) : undefined
}

/** Timestamps arrive as numbers, ISO strings or decoded DateTime objects depending on the API. */
function toMillis(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string") {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  const record = asRecord(value)
  if (!record) return undefined
  for (const key of ["epochMillis", "epoch", "millis", "value"]) {
    const candidate = record[key]
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate
  }
  return undefined
}

function listOf(result: unknown): Unknown[] {
  if (Array.isArray(result)) return result.filter((item): item is Unknown => Boolean(asRecord(item)))
  const record = asRecord(result)
  const sessions = record?.sessions ?? record?.items ?? record?.data
  return Array.isArray(sessions)
    ? sessions.filter((item): item is Unknown => Boolean(asRecord(item)))
    : []
}

function toAgent(session: Unknown): AgentState | null {
  const sessionID = asString(session.id) ?? asString(session.sessionID)
  if (!sessionID) return null
  const location = asRecord(session.location)
  const model = asRecord(session.model)
  const time = asRecord(session.time)
  const now = Date.now()
  return {
    sessionID,
    parentID: asString(session.parentID),
    directory: asString(location?.directory) ?? asString(session.directory) ?? "",
    title: asString(session.title),
    slug: asString(session.slug),
    agent: asString(session.agent),
    model: asString(model?.id) ?? asString(session.model),
    status: "idle",
    statusText: "Idle",
    firstSeenAt: toMillis(time?.created) ?? now,
    lastEventAt: toMillis(time?.updated) ?? now,
  }
}

export function seedAgents(store: OfficeStore, sessions: unknown): number {
  let added = 0
  for (const session of listOf(sessions)) {
    const agent = toAgent(session)
    if (!agent || store.get(agent.sessionID)) continue
    store.add(agent)
    added += 1
  }
  return added
}
