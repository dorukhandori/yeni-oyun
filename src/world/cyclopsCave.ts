import * as THREE from "three";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture, loadDataTexture } from "./sprite";

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

/**
 * Bulundu (sahip playtest'i, 26 Ağu 2026): "dev içeri giriyor random
 * dolaşıyor ama duvarlara yakın sağa sola hiç gitmiyor random bir şekilde."
 * Eski gezinme hedefleri (`cyclopsStop.ts`) tek bir sabit nokta per oda idi,
 * 3'ü de x=0 (merkez hat) üstünde — dev neredeyse hiç yanlara sapmıyordu.
 * Odaların gerçek genişliğini (dar boğazların aksine, `x` serbestliği
 * içeride var) dışarı açan yardımcı — `cyclopsStop.ts` artık bir oda
 * seçip o oda İÇİNDE rastgele bir (x,z) çekebiliyor.
 */
export function roomBounds(id: RoomId): { dMin: number; dMax: number; halfWidth: number } {
  const r = ROOMS.find((room) => room.id === id);
  if (!r) throw new Error(`roomBounds: unknown room id ${id}`);
  return { dMin: r.dMin, dMax: r.dMax, halfWidth: r.halfWidth };
}

export const CAVE_MOUTH_D = 4; // CAUGHT_RESPAWN_POINT (level-cyclops-cave.md §1.2 note)

// ------------------------------------------------------------------ hearth
// level-cyclops-cave.md §3.4 correction: hearth shifted 4 m west of the
// pens room's centre so a real shadow pocket exists on the east wall.
export const HEARTH_POS = { x: -4, z: 35 };
export const TORCH_POS = { x: 0, z: 58 }; // inner nook wall-mounted torch, roughly central to the room

// -------------------------------------------------------------- hide spots
/**
 * Bulundu (sahip talebi, 26 Ağu 2026): "gizlenme yerleri gerçek girinti ve
 * çıkıntıdan oluşacak ve her odada random yerlerde olacak." Eski model
 * `level-cyclops-cave.md` §3'ün sabit koordinatlarıydı (soyut bir yarıçap,
 * görsel karşılığı yalnız dev-görünür bir halkaydı). Şimdi: her oturumda
 * (`buildCyclopsCave()` her çağrıldığında) yeniden çekiliyor — oda içinde
 * rastgele bir derinlik + rastgele bir duvar tarafı (sol/sağ), gerçek
 * geometriyle (kaya çıkıntısı ya da duvar oyuğu, yine rastgele).
 *
 * Sadeleştirme, bilerek: oyuncunun oyukların İÇİNE fiziksel olarak
 * girebilmesi (duvarın normal sınırını yerel olarak genişletme) bu turda
 * yapılmadı — `corridorHalfWidthAt(z)` hâlâ oda başına tek bir sayı,
 * konuma göre değişmiyor. Oyuk/kaya görsel olarak gerçek bir çıkıntı/girinti,
 * ama "güvenli" sayılma hâlâ mevcut yarıçap-mesafe kuralına bağlı — oyuncu
 * duvara yaslanacak kadar yakın durursa zaten o kontrolü geçiyor.
 */
export type HideSpotType = "rock" | "niche";

export interface HideSpot {
  room: RoomId;
  x: number;
  z: number;
  radius: number;
  type: HideSpotType;
  /** -1 = batı duvarı, 1 = doğu duvarı — geometri buna göre kuruluyor. */
  side: -1 | 1;
}

const HIDE_SPOT_ROOM_IDS: RoomId[] = ["mouth", "depot", "pens", "inner"];

function randomHideSpotFor(room: RoomSpan): HideSpot {
  const marginZ = 2.5;
  const span = Math.max(1, room.dMax - room.dMin - marginZ * 2);
  const z = room.dMin + marginZ + Math.random() * span;
  const side: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
  const type: HideSpotType = Math.random() < 0.5 ? "rock" : "niche";
  const wallX = Number.isFinite(room.halfWidth) ? room.halfWidth : 6;
  // Kaya duvardan içeri (yürünebilir alanda), oyuk duvarın kendi hizasında
  // (görsel cebi orada, gerçek geometri aşağıda inşa ediliyor).
  const x = side * (type === "rock" ? wallX - 1.3 : wallX - 0.55);
  return { room: room.id, x, z, radius: 1.4, type, side };
}

function generateHideSpots(): HideSpot[] {
  return ROOMS.filter((r) => HIDE_SPOT_ROOM_IDS.includes(r.id)).map(randomHideSpotFor);
}

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
  /** This build's randomised hide-spot placement (26 Ağu 2026) — not read by
   * cyclopsStop.ts's DETECT logic yet (that's still pure light-distance),
   * exposed for future use/debugging. */
  hideSpots: HideSpot[];
}

