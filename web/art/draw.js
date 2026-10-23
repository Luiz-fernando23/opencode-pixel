/** Pixel drawing helpers. Everything snaps to whole pixels, nothing is anti-aliased. */

export function makeCanvas(w, h) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const g = canvas.getContext("2d");
  g.imageSmoothingEnabled = false;
  return { canvas, g };
}

export function rect(g, x, y, w, h, color) {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function px(g, x, y, color) {
  rect(g, x, y, 1, 1, color);
}

export function hline(g, x, y, w, color) {
  rect(g, x, y, w, 1, color);
}

export function vline(g, x, y, h, color) {
  rect(g, x, y, 1, h, color);
}

export function outlined(g, x, y, w, h, fill, outline = "#241f2d") {
  rect(g, x, y, w, h, outline);
  rect(g, x + 1, y + 1, w - 2, h - 2, fill);
}

/** 50% checkerboard, pixel aligned to the destination. */
export function dither(g, x, y, w, h, color, phase = 0) {
  g.fillStyle = color;
  for (let yy = 0; yy < h; yy += 1) {
    for (let xx = (yy + phase) % 2; xx < w; xx += 2) {
      g.fillRect(x + xx, y + yy, 1, 1);
    }
  }
}

export function ditherRect(g, x, y, w, h, color, phase = 0) {
  dither(g, x, y, w, h, color, phase);
}

/** Soft-ish drop shadow, still made of pixels: solid core plus a dithered rim. */
export function groundShadow(g, x, y, w, h, color = "rgba(10,10,18,0.38)") {
  g.fillStyle = color;
  g.fillRect(x + 2, y, w - 4, h);
  g.fillRect(x, y + 2, w, h - 4);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  g.fillStyle = color.replace(/[\d.]+\)$/, "0.2)");
  g.fillRect(x + 2, y - 1, w - 4, 1);
  g.fillRect(x - 1, y + 2, 1, h - 4);
  g.fillRect(x + 2, y + h, w - 4, 1);
  g.fillRect(x + w, y + 2, 1, h - 4);
}

/** Ellipse approximated in blocky steps, useful for rugs and light pools. */
export function pEllipse(g, cx, cy, rx, ry, color) {
  g.fillStyle = color;
  for (let y = -ry; y <= ry; y += 1) {
    const span = Math.floor(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    g.fillRect(Math.round(cx - span), Math.round(cy + y), Math.max(1, span * 2 + 1), 1);
  }
}

/** A 2x2 dither pattern cached as a canvas pattern (cheap repeated fills). */
const patternCache = new Map();
export function pattern(g, color, alpha = 1, phase = 0) {
  const key = `${color}|${alpha}|${phase}`;
  let p = patternCache.get(key);
  if (!p) {
    const { canvas, g: pg } = makeCanvas(2, 2);
    pg.fillStyle = color;
    pg.globalAlpha = alpha;
    pg.fillRect(phase % 2, 0, 1, 1);
    pg.fillRect((phase + 1) % 2, 1, 1, 1);
    p = g.createPattern(canvas, "repeat");
    patternCache.set(key, p);
  }
  return p;
}

export function fillPattern(g, x, y, w, h, color, alpha = 1, phase = 0) {
  g.fillStyle = pattern(g, color, alpha, phase);
  g.fillRect(x, y, w, h);
}

export function text(g, str, x, y, color, font = "5px monospace") {
  g.font = font;
  g.textBaseline = "top";
  g.fillStyle = color;
  g.fillText(str, x, y);
}
