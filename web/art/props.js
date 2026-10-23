/**
 * Static office props, drawn at 1x. Everything is made of whole-pixel rects with
 * a dark outline, a top-left highlight and a bottom-right shadow, so the scene reads
 * as one coherent pixel-art room instead of a pile of rectangles.
 */
import { P } from "./palette.js";
import { rect, px, hline, vline, dither, groundShadow, pEllipse } from "./draw.js";

/* ------------------------------------------------------------------ floors */

export function woodFloor(g, x, y, w, h) {
  rect(g, x, y, w, h, P.floor1);
  const tones = [P.floor1, P.floor2, P.floor3, P.floor4];
  let seed = 7;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let row = 0; row < h; row += 10) {
    const tone = tones[Math.floor(rand() * tones.length)];
    rect(g, x, y + row, w, 10, tone);
    hline(g, x, y + row, w, P.floorLine);
    hline(g, x, y + row + 9, w, P.floor3);

    for (let xx = 0; xx < w; xx += 32) {
      const joint = x + xx + (row % 20 === 0 ? 16 : 0);
      if (joint > x && joint < x + w) {
        vline(g, joint, y + row, 10, P.floorLine);
      }
    }

    for (let i = 0; i < w / 42; i += 1) {
      const gx = x + Math.floor(rand() * (w - 7));
      const gy = y + row + 2 + Math.floor(rand() * 5);
      const len = 2 + Math.floor(rand() * 4);
      hline(g, gx, gy, len, rand() > 0.55 ? P.floorHi : P.floorLine);
    }
  }

  // ambient occlusion where the floor meets the walls
  for (let i = 0; i < 4; i += 1) {
    dither(g, x + i, y, w - i * 2, 4 - i, "rgba(12,10,18,0.55)");
  }
}

export function carpetFloor(g, x, y, w, h) {
  rect(g, x, y, w, h, P.carpet1);
  for (let yy = 0; yy < h; yy += 6) {
    hline(g, x, y + yy, w, P.carpet2);
  }
  for (let xx = 0; xx < w; xx += 6) {
    for (let yy = (xx / 6) % 2 === 0 ? 3 : 0; yy < h; yy += 6) {
      px(g, x + xx, y + yy, P.carpet3);
    }
  }
  // sparse fibers
  for (let i = 0; i < (w * h) / 520; i += 1) {
    const fx = x + ((i * 37) % w);
    const fy = y + ((i * 53) % h);
    px(g, fx, fy, P.carpet2);
  }
  for (let i = 0; i < 4; i += 1) {
    dither(g, x + i, y, w - i * 2, 4 - i, "rgba(8,10,18,0.45)");
  }
}

export function checkerFloor(g, x, y, w, h, tile = 16) {
  for (let yy = 0; yy < h; yy += tile) {
    for (let xx = 0; xx < w; xx += tile) {
      const light = (xx / tile + yy / tile) % 2 === 0;
      rect(g, x + xx, y + yy, Math.min(tile, w - xx), Math.min(tile, h - yy), light ? P.checkerL : P.checkerD);
      if (light) {
        hline(g, x + xx, y + yy, Math.min(tile, w - xx), "#e5dfcf");
        vline(g, x + xx, y + yy, Math.min(tile, h - yy), "#e5dfcf");
      }
    }
  }
  dither(g, x, y, w, 3, "rgba(8,8,14,0.45)");
}

export function rug(g, x, y, w, h) {
  rect(g, x, y, w, h, P.outline);
  rect(g, x + 1, y + 1, w - 2, h - 2, P.fabricDk);
  rect(g, x + 3, y + 3, w - 6, h - 6, "#3b3448");
  // border pattern
  for (let i = 0; i < w - 8; i += 8) {
    rect(g, x + 5 + i, y + 5, 4, 1, P.amberDk);
    rect(g, x + 5 + i, y + h - 6, 4, 1, P.amberDk);
  }
  // inner field with a simple diamond lattice
  for (let yy = y + 10; yy < y + h - 10; yy += 10) {
    for (let xx = x + 10; xx < x + w - 10; xx += 10) {
      px(g, xx, yy, "#6e627e");
      px(g, xx + 1, yy - 1, "#6e627e");
      px(g, xx + 1, yy + 1, "#6e627e");
      px(g, xx + 2, yy, "#6e627e");
      px(g, xx + 1, yy, P.amberDk);
    }
  }
  // fringe
  for (let xx = x + 2; xx < x + w - 2; xx += 3) {
    px(g, xx, y - 1, "#c9bda5");
    px(g, xx, y + h, "#c9bda5");
  }
  groundShadow(g, x + 2, y + h - 2, w - 4, 4);
}

