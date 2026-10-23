import { createOffice } from "./renderer.js";
import { SCENE } from "./art/scene.js";

const canvas = document.getElementById("office");
const statsEl = document.getElementById("stats");
const connEl = document.getElementById("conn");
const emptyEl = document.getElementById("empty");
const hintEl = document.getElementById("hint");
const labelsEl = document.getElementById("labels");
const hitsEl = document.getElementById("hits");
const rosterEl = document.getElementById("roster");
const toggleEl = document.getElementById("toggle-names");
const cardEl = document.getElementById("agent-card");
const cardStatus = document.getElementById("card-status");
const cardProject = document.getElementById("card-project");
const cardTitle = document.getElementById("card-title");
const cardMeta = document.getElementById("card-meta");
const cardNow = document.getElementById("card-now");

const office = createOffice(canvas);

const STATUS_LABEL = {
  idle: "idle",
  thinking: "thinking",
  tool: "working",
  waiting: "needs you",
  done: "done",
  error: "error",
};

let snapshot = { agents: [], stats: { sessions: 0, working: 0, waiting: 0, errors: 0 } };
let live = false;
let hoveredID = null;
let entriesByID = new Map();
let rosterSignature = "";
const labelNodes = new Map();
const hitNodes = new Map();

function renderStats() {
  const { sessions, working, waiting, errors } = snapshot.stats;
  const hidden = office.hidden;
  statsEl.innerHTML =
    `<span><b>${sessions}</b>session${sessions === 1 ? "" : "s"}</span>` +
    `<span><b>${working}</b>working</span>` +
    `<span${waiting ? ' class="warn"' : ""}><b>${waiting}</b>waiting</span>` +
    (errors ? `<span class="warn"><b>${errors}</b>error${errors === 1 ? "" : "s"}</span>` : "");
  emptyEl.classList.toggle("hidden", sessions > 0);
  hintEl.textContent = hidden > 0 ? `+${hidden} session${hidden === 1 ? "" : "s"} hidden` : "";
}

function labelFor(entry) {
  return entry.project || entry.agent.slug || "session";
}

function cardMetaText(agent) {
  const parts = [];
  if (agent.parentID) parts.push("subagent");
  if (agent.agent) parts.push(agent.agent);
  if (agent.model) parts.push(agent.model);
  if (agent.tokens) {
    const total = (agent.tokens.input ?? 0) + (agent.tokens.output ?? 0);
    if (total > 0) parts.push(`${Math.round(total / 1000)}k tokens`);
  }
  return parts.join(" · ") || agent.sessionID;
}

function cardNowText(agent) {
  if (agent.status === "waiting") {
    const action = agent.permission?.action;
    return action ? `Waiting for permission: ${action}` : agent.statusText || "Waiting for your input";
  }
  if (agent.status === "tool") {
    const tool = agent.tool?.name;
    return tool ? `${tool} · ${agent.statusText || "running"}` : agent.statusText || "Running a tool";
  }
  return agent.statusText || STATUS_LABEL[agent.status] || "";
}

function fillCard(entry) {
  const agent = entry.agent;
  cardStatus.textContent = STATUS_LABEL[agent.status] ?? agent.status;
  cardProject.textContent = entry.project;
  cardTitle.textContent = agent.title || agent.slug || "Untitled session";
  cardMeta.textContent = cardMetaText(agent);
  cardNow.textContent = cardNowText(agent);
}

function positionCard(node) {
  const rect = node.getBoundingClientRect();
  const width = cardEl.offsetWidth || 260;
  const height = cardEl.offsetHeight || 120;
  const margin = 12;
  const center = rect.left + rect.width / 2;
  const left = Math.min(Math.max(margin, center - width / 2), window.innerWidth - width - margin);
  const above = rect.top - 8 - height;
  const top = above > margin ? above : rect.bottom + 8;
  cardEl.style.left = `${Math.round(left)}px`;
  cardEl.style.top = `${Math.round(top)}px`;
}

function showCard(sessionID, node) {
  const entry = entriesByID.get(sessionID);
  if (!entry) return;
  hoveredID = sessionID;
  fillCard(entry);
  cardEl.className = `agent-card status-${entry.agent.status}`;
  cardEl.hidden = false;
  positionCard(node);
}

function hideCard() {
  hoveredID = null;
  cardEl.hidden = true;
}

function bindHover(node) {
  const id = () => node.dataset.sessionID;
  node.addEventListener("mouseenter", () => showCard(id(), node));
  node.addEventListener("mouseleave", hideCard);
  node.addEventListener("focus", () => showCard(id(), node));
  node.addEventListener("blur", hideCard);
  node.addEventListener("click", (event) => {
    event.stopPropagation();
    showCard(id(), node);
  });
}

