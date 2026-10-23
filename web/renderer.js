/**
 * Office renderer: static scene + dynamic agents. The scene is drawn at 1x into an
 * offscreen canvas and blitted at an integer scale, so pixels stay square.
 */
import { P } from "./art/palette.js";
import { makeCanvas, rect, hline, px, dither } from "./art/draw.js";
import { buildScene, LAYOUT, SCENE } from "./art/scene.js";
import { drawCharacter } from "./art/characters.js";
import { lookFor } from "./art/palette.js";
import { chair } from "./art/props.js";

const STATUS = {
  idle: { color: P.metal, label: "idle" },
  thinking: { color: P.amber, label: "thinking" },
  tool: { color: P.blueHi, label: "working" },
  waiting: { color: P.redHi, label: "needs you" },
  done: { color: P.greenHi, label: "done" },
  error: { color: P.red, label: "error" },
};

const CAPACITY = LAYOUT.desks.length;
const WALK_SPEED = 52; // art pixels per second

function projectName(agent) {
  const dir = String(agent.directory ?? "").replace(/[\\/]+$/, "");
  return dir.split(/[\\/]/).pop() || "";
}

function pickVisible(agents) {
  if (agents.length <= CAPACITY) return agents;
  // Top-level sessions get desks first; subagents only fill spare seats.
  const rank = (a) => (a.parentID ? 4 : a.status === "idle" ? 2 : a.status === "done" ? 1 : 0);
  const keep = new Set(
    [...agents]
      .sort((a, b) => rank(a) - rank(b) || b.lastEventAt - a.lastEventAt)
      .slice(0, CAPACITY)
      .map((a) => a.sessionID),
  );
  return agents.filter((a) => keep.has(a.sessionID));
}

function drawScreen(g, d, agent, time) {
  const s = d.screen;
  g.save();
  g.beginPath();
  g.rect(s.x, s.y, s.w, s.h);
  g.clip();
  rect(g, s.x, s.y, s.w, s.h, P.screen);
  hline(g, s.x, s.y, s.w, "#22303f");

  const status = agent.status;
  if (status === "tool") {
    const colors = [P.code1, P.code2, P.code3, P.code4];
    for (let row = 0; row < 6; row += 1) {
      const y = s.y + 2 + row * 2;
      const offset = (time / 120 + row * 3 + agent.sessionID.length) % 8;
      let x = s.x + 2 - offset;
      for (let seg = 0; seg < 3; seg += 1) {
        const len = 3 + ((row * 5 + seg * 7) % 8);
        rect(g, x, y, len, 1, colors[(row + seg) % colors.length]);
        x += len + 1;
        if (x > s.x + s.w - 2) break;
      }
    }
    if (Math.floor(time / 500) % 2 === 0) {
      rect(g, s.x + s.w - 4, s.y + s.h - 4, 2, 2, P.code1);
    }
  } else if (status === "thinking") {
    rect(g, s.x + 1, s.y + 1, s.w - 2, s.h - 2, "#12202e");
    const dots = Math.floor(time / 350) % 4;
    for (let i = 0; i < 3; i += 1) {
      px(g, s.x + 8 + i * 3, s.y + 7, i < dots ? P.amberHi : "#3a4a5a");
    }
    hline(g, s.x + 3, s.y + 10, 6, "#2b4052");
    hline(g, s.x + 3, s.y + 11, 4, "#2b4052");
  } else if (status === "waiting" || status === "error") {
    const pulse = Math.floor(time / 300) % 2 === 0;
    rect(g, s.x + 1, s.y + 1, s.w - 2, s.h - 2, pulse ? "#3a1c22" : "#2a1620");
    const cx = s.x + 12;
    const cy = s.y + 3;
    rect(g, cx, cy, 2, 6, P.redHi);
    rect(g, cx, cy + 7, 2, 2, P.redHi);
    if (status === "error") {
      hline(g, s.x + 3, s.y + 11, s.w - 6, P.red);
      hline(g, s.x + 5, s.y + 12, s.w - 10, "#7a2a2a");
    }
  } else if (status === "done") {
    rect(g, s.x + 1, s.y + 1, s.w - 2, s.h - 2, "#12251e");
    const cx = s.x + 8;
    const cy = s.y + 5;
    rect(g, cx, cy + 2, 2, 6, P.greenHi);
    rect(g, cx + 2, cy + 6, 2, 2, P.greenHi);
    rect(g, cx + 4, cy + 4, 2, 2, P.greenHi);
    rect(g, cx + 6, cy + 2, 2, 2, P.greenHi);
    rect(g, cx + 8, cy, 2, 2, P.greenHi);
  } else {
    for (let i = 0; i < 5; i += 1) {
      px(g, s.x + 4 + ((i * 7 + 3) % 18), s.y + 3 + ((i * 5 + 2) % 9), "#2e465c");
    }
    if (Math.floor(time / 900) % 2 === 0) {
      px(g, s.x + s.w - 5, s.y + s.h - 4, P.amberDk);
    }
  }
  g.restore();
}

