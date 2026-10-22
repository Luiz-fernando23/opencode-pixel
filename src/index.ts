/**
 * opencode-pixel — pixel-art office dashboard for OpenCode agents.
 *
 * The plugin subscribes to the global V2 event stream, reduces it into office state, serves
 * the dashboard on localhost and opens it once.
 *
 * Hub behaviour: OpenCode can load this plugin more than once (one instance per project
 * location, another process, or across config reloads). Only one instance owns the HTTP
 * server; the others forward their events to it over POST /api/ingest and take over if the
 * owner disappears.
 */
import { Plugin } from "@opencode/plugin"

import { openBrowser } from "./browser.ts"
import { resolveOptions } from "./config.ts"
import { createLogger, logFile } from "./log.ts"
import { seedAgents } from "./seed.ts"
import { startServer, type OfficeServerHandle } from "./server.ts"
import { OfficeStore } from "./state.ts"
import type { OpenCodeEvent } from "./events.ts"

const PRUNE_INTERVAL_MS = 60 * 1000
const DONE_FADE_MS = 60 * 1000
const HEALTH_INTERVAL_MS = 5 * 1000
const HEALTH_FAILURES_BEFORE_TAKEOVER = 3

export default Plugin.define({
  id: "pixel-office",
  async setup(ctx) {
    const options = resolveOptions(ctx.options)
    const store = new OfficeStore(ctx.app.version)
    const log = createLogger("plugin")
    log(`loaded for ${ctx.location.directory} (opencode ${ctx.app.version}, log at ${logFile("plugin")})`)

    const start = async (): Promise<OfficeServerHandle | null> => {
      try {
        return await startServer({ store, port: options.port, version: ctx.app.version, log })
      } catch (error) {
        log(`server failed to start: ${String(error)}`)
        return null
      }
    }

    let handle = await start()

    let opened = false
    const openOnce = (): void => {
      if (!handle || handle.reused || opened || !options.autoOpen) return
      opened = true
      openBrowser(handle.url)
      log(`dashboard ready at ${handle.url}`)
    }

    const seed = async (): Promise<void> => {
      try {
        const seeded = seedAgents(store, await ctx.session.list())
        if (seeded > 0) log(`seeded ${seeded} existing session(s)`)
      } catch (error) {
        log(`could not list existing sessions: ${String(error)}`)
      }
    }

    // A second instance must not keep its own state: it forwards to whoever owns the server.
    let forwardTo: string | null = handle?.reused ? handle.url : null

    const apply = (event: OpenCodeEvent): void => {
      if (!forwardTo) {
        store.apply(event)
        return
      }
      void fetch(new URL("/api/ingest", forwardTo), {
        method: "POST",
        headers: { "content-type": "application/json", "x-opencode-pixel": "1" },
        body: JSON.stringify(event),
      }).catch(() => {
        /* the health watcher deals with a dead host */
      })
    }

    let failures = 0
    const watchHost = async (): Promise<void> => {
      if (!forwardTo) return
      try {
        const response = await fetch(new URL("/api/health", forwardTo), {
          signal: AbortSignal.timeout(2000),
        })
        if (response.ok) {
          failures = 0
          return
        }
        failures += 1
      } catch {
        failures += 1
      }
      if (failures < HEALTH_FAILURES_BEFORE_TAKEOVER) return

      log("dashboard host went away, taking over")
      forwardTo = null
      failures = 0
      handle = await start()
      if (handle) {
        await seed()
        openOnce()
      }
    }

    const health = setInterval(() => void watchHost(), HEALTH_INTERVAL_MS)
    if (typeof health.unref === "function") health.unref()

    const controller = new AbortController()
    void (async () => {
      try {
        for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
          const typed = event as OpenCodeEvent
          if (!options.watchAllSessions) {
            const directory = typed.location?.directory
            if (directory && directory !== ctx.location.directory) continue
          }
          apply(typed)
          openOnce()
        }
      } catch (error) {
        log(`event stream ended: ${String(error)}`)
      }
    })()

    if (!forwardTo) await seed()

    const prune = setInterval(() => {
      const removed = store.prune(options.idleTimeoutMs)
      if (removed > 0) log(`pruned ${removed} idle session(s)`)
      store.settle(DONE_FADE_MS)
    }, PRUNE_INTERVAL_MS)
    if (typeof prune.unref === "function") prune.unref()

    return () => {
      clearInterval(prune)
      clearInterval(health)
      controller.abort()
      void handle?.close()
    }
  },
})
