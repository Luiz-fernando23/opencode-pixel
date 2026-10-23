/**
 * Character art. Every character is built from the same hand-drawn parts:
 * head + hair overlay + torso + arms + legs. Palettes come from the session look,
 * so we get variety without shipping a sprite sheet per agent.
 *
 * Coordinates are art pixels. A standing character is 16x26, drawn with its feet
 * at (x, y). A seated character is drawn with its seat at (x, y).
 */
import { P } from "./palette.js";
import { mix } from "./color.js";

const W = 16;

function map(rows, name = "sprite") {
  const width = rows[0]?.length ?? 0;
  for (let i = 0; i < rows.length; i += 1) {
    if (rows[i].length !== width) {
      throw new Error(`${name}: row ${i} has ${rows[i].length} columns, expected ${width}: "${rows[i]}"`);
    }
  }
  return rows;
}

const HEAD_FRONT = map([
  "....oooooooo....",
  "..ooIIHHHHHHoo..",
  ".oHIIHHHHHHHHHo.",
  ".oHHIIHHhhhhHHo.",
  ".oHHhSSSSSShHHo.",
  ".oHhSSSSSSSShHo.",
  ".oHhSSSSSSSShHo.",
  ".oHhSSeSSSeShHo.",
  ".oHhSSSSSSSShHo.",
  ".oHhSSSSSSSShHo.",
  ".oHHsSSmmSSsHHo.",
  "..oHHssssssHHo..",
  "...ooHHHHHHoo...",
], "head-front");

const HEAD_BACK = map([
  "....oooooooo....",
  "..ooIIHHHHHHoo..",
  ".oHIIHHHHHHHHHo.",
  ".oHHIIHHhhhhHHo.",
  ".oHHHIIhhhhhHHo.",
  ".oHHHhhhhhhhHHo.",
  ".oHHHhhhhhhhHHo.",
  ".oHHHHhhhhhHHHo.",
  ".oHHHHHhhhHHHHo.",
  ".oHHHHHHHHHHHHo.",
  "..oHHHHHHHHHHo..",
  "...oHHHHHHHHo...",
  ".....oooooo.....",
], "head-back");

const HEAD_SIDE = map([
  "....oooooooo....",
  "..ooHHHHHHHHoo..",
  ".oHHHHHHHHHHHHo.",
  ".oHHHHHHHHHHHHo.",
  ".oHHHHhSSSSSSHo.",
  ".oHHHhSSSSSSSHo.",
  ".oHHHhSSeSSSSHo.",
  ".oHHHhSSSSSSSHo.",
  ".oHHHhSSSSSSHo..",
  ".oHHHsSSmSSSHo..",
  "..oHHsssssHHo...",
  "...oHHHHHHHoo...",
  ".....oooooo.....",
], "head-side");

const HAIR_LONG = map([
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "oH............Ho",
  "oH............Ho",
  "oH............Ho",
  "oH............Ho",
  "oH............Ho",
  "oH............Ho",
  "oH............Ho",
  "oH............Ho",
  "oH............Ho",
  "oH............Ho",
  ".o............o.",
  "................",
], "hair-long");

const HAIR_BANGS = map([
  "................",
  "................",
  "................",
  "................",
  "..hHHHHHHHHHHh..",
  "..hhhhhhhhhhhh..",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
  "................",
], "hair-bangs");

const HAIR_CURLY = map([
  "................",
  "................",
  "................",
  "..I..........I..",
  ".IHo........oHI.",
  ".IHH........HHI.",
  ".IHH........HHI.",
  "..Ho........oH..",
  "................",
  "................",
  "................",
  "................",
  "................",
], "hair-curly");

const TORSO_FRONT = map([
  "...oooooooooo...",
  "..oCCCCCCCCCCo..",
  ".oCCVVVVVVVVCCo.",
  ".oCCVVVVVVVVCCo.",
  ".oCCCCCCCCCCCCo.",
  ".oCCCCCCCCCCCCo.",
  ".oCCCCCCCCCCCCo.",
  "..oCCCCCCCCCCo..",
  "...oooooooooo...",
], "torso-front");

const TORSO_BACK = map([
  "...oooooooooo...",
  "..oCCCCCCCCCCo..",
  ".oCCCCCCCCCCCCo.",
  ".oCCCCCCCCCCCCo.",
  ".oCCCCCCCCCCCCo.",
  ".oCCCCCCCCCCCCo.",
  ".oCCCCCCCCCCCCo.",
  "..oCCCCCCCCCCo..",
  "...oooooooooo...",
], "torso-back");

const TORSO_SIDE = map([
  "...ooooooooo....",
  "..oCCCCCCCCo....",
  ".oCCVVVVVVCCo...",
  ".oCCVVVVVVCCo...",
  ".oCCCCCCCCCCo...",
  ".oCCCCCCCCCCo...",
  ".oCCCCCCCCCCo...",
  "..oCCCCCCCCo....",
  "...oooooooo.....",
], "torso-side");

