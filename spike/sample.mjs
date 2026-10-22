/**
 * Print the first observed payload for one or more event types.
 * Usage: node spike/sample.mjs <events.jsonl> session.step.ended session.created ...
 */
import fs from "node:fs"

const [file, ...types] = process.argv.slice(2)
if (!file || types.length === 0) {
  console.error("usage: node spike/sample.mjs <events.jsonl> <type> [type...]")
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

const all = process.argv.includes("--all")

for (const type of types) {
  const matches = lines.filter((l) => l.kind === "event" && l.type === type)
  console.log(`\n===== ${type} (${matches.length} occurrences) =====`)
  if (matches.length === 0) {
    console.log("(not observed)")
    continue
  }
  if (all) {
    matches.forEach((match, index) => {
      const data = match.event?.data ?? match.event
      console.log(`--- #${index + 1} ---`)
      console.log(JSON.stringify(data, null, 1).slice(0, 1400))
    })
    continue
  }
  console.log(JSON.stringify(matches[0].event, null, 1).slice(0, 2200))
  if (matches.length > 1) {
    const last = matches[matches.length - 1].event
    console.log(`--- last of ${matches.length} ---`)
    console.log(JSON.stringify(last, null, 1).slice(0, 1200))
  }
}
