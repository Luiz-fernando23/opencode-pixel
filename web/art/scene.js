/**
 * Room composition. Everything that never moves is pre-rendered once into a
 * background canvas; the renderer adds agents, screens, chairs and light on top.
 */
import { P } from "./palette.js";
import { makeCanvas, rect, hline, vline, dither, px } from "./draw.js";
import {
  woodFloor,
  carpetFloor,
  checkerFloor,
  rug,
  wallFace,
  wallShadow,
  desk,
  plant,
  bookshelf,
  windowNight,
  framedArt,
  clock,
  wallShelf,
  sofa,
  loveseat,
  coffeeTable,
  coffeeStation,
  floorLamp,
  sideTable,
  printer,
  cat,
  whiteboard,
  meetingTable,
  meetingChair,
  neonSign,
} from "./props.js";

export const SCENE = { w: 600, h: 340, frame: 4, wallH: 62, floorY: 66 };

const DESK_X = [20, 100, 180, 260];
const DESK_Y = [94, 190];

export const LAYOUT = {
  ...SCENE,
  studio: { x: 4, y: 66, w: 368, h: 270 },
  lounge: { x: 384, y: 66, w: 212, h: 270 },
  doorway: { x: 372, y: 172, w: 12, h: 68 },
  entry: { x: 468, y: 300, w: 128, h: 36 },
  spawn: { x: 560, y: 326 },
  aisle: { x: 350, y: 206 },
  desks: [],
};

for (let row = 0; row < DESK_Y.length; row += 1) {
  for (let col = 0; col < DESK_X.length; col += 1) {
    const x = DESK_X[col];
    const y = DESK_Y[row];
    LAYOUT.desks.push({
      id: row * 4 + col,
      x,
      y,
      w: 64,
      h: 34,
      seat: { x: x + 32, y: y + 47 },
      chair: { x: x + 24, y: y + 34 },
      screen: { x: x + 12, y: y - 8, w: 24, h: 14 },
      label: { x: x + 32, y: y + 58 },
    });
  }
}

/** Draw the empty desk shell (screen content and glow are dynamic). */
function deskShell(g, d) {
  desk(g, d.x, d.y, d.id);
  rect(g, d.screen.x, d.screen.y, d.screen.w, d.screen.h, P.screen);
  hline(g, d.screen.x, d.screen.y, d.screen.w, "#22303f");
  px(g, d.screen.x + d.screen.w - 3, d.screen.y + d.screen.h - 3, P.green);
}

function runner(g, x, y, w, h) {
  rect(g, x, y, w, h, P.outline);
  rect(g, x + 1, y + 1, w - 2, h - 2, P.carpet3);
  hline(g, x + 2, y + 2, w - 4, P.trimDark);
  hline(g, x + 2, y + h - 3, w - 4, P.trimDark);
  for (let xx = x + 8; xx < x + w - 8; xx += 16) {
    rect(g, xx, y + 9, 2, 2, P.blueHi);
    px(g, xx + 1, y + 7, P.checkerL);
    px(g, xx, y + 8, P.amberDk);
    px(g, xx + 2, y + 8, P.amberDk);
    px(g, xx + 1, y + 11, P.amberDk);
  }
}

