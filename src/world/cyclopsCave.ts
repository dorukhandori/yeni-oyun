import * as THREE from "three";

/**
 * Cyclops Cave (2nd stop) — primitive, code-only geometry + world content.
 *
 * "En ilkel şekilde yap, test et, en son süsle" (sahip, 25 Ağu 2026): this
 * is deliberately NOT the Blender-built shell from
 * cyclops-cave-production-plan.md's ASSET-090 — flat-colored box rooms,
 * primitive prop shapes, no textures. Real geometry/art comes after the
 * mechanic is proven playable. Numbers are NOT placeholders though — every
 * D-range, width, coordinate below is the locked value from
 * docs/design/level-cyclops-cave.md §1.2/§3 and docs/design/tuning.md §12.
 *
 * Axis convention (level-cyclops-cave.md §1.1, binding): cave deepens in
 * +Z. D = z (threshold at z=0 here, so D and z are the same number for
 * this module). Width = X, centred on x=0. Height = Y.
 */

export type RoomId =
  | "cove"
  | "path"
  | "mouth"
  | "depot"
  | "gorgeA"
  | "pens"
  | "gorgeB"
  | "inner";

interface RoomSpan {
  id: RoomId;
  dMin: number;
  dMax: number;
  /** Half-width in X. Infinity = open (no wall collision), used for the cove. */
  halfWidth: number;
  ceilingY: number;
  /** Flat wall/floor colour — Aegean-rock family, no palette-outside hex. */
  color: number;
}

// level-cyclops-cave.md §1.2 table, exact D/X/Y. Ceiling taper (mouth 6->4)
// simplified to a flat value for the primitive pass.
const ROOMS: RoomSpan[] = [
  { id: "cove", dMin: -20, dMax: -8, halfWidth: Infinity, ceilingY: Infinity, color: 0x2a3a4a },
  { id: "path", dMin: -8, dMax: 0, halfWidth: 3, ceilingY: 12, color: 0x3a4a5a },
  { id: "mouth", dMin: 0, dMax: 8, halfWidth: 5, ceilingY: 5, color: 0x9a9488 },
  { id: "depot", dMin: 8, dMax: 22, halfWidth: 6, ceilingY: 4, color: 0x6b6a62 },
  { id: "gorgeA", dMin: 22, dMax: 26, halfWidth: 2, ceilingY: 3, color: 0x5a594f },
  { id: "pens", dMin: 26, dMax: 44, halfWidth: 7, ceilingY: 7, color: 0x6b6a62 },
  { id: "gorgeB", dMin: 44, dMax: 48, halfWidth: 2, ceilingY: 3, color: 0x5a594f },
  { id: "inner", dMin: 48, dMax: 65, halfWidth: 4.5, ceilingY: 5, color: 0x45443d },
];

export function roomAt(z: number): RoomSpan {
  for (const r of ROOMS) if (z >= r.dMin && z < r.dMax) return r;
  return z < ROOMS[0].dMin ? ROOMS[0] : ROOMS[ROOMS.length - 1];
}

export function roomIdAt(z: number): RoomId {
  return roomAt(z).id;
}

/** Movement-clamp bound. Infinity in the cove means "no wall". */
export function corridorHalfWidthAt(z: number): number {
  return roomAt(z).halfWidth;
}

export const CAVE_MOUTH_D = 4; // CAUGHT_RESPAWN_POINT (level-cyclops-cave.md §1.2 note)

// ------------------------------------------------------------------ hearth
// level-cyclops-cave.md §3.4 correction: hearth shifted 4 m west of the
// pens room's centre so a real shadow pocket exists on the east wall.
export const HEARTH_POS = { x: -4, z: 35 };
export const TORCH_POS = { x: 0, z: 58 }; // inner nook wall-mounted torch, roughly central to the room

// -------------------------------------------------------------- hide spots
// tuning.md §12.1: coordinates level-cyclops-cave.md §3, radius here.
export interface HideSpot {
  room: RoomId;
  x: number;
  z: number;
  radius: number;
}

export const HIDE_SPOTS: HideSpot[] = [
  { room: "mouth", x: 4, z: 6, radius: 1.2 },
  { room: "depot", x: 5, z: 19, radius: 1.5 },
  { room: "pens", x: 5.5, z: 35, radius: 1.5 },
  { room: "inner", x: 4, z: 51, radius: 1.5 },
];

// ------------------------------------------------------------------- items
// level-cyclops-cave.md §5 — 7 items, coordinates exact. "cheese"/"wine" =
// F3's food/wine-skin narrative frame (D1), not crew.
export type ItemKind = "cheese" | "wine";

export interface CaveItem {
  id: string;
  kind: ItemKind;
  room: RoomId;
  home: { x: number; z: number };
  pos: { x: number; z: number };
  carried: boolean;
  delivered: boolean;
  mesh: THREE.Object3D;
}