const LEGS_IDLE = map([
  "...oPPPPPPPPo...",
  "...oPPPooPPPo...",
  "...oPPP..PPPo...",
  "...oBBB..BBBo...",
  "...oooo..oooo...",
], "legs-idle");

const LEGS_WALK_A = map([
  "...oPPPPPPPPo...",
  "...oPPPooPPPo...",
  "..oPPP...PPPo...",
  "..oBBBo..oBBBo..",
  "..oooo....oooo..",
], "legs-walk-a");

const LEGS_WALK_B = map([
  "...oPPPPPPPPo...",
  "...oPPPooPPPo...",
  "...oPPP.oPPPo...",
  "...oBBBo.oBBBo..",
  "...oooo...oooo..",
], "legs-walk-b");

const LEGS_SIT = map([
  "...oPPPPPPPPo...",
  "..oPPPPPPPPPPo..",
  "..oBBB..BBBBBo..",
  "..oooo..ooooo...",
], "legs-sit");

const ARM = map([
  ".oo.",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oSSo",
  ".oo.",
], "arm");

const ARM_UP = map([
  ".oo.",
  "oSSo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  ".oo.",
], "arm-up");

const ARM_BACK = map([
  ".oo.",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  "oCCo",
  ".oo.",
], "arm-back");

const HAIR_STYLES = [null, "long", "bangs", "curly", "long", "bangs", "curly", "long"];

function colorsFor(look) {
  const hair = look.hair;
  const skin = look.skin;
  const shirt = look.shirt;
  const pants = look.pants;
  return {
    o: P.outline,
    h: hair[0],
    H: hair[1] ?? hair[0],
    I: hair[2] ?? hair[1] ?? hair[0],
    s: mix(skin[1] ?? skin[0], P.ink, 0.25),
    S: skin[1] ?? skin[0],
    F: skin[0],
    e: P.ink,
    m: "#8f4a44",
    c: mix(shirt, P.ink, 0.32),
    C: shirt,
    V: mix(shirt, "#fff4dc", 0.22),
    p: mix(pants, P.ink, 0.32),
    P: pants,
    b: "#17131c",
    B: "#2d2835",
    a: P.metalDk,
    A: P.metalHi,
  };
}

function stamp(g, rows, x, y, colors, flip = false) {
  const h = rows.length;
  const width = rows[0].length;
  for (let row = 0; row < h; row += 1) {
    const line = rows[row];
    for (let col = 0; col < width; col += 1) {
      const ch = line[col];
      if (ch === "." || ch === undefined) continue;
      const color = colors[ch];
      if (!color) continue;
      const dx = flip ? width - 1 - col : col;
      g.fillStyle = color;
      g.fillRect(x + dx, y + row, 1, 1);
    }
  }
}

function drawHead(g, x, y, look, dir, style, blink) {
  const colors = colorsFor(look);
  const head = dir === "up" ? HEAD_BACK : dir === "left" || dir === "right" ? HEAD_SIDE : HEAD_FRONT;
  stamp(g, head, x, y, colors);

  if (style === "long") stamp(g, HAIR_LONG, x, y, colors);
  if (style === "bangs") stamp(g, HAIR_BANGS, x, y, colors);
  if (style === "curly") stamp(g, HAIR_CURLY, x, y, colors);

  if (look.style === 2 || look.style === 6) {
    // beanie
    g.fillStyle = colors.c;
    g.fillRect(x + 3, y + 1, 10, 3);
    g.fillStyle = colors.C;
    g.fillRect(x + 3, y + 2, 10, 1);
    g.fillStyle = colors.V;
    g.fillRect(x + 3, y + 4, 10, 1);
    g.fillStyle = colors.o;
    g.fillRect(x + 2, y + 1, 1, 4);
    g.fillRect(x + 13, y + 1, 1, 4);
  }

  if (look.style === 4) {
    // bun, sitting on the crown rather than floating above it
    g.fillStyle = colors.o;
    g.fillRect(x + 5, y - 2, 6, 1);
    g.fillRect(x + 4, y - 1, 1, 3);
    g.fillRect(x + 11, y - 1, 1, 3);
    g.fillStyle = colors.H;
    g.fillRect(x + 5, y - 1, 6, 2);
    g.fillStyle = colors.I;
    g.fillRect(x + 6, y - 1, 2, 1);
  }

  if (look.style === 5) {
    // headphones
    g.fillStyle = colors.o;
    g.fillRect(x + 3, y - 1, 10, 1);
    g.fillRect(x + 2, y, 1, 2);
    g.fillRect(x + 13, y, 1, 2);
    g.fillStyle = colors.a;
    g.fillRect(x + 1, y + 5, 2, 5);
    g.fillRect(x + 13, y + 5, 2, 5);
    g.fillStyle = colors.A;
    g.fillRect(x + 1, y + 6, 1, 3);
    g.fillRect(x + 13, y + 6, 1, 3);
  }

  if (look.style === 7) {
    // round glasses
    g.fillStyle = colors.o;
    g.fillRect(x + 5, y + 6, 3, 1);
    g.fillRect(x + 5, y + 8, 3, 1);
    g.fillRect(x + 4, y + 7, 1, 1);
    g.fillRect(x + 8, y + 7, 1, 1);
    g.fillRect(x + 9, y + 6, 3, 1);
    g.fillRect(x + 9, y + 8, 3, 1);
    g.fillRect(x + 12, y + 7, 1, 1);
    g.fillRect(x + 8, y + 7, 1, 1);
  }

  if (blink) {
    g.fillStyle = colors.S;
    g.fillRect(x + 6, y + 7, 1, 1);
    g.fillRect(x + 10, y + 7, 1, 1);
    g.fillStyle = colors.o;
    g.fillRect(x + 6, y + 8, 1, 1);
    g.fillRect(x + 10, y + 8, 1, 1);
  }
}