function ensureLabel(entry) {
  let node = labelNodes.get(entry.sessionID);
  if (node) return node;
  node = document.createElement("div");
  node.className = "agent-label";
  node.tabIndex = 0;
  node.dataset.sessionID = entry.sessionID;
  node.innerHTML = '<span class="label-dot"></span><span class="label-name"></span>';
  bindHover(node);
  labelsEl.append(node);
  labelNodes.set(entry.sessionID, node);
  return node;
}

function ensureHit(entry) {
  let node = hitNodes.get(entry.sessionID);
  if (node) return node;
  node = document.createElement("div");
  node.className = "desk-hit";
  node.dataset.sessionID = entry.sessionID;
  bindHover(node);
  hitsEl.append(node);
  hitNodes.set(entry.sessionID, node);
  return node;
}

function renderLabels(entries, seen) {
  for (const entry of entries) {
    seen.add(`label:${entry.sessionID}`);
    const node = ensureLabel(entry);
    node.className = `agent-label status-${entry.agent.status}${entry.subagent ? " is-sub" : ""}`;
    node.style.left = `${(entry.label.x / SCENE.w) * 100}%`;
    node.style.top = `${(entry.label.y / SCENE.h) * 100}%`;
    node.querySelector(".label-name").textContent = labelFor(entry);
    node.setAttribute("aria-label", `${entry.project}: ${STATUS_LABEL[entry.agent.status] ?? entry.agent.status}`);
  }
  for (const [sessionID, node] of labelNodes) {
    if (seen.has(`label:${sessionID}`)) continue;
    node.remove();
    labelNodes.delete(sessionID);
  }
}

function renderHits(entries, seen) {
  for (const entry of entries) {
    seen.add(`hit:${entry.sessionID}`);
    const node = ensureHit(entry);
    const d = entry.desk;
    node.style.left = `${((d.x - 6) / SCENE.w) * 100}%`;
    node.style.top = `${((d.y - 16) / SCENE.h) * 100}%`;
    node.style.width = `${((d.w + 22) / SCENE.w) * 100}%`;
    node.style.height = `${((d.h + 46) / SCENE.h) * 100}%`;
  }
  for (const [sessionID, node] of hitNodes) {
    if (seen.has(`hit:${sessionID}`)) continue;
    node.remove();
    hitNodes.delete(sessionID);
  }
}

function renderRoster(entries) {
  const signature = entries
    .map((e) => `${e.sessionID}:${e.agent.status}:${e.subagent ? 1 : 0}:${labelFor(e)}`)
    .join("|");
  if (signature === rosterSignature) return;
  rosterSignature = signature;
  rosterEl.replaceChildren(
    ...entries.map((entry) => {
      const chip = document.createElement("div");
      chip.className = `roster-chip status-${entry.agent.status}${entry.subagent ? " is-sub" : ""}`;
      chip.tabIndex = 0;
      chip.dataset.sessionID = entry.sessionID;
      chip.setAttribute("aria-label", `${entry.project}: ${STATUS_LABEL[entry.agent.status] ?? entry.agent.status}`);
      chip.innerHTML = '<span class="label-dot"></span><span class="chip-name"></span>';
      chip.querySelector(".chip-name").textContent = labelFor(entry);
      bindHover(chip);
      return chip;
    }),
  );
}

function renderOverlay() {
  const entries = office
    .layout()
    .slice()
    .sort((a, b) => a.desk.id - b.desk.id);
  entriesByID = new Map(entries.map((entry) => [entry.sessionID, entry]));
  const seen = new Set();
  renderLabels(entries, seen);
  renderHits(entries, seen);
  renderRoster(entries);

  if (hoveredID) {
    const entry = entriesByID.get(hoveredID);
    if (!entry) {
      hideCard();
    } else {
      fillCard(entry);
      cardEl.className = `agent-card status-${entry.agent.status}`;
      const anchor = labelNodes.get(hoveredID) ?? hitNodes.get(hoveredID);
      if (anchor) positionCard(anchor);
    }
  }
}

function apply(next) {
  snapshot = next;
  office.setState(next);
  renderStats();
  renderOverlay();
}

function connect() {
  const source = new EventSource("/events");
  source.addEventListener("state", (event) => {
    try {
      apply(JSON.parse(event.data));
    } catch {
      return;
    }
    if (!live) {
      live = true;
      connEl.classList.add("live");
      connEl.innerHTML = "<i></i> live";
    }
  });
  source.addEventListener("error", () => {
    live = false;
    connEl.classList.remove("live");
    connEl.innerHTML = "<i></i> reconnecting";
  });
}

toggleEl.addEventListener("click", () => {
  const on = document.body.classList.toggle("show-names");
  toggleEl.setAttribute("aria-pressed", String(on));
  hideCard();
});

if (new URLSearchParams(window.location.search).has("debug")) {
  window.__opencodePixel = {
    apply,
    current: () => snapshot,
    office,
  };
}

window.addEventListener("scroll", hideCard, { passive: true });
window.addEventListener("resize", hideCard);
document.addEventListener("click", hideCard);

connect();
