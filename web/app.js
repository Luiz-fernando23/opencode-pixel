/**
 * opencode-pixel dashboard (phase 1).
 * Renders office state from the SSE stream: one desk per session, one character per agent.
 */

const canvas = document.getElementById("office");
const ctx = canvas.getContext("2d");
const statsEl = document.getElementById("stats");
const connEl = document.getElementById("conn");
const emptyEl = document.getElementById("empty");

const TILE = 24;
const DESK_W = TILE * 5;
const DESK_H = TILE * 4;
const PAD = TILE * 2;

const STATUS_COLORS = {
  idle: "#6c7490",
  thinking: "#e8b45f",
  tool: "#63a8f0",
  waiting: "#f4695f",
  done: "#7fd18b",
  error: "#f4695f",
};

const STATUS_LABEL = {
  idle: "idle",
  thinking: "thinking",
  tool: "working",
  waiting: "needs you",
  done: "done",
  error: "error",
};

let snapshot = { agents: [], stats: { sessions: 0, working: 0, waiting: 0, errors: 0 } };
let connected = false;
let start = performance.now();

function connect() {
  const source = new EventSource("/events");
  source.addEventListener("state", (event) => {
    snapshot = JSON.parse(event.data);
    if (!connected) {
      connected = true;
      connEl.textContent = "live";
      connEl.classList.add("live");
    }
    renderStats();
  });
  source.addEventListener("error", () => {
    connected = false;
    connEl.textContent = "reconnecting…";
    connEl.classList.remove("live");
  });
}

function renderStats() {
  const { sessions, working, waiting, errors } = snapshot.stats;
  const visible = pickVisible(snapshot.agents ?? []).length;
  const hidden = Math.max(0, sessions - visible);
  statsEl.innerHTML =
    `<span><b>${sessions}</b> sessions</span>` +
    `<span><b>${working}</b> working</span>` +
    `<span><b>${waiting}</b> waiting</span>` +
    (errors > 0 ? `<span style="color:#f4695f"><b>${errors}</b> errors</span>` : "") +
    (hidden > 0 ? `<span title="Only the most relevant sessions fit in the office">+<b>${hidden}</b> hidden</span>` : "");
  emptyEl.classList.toggle("hidden", sessions > 0);
}

function drawRoom() {
  ctx.fillStyle = "#12151f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // floor tiles
  for (let y = 0; y < canvas.height; y += TILE) {
    for (let x = 0; x < canvas.width; x += TILE) {
      const odd = ((x / TILE) + (y / TILE)) % 2 === 0;
      ctx.fillStyle = odd ? "#171b28" : "#141822";
      ctx.fillRect(x, y, TILE, TILE);
    }
  }

  // grid glow
  ctx.strokeStyle = "rgba(255,255,255,0.03)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += TILE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y <= canvas.height; y += TILE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(canvas.width, y + 0.5);
    ctx.stroke();
  }
}

function deskSlot(index) {
  const perRow = Math.max(1, Math.floor((canvas.width - PAD) / (DESK_W + PAD)));
  const col = index % perRow;
  const row = Math.floor(index / perRow);
  return {
    x: PAD + col * (DESK_W + PAD),
    y: PAD + row * (DESK_H + PAD * 1.6),
  };
}

function slotCount() {
  const cols = Math.max(1, Math.floor((canvas.width - PAD) / (DESK_W + PAD)));
  const rows = Math.max(1, Math.floor((canvas.height - PAD) / (DESK_H + PAD * 1.6)) + 1);
  return cols * rows;
}

/**
 * The office has room for a handful of desks. Show every agent that is doing something,
 * then fill the rest with the most recent idle sessions (stable order by first sighting).
 */
function pickVisible(agents) {
  const capacity = slotCount();
  if (agents.length <= capacity) return agents;
  const priority = (agent) => (agent.status === "idle" ? 1 : 0);
  const selected = new Set(
    [...agents]
      .sort((a, b) => priority(a) - priority(b) || b.lastEventAt - a.lastEventAt)
      .slice(0, capacity)
      .map((agent) => agent.sessionID),
  );
  return agents.filter((agent) => selected.has(agent.sessionID));
}

function drawDesk(slot) {
  const { x, y } = slot;
  ctx.fillStyle = "#2b3247";
  ctx.fillRect(x + 6, y + TILE * 2.4, DESK_W - 12, TILE * 0.9);
  ctx.fillStyle = "#3a4260";
  ctx.fillRect(x + 6, y + TILE * 2.4, DESK_W - 12, TILE * 0.35);

  // monitor
  ctx.fillStyle = "#1b2030";
  ctx.fillRect(x + DESK_W / 2 - 22, y + TILE * 0.9, 44, TILE * 1.5);
  ctx.fillStyle = "#0e1119";
  ctx.fillRect(x + DESK_W / 2 - 19, y + TILE * 1.05, 38, TILE * 1.2);
}