function drawGlow(g, d, status, time) {
  const color = STATUS[status]?.color ?? P.metal;
  if (status === "idle") return;
  const alpha = status === "waiting" ? 0.12 + (Math.sin(time / 200) + 1) * 0.03 : 0.07;
  dither(g, d.x + 10, d.y + 8, 28, 12, withAlpha(color, alpha));
}

function withAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(n.slice(0, 2), 16);
  const gg = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  return `rgba(${r},${gg},${b},${alpha})`;
}

function bubble(g, x, y, kind) {
  const color = kind === "done" ? P.greenHi : kind === "idle" ? P.blueHi : kind === "thinking" ? P.amberHi : P.redHi;
  rect(g, x - 7, y - 12, 14, 12, P.outline);
  rect(g, x - 6, y - 11, 12, 9, "#20242f");
  hline(g, x - 6, y - 11, 12, "#303746");
  rect(g, x - 2, y - 2, 4, 2, P.outline);
  rect(g, x - 1, y, 2, 1, P.outline);

  if (kind === "waiting" || kind === "error") {
    rect(g, x - 1, y - 9, 2, 5, color);
    rect(g, x - 1, y - 3, 2, 1, color);
  } else if (kind === "done") {
    rect(g, x - 3, y - 6, 2, 2, color);
    rect(g, x - 1, y - 4, 2, 2, color);
    rect(g, x + 1, y - 6, 2, 2, color);
    rect(g, x + 3, y - 8, 2, 2, color);
  } else if (kind === "thinking") {
    px(g, x - 3, y - 6, color);
    px(g, x, y - 6, color);
    px(g, x + 3, y - 6, color);
  } else {
    hline(g, x - 2, y - 8, 5, color);
    px(g, x + 1, y - 7, color);
    px(g, x - 1, y - 6, color);
    hline(g, x - 2, y - 5, 5, color);
  }
}

/** Standing agents step to the right of the desk; everyone else sits. */
function targetFor(agent, d) {
  if (agent.status === "waiting" || agent.status === "done") {
    return { x: d.x + 56, y: d.y + 56, mode: "standing" };
  }
  return { x: d.seat.x, y: d.seat.y, mode: "seated" };
}

function sameTarget(a, b) {
  return a.mode === b.mode && a.x === b.x && a.y === b.y;
}

/**
 * A new session enters from the lounge doorway, crosses the divider, then follows
 * the runner to its desk. Row 1 walks up to the chair; row 2 loops around the
 * desk through the gap so it never walks over the furniture.
 */
function entryPath(d, target) {
  const path = [
    { x: 560, y: 326 },
    { x: 540, y: 322 },
    { x: 500, y: 322 },
    { x: 500, y: 226 },
    { x: 390, y: 226 },
    { x: 360, y: 226 },
    { x: 350, y: 206 },
    { x: 350, y: 166 },
  ];
  if (d.id < 4) {
    path.push({ x: d.x + 72, y: 166 });
    path.push({ x: d.x + 72, y: target.y });
    path.push({ x: target.x, y: target.y });
  } else if (target.mode === "seated") {
    path.push({ x: d.x + 72, y: 166 });
    path.push({ x: d.x + 72, y: 238 });
    path.push({ x: d.x + 32, y: 238 });
    path.push({ x: target.x, y: target.y });
  } else {
    path.push({ x: d.x + 72, y: 166 });
    path.push({ x: d.x + 72, y: target.y });
    path.push({ x: target.x, y: target.y });
  }
  return path;
}

