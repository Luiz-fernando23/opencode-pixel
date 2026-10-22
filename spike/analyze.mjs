/**
 * Phase 0 spike analyzer: distill a raw events.jsonl into a readable catalog.
 *
 * Usage: node spike/analyze.mjs <path-to-events.jsonl> [--full] [--all]
 */
import fs from "node:fs"

const file = process.argv[2]
const full = process.argv.includes("--full")
if (!file) {
  console.error("usage: node spike/analyze.mjs <events.jsonl> [--full]")
  process.exit(1)
}

const lines = fs
  .readFileSync(file, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((line) => {
    try {
      return JSON.parse(line)
    } catch {
      return null
    }
  })
  .filter(Boolean)

const byKind = new Map()
for (const line of lines) {
  byKind.set(line.kind, (byKind.get(line.kind) ?? 0) + 1)
}

const events = lines.filter((l) => l.kind === "event")
const byType = new Map()
for (const line of events) {
  const type = line.type ?? "?"
  if (!byType.has(type)) byType.set(type, { count: 0, sample: line.event, keys: new Set() })
  const entry = byType.get(type)
  entry.count += 1
  const payload = line.event?.data ?? line.event
  if (payload && typeof payload === "object") {
    for (const key of Object.keys(payload)) entry.keys.add(key)
  }
}

const setup = lines.filter((l) => l.kind === "setup")
console.log("=== setup ===")
for (const s of setup) {
  console.log(`dir=${s.directory} project=${s.project} version=${s.version}`)
  console.log(`ctx domains: ${(s.domains ?? []).join(", ")}`)
}

console.log("\n=== kinds ===")
for (const [kind, count] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`${String(count).padStart(5)}  ${kind}`)
}

console.log("\n=== event types ===")
for (const [type, info] of [...byType.entries()].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`${String(info.count).padStart(5)}  ${type}`)
  console.log(`        keys: ${[...info.keys].sort().join(", ") || "-"}`)
  if (full) console.log("        sample: " + JSON.stringify(info.sample).slice(0, 1600))
}

console.log("\n=== tool hooks ===")
const toolHooks = lines.filter((l) => l.kind?.startsWith("tool."))
const toolNames = new Map()
for (const hook of toolHooks) {
  const key = `${hook.kind}:${hook.tool}`
  toolNames.set(key, (toolNames.get(key) ?? 0) + 1)
}
for (const [key, count] of [...toolNames.entries()].sort()) {
  console.log(`${String(count).padStart(5)}  ${key}`)
}
const firstHook = toolHooks[0]
if (firstHook) console.log("first hook payload: " + JSON.stringify(firstHook).slice(0, 1200))