/* -------------------------------------------------------------------- walls */

export function wallFace(g, x, y, w, h) {
  rect(g, x, y, w, h, P.wall);
  for (let xx = 0; xx < w; xx += 8) {
    vline(g, x + xx, y, h - 18, P.wallMid);
    vline(g, x + xx + 1, y, h - 18, "#3d5366");
  }
  // subtle dot pattern on the wallpaper
  for (let yy = y + 6; yy < y + h - 18; yy += 12) {
    for (let xx = 4; xx < w; xx += 16) {
      px(g, x + xx, yy, "#405568");
    }
  }
  // wainscot
  rect(g, x, y + h - 18, w, 12, P.wallDark);
  hline(g, x, y + h - 18, w, P.trimDark);
  for (let xx = 0; xx < w; xx += 24) {
    vline(g, x + xx, y + h - 17, 10, "#2a3c4b");
    hline(g, x + xx + 1, y + h - 16, 22, "#2a3c4b");
  }
  // baseboard
  rect(g, x, y + h - 6, w, 6, P.base);
  hline(g, x, y + h - 6, w, P.trim);
  hline(g, x, y + h - 5, w, "#2a3a49");
}

export function wallShadow(g, x, y, w) {
  for (let i = 0; i < 5; i += 1) {
    dither(g, x + i, y + i, w - i * 2, 1, "rgba(8,8,16,0.5)");
  }
}

/* -------------------------------------------------------------------- desks */

export function desk(g, x, y, variant = 0) {
  groundShadow(g, x + 2, y + 30, 60, 5);

  // legs
  rect(g, x + 3, y + 24, 3, 8, P.woodDark);
  rect(g, x + 58, y + 24, 3, 8, P.woodDark);
  vline(g, x + 3, y + 24, 8, "#6b4029");
  vline(g, x + 58, y + 24, 8, "#6b4029");

  // top
  rect(g, x, y + 3, 64, 25, P.outline);
  rect(g, x + 1, y + 4, 62, 20, P.woodMid);
  hline(g, x + 1, y + 4, 62, P.woodPale);
  hline(g, x + 2, y + 5, 60, P.woodHi);
  for (let yy = y + 10; yy < y + 23; yy += 6) {
    hline(g, x + 1, yy, 62, P.wood);
    if (variant % 2 === 0) hline(g, x + 18, yy + 2, 12, P.woodHi);
  }
  rect(g, x + 1, y + 22, 62, 4, P.woodDark);
  hline(g, x + 1, y + 22, 62, P.wood);
  // front apron gives the desk weight instead of reading as a floating shelf
  rect(g, x + 2, y + 26, 60, 4, P.outline);
  rect(g, x + 3, y + 26, 58, 2, P.woodDark);
  hline(g, x + 3, y + 26, 58, P.wood);

  // drawer unit, right side
  rect(g, x + 44, y + 6, 18, 24, P.outline);
  rect(g, x + 45, y + 7, 16, 22, P.wood);
  hline(g, x + 45, y + 7, 16, P.woodHi);
  for (let d = 0; d < 2; d += 1) {
    const dy = y + 9 + d * 10;
    rect(g, x + 47, dy, 12, 8, P.woodDark);
    hline(g, x + 48, dy + 1, 10, P.woodMid);
    rect(g, x + 51, dy + 4, 4, 1, P.metalHi);
  }

  // monitor
  const mx = x + 10;
  const my = y - 10;
  rect(g, mx + 3, y + 4, 8, 3, P.metalDk);
  rect(g, mx + 1, y + 6, 12, 2, P.metal);
  rect(g, mx, my, 28, 20, P.outline);
  rect(g, mx + 1, my + 1, 26, 18, P.metalDk);
  rect(g, mx + 2, my + 2, 24, 14, P.screen);
  hline(g, mx + 2, my + 2, 24, "#22303f");
  rect(g, mx + 15, my + 17, 2, 1, P.greenHi);
  // sticky notes on the bezel
  if (variant % 2 === 1) {
    rect(g, mx + 22, my + 1, 4, 3, P.amberHi);
    rect(g, mx + 24, my + 1, 1, 3, P.amber);
  }

  // keyboard, mouse, mug, papers
  rect(g, x + 9, y + 15, 19, 6, P.outline);
  rect(g, x + 10, y + 16, 17, 4, "#39424f");
  hline(g, x + 10, y + 16, 17, P.metal);
  for (let k = 0; k < 4; k += 1) {
    hline(g, x + 11, y + 17 + k, 15, "#4b5666");
  }
  rect(g, x + 32, y + 17, 4, 3, P.metal);
  px(g, x + 33, y + 17, P.metalHi);

  if (variant % 3 === 0) {
    // mug with steam (static base)
    rect(g, x + 38, y + 11, 5, 5, P.outline);
    rect(g, x + 39, y + 12, 3, 3, P.checkerL);
    hline(g, x + 38, y + 12, 1, P.checkerL);
    px(g, x + 43, y + 12, P.checkerL);
  } else if (variant % 3 === 1) {
    // papers
    rect(g, x + 38, y + 12, 8, 6, "#d8d2c2");
    hline(g, x + 39, y + 13, 6, "#a9a392");
    hline(g, x + 39, y + 15, 4, "#a9a392");
  } else {
    // tiny plant
    rect(g, x + 38, y + 13, 6, 5, P.potDk);
    rect(g, x + 39, y + 12, 4, 2, P.pot);
    px(g, x + 40, y + 10, P.leafMid);
    px(g, x + 41, y + 9, P.leafHi);
    px(g, x + 39, y + 9, P.leaf);
  }
}