function drawTorso(g, x, y, look, dir) {
  const colors = colorsFor(look);
  const torso = dir === "up" ? TORSO_BACK : dir === "left" || dir === "right" ? TORSO_SIDE : TORSO_FRONT;
  stamp(g, torso, x, y, colors);
}

function drawArm(g, x, y, look, dir, pose, side = 1) {
  const colors = colorsFor(look);
  const row = pose === "up" ? ARM_UP : dir === "up" ? ARM_BACK : ARM;
  stamp(g, row, x, y, colors, side < 0);
}

function drawLegs(g, x, y, look, frame, pose) {
  const colors = colorsFor(look);
  const legs = pose === "sit" ? LEGS_SIT : frame === 1 ? LEGS_WALK_A : frame === 3 ? LEGS_WALK_B : LEGS_IDLE;
  stamp(g, legs, x, y, colors);
}

/**
 * @param {CanvasRenderingContext2D} g
 * @param {number} x center x (art px)
 * @param {number} y baseline (feet for standing, seat for sitting)
 * @param {object} look
 * @param {{dir?: string, pose?: string, frame?: number, blink?: boolean, bob?: number}} opts
 */
export function drawCharacter(g, x, y, look, opts = {}) {
  const dir = opts.dir ?? "down";
  const pose = opts.pose ?? "stand";
  const frame = opts.frame ?? 0;
  const bob = opts.bob ?? (pose === "walk" && (frame === 1 || frame === 3) ? -1 : 0);
  const style = HAIR_STYLES[look.style % HAIR_STYLES.length];
  const left = Math.round(x - W / 2);
  const mirror = dir === "left";

  if (mirror) {
    // Mirror inside the character's own 16px box. Draw calls use absolute x, so the
    // translation has to account for `left` twice (once for the pivot, once for the
    // coordinate origin): screen = 2*left + W - 1 - x.
    g.save();
    g.translate(left * 2 + W - 1, 0);
    g.scale(-1, 1);
  }

  if (pose === "sit" || pose === "type" || pose === "sleep") {
    const top = Math.round(y - 21);
    const facing = pose === "sleep" ? "down" : "up";
    drawTorso(g, left, top + 12, look, facing);
    drawHead(g, left, top, look, facing, style, opts.blink);
    if (mirror) g.restore();
    return;
  }

  const headY = Math.round(y - 26 + bob);
  const torsoY = headY + 12;
  const legsY = torsoY + 9;
  const armY = headY + 13;

  drawLegs(g, left, legsY, look, frame, pose);
  drawTorso(g, left, torsoY, look, dir);

  if (pose === "wave") {
    drawArm(g, left - 1, armY, look, dir, "down", -1);
    drawHead(g, left, headY, look, dir, style, opts.blink);
    drawArm(g, left + 13, armY - 17, look, dir, "up", 1);
  } else if (pose === "cheer") {
    drawHead(g, left, headY, look, dir, style, opts.blink);
    drawArm(g, left - 3, armY - 17, look, dir, "up", -1);
    drawArm(g, left + 15, armY - 17, look, dir, "up", 1);
  } else {
    const swing = pose === "walk" && frame % 2 === 1 ? 1 : 0;
    drawArm(g, left - 1, armY + swing, look, dir, "down", -1);
    drawArm(g, left + 12, armY - swing, look, dir, "down", 1);
    drawHead(g, left, headY, look, dir, style, opts.blink);
  }

  if (mirror) g.restore();
}

export { W as CHARACTER_WIDTH };