function drawScreen(slot, agent, time) {
  const { x, y } = slot;
  const lit = agent.status === "tool" || agent.status === "thinking";
  ctx.fillStyle = lit ? "#2c4a6b" : "#151a26";
  ctx.fillRect(x + DESK_W / 2 - 19, y + TILE * 1.05, 38, TILE * 1.2);
  if (!lit) return;
  ctx.fillStyle = "#7fb6ff";
  const lines = 4;
  for (let i = 0; i < lines; i += 1) {
    const phase = Math.sin(time / 220 + i * 1.3) * 0.5 + 0.5;
    const w = 8 + phase * 26;
    ctx.fillRect(x + DESK_W / 2 - 15, y + TILE * 1.2 + i * 5, w, 2);
  }
}

function drawCharacter(slot, agent, time) {
  const { x, y } = slot;
  const bob = Math.sin(time / 300 + agent.sessionID.length) * 1.5;
  const cx = x + DESK_W / 2;
  const cy = y + TILE * 2.4 + bob;
  const body = STATUS_COLORS[agent.status] ?? STATUS_COLORS.idle;
  const sub = Boolean(agent.parentID);
  const scale = sub ? 0.8 : 1;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  // head
  ctx.fillStyle = "#f0c9a8";
  ctx.fillRect(-6, -18, 12, 10);
  // hair
  ctx.fillStyle = "#3a2a22";
  ctx.fillRect(-7, -20, 14, 4);
  // body
  ctx.fillStyle = body;
  ctx.fillRect(-7, -8, 14, 12);
  // arms typing when working
  ctx.fillStyle = "#f0c9a8";
  const typing = agent.status === "tool" || agent.status === "thinking";
  const arm = typing ? Math.sin(time / 90) * 1.6 : 0;
  ctx.fillRect(-11, -5 + arm, 4, 4);
  ctx.fillRect(7, -5 - arm, 4, 4);
  // legs
  ctx.fillStyle = "#26304a";
  ctx.fillRect(-6, 4, 5, 5);
  ctx.fillRect(1, 4, 5, 5);

  ctx.restore();
}

function wrapText(text, max) {
  const words = String(text ?? "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).trim().length > max) {
      if (line) lines.push(line);
      line = word;
    } else {
      line = (line + " " + word).trim();
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function projectName(agent) {
  const dir = String(agent.directory || "").replace(/[\\/]+$/, "");
  const parts = dir.split(/[\\/]/);
  return parts[parts.length - 1] || "";
}

function drawLabel(slot, agent) {
  const { x, y } = slot;
  const title = agent.title || agent.slug || projectName(agent) || agent.sessionID.slice(0, 12);
  ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillStyle = "rgba(230,232,239,0.9)";
  ctx.fillText(title.slice(0, 22), x + DESK_W / 2, y + TILE * 3.9);
  ctx.fillStyle = "rgba(139,144,163,0.9)";
  const project = projectName(agent);
  const status = STATUS_LABEL[agent.status] ?? agent.status;
  const subtitle = project && project !== title ? `${status} · ${project}` : status;
  ctx.fillText(subtitle.slice(0, 26), x + DESK_W / 2, y + TILE * 4.6);
  ctx.textAlign = "left";
}

function drawBubble(slot, agent, time) {
  if (agent.status !== "waiting" && agent.status !== "error" && agent.status !== "done") return;
  const { x, y } = slot;
  const lines = wrapText(agent.statusText, 26);
  const w = Math.max(120, Math.max(...lines.map((l) => l.length)) * 6.4 + 18);
  const h = 16 + lines.length * 13;
  const bx = x + DESK_W / 2 - w / 2;
  const by = y - h - 2 + Math.sin(time / 260) * 1.5;
  const color = agent.status === "done" ? "#7fd18b" : agent.status === "waiting" ? "#f4695f" : "#f4695f";

  ctx.fillStyle = "rgba(20,24,34,0.96)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, w, h, 6);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + DESK_W / 2 - 5, by + h);
  ctx.lineTo(x + DESK_W / 2 + 5, by + h);
  ctx.lineTo(x + DESK_W / 2, by + h + 6);
  ctx.closePath();
  ctx.fillStyle = "rgba(20,24,34,0.96)";
  ctx.fill();

  ctx.fillStyle = color;
  ctx.font = "11px 'Segoe UI', system-ui, sans-serif";
  lines.forEach((line, index) => {
    ctx.fillText(line, bx + 9, by + 14 + index * 13);
  });
}

function draw(time) {
  drawRoom();
  const agents = pickVisible(snapshot.agents ?? []);
  agents.forEach((agent, index) => {
    const slot = deskSlot(index);
    drawDesk(slot);
    drawScreen(slot, agent, time);
    drawCharacter(slot, agent, time);
    drawLabel(slot, agent);
    drawBubble(slot, agent, time);
  });
  requestAnimationFrame(draw);
}

connect();
requestAnimationFrame(draw);