export function chair(g, x, y) {
  groundShadow(g, x + 2, y + 17, 12, 4);
  // wheels and gas lift
  px(g, x + 3, y + 19, P.ink2);
  px(g, x + 12, y + 19, P.ink2);
  vline(g, x + 3, y + 15, 4, P.metalDk);
  vline(g, x + 12, y + 15, 4, P.metalDk);
  vline(g, x + 7, y + 12, 3, P.metalDk);
  // seat
  rect(g, x + 2, y + 7, 12, 6, P.outline);
  rect(g, x + 3, y + 7, 10, 4, "#465264");
  hline(g, x + 3, y + 7, 10, "#6f7d92");
  // armrests
  vline(g, x, y + 8, 6, P.outline);
  vline(g, x + 15, y + 8, 6, P.outline);
  vline(g, x + 1, y + 9, 4, "#5b687c");
  vline(g, x + 14, y + 9, 4, "#5b687c");
  // backrest, drawn after the character so it overlaps the lower back
  rect(g, x + 1, y + 13, 14, 8, P.outline);
  rect(g, x, y + 14, 16, 7, P.outline);
  rect(g, x + 1, y + 14, 14, 6, "#394557");
  hline(g, x + 2, y + 14, 12, "#64748b");
  hline(g, x + 2, y + 15, 12, "#4b586c");
  rect(g, x + 7, y + 16, 2, 3, "#2c3544");
}

/* ------------------------------------------------------------------- props */

export function plant(g, x, y, big = true) {
  groundShadow(g, x + 1, y + 22, 14, 4);
  // pot
  rect(g, x + 2, y + 18, 12, 8, P.outline);
  rect(g, x + 3, y + 19, 10, 6, P.pot);
  hline(g, x + 3, y + 19, 10, P.potHi);
  rect(g, x + 4, y + 24, 8, 1, P.potDk);
  // stems and leaves
  const leaves = big
    ? [
        [-6, -4, 4, 7],
        [1, -9, 5, 8],
        [7, -3, 5, 7],
        [-3, -13, 4, 8],
        [5, -14, 4, 7],
        [-8, 4, 4, 5],
        [8, 5, 4, 5],
      ]
    : [
        [-3, -3, 3, 5],
        [2, -5, 3, 6],
        [5, 1, 3, 4],
      ];
  for (const [dx, dy, w, h] of leaves) {
    const lx = x + 8 + dx;
    const ly = y + 18 + dy;
    rect(g, lx, ly, w, h, P.leafDk);
    rect(g, lx, ly, w - 1, h - 1, P.leaf);
    hline(g, lx, ly, w - 2, P.leafMid);
    px(g, lx + 1, ly + 1, P.leafHi);
    px(g, lx + w - 1, ly + h - 1, P.leafDk);
  }
  vline(g, x + 8, y + 8, 11, P.leafDk);
  vline(g, x + 7, y + 12, 7, P.leaf);
}