export function buildScene() {
  const { canvas, g } = makeCanvas(SCENE.w, SCENE.h);

  // outer frame
  rect(g, 0, 0, SCENE.w, SCENE.h, P.frame);
  rect(g, 1, 1, SCENE.w - 2, 2, "#1c2230");
  rect(g, 1, 1, 2, SCENE.h - 2, "#1c2230");
  rect(g, SCENE.w - 3, 1, 2, SCENE.h - 2, "#080a10");
  rect(g, 1, SCENE.h - 3, SCENE.w - 2, 2, "#080a10");

  const { frame, floorY } = SCENE;

  // --- floors
  woodFloor(g, frame, floorY, 368, SCENE.h - floorY - frame);
  carpetFloor(g, 384, floorY, 212, SCENE.h - floorY - frame);
  checkerFloor(g, 468, 300, 128, 36, 16);

  // --- top wall
  wallFace(g, frame, frame, SCENE.w - frame * 2, 62);
  wallShadow(g, frame, floorY, 368);
  wallShadow(g, 384, floorY, 212);

  // thin side baseboards frame the room without stealing floor space
  rect(g, frame, floorY, 2, SCENE.h - floorY - frame, P.wallDeep);
  vline(g, frame + 1, floorY, SCENE.h - floorY - frame, P.base);
  rect(g, SCENE.w - frame - 2, floorY, 2, SCENE.h - floorY - frame, P.wallDeep);
  vline(g, SCENE.w - frame - 2, floorY, SCENE.h - floorY - frame, P.base);

  // --- divider wall, with the doorway roughly in the middle
  // upper segment
  rect(g, 372, frame, 12, 168, P.wall);
  vline(g, 372, frame, 168, P.wallHi);
  vline(g, 373, frame, 168, P.wallMid);
  vline(g, 382, frame, 168, P.wallDark);
  vline(g, 383, frame, 168, P.base);
  // lower segment
  rect(g, 372, 240, 12, 96, P.wall);
  vline(g, 372, 240, 96, P.wallHi);
  vline(g, 373, 240, 96, P.wallMid);
  vline(g, 382, 240, 96, P.wallDark);
  vline(g, 383, 240, 96, P.base);
  hline(g, 372, 240, 12, P.trimDark);

  // floor through the doorway: wood on the studio half, carpet on the lounge half
  rect(g, 372, 172, 6, 68, P.floor2);
  for (let yy = 172; yy < 240; yy += 10) {
    hline(g, 372, yy, 6, P.floorLine);
  }
  rect(g, 378, 172, 6, 68, P.carpet1);
  for (let yy = 172; yy < 240; yy += 6) {
    hline(g, 378, yy + 2, 6, P.carpet2);
  }
  vline(g, 377, 172, 68, P.trimDark);
  vline(g, 378, 172, 68, P.trim);
  dither(g, 372, 172, 12, 68, "rgba(255,190,100,0.06)");

  // doorway frame + threshold
  rect(g, 369, 168, 18, 6, P.woodDark);
  hline(g, 369, 168, 18, P.woodHi);
  vline(g, 370, 172, 68, P.wood);
  vline(g, 371, 172, 68, P.woodDark);
  vline(g, 383, 172, 68, P.wood);
  vline(g, 382, 172, 68, P.woodDark);
  rect(g, 368, 238, 20, 4, P.metalDk);
  hline(g, 368, 238, 20, P.metal);
  // warm spill from the doorway
  dither(g, 338, 178, 32, 64, "rgba(255,190,100,0.07)");
  dither(g, 384, 178, 28, 64, "rgba(255,190,100,0.06)");

  // --- studio wall decor
  bookshelf(g, 20, 24);
  windowNight(g, 84, 20, 88, 38);
  framedArt(g, 188, 30, 0);
  clock(g, 226, 32);
  wallShelf(g, 252, 38);
  neonSign(g, 318, 26);

  // --- lounge wall decor
  whiteboard(g, 392, 28);
  framedArt(g, 452, 32, 1);
  framedArt(g, 488, 32, 0);
  clock(g, 550, 32);
  // hanging vine in the lounge corner
  rect(g, 584, 18, 6, 4, P.potDk);
  for (let i = 0; i < 5; i += 1) {
    px(g, 585 + (i % 2), 22 + i * 4, P.leafMid);
    px(g, 586 + (i % 2), 24 + i * 4, P.leaf);
    px(g, 587, 25 + i * 4, P.leafHi);
  }

  // --- studio desks (empty)
  runner(g, 20, 154, 320, 24);
  for (const d of LAYOUT.desks) deskShell(g, d);

  // --- studio bottom: meeting corner
  rug(g, 84, 242, 124, 86);
  meetingChair(g, 108, 246);
  meetingChair(g, 152, 246);
  meetingTable(g, 112, 264);
  meetingChair(g, 108, 300);
  meetingChair(g, 152, 300);
  printer(g, 16, 292);
  // bookshelf + plant on the right
  bookshelf(g, 314, 280);
  plant(g, 294, 272, false);
  // tall plant and water cooler fill the left corner
  plant(g, 62, 246, true);
  rect(g, 56, 296, 16, 22, P.outline);
  rect(g, 57, 297, 14, 20, "#3d4654");
  hline(g, 57, 297, 14, P.metalHi);
  rect(g, 58, 288, 12, 10, P.outline);
  rect(g, 59, 289, 10, 8, P.blue);
  hline(g, 60, 289, 8, P.blueHi);
  rect(g, 60, 286, 8, 3, P.metal);
  rect(g, 59, 303, 4, 4, P.checkerL);
  px(g, 61, 305, P.blue);
  // stack of books left of the meeting corner
  rect(g, 236, 306, 22, 4, P.fabric);
  rect(g, 238, 302, 18, 4, P.amber);
  rect(g, 240, 298, 14, 4, P.shirt1);
  // plant under the neon sign, clear of the doorway path
  plant(g, 344, 86, false);

  // --- lounge
  rug(g, 508, 218, 76, 46);
  loveseat(g, 520, 232);
  sideTable(g, 578, 238);
  rug(g, 458, 130, 100, 62);
  sofa(g, 520, 96);
  cat(g, 552, 94, 0);
  coffeeTable(g, 472, 148);
  coffeeStation(g, 392, 246);
  bookshelf(g, 442, 246);
  floorLamp(g, 578, 142);
  plant(g, 392, 86, true);
  plant(g, 444, 178, true);
  plant(g, 392, 280, false);
  plant(g, 576, 266, false);
  // entry mat
  rect(g, 520, 306, 60, 22, P.outline);
  rect(g, 521, 307, 58, 20, "#3e3542");
  for (let i = 0; i < 4; i += 1) {
    hline(g, 523, 310 + i * 4, 54, "#55485a");
  }

  // --- ambient light
  dither(g, 500, 128, 84, 66, "rgba(255,190,100,0.05)");
  dither(g, 90, 70, 90, 40, "rgba(120,180,255,0.04)");
  dither(g, 20, 250, 70, 60, "rgba(255,190,100,0.035)");
  dither(g, 540, 210, 52, 50, "rgba(255,190,100,0.04)");

  // --- pixel vignette
  for (let i = 0; i < 8; i += 1) {
    const alpha = 0.05 + i * 0.012;
    dither(g, frame + i, frame + 62 + i, 1, SCENE.h - floorY - 62, `rgba(6,6,12,${alpha})`);
    dither(g, SCENE.w - frame - i - 1, floorY + i, 1, SCENE.h - floorY - frame - i, `rgba(6,6,12,${alpha})`);
    dither(g, frame + i, SCENE.h - frame - i - 1, SCENE.w - frame * 2 - i * 2, 1, `rgba(6,6,12,${alpha})`);
  }

  return { canvas, layout: LAYOUT };
}
