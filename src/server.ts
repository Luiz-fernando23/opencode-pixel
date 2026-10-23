/**
 * Dashboard server: static page + JSON state + Server-Sent Events stream.
 *
 * SSE instead of WebSockets on purpose: no dependency, the browser reconnects on its own,
 * and the payload (a few sessions) is tiny. Binds to 127.0.0.1 only.
 */
import fs from "node:fs"
import http from "node:http"
import path from "node:path"
import { fileURLToPath } from "node:url"

import type { OfficeStore } from "./state.ts"
import type { OfficeSnapshot } from "./types.ts"

const PUSH_INTERVAL_MS = 100
const PORT_ATTEMPTS = 12

export interface OfficeServerHandle {
  port: number
  url: string
  reused: boolean
  close: () => Promise<void>
}

export interface OfficeServerOptions {
  store: OfficeStore
  port: number
  version: string
  log: (message: string) => void
}

function webDir(): string {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "web")
}

async function probe(port: number): Promise<"office" | "taken" | "free"> {
  return await new Promise((resolve) => {
    const request = http.get(
      { host: "127.0.0.1", port, path: "/api/health", timeout: 700 },
      (response) => {
        let body = ""
        response.on("data", (chunk) => (body += chunk))
        response.on("end", () => {
          try {
            const parsed = JSON.parse(body) as { name?: string }
            resolve(parsed.name === "opencode-pixel" ? "office" : "taken")
          } catch {
            resolve("taken")
          }
        })
      },
    )
    request.on("timeout", () => {
      request.destroy()
      resolve("taken")
    })
    request.on("error", () => resolve("free"))
  })
}

const ASSET_TYPES = new Map<string, string>([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff2", "font/woff2"],
  [".txt", "text/plain; charset=utf-8"],
])

interface Asset {
  file: string
  type: string
}

function resolveAsset(root: string, route: string): Asset | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(route)
  } catch {
    return null
  }
  if (decoded.includes("\0")) return null
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "")
  if (!relative) return null

  // Resolve inside web/ only: a crafted ../../ route must not escape the package.
  const absolute = path.resolve(root, relative)
  if (absolute !== root && !absolute.startsWith(root + path.sep)) return null

  try {
    if (!fs.statSync(absolute).isFile()) return null
  } catch {
    return null
  }
  return { file: absolute, type: ASSET_TYPES.get(path.extname(absolute).toLowerCase()) ?? "application/octet-stream" }
}

export async function startServer(options: OfficeServerOptions): Promise<OfficeServerHandle | null> {
  const { store, version, log } = options
  const root = webDir()
  if (!fs.existsSync(path.join(root, "index.html"))) {
    log(`dashboard assets not found in ${root}`)
    return null
  }

  const clients = new Set<http.ServerResponse>()
  const startedAt = Date.now()
  let pending: OfficeSnapshot | null = null
  let timer: NodeJS.Timeout | null = null

  const flush = (): void => {
    timer = null
    const snapshot = pending
    pending = null
    if (!snapshot) return
    const payload = `event: state\ndata: ${JSON.stringify(snapshot)}\n\n`
    for (const client of clients) {
      try {
        client.write(payload)
      } catch {
        clients.delete(client)
      }
    }
  }

  const unsubscribe = store.subscribe((snapshot) => {
    pending = snapshot
    if (timer) return
    timer = setTimeout(flush, PUSH_INTERVAL_MS)
  })

  const server = http.createServer((request, response) => {
    const url = request.url ?? "/"
    const route = url.split("?")[0]

    if (route === "/api/health") {
      response.writeHead(200, { "content-type": "application/json" })
      response.end(JSON.stringify({ name: "opencode-pixel", version, uptime: (Date.now() - startedAt) / 1000 }))
      return
    }

    if (route === "/api/state") {
      response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" })
      response.end(JSON.stringify(store.snapshot()))
      return
    }

    // Other plugin instances forward their events here (idempotent: the reducer just
    // overwrites per-session state). Header check keeps stray local POSTs out.
    if (route === "/api/ingest" && request.method === "POST") {
      if (request.headers["x-opencode-pixel"] !== "1") {
        response.writeHead(403, { "content-type": "application/json" })
        response.end('{"error":"forbidden"}')
        return
      }
      let body = ""
      let aborted = false
      request.on("data", (chunk: Buffer) => {
        body += chunk
        if (body.length > 1_000_000) {
          aborted = true
          request.destroy()
        }
      })
      request.on("end", () => {
        if (aborted) return
        try {
          store.apply(JSON.parse(body))
          response.writeHead(200, { "content-type": "application/json" })
          response.end('{"ok":true}')
        } catch {
          response.writeHead(400, { "content-type": "application/json" })
          response.end('{"error":"invalid json"}')
        }
      })
      return
    }

    if (route === "/events") {
      response.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        connection: "keep-alive",
      })
      response.write(`event: state\ndata: ${JSON.stringify(store.snapshot())}\n\n`)
      clients.add(response)
      request.on("close", () => clients.delete(response))
      return
    }

    const asset = resolveAsset(root, route)
    if (asset) {
      try {
        const body = fs.readFileSync(asset.file)
        response.writeHead(200, {
          "content-type": asset.type,
          "content-length": body.byteLength,
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        })
        response.end(request.method === "HEAD" ? undefined : body)
      } catch {
        response.writeHead(500, { "content-type": "text/plain" })
        response.end("asset missing")
      }
      return
    }

    response.writeHead(404, { "content-type": "text/plain" })
    response.end("not found")
  })

  let port = 0
  for (let attempt = 0; attempt < PORT_ATTEMPTS; attempt += 1) {
    const candidate = options.port + attempt
    const status = await probe(candidate)
    if (status === "office") {
      unsubscribe()
      log(`reusing dashboard already served on port ${candidate}`)
      return {
        port: candidate,
        url: `http://127.0.0.1:${candidate}/`,
        reused: true,
        close: async () => {},
      }
    }
    if (status === "taken") continue

    const bound = await new Promise<boolean>((resolve) => {
      const onError = (): void => resolve(false)
      server.once("error", onError)
      server.listen(candidate, "127.0.0.1", () => {
        server.removeListener("error", onError)
        resolve(true)
      })
    })
    if (bound) {
      port = candidate
      break
    }

    // Lost a bind race against another instance of this plugin. Give it a moment, then
    // reuse it instead of starting a second dashboard on the next port (split brain).
    await new Promise((resolve) => setTimeout(resolve, 200))
    if ((await probe(candidate)) === "office") {
      unsubscribe()
      log(`reusing dashboard already served on port ${candidate}`)
      return {
        port: candidate,
        url: `http://127.0.0.1:${candidate}/`,
        reused: true,
        close: async () => {},
      }
    }
  }

  if (port === 0) {
    unsubscribe()
    log("no free port for the dashboard")
    return null
  }

  return {
    port,
    url: `http://127.0.0.1:${port}/`,
    reused: false,
    close: async () => {
      unsubscribe()
      if (timer) clearTimeout(timer)
      for (const client of clients) {
        try {
          client.end()
        } catch {
          /* ignore */
        }
      }
      await new Promise<void>((resolve) => server.close(() => resolve()))
    },
  }
}