export function bookshelf(g, x, y) {
  groundShadow(g, x + 1, y + 34, 46, 4);
  rect(g, x, y, 48, 38, P.outline);
  rect(g, x + 1, y + 1, 46, 36, P.woodDark);
  rect(g, x + 3, y + 3, 42, 32, "#2c241f");
  const rows = [y + 4, y + 15, y + 26];
  const spines = [
    [P.amber, P.fabric, P.shirt1, P.checkerL],
    [P.shirt5, P.woodPale, P.fabricHi, P.blueHi],
    [P.purple, P.amberHi, P.shirt3, P.metalHi],
  ];
  rows.forEach((ry, r) => {
    // books
    let bx = x + 4;
    for (let i = 0; i < 11; i += 1) {
      const bw = 2 + (i % 2);
      const bh = 6 + ((i * 3) % 4);
      if (bx + bw > x + 43) break;
      const color = spines[r][i % spines[r].length];
      rect(g, bx, ry + 9 - bh, bw, bh, color);
      px(g, bx, ry + 9 - bh, "#f2e6cf");
      bx += bw + 1;
    }
    // a leaning book
    if (r === 1) {
      rect(g, x + 35, ry + 2, 3, 3, P.checkerL);
      rect(g, x + 34, ry + 5, 4, 4, P.checkerL);
    }
    hline(g, x + 3, ry + 10, 42, P.wood);
    hline(g, x + 3, ry + 11, 42, P.woodDark);
  });
  // side highlight
  vline(g, x + 1, y + 2, 34, P.woodHi);
  // plant on top
  rect(g, x + 34, y - 4, 6, 4, P.pot);
  px(g, x + 36, y - 6, P.leafMid);
  px(g, x + 37, y - 7, P.leafHi);
  px(g, x + 35, y - 7, P.leaf);
}

export function windowNight(g, x, y, w = 88, h = 38) {
  // frame
  rect(g, x, y, w, h, P.outline);
  rect(g, x + 1, y + 1, w - 2, h - 2, P.woodDark);
  rect(g, x + 4, y + 4, w - 8, h - 8, "#0d1726");
  // sky bands
  rect(g, x + 4, y + 4, w - 8, 12, "#111f33");
  rect(g, x + 4, y + 16, w - 8, 10, "#172a42");
  rect(g, x + 4, y + 26, w - 8, h - 30, "#1e3652");
  // moon
  rect(g, x + 58, y + 8, 7, 7, "#e8e2c8");
  rect(g, x + 60, y + 8, 3, 2, "#fff8dd");
  px(g, x + 58, y + 14, "#c9c3aa");
  // stars
  for (let i = 0; i < 9; i += 1) {
    px(g, x + 8 + ((i * 17) % (w - 18)), y + 7 + ((i * 11) % 14), "#cfe6ff");
  }
  // skyline
  const base = y + h - 8;
  const towers = [
    [4, 16, 22],
    [10, 12, 16],
    [24, 10, 20],
    [36, 14, 26],
    [52, 9, 18],
    [63, 14, 24],
    [79, 8, 20],
  ];
  for (const [dx, tw, th] of towers) {
    rect(g, x + dx, base - th, tw, th, "#0b1320");
    for (let wy = base - th + 3; wy < base - 2; wy += 4) {
      for (let wx = x + dx + 2; wx < x + dx + tw - 2; wx += 4) {
        if ((wx + wy) % 7 < 3) px(g, wx, wy, P.amberHi);
      }
    }
  }
  // mullions
  rect(g, x + w / 2 - 1, y + 4, 2, h - 8, P.woodDark);
  rect(g, x + 4, y + h / 2 - 1, w - 8, 2, P.woodDark);
  // glass reflection
  hline(g, x + 10, y + 10, 16, "rgba(160,210,255,0.28)");
  hline(g, x + 22, y + 13, 6, "rgba(160,210,255,0.18)");
  // sill
  rect(g, x - 2, y + h, w + 4, 4, P.woodDark);
  hline(g, x - 2, y + h, w + 4, P.woodHi);
  // small plant on the sill
  rect(g, x + 8, y + h - 4, 5, 4, P.potDk);
  px(g, x + 10, y + h - 6, P.leafMid);
  px(g, x + 11, y + h - 7, P.leafHi);
}

export function framedArt(g, x, y, kind = 0) {
  rect(g, x, y, 26, 20, P.outline);
  rect(g, x + 1, y + 1, 24, 18, P.woodDark);
  rect(g, x + 3, y + 3, 20, 14, "#d8cfb8");
  if (kind % 2 === 0) {
    rect(g, x + 4, y + 4, 18, 8, "#d99b5a");
    rect(g, x + 4, y + 10, 18, 6, "#3f6b58");
    rect(g, x + 8, y + 6, 4, 4, "#ffe6a8");
    rect(g, x + 14, y + 11, 5, 5, "#2f5547");
  } else {
    rect(g, x + 4, y + 4, 18, 12, "#3b5b77");
    rect(g, x + 7, y + 7, 4, 8, "#d9dbe0");
    rect(g, x + 13, y + 5, 3, 10, "#c06a7a");
    rect(g, x + 17, y + 9, 3, 6, "#e89b3c");
  }
  rect(g, x + 3, y + 16, 20, 1, "#8f8774");
  groundShadow(g, x + 2, y + 19, 22, 3);
}