/**
 * Free PolyHaven "Worn Rock Natural 01" (CC0), pulled in via Blender MCP
 * (25 Ağu 2026) as a representative stand-in — sahip: "önce blenderdan vs
 * bedavaya temsili modellerle kodlayalım", before spending any Tripo
 * credit. Warmer/tanner than art-bible's chalk-white target (#e6e2d4);
 * nudged toward it with a light tint rather than re-downloading — the
 * real palette pass is later polish, this is just "not a flat color".
 */
function loadCaveRockMaterial(): THREE.MeshStandardMaterial {
  const map = loadAlbedoTexture(assetUrl("assets/textures/rock_cave_wall_01_albedo_1024.jpg"));
  const roughnessMap = loadDataTexture(assetUrl("assets/textures/rock_cave_wall_01_rough_1024.jpg"));
  const normalMap = loadDataTexture(assetUrl("assets/textures/rock_cave_wall_01_normal_1024.jpg"));
  for (const t of [map, roughnessMap, normalMap]) {
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.2, 2.2);
  }
  return new THREE.MeshStandardMaterial({
    map,
    roughnessMap,
    normalMap,
    color: 0xd8d0bc, // tint toward art-bible's chalk-white, source photo runs tan
    roughness: 1,
    side: THREE.BackSide,
  });
}

export function buildCyclopsCave(): CyclopsCave {
  const group = new THREE.Group();
  const rockMat = loadCaveRockMaterial();

  // Ground strip for the whole D range (cove included) so nothing falls
  // through void; cave rooms below layer box shells on top of this.
  const floorGeo = new THREE.PlaneGeometry(40, 90);
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate(0, 0, 22.5); // covers D -20..65
  // .clone() — the walls (rockMat, above) use the SAME cached texture
  // object (loadAlbedoTexture caches by URL); .repeat is a property of the
  // Texture, not the material, so without cloning, setting a different
  // repeat here would silently overwrite the walls' tiling too.
  const floorTex = loadAlbedoTexture(assetUrl("assets/textures/rock_cave_wall_01_albedo_1024.jpg")).clone();
  floorTex.needsUpdate = true;
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(9, 20);
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1, map: floorTex }),
  );
  floor.receiveShadow = true;
  group.add(floor);

  // Room shells: BackSide box per segment so the camera (inside) sees
  // interior walls/ceiling. Cove (open sky) and path get no shell.
  for (const r of ROOMS) {
    if (r.id === "cove" || !Number.isFinite(r.halfWidth)) continue;
    const depth = r.dMax - r.dMin;
    const width = r.halfWidth * 2;
    const height = Number.isFinite(r.ceilingY) ? r.ceilingY : 6;
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = rockMat;
    const box = new THREE.Mesh(geo, mat);
    // Bulundu (sahip playtest'i, 26 Ağu): "zemin ve duvarlar hareket
    // ederken flicker oluyor" — kutunun taban yüzü zemin `PlaneGeometry`
    // ile birebir aynı y=0 düzlemindeydi (klasik z-fighting). 5 cm aşağı
    // kaydırıldı, tavan farkı görsel olarak hissedilmez.
    box.position.set(0, height / 2 - 0.05, r.dMin + depth / 2);
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

  // Hide spots — real geometry (rock outcropping or wall niche), randomised
  // position/type per room per session (see generateHideSpots() above).
  const hideSpots = generateHideSpots();
  for (const h of hideSpots) {
    if (h.type === "rock") {
      // Çıkıntı: yürünebilir alana giren bir kaya kütlesi, arkasına
      // geçilip saklanılabilir.
      const geo = new THREE.IcosahedronGeometry(1.05, 0);
      geo.scale(1, 0.85, 1);
      const rock = new THREE.Mesh(geo, rockMat.clone());
      (rock.material as THREE.MeshStandardMaterial).side = THREE.FrontSide;
      rock.position.set(h.x, 0.75, h.z);
      rock.rotation.y = Math.random() * Math.PI * 2;
      group.add(rock);
    } else {
      // Girinti: duvarın normal hattının ötesine uzanan küçük bir cep —
      // oda kabuğuyla aynı malzeme, iç yüzü görünür (BackSide).
      const depth = 1.3;
      const nicheGeo = new THREE.BoxGeometry(depth, 2.3, 1.8);
      const niche = new THREE.Mesh(nicheGeo, rockMat);
      niche.position.set(h.x - h.side * (depth / 2 - 0.15), 1.05, h.z);
      group.add(niche);
    }
    // İnce zemin işareti — hâlâ dev-görünür bir ipucu, artık ikincil
    // (asıl "burası saklaş noktası" hissi geometriden geliyor).
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(h.radius - 0.06, h.radius, 24),
      new THREE.MeshBasicMaterial({ color: 0x5f7fa8, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
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

  return { group, items, setDoorOpen, hearthLight, torchLight, hideSpots };
}
