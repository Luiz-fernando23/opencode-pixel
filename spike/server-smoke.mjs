// Smoke test for the plugin HTTP server without starting OpenCode.
// Usage: node spike/server-smoke.mjs
import { startServer } from "../src/server.ts"

const store = {
  subscribe() {
    return () => {}
  },
  snapshot() {
    return { agents: [], stats: { sessions: 0, working: 0, waiting: 0, errors: 0 } }
  },
}

const handle = await startServer({ store, port: 5190, version: "smoke", log: console.log })
if (!handle) throw new Error("server did not start")

let failures = 0
async function check(label, path, expected, contains) {
  const response = await fetch(handle.url.replace(/\/$/, "") + path)
  const body = await response.text()
  const ok = response.status === expected && (!contains || body.includes(contains))
  console.log(`${ok ? "ok" : "FAIL"} ${label} -> ${response.status}`)
  if (!ok) failures += 1
}

await check("index", "/", 200, 'id="office"')
await check("app module", "/app.js", 200, "createOffice")
await check("scene module", "/art/scene.js", 200, "export")
await check("palette module", "/art/palette.js", 200, "LOOKS")
await check("state api", "/api/state", 200, '"stats"')
await check("missing asset", "/nope.js", 404)
await check("traversal encoded", "/art/%2e%2e/%2e%2e/package.json", 404)
await check("traversal plain", "/../package.json", 404)

await handle.close()
if (failures > 0) {
  console.error(`${failures} failure(s)`)
  process.exitCode = 1
} else {
  console.log("server smoke test passed")
}