export function clock(g, x, y) {
  rect(g, x + 2, y, 12, 2, P.outline);
  rect(g, x, y + 2, 16, 12, P.outline);
  rect(g, x + 2, y + 14, 12, 2, P.outline);
  rect(g, x + 1, y + 2, 14, 12, "#d9d3c3");
  rect(g, x + 2, y + 1, 12, 14, "#d9d3c3");
  rect(g, x + 3, y + 3, 10, 10, "#ece6d6");
  // ticks
  px(g, x + 8, y + 4, P.ink2);
  px(g, x + 8, y + 11, P.ink2);
  px(g, x + 4, y + 8, P.ink2);
  px(g, x + 11, y + 8, P.ink2);
  // hands at 10:10
  hline(g, x + 5, y + 6, 3, P.ink2);
  hline(g, x + 8, y + 5, 2, P.ink2);
  px(g, x + 8, y + 8, P.red);
}

export function wallShelf(g, x, y) {
  groundShadow(g, x + 1, y + 6, 38, 3);
  rect(g, x, y, 40, 4, P.outline);
  rect(g, x + 1, y + 1, 38, 3, P.wood);
  hline(g, x + 1, y + 1, 38, P.woodHi);
  // books and a plant
  rect(g, x + 3, y - 6, 3, 7, P.fabric);
  rect(g, x + 7, y - 5, 2, 6, P.amber);
  rect(g, x + 10, y - 7, 4, 8, P.checkerL);
  rect(g, x + 16, y - 4, 5, 5, P.potDk);
  px(g, x + 18, y - 6, P.leafMid);
  px(g, x + 19, y - 7, P.leafHi);
  px(g, x + 21, y - 5, P.leaf);
  // brackets
  vline(g, x + 4, y + 4, 3, P.metalDk);
  vline(g, x + 35, y + 4, 3, P.metalDk);
}

/* ------------------------------------------------------------------- lounge */

export function sofa(g, x, y) {
  groundShadow(g, x + 1, y + 26, 62, 5);
  // legs
  rect(g, x + 5, y + 26, 3, 4, P.woodDark);
  rect(g, x + 56, y + 26, 3, 4, P.woodDark);
  // back
  rect(g, x, y, 64, 14, P.outline);
  rect(g, x + 1, y + 1, 62, 12, P.fabricDk);
  hline(g, x + 1, y + 1, 62, P.fabricHi);
  // seat
  rect(g, x + 2, y + 12, 60, 12, P.outline);
  rect(g, x + 3, y + 12, 58, 10, P.fabric);
  hline(g, x + 3, y + 12, 58, P.fabricPale);
  hline(g, x + 3, y + 21, 58, P.fabricDk);
  // cushions
  for (let c = 0; c < 3; c += 1) {
    const cx = x + 4 + c * 19;
    rect(g, cx, y + 14, 17, 7, P.fabricHi);
    hline(g, cx, y + 14, 17, P.fabricPale);
    vline(g, cx + 16, y + 15, 5, P.fabricDk);
  }
  // arms
  rect(g, x, y + 8, 6, 16, P.outline);
  rect(g, x + 1, y + 8, 4, 14, P.fabricDk);
  hline(g, x + 1, y + 8, 4, P.fabricHi);
  rect(g, x + 58, y + 8, 6, 16, P.outline);
  rect(g, x + 59, y + 8, 4, 14, P.fabricDk);
  hline(g, x + 59, y + 8, 4, P.fabricHi);
  // throw pillow
  rect(g, x + 8, y + 8, 9, 8, P.outline);
  rect(g, x + 9, y + 9, 7, 6, P.amber);
  hline(g, x + 9, y + 9, 7, P.amberHi);
  px(g, x + 10, y + 11, P.amberPale);
}

