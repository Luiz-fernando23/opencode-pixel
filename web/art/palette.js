/**
 * One palette for the whole office. Limited, warm and a little dusty on purpose:
 * the scene is lit by desk lamps and monitors at night, not by a white studio light.
 */
export const P = {
  ink: "#15121c",
  ink2: "#1d1927",
  outline: "#241f2d",
  night: "#0a0c13",
  frame: "#0d1018",
  frameHi: "#242a38",

  wallHi: "#4a6173",
  wall: "#374c5e",
  wallMid: "#2e4152",
  wallDark: "#243443",
  wallDeep: "#1b2631",
  trim: "#7890a3",
  trimDark: "#4d6273",
  base: "#16202a",

  floor1: "#5c3826",
  floor2: "#633c29",
  floor3: "#553122",
  floor4: "#67402c",
  floorLine: "#3f2318",
  floorHi: "#73472e",

  carpet1: "#2d4760",
  carpet2: "#324e69",
  carpet3: "#294158",
  checkerL: "#d7d1c1",
  checkerD: "#2b2d3a",

  woodDark: "#4e2f21",
  wood: "#75452c",
  woodMid: "#8b5536",
  woodHi: "#b0784c",
  woodPale: "#c99565",

  metal: "#6b7788",
  metalHi: "#9aa8b8",
  metalDk: "#3d4654",

  screen: "#0d1620",
  screen2: "#142434",
  screenLit: "#1d3548",
  code1: "#7fd9ff",
  code2: "#9cf0b8",
  code3: "#ffd479",
  code4: "#ff8f7a",

  leafDk: "#23523c",
  leaf: "#2f6b4f",
  leafMid: "#3f8a63",
  leafHi: "#66b083",
  leafPale: "#8fd6a8",

  potDk: "#7a3e2c",
  pot: "#a85a3d",
  potHi: "#cf7a53",

  fabricDk: "#5e2433",
  fabric: "#862f42",
  fabricHi: "#b04a5e",
  fabricPale: "#d06a7c",

  amberDk: "#b06a24",
  amber: "#e89b3c",
  amberHi: "#ffc857",
  amberPale: "#ffe6a8",

  red: "#c9463f",
  redHi: "#f27a6a",
  redPale: "#ffb3a7",

  green: "#4f9a6a",
  greenHi: "#7fd18b",
  blue: "#4d7ea8",
  blueHi: "#7fb6e0",
  purple: "#6b4f7a",
  pink: "#c06a7a",

  skin1: "#f2c9a0",
  skin2: "#d9a077",
  skin3: "#b57a52",
  skin4: "#7d513a",

  hair1: "#2a1c18",
  hair2: "#4a2e22",
  hair3: "#7a4a2e",
  hair4: "#c98a4b",
  hair5: "#e6d3b3",
  hair6: "#8a8f9c",

  shirt1: "#2f7f8f",
  shirt2: "#d69a3a",
  shirt3: "#b5563f",
  shirt4: "#3b4f78",
  shirt5: "#4f7a4a",
  shirt6: "#6b4f7a",
  shirt7: "#c06a7a",
  shirt8: "#d9dbe0",

  pants1: "#2b3550",
  pants2: "#3e3a4a",
  pants3: "#5a4636",
  shoe: "#1e1a22",
};

/** Character looks. Chosen from the session id, so a session keeps its face. */
export const LOOKS = [
  { hair: [P.hair1, P.hair2, P.hair3], skin: [P.skin2, P.skin3], shirt: P.shirt1, pants: P.pants1, style: 0 },
  { hair: [P.hair2, P.hair3, P.hair4], skin: [P.skin1, P.skin2], shirt: P.shirt2, pants: P.pants2, style: 1 },
  { hair: [P.hair1, P.hair2, P.hair3], skin: [P.skin3, P.skin4], shirt: P.shirt3, pants: P.pants3, style: 2 },
  { hair: [P.hair3, P.hair4, P.hair5], skin: [P.skin1, P.skin2], shirt: P.shirt4, pants: P.pants1, style: 3 },
  { hair: [P.hair2, P.hair3, P.hair4], skin: [P.skin2, P.skin3], shirt: P.shirt5, pants: P.pants2, style: 4 },
  { hair: [P.hair1, P.hair6, P.hair5], skin: [P.skin1, P.skin2], shirt: P.shirt6, pants: P.pants1, style: 5 },
  { hair: [P.hair3, P.hair4, P.hair5], skin: [P.skin3, P.skin4], shirt: P.shirt7, pants: P.pants3, style: 6 },
  { hair: [P.hair1, P.hair2, P.hair3], skin: [P.skin4, P.skin3], shirt: P.shirt8, pants: P.pants1, style: 7 },
];

export function lookFor(id) {
  let hash = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    hash ^= id.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return LOOKS[Math.abs(hash) % LOOKS.length];
}
