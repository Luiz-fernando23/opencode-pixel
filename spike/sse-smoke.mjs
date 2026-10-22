/** Quick SSE smoke test: reads the first state frame from the dashboard stream. */
const url = process.argv[2] ?? "http://127.0.0.1:5117/events"
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 6000)

const response = await fetch(url, { signal: controller.signal, headers: { accept: "text/event-stream" } })
const reader = response.body.getReader()
const decoder = new TextDecoder()
let buffer = ""
try {
  while (buffer.length < 40) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const marker = buffer.indexOf("\n\n")
    if (marker !== -1) break
  }
} finally {
  clearTimeout(timeout)
  controller.abort()
}

const frame = buffer.split("\n\n")[0] ?? ""
const dataLine = frame.split("\n").find((line) => line.startsWith("data: "))
if (!dataLine) {
  console.error("no data frame received; got:", JSON.stringify(buffer.slice(0, 200)))
  process.exit(1)
}
const snapshot = JSON.parse(dataLine.slice("data: ".length))
console.log("SSE frame ok:", JSON.stringify(snapshot.stats), "agents:", snapshot.agents.length)