export function coffeeTable(g, x, y) {
  groundShadow(g, x + 1, y + 18, 36, 4);
  rect(g, x + 3, y + 14, 2, 7, P.woodDark);
  rect(g, x + 31, y + 14, 2, 7, P.woodDark);
  rect(g, x, y + 6, 36, 9, P.outline);
  rect(g, x + 1, y + 7, 34, 6, P.woodMid);
  hline(g, x + 1, y + 7, 34, P.woodPale);
  hline(g, x + 2, y + 12, 32, P.wood);
  // lower shelf
  rect(g, x + 5, y + 15, 26, 3, P.woodDark);
  // mug
  rect(g, x + 6, y + 2, 5, 5, P.outline);
  rect(g, x + 7, y + 3, 3, 3, P.checkerL);
  px(g, x + 11, y + 3, P.checkerL);
  // book
  rect(g, x + 17, y + 3, 9, 5, P.fabric);
  hline(g, x + 17, y + 3, 9, P.fabricHi);
  rect(g, x + 17, y + 8, 9, 1, P.checkerL);
  // small plant
  rect(g, x + 28, y + 3, 4, 4, P.potDk);
  px(g, x + 29, y + 1, P.leafMid);
  px(g, x + 30, y, P.leafHi);
}

export function coffeeStation(g, x, y) {
  groundShadow(g, x + 1, y + 23, 42, 4);
  // counter
  rect(g, x, y + 10, 44, 16, P.outline);
  rect(g, x + 1, y + 10, 42, 14, P.wood);
  hline(g, x + 1, y + 10, 42, P.woodHi);
  rect(g, x + 1, y + 10, 42, 3, P.metalDk);
  hline(g, x + 1, y + 10, 42, P.metal);
  for (let d = 0; d < 2; d += 1) {
    const dx = x + 5 + d * 20;
    rect(g, dx, y + 15, 16, 8, P.woodDark);
    rect(g, dx + 5, y + 17, 6, 1, P.metalHi);
  }
  // coffee machine
  rect(g, x + 6, y - 4, 16, 15, P.outline);
  rect(g, x + 7, y - 3, 14, 13, P.metalDk);
  hline(g, x + 7, y - 3, 14, P.metal);
  rect(g, x + 9, y + 1, 10, 4, P.screen);
  px(g, x + 11, y + 2, P.code2);
  px(g, x + 14, y + 2, P.code1);
  rect(g, x + 10, y + 7, 8, 3, P.ink2);
  rect(g, x + 12, y + 10, 4, 2, P.checkerL);
  px(g, x + 19, y + 6, P.redHi);
  // cups
  rect(g, x + 26, y + 3, 3, 4, P.checkerL);
  rect(g, x + 31, y + 3, 3, 4, P.checkerL);
  rect(g, x + 37, y + 2, 4, 5, P.pot);
  // steam
  px(g, x + 12, y - 7, "rgba(240,240,230,0.35)");
  px(g, x + 13, y - 9, "rgba(240,240,230,0.25)");
}

export function floorLamp(g, x, y) {
  // warm pool
  dither(g, x - 12, y - 4, 38, 18, "rgba(255,190,90,0.08)");
  groundShadow(g, x + 2, y + 30, 10, 3);
  rect(g, x + 4, y + 30, 8, 2, P.metalDk);
  vline(g, x + 8, y + 12, 18, P.metalDk);
  vline(g, x + 7, y + 12, 18, P.metal);
  // shade
  rect(g, x + 2, y + 2, 12, 9, P.outline);
  rect(g, x + 3, y + 3, 10, 7, P.amber);
  hline(g, x + 3, y + 3, 10, P.amberPale);
  hline(g, x + 4, y + 9, 8, P.amberDk);
  // light glow
  px(g, x + 8, y + 11, P.amberPale);
  dither(g, x + 3, y + 12, 10, 8, "rgba(255,200,100,0.18)");
}

export function printer(g, x, y) {
  groundShadow(g, x + 1, y + 22, 32, 4);
  rect(g, x, y + 4, 34, 22, P.outline);
  rect(g, x + 1, y + 5, 32, 20, "#4a5361");
  hline(g, x + 1, y + 5, 32, P.metalHi);
  hline(g, x + 1, y + 20, 32, P.metalDk);
  // paper tray
  rect(g, x + 4, y, 20, 6, P.outline);
  rect(g, x + 5, y + 1, 18, 4, P.checkerL);
  hline(g, x + 6, y + 3, 16, "#b9b3a3");
  // output slot
  rect(g, x + 8, y + 9, 18, 6, P.ink2);
  rect(g, x + 9, y + 10, 16, 4, P.checkerL);
  hline(g, x + 11, y + 11, 12, "#a9a392");
  // buttons
  px(g, x + 28, y + 9, P.greenHi);
  px(g, x + 30, y + 9, P.amber);
  // panel lines
  vline(g, x + 26, y + 6, 12, P.metalDk);
}