const ITEM_DEFS: { id: string; kind: ItemKind; room: RoomId; x: number; z: number }[] = [
  { id: "D-01", kind: "cheese", room: "depot", x: -4, z: 12 },
  { id: "D-02", kind: "wine", room: "depot", x: 4, z: 20 },
  { id: "A-01", kind: "cheese", room: "pens", x: -3, z: 29 },
  { id: "A-02", kind: "wine", room: "pens", x: 3, z: 35 },
  { id: "A-03", kind: "cheese", room: "pens", x: -2, z: 41 },
  { id: "I-01", kind: "cheese", room: "inner", x: -3, z: 53 },
  { id: "I-02", kind: "wine", room: "inner", x: 2, z: 63 },
];

function makeItemMesh(kind: ItemKind): THREE.Object3D {
  if (kind === "cheese") {
    const geo = new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10);
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8c165, roughness: 0.8 });
    const m = new THREE.Mesh(geo, mat);
    m.position.y = 0.08;
    return m;
  }
  const geo = new THREE.SphereGeometry(0.18, 8, 6);
  geo.scale(1, 1.3, 1);
  const mat = new THREE.MeshStandardMaterial({ color: 0x7a3a2a, roughness: 0.7 });
  const m = new THREE.Mesh(geo, mat);
  m.position.y = 0.18;
  return m;
}

export interface CyclopsCave {
  group: THREE.Group;
  items: CaveItem[];
  /** Toggle the two local light sources between door-open and door-closed radii (tuning.md §12/§12.1). */
  setDoorOpen(open: boolean): void;
  hearthLight: THREE.PointLight;
  torchLight: THREE.PointLight;
}

export function buildCyclopsCave(): CyclopsCave {
  const group = new THREE.Group();

  // Ground strip for the whole D range (cove included) so nothing falls
  // through void; cave rooms below layer box shells on top of this.
  const floorGeo = new THREE.PlaneGeometry(40, 90);
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate(0, 0, 22.5); // covers D -20..65
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1 }),
  );
  group.add(floor);

  // Room shells: BackSide box per segment so the camera (inside) sees
  // interior walls/ceiling. Cove (open sky) and path get no shell.
  for (const r of ROOMS) {
    if (r.id === "cove" || !Number.isFinite(r.halfWidth)) continue;
    const depth = r.dMax - r.dMin;
    const width = r.halfWidth * 2;
    const height = Number.isFinite(r.ceilingY) ? r.ceilingY : 6;
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color: r.color,
      roughness: 1,
      side: THREE.BackSide,
    });
    const box = new THREE.Mesh(geo, mat);
    box.position.set(0, height / 2, r.dMin + depth / 2);
    group.add(box);
  }

  // Hearth (pens) — point light, radius toggles 6.0 (open) / 3.0 (closed),
  // same warm colour both states (tuning.md §12 CYCLOPS_LIGHT_RADIUS*).
  const hearthLight = new THREE.PointLight(0xeeae6a, 3.2, 6.0, 2);
  hearthLight.position.set(HEARTH_POS.x, 0.6, HEARTH_POS.z);
  group.add(hearthLight);
  const hearthGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffcf80 }),
  );
  hearthGlow.position.copy(hearthLight.position);
  group.add(hearthGlow);

  // Torch (inner nook) — fixed 3.0 m radius regardless of door state
  // (tuning.md §12 table: "zaten dar/sabit, kapıdan etkilenmiyor").
  const torchLight = new THREE.PointLight(0xeeae6a, 2.2, 3.0, 2);
  torchLight.position.set(TORCH_POS.x, 1.6, TORCH_POS.z);
  group.add(torchLight);

  // Hide-spot markers — thin flat ring, dev-visible for the primitive pass.
  for (const h of HIDE_SPOTS) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(h.radius - 0.06, h.radius, 24),
      new THREE.MeshBasicMaterial({ color: 0x5f7fa8, side: THREE.DoubleSide, transparent: true, opacity: 0.6 }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(h.x, 0.02, h.z);
    group.add(ring);
  }

  // Items.
  const items: CaveItem[] = ITEM_DEFS.map((d) => {
    const mesh = makeItemMesh(d.kind);
    mesh.position.set(d.x, mesh.position.y, d.z);
    group.add(mesh);
    return {
      id: d.id,
      kind: d.kind,
      room: d.room,
      home: { x: d.x, z: d.z },
      pos: { x: d.x, z: d.z },
      carried: false,
      delivered: false,
      mesh,
    };
  });

  function setDoorOpen(open: boolean): void {
    hearthLight.distance = open ? 6.0 : 3.0;
    torchLight.distance = 3.0; // unaffected by door state (tuning.md §12)
  }
  setDoorOpen(true);

  return { group, items, setDoorOpen, hearthLight, torchLight };
}