function snapMotion(m, target) {
  m.target = target;
  m.x = target.x;
  m.y = target.y;
  m.mode = target.mode;
  m.path = [];
  m.dir = target.mode === "seated" ? "up" : "down";
}

function createMotion(d, target, initial) {
  if (initial) {
    return { x: target.x, y: target.y, mode: target.mode, target, path: [], dir: target.mode === "seated" ? "up" : "down", seatID: d.id, walkFrame: 1 };
  }
  return {
    x: LAYOUT.spawn.x,
    y: LAYOUT.spawn.y,
    mode: "walking",
    target,
    path: entryPath(d, target),
    dir: "up",
    seatID: d.id,
    walkFrame: 1,
  };
}

/** A small floating diamond marks sessions created by a subagent/task tool. */
function drawSubagentMark(g, x, headTop) {
  const mx = x + 10;
  const my = headTop - 2;
  px(g, mx, my, P.blueHi);
  px(g, mx - 1, my + 1, P.blue);
  px(g, mx, my + 1, P.blueHi);
  px(g, mx + 1, my + 1, P.blue);
  px(g, mx, my + 2, P.blueHi);
}

function drawSmoke(g, d, time) {
  const rise = Math.floor(time / 220) % 6;
  for (let i = 0; i < 3; i += 1) {
    const px0 = d.screen.x - 2 + i * 3;
    const py = d.screen.y - 3 - ((rise + i * 2) % 6);
    px(g, px0, py, i % 2 === 0 ? "#6b6f7a" : "#4a4f5c");
  }
}

function drawAgent(g, d, agent, m, time) {
  const look = lookFor(agent.sessionID);
  const t = Math.floor(time / 120);

  if (m.mode === "walking") {
    const x = Math.round(m.x);
    const y = Math.round(m.y);
    drawCharacter(g, x, y, look, {
      dir: m.dir,
      pose: "walk",
      frame: m.walkFrame,
    });
    if (agent.parentID) drawSubagentMark(g, x, y - 26);
    return;
  }

  if (m.mode === "standing") {
    const x = Math.round(m.x);
    const y = Math.round(m.y);
    drawCharacter(g, x, y, look, {
      dir: "down",
      pose: agent.status === "done" ? "cheer" : "wave",
    });
    if (agent.parentID) drawSubagentMark(g, x, y - 26);
    bubble(g, x, y - 24, agent.status === "done" ? "done" : "waiting");
    return;
  }

  const x = Math.round(m.x);
  const y = Math.round(m.y);
  if (agent.status === "error") {
    drawCharacter(g, x, y + 2, look, { dir: "up", pose: "type" });
    if (agent.parentID) drawSubagentMark(g, x, y - 19);
    drawSmoke(g, d, time);
    return;
  }

  const typing = agent.status === "tool" || agent.status === "thinking";
  const bob = typing ? (t % 2 === 0 ? 0 : -1) : 0;
  drawCharacter(g, x, y, look, { dir: "up", pose: "type", bob, blink: t % 37 === 0 });
  if (agent.parentID) drawSubagentMark(g, x, y - 21);
  if (agent.status === "thinking") bubble(g, x, y - 24, "thinking");
  if (agent.status === "idle") bubble(g, x, y - 24, "idle");
}

function updateMotions(motions, dt, time) {
  for (const m of motions.values()) {
    if (m.mode !== "walking") continue;
    let remaining = WALK_SPEED * dt;
    let guard = 0;
    while (remaining > 0 && m.path.length && guard < 64) {
      guard += 1;
      const p = m.path[0];
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.0001) {
        m.path.shift();
        continue;
      }
      m.dir = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : dy < 0 ? "up" : "down";
      if (dist <= remaining) {
        m.x = p.x;
        m.y = p.y;
        m.path.shift();
        remaining -= dist;
      } else {
        m.x += (dx / dist) * remaining;
        m.y += (dy / dist) * remaining;
        remaining = 0;
      }
    }
    if (!m.path.length) {
      m.x = m.target.x;
      m.y = m.target.y;
      m.mode = m.target.mode;
      m.dir = m.target.mode === "seated" ? "up" : "down";
    }
    m.walkFrame = Math.floor(time / 130) % 2 ? 1 : 3;
  }
}