export function cat(g, x, y, frame = 0) {
  // curled cat, 16x10
  rect(g, x + 2, y + 3, 12, 6, P.amberDk);
  rect(g, x + 3, y + 2, 10, 6, P.amber);
  hline(g, x + 4, y + 2, 8, P.amberHi);
  // head
  rect(g, x + 10, y + 1, 5, 5, P.amberDk);
  rect(g, x + 11, y + 1, 4, 4, P.amber);
  px(g, x + 10, y, P.amberDk);
  px(g, x + 14, y, P.amberDk);
  px(g, x + 12, y + 3, P.ink2);
  px(g, x + 14, y + 3, P.ink2);
  // stripes and tail
  hline(g, x + 5, y + 4, 3, P.amberDk);
  hline(g, x + 8, y + 6, 3, P.amberDk);
  rect(g, x + 1, y + (frame % 2), 5, 1, P.amberDk);
  px(g, x + 1, y + 2 + (frame % 2), P.amber);
}

export function loveseat(g, x, y) {
  groundShadow(g, x + 1, y + 24, 50, 4);
  rect(g, x + 4, y + 24, 3, 4, P.woodDark);
  rect(g, x + 45, y + 24, 3, 4, P.woodDark);
  rect(g, x, y, 52, 13, P.outline);
  rect(g, x + 1, y + 1, 50, 11, P.fabricDk);
  hline(g, x + 1, y + 1, 50, P.fabricHi);
  rect(g, x + 2, y + 11, 48, 11, P.outline);
  rect(g, x + 3, y + 11, 46, 9, P.fabric);
  hline(g, x + 3, y + 11, 46, P.fabricPale);
  for (let c = 0; c < 2; c += 1) {
    const cx = x + 4 + c * 23;
    rect(g, cx, y + 13, 20, 6, P.fabricHi);
    hline(g, cx, y + 13, 20, P.fabricPale);
    vline(g, cx + 19, y + 14, 4, P.fabricDk);
  }
  rect(g, x, y + 8, 5, 14, P.outline);
  rect(g, x + 1, y + 8, 3, 12, P.fabricDk);
  rect(g, x + 47, y + 8, 5, 14, P.outline);
  rect(g, x + 48, y + 8, 3, 12, P.fabricDk);
  // teal throw pillow
  rect(g, x + 6, y + 7, 8, 7, P.outline);
  rect(g, x + 7, y + 8, 6, 5, P.shirt1);
  hline(g, x + 7, y + 8, 6, P.blueHi);
}

export function meetingChair(g, x, y) {
  groundShadow(g, x + 1, y + 12, 12, 3);
  vline(g, x + 3, y + 11, 4, P.woodDark);
  vline(g, x + 12, y + 11, 4, P.woodDark);
  rect(g, x + 1, y + 6, 14, 6, P.outline);
  rect(g, x + 2, y + 6, 12, 4, P.woodMid);
  hline(g, x + 2, y + 6, 12, P.woodPale);
  // back
  rect(g, x + 2, y, 12, 6, P.outline);
  rect(g, x + 3, y + 1, 10, 4, P.wood);
  hline(g, x + 3, y + 1, 10, P.woodHi);
  rect(g, x + 4, y + 3, 8, 1, P.woodDark);
}

export function meetingTable(g, x, y) {
  groundShadow(g, x + 2, y + 30, 68, 5);
  rect(g, x + 3, y + 26, 4, 8, P.woodDark);
  rect(g, x + 65, y + 26, 4, 8, P.woodDark);
  rect(g, x, y + 4, 72, 24, P.outline);
  rect(g, x + 1, y + 5, 70, 20, P.woodMid);
  hline(g, x + 1, y + 5, 70, P.woodPale);
  hline(g, x + 2, y + 6, 68, P.woodHi);
  for (let yy = y + 12; yy < y + 24; yy += 6) {
    hline(g, x + 1, yy, 70, P.wood);
  }
  rect(g, x + 1, y + 23, 70, 5, P.woodDark);
  hline(g, x + 1, y + 23, 70, P.wood);
  // lower shelf
  rect(g, x + 8, y + 27, 56, 3, P.woodDark);
  // laptop
  rect(g, x + 11, y + 2, 16, 10, P.outline);
  rect(g, x + 12, y + 3, 14, 8, P.metalDk);
  rect(g, x + 13, y + 4, 12, 5, P.screenLit);
  hline(g, x + 14, y + 5, 8, P.code1);
  hline(g, x + 14, y + 7, 5, P.code2);
  rect(g, x + 9, y + 12, 20, 3, P.metal);
  // papers
  rect(g, x + 36, y + 7, 12, 8, "#d8d2c2");
  hline(g, x + 37, y + 9, 10, "#a9a392");
  hline(g, x + 37, y + 11, 7, "#a9a392");
  // mugs
  rect(g, x + 52, y + 6, 5, 5, P.outline);
  rect(g, x + 53, y + 7, 3, 3, P.checkerL);
  rect(g, x + 60, y + 9, 4, 4, P.pot);
  // small plant
  rect(g, x + 31, y + 12, 5, 4, P.potDk);
  px(g, x + 33, y + 9, P.leafMid);
  px(g, x + 34, y + 8, P.leafHi);
  px(g, x + 32, y + 8, P.leaf);
}

