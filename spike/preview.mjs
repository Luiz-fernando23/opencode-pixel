/**
 * Local preview server for iterating on the dashboard art without loading the plugin.
 * Serves the repo root (web/ and spike/) and a deterministic demo snapshot on /api/state
 * and /events, so the real app.js can run unchanged.
 *
 *   node spike/preview.mjs [port]
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const port = Number(process.argv[2] ?? 5180);
const now = Date.now();

const dirs = [
  "C:\\Users\\danie\\projetos\\checkout-api",
  "C:\\Users\\danie\\projetos\\pixel-office",
  "C:\\Users\\danie\\projetos\\mobile-app",
  "C:\\Users\\danie\\projetos\\landing-page",
  "C:\\Users\\danie\\projetos\\data-pipeline",
  "C:\\Users\\danie\\projetos\\design-system",
  "C:\\Users\\danie\\projetos\\billing",
  "C:\\Users\\danie\\projetos\\docs",
];

const titles = [
  "Refactor checkout flow",
  "Build the office renderer",
  "Fix push notifications",
  "Hero section polish",
  "Backfill analytics events",
  "Tokens and dark mode",
  "Retry failed invoices",
  "Rewrite getting started",
];

const statuses = ["tool", "tool", "thinking", "waiting", "done", "idle", "error", "tool"];

const agents = titles.map((title, i) => ({
  sessionID: `ses_demo_${i}`,
  directory: dirs[i],
  title,
  slug: title.toLowerCase().replace(/[^a-z]+/g, "-"),
  agent: "build",
  model: "opencode/deepseek-v4.1-flash-free",
  status: statuses[i],
  statusText:
    statuses[i] === "tool"
      ? ["Editing src/renderer.ts", "Running npm test", "Searching the repo", "Reading docs/events.md"][i % 4]
      : statuses[i] === "waiting"
        ? "Allow writing to src/index.ts?"
        : statuses[i] === "done"
          ? "Finished the turn"
          : statuses[i] === "error"
            ? "Tool failed: ENOENT"
            : statuses[i] === "thinking"
              ? "Thinking about the layout"
              : "Waiting for a session",
  tool: statuses[i] === "tool" ? { name: "edit", callID: `call_${i}`, startedAt: now - 4000 } : undefined,
  lastEventAt: now - i * 1200,
  firstSeenAt: now - 60000,
}));

function stats() {
  return {
    sessions: agents.length,
    working: agents.filter((a) => a.status === "tool" || a.status === "thinking").length,
    waiting: agents.filter((a) => a.status === "waiting").length,
    errors: agents.filter((a) => a.status === "error").length,
  };
}

const snapshot = { agents, stats: stats(), updatedAt: now };

function setStatus(agent, status) {
  agent.status = status;
  agent.lastEventAt = Date.now();
  agent.permission =
    status === "waiting"
      ? { id: "perm_demo", action: "edit", resources: ["src/index.ts"], askedAt: Date.now() }
      : undefined;
  agent.tool =
    status === "tool"
      ? { name: "edit", callID: `call_${agent.sessionID}_${Date.now()}`, startedAt: Date.now() }
      : undefined;
  agent.statusText =
    status === "tool"
      ? "Editing src/renderer.ts"
      : status === "waiting"
        ? "Allow writing to src/index.ts?"
        : status === "done"
          ? "Finished the turn"
          : status === "error"
            ? "Tool failed: ENOENT"
            : status === "thinking"
              ? "Thinking about the layout"
              : "Waiting for a session";
}

const clients = new Set();
function broadcast() {
  snapshot.stats = stats();
  snapshot.updatedAt = Date.now();
  const payload = `event: state\ndata: ${JSON.stringify(snapshot)}\n\n`;
  for (const client of clients) client.write(payload);
}

// Cycle one agent every few seconds so the preview exercises walking, bubbles and
// done/error transitions. The initial snapshot still contains one of every state.
const cycles = [
  ["tool", "waiting"],
  ["tool", "thinking"],
  ["thinking", "done"],
  ["waiting", "tool"],
  ["done", "idle"],
  ["idle", "tool"],
  ["error", "thinking"],
  ["tool", "error"],
];
let tick = 0;
setInterval(() => {
  const agent = agents[tick % agents.length];
  const cycle = cycles[tick % cycles.length];
  const at = cycle.indexOf(agent.status);
  setStatus(agent, at === -1 ? cycle[0] : cycle[(at + 1) % cycle.length]);
  broadcast();
  tick += 1;
}, 5000).unref?.();

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".json": "application/json; charset=utf-8",
};

http
  .createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/api/state") {
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      res.end(JSON.stringify(snapshot));
      return;
    }
    if (url.pathname === "/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream",
        "cache-control": "no-store",
        connection: "keep-alive",
      });
      res.write(`event: state\ndata: ${JSON.stringify(snapshot)}\n\n`);
      clients.add(res);
      req.on("close", () => clients.delete(res));
      return;
    }

    const pathname = decodeURIComponent(url.pathname);
    const rel = pathname === "/" ? "/web/index.html" : pathname.startsWith("/spike/") || pathname.startsWith("/web/") ? pathname : `/web${pathname}`;
    const file = path.resolve(root, `.${rel}`);
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    res.writeHead(200, {
      "content-type": mime[path.extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(fs.readFileSync(file));
  })
  .listen(port, "127.0.0.1", () => {
    console.log(`preview: http://127.0.0.1:${port}/  (live demo state)`);
    console.log(`sprites: http://127.0.0.1:${port}/spike/sprite-lab.html`);
  });
