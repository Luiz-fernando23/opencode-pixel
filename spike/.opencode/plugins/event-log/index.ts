/**
 * Phase 0 spike: log the real OpenCode V2 event catalog.
 *
 * This plugin is disposable. It exists to answer: which `event.type` values does
 * OpenCode V2 emit, and what does each payload look like? Findings are written to
 * docs/event-catalog.md.
 *
 * Deliberately dependency-free: it default-exports a plain `{ id, setup }` object
 * (the documented V2 plugin shape) instead of importing `@opencode/plugin`, so a
 * runtime resolution problem cannot hide the event data.
 */
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

// The plugin runs inside the OpenCode background service, whose cwd is NOT the
// project directory, so derive the log path from this module's own location.
const LOG =
  process.env.PIXEL_SPIKE_LOG ||
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "events.jsonl")

function trim(value, depth = 0, budget = { n: 0 }) {
  if (budget.n > 4000) return "[truncated]"
  if (value === null || value === undefined) return value
  const t = typeof value
  if (t === "string") {
    budget.n += 32
    return value.length > 400 ? value.slice(0, 400) + `\u2026(${value.length})` : value
  }
  if (t === "number" || t === "boolean") return value
  if (t === "bigint") return String(value)
  if (t === "function") return "[function]"
  if (Array.isArray(value)) {
    if (depth > 4) return `[array(${value.length})]`
    return value.slice(0, 40).map((item) => trim(item, depth + 1, budget))
  }
  if (t === "object") {
    if (depth > 5) return "[object]"
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      budget.n += 8
      out[k] = trim(v, depth + 1, budget)
    }
    return out
  }
  return String(value)
}

function log(entry) {
  try {
    fs.mkdirSync(path.dirname(LOG), { recursive: true })
    fs.appendFileSync(LOG, JSON.stringify({ t: Date.now(), ...entry }) + "\n")
  } catch {
    /* the spike must never break the host */
  }
}

export default {
  id: "pixel-spike",
  async setup(ctx) {
    log({
      kind: "setup",
      directory: ctx?.location?.directory ?? null,
      project: ctx?.location?.project?.id ?? null,
      version: ctx?.app?.version ?? null,
      domains: ctx ? Object.keys(ctx).sort() : [],
    })

    const controller = new AbortController()
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          log({ kind: "event", type: event?.type ?? "?", event: trim(event) })
        }
      } catch (error) {
        log({ kind: "subscribe.error", message: String(error) })
      }
    })()

    for (const name of ["execute.before", "execute.after"]) {
      try {
        await ctx.tool.hook(name, (event) => {
          log({
            kind: `tool.${name}`,
            tool: event?.tool ?? null,
            keys: event ? Object.keys(event).sort() : [],
            input: trim(event?.input),
            output: trim(event?.output ?? event?.result),
          })
        })
        log({ kind: "hook.registered", hook: `tool.${name}` })
      } catch (error) {
        log({ kind: "hook.error", hook: `tool.${name}`, message: String(error) })
      }
    }

    return () => {
      try {
        controller.abort()
      } catch {
        /* ignore */
      }
    }
  },
}