export function sideTable(g, x, y) {
  groundShadow(g, x + 1, y + 14, 14, 3);
  rect(g, x + 2, y + 12, 1, 5, P.woodDark);
  rect(g, x + 13, y + 12, 1, 5, P.woodDark);
  rect(g, x, y + 4, 16, 9, P.outline);
  rect(g, x + 1, y + 5, 14, 6, P.woodMid);
  hline(g, x + 1, y + 5, 14, P.woodPale);
  rect(g, x + 3, y + 1, 4, 4, P.checkerL);
  px(g, x + 8, y + 2, P.amberHi);
  rect(g, x + 10, y + 2, 4, 3, P.fabric);
}

const GLYPHS = {
  P: ["1111", "1001", "1001", "1111", "1000", "1000", "1000"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  E: ["1111", "1000", "1000", "1110", "1000", "1000", "1111"],
  L: ["1000", "1000", "1000", "1000", "1000", "1000", "1111"],
};

export function neonSign(g, x, y) {
  // plaque
  rect(g, x + 3, y - 2, 2, 3, P.metalDk);
  rect(g, x + 39, y - 2, 2, 3, P.metalDk);
  rect(g, x, y, 44, 20, P.outline);
  rect(g, x + 1, y + 1, 42, 18, "#1a2030");
  rect(g, x + 2, y + 2, 40, 16, "#121824");
  hline(g, x + 3, y + 1, 38, P.frameHi);
  // logo mark
  rect(g, x + 5, y + 6, 6, 6, P.amberDk);
  rect(g, x + 6, y + 7, 2, 2, P.amberHi);
  rect(g, x + 9, y + 9, 2, 2, P.blueHi);
  // PIXEL
  let cx = x + 14;
  const map = ["P", "I", "X", "E", "L"];
  for (let i = 0; i < map.length; i += 1) {
    const rows = GLYPHS[map[i]];
    for (let gy = 0; gy < rows.length; gy += 1) {
      for (let gx = 0; gx < rows[gy].length; gx += 1) {
        if (rows[gy][gx] !== "1") continue;
        px(g, cx + gx + 1, y + 6 + gy + 1, P.amberDk);
        px(g, cx + gx, y + 6 + gy, P.amberHi);
      }
    }
    cx += rows[0].length + 1;
  }
  // faint neon wash
  dither(g, x + 4, y + 20, 36, 4, "rgba(255,200,90,0.08)");
}

export function whiteboard(g, x, y) {
  groundShadow(g, x + 2, y + 25, 44, 3);
  rect(g, x, y, 48, 28, P.outline);
  rect(g, x + 1, y + 1, 46, 26, "#b9c1c9");
  rect(g, x + 2, y + 2, 44, 23, "#e6e9e6");
  // scribbles
  hline(g, x + 6, y + 7, 14, P.blue);
  hline(g, x + 6, y + 10, 9, P.blue);
  hline(g, x + 6, y + 13, 12, P.blue);
  rect(g, x + 26, y + 5, 14, 10, "#d8d2c2");
  hline(g, x + 28, y + 7, 9, P.ink2);
  hline(g, x + 28, y + 9, 6, P.ink2);
  // chart
  rect(g, x + 26, y + 17, 2, 5, P.fabric);
  rect(g, x + 30, y + 15, 2, 7, P.amber);
  rect(g, x + 34, y + 13, 2, 9, P.green);
  // sticky notes
  rect(g, x + 8, y + 17, 6, 5, P.amberHi);
  rect(g, x + 16, y + 17, 6, 5, P.fabricPale);
  // tray
  rect(g, x + 8, y + 24, 32, 3, P.metalDk);
  hline(g, x + 8, y + 24, 32, P.metalHi);
}