export function createOffice(canvas) {
  const scale = 2;
  canvas.width = SCENE.w * scale;
  canvas.height = SCENE.h * scale;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;

  const scene = buildScene();
  const { canvas: buffer, g: bg } = makeCanvas(SCENE.w, SCENE.h);

  let snapshot = { agents: [], stats: { sessions: 0, working: 0, waiting: 0, errors: 0 } };
  let visible = [];
  let hidden = 0;
  let initialized = false;
  let seatOf = new Map();
  const motions = new Map();
  let lastTime = 0;
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  function setState(next) {
    snapshot = next;
    const picked = pickVisible(next.agents ?? []);
    hidden = Math.max(0, (next.agents ?? []).length - picked.length);
    const first = !initialized;

    // stable seats: keep a session's desk while it is visible, then fill free desks
    const nextSeat = new Map();
    const used = new Set();
    for (const agent of picked) {
      const desk = seatOf.get(agent.sessionID);
      if (desk && !used.has(desk.id)) {
        nextSeat.set(agent.sessionID, desk);
        used.add(desk.id);
      }
    }
    for (const agent of picked) {
      if (nextSeat.has(agent.sessionID)) continue;
      const free = LAYOUT.desks.find((d) => !used.has(d.id));
      if (!free) break;
      nextSeat.set(agent.sessionID, free);
      used.add(free.id);
    }
    seatOf = nextSeat;
    visible = picked.filter((a) => seatOf.has(a.sessionID));

    const alive = new Set(visible.map((agent) => agent.sessionID));
    for (const id of [...motions.keys()]) {
      if (!alive.has(id)) motions.delete(id);
    }

    for (const agent of visible) {
      const d = seatOf.get(agent.sessionID);
      const target = targetFor(agent, d);
      let m = motions.get(agent.sessionID);
      if (!m) {
        m = createMotion(d, target, first || reduced);
        motions.set(agent.sessionID, m);
        continue;
      }
      m.seatID = d.id;
      if (!sameTarget(m.target, target)) {
        m.target = target;
        if (reduced) {
          snapMotion(m, target);
        } else {
          m.path = [{ x: target.x, y: target.y }];
          m.mode = "walking";
        }
      }
    }

    initialized = true;
    if (reduced) draw(performance.now());
    return { hidden };
  }

  function draw(time) {
    bg.drawImage(scene.canvas, 0, 0);

    for (const agent of visible) {
      const d = seatOf.get(agent.sessionID);
      drawGlow(bg, d, agent.status, time);
      drawScreen(bg, d, agent, time);
    }

    // dynamic props and people share one y-sorted pass, so a chair in front of a
    // seated character covers their lower back while a standing character stays in front.
    const items = [];
    for (const agent of visible) {
      const d = seatOf.get(agent.sessionID);
      const m = motions.get(agent.sessionID);
      if (!m) continue;
      items.push({ base: m.y, order: 1, kind: "agent", agent, d, m });
    }
    for (const agent of visible) {
      const d = seatOf.get(agent.sessionID);
      items.push({ base: d.chair.y + 20, order: 0, kind: "chair", d });
    }
    items.sort((a, b) => a.base - b.base || a.order - b.order);

    for (const item of items) {
      if (item.kind === "chair") chair(bg, item.d.chair.x, item.d.chair.y);
      else drawAgent(bg, item.d, item.agent, item.m, time);
    }

    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(buffer, 0, 0, SCENE.w, SCENE.h, 0, 0, SCENE.w * scale, SCENE.h * scale);
  }

  function frame(time) {
    const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0.016;
    lastTime = time;
    if (!reduced) updateMotions(motions, dt, time);
    draw(time);
    if (!reduced) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  return {
    setState,
    get hidden() {
      return hidden;
    },
    stats: () => snapshot.stats,
    visibleCount: () => visible.length,
    projectName,
    statuses: STATUS,
    motions: () =>
      [...motions.entries()].map(([sessionID, m]) => ({
        sessionID,
        x: Math.round(m.x),
        y: Math.round(m.y),
        mode: m.mode,
        dir: m.dir,
        path: m.path.map((p) => ({ x: p.x, y: p.y })),
        target: m.target,
      })),
    layout: () =>
      visible.map((agent) => {
        const desk = seatOf.get(agent.sessionID);
        return {
          sessionID: agent.sessionID,
          agent,
          project: projectName(agent) || agent.slug || "session",
          label: desk.label,
          desk,
          subagent: Boolean(agent.parentID),
        };
      }),
  };
}
