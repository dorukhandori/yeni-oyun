import { CELL } from "../constants";
import type { Cell, CaveMap, GroundKind } from "../types";

/**
 * Hand-authored cave layout. Rows run from far (index 0) to near the spawn.
 * `#` rock · `~` water/ice · `=` plank walkway · `.` moss floor
 * `s` farm soil · `S` sell stand · `P` spawn
 */
const LAYOUT = [
  "########################",
  "########################",
  "###~~~~~~~~~~~~~~~~~~###",
  "##~~~....ssss......~~~##",
  "##~~...ssssssss......~~#",
  "#~~...ssssssssss......~#",
  "#~~...ssssssssss......~#",
  "#~~....ssssssss.......~#",
  "#~~~.....ssss........~~#",
  "##~~~.....S.........~~~#",
  "###~~~....===.....~~~~##",
  "#####~~~~~===~~~~~######",
  "#####~~~~~===~~~~#######",
  "#####~~~~~===~~~~#######",
  "#####~~~~~===~~~########",
  "#####~~~~~=P=~~~########",
  "#####~~~~~===~~~~#######",
  "#####~~~~~===~~~~#######",
  "#####~~~~~===~~~########",
  "#####~~~~~===~~~~#######",
  "########################",
];

const KIND: Record<string, GroundKind> = {
  "#": "rock",
  "~": "water",
  "=": "plank",
  ".": "moss",
  s: "soil",
  S: "stand",
  P: "plank",
};

function makeCell(ground: GroundKind): Cell {
  return {
    ground,
    farmable: ground === "soil",
    tilled: false,
    wet: false,
    crop: "none",
    grow: 0,
    dirty: true,
  };
}

export function createMap(): CaveMap {
  const width = Math.max(...LAYOUT.map((r) => r.length));
  const height = LAYOUT.length;
  const cells: Cell[][] = [];
  let spawn = { cx: Math.floor(width / 2), cz: height - 3 };
  let stand = { cx: 10, cz: 9 };

  for (let cz = 0; cz < height; cz++) {
    const raw = LAYOUT[cz].padEnd(width, "#");
    const row: Cell[] = [];
    for (let cx = 0; cx < width; cx++) {
      const ch = raw[cx];
      row.push(makeCell(KIND[ch] ?? "rock"));
      if (ch === "P") spawn = { cx, cz };
      if (ch === "S") stand = { cx, cz };
    }
    cells.push(row);
  }

  // A couple of plots start pre-tilled so the first interaction reads clearly.
  for (const [cx, cz] of [
    [11, 5],
    [12, 5],
    [11, 6],
    [12, 6],
  ] as const) {
    const c = cells[cz]?.[cx];
    if (c?.farmable) c.tilled = true;
  }

  return { cells, width, height, spawn, stand };
}

export function cellAt(map: CaveMap, cx: number, cz: number): Cell | null {
  if (cx < 0 || cz < 0 || cx >= map.width || cz >= map.height) return null;
  return map.cells[cz][cx];
}

export function walkable(map: CaveMap, cx: number, cz: number): boolean {
  const c = cellAt(map, cx, cz);
  return !!c && c.ground !== "rock" && c.ground !== "water";
}

/** Map cell centre in world space. */
export function cellToWorld(map: CaveMap, cx: number, cz: number): { x: number; z: number } {
  return {
    x: (cx - (map.width - 1) / 2) * CELL,
    z: (cz - (map.height - 1) / 2) * CELL,
  };
}

export function worldToCell(map: CaveMap, x: number, z: number): { cx: number; cz: number } {
  return {
    cx: Math.round(x / CELL + (map.width - 1) / 2),
    cz: Math.round(z / CELL + (map.height - 1) / 2),
  };
}
