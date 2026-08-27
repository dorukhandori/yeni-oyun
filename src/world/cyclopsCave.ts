import * as THREE from "three";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture, loadDataTexture } from "./sprite";
import { loadGltfBundle } from "./gltf";
import { mulberry32 } from "./rng";
import { ISLAND_KIT, placeKit } from "./islandKit";
import { plantHero, paintHero } from "./ship";
import { buildDistantHills } from "./terrain";
import { SHIP, PALETTE, FLORA } from "../constants";

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
  { id: "cove", dMin: -50, dMax: -8, halfWidth: Infinity, ceilingY: Infinity, color: 0x2a3a4a },
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

// Üretim planı §4.2 (Hafif+ kapsam): patika düz bir yürüyüş değil, gerçek bir
// "yokuş" olsun — ama mağara içi (D>=0, halihazırda tüm oda/item/gizli-kapı
// mantığı Y=0 varsayıyor) hiç etkilenmesin, blast-radius'u path aralığına
// kilitli tutmak için. Bu yüzden düz bir rampa değil, kumsalda (D=-8) 0'dan
// başlayıp yolun ortasında tepe yapan, mağara eşiğine (D=0) tam olarak 0'a
// dönen bir "tümsek" (sinüs) eğrisi: eşikte süreksizlik/basamak olmaz.
const PATH_D_MIN = -8;
const PATH_D_MAX = 0;
const PATH_MAX_RISE = 1.5;

// Sahip (27 Ağu, onbeşinci geri bildirim): "suyu adanın içine kadar
// gelmesini kes" — koyun tamamı (D<-8) bu fonksiyonda hep DÜZ Y=0'dı,
// deniz seviyesinden (`SEA_TEX.floorY`=-0,16) yalnız 16 cm yukarıda —
// gerçek Gerstner dalga tepe genliği bunu zaman zaman aşıyor, kum/çim
// ORTASINDA (yalnız kıyıda değil) su görünüyordu (kıyı sırtı — aşağıdaki
// `ridgeHeightAt` — yalnız D≈-49..-52'yi kapsıyor, kalan ~40 m'yi değil).
// Kalıcı çözüm: koyun tamamı dalga genliğinden çok daha yüksek bir "plato"
// ya (0,4 m) kaldırıldı — hem mağara eşiğinde (D=0, iç mekan Y=0 varsayımı
// hiç bozulmadan) hem de kıyı sırtının kendi tabanında (D=-49, sırt
// geometrisiyle dikişsiz) TAM 0'a inen yumuşak, sürekli bir eğri.
const COVE_PLATEAU = 0.4;
const COVE_RISE_END = -14; // -8'den buraya kadar platoya yumuşak çıkış
const COVE_FALL_START = -46; // buradan kıyı sırtına yumuşak iniş başlıyor
const COVE_FALL_END = -49; // sırtın kendi tabanı (ridgeHeightAt'in d=0 noktası)

/** Ground height (world Y) at a given world Z. Cave mouth (D=0) and interior
 * (D>=0) are always exactly 0. D -8..0 is the original path hump (unchanged).
 * D<-8 (the open cove) sits on a gentle raised plateau — well above the
 * sea's floorY + wave amplitude — that eases back down to 0 right at the
 * shore rock ridge's own base. */
export function heightAt(z: number): number {
  if (z >= PATH_D_MAX) return 0;
  if (z > PATH_D_MIN) {
    const t = (z - PATH_D_MIN) / (PATH_D_MAX - PATH_D_MIN);
    return PATH_MAX_RISE * Math.sin(Math.PI * t);
  }
  if (z <= COVE_FALL_END) return 0;
  if (z <= COVE_FALL_START) {
    const t = (z - COVE_FALL_END) / (COVE_FALL_START - COVE_FALL_END);
    return COVE_PLATEAU * (0.5 - 0.5 * Math.cos(t * Math.PI));
  }
  if (z <= COVE_RISE_END) return COVE_PLATEAU;
  const t = (z - PATH_D_MIN) / (COVE_RISE_END - PATH_D_MIN);
  return COVE_PLATEAU * (0.5 - 0.5 * Math.cos(t * Math.PI));
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

// CAUGHT_RESPAWN_POINT (level-cyclops-cave.md §1.2, "mağara ağzı D≈4", 14 Ağu
// @helix) existed here through two revisions — first the locked D≈4 itself,
// then a same-session fix moving it to x=2.4/z=-4 after finding the original
// point sat inside the giant's own wander/beeline path (__CYCLOPS_DEBUG__,
// 26 Ağu). Sahip's very next request removed the whole mechanic it served:
// "dev beni bir kere ezdiğinde girişe ışınlanıyorum, bunu ben sadece 3/3
// olduğunda istiyorum" (26 Ağu, üçüncü tur) — cyclopsStop.ts's onCaught() no
// longer teleports the player on crush 1/2 at all, only a full run reset via
// the loss screen's "Yeniden Oyna" (back to the ship spawn, not this point).
// Both constants removed as dead code — full reasoning is in git history
// (commits around 26 Ağu) if a future respawn-on-partial-crush design wants
// to reintroduce something like this.

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

/**
 * Bulundu (sahip talebi, 26 Ağu 2026): İç nöy artık öğe hedefine ulaşmak
 * için ZORUNLU bir durak (bkz. ITEM_DEFS'in yukarıdaki notu) ve dev'in
 * kendi yatağı da orada — "orada ezilmemeleri epey zor olsun ama bir kaç
 * tane saklanma girintisi olsun." Diğer odalar 1 girinti ile kalıyor, İç
 * nöy 3 alıyor — tehlike gerçek ama tek bir dar geçit değil.
 */
const HIDE_SPOTS_PER_ROOM: Partial<Record<RoomId, number>> = { inner: 3 };

function randomHideSpotFor(room: RoomSpan, usedZ: number[]): HideSpot {
  const marginZ = 2.5;
  const span = Math.max(1, room.dMax - room.dMin - marginZ * 2);
  // Aynı odada birden çok girinti üretilirken üst üste binmesinler diye
  // basit bir "yeniden dene" — kesin bir garanti değil, iyi niyetli bir
  // dağılım (odalar zaten birkaç metrelik span'lara sahip).
  let z = room.dMin + marginZ + Math.random() * span;
  for (let attempt = 0; attempt < 6 && usedZ.some((u) => Math.abs(u - z) < 3.5); attempt++) {
    z = room.dMin + marginZ + Math.random() * span;
  }
  const side: -1 | 1 = Math.random() < 0.5 ? -1 : 1;
  const type: HideSpotType = Math.random() < 0.5 ? "rock" : "niche";
  const wallX = Number.isFinite(room.halfWidth) ? room.halfWidth : 6;
  // Kaya duvardan içeri (yürünebilir alanda), oyuk duvarın kendi hizasında
  // (görsel cebi orada, gerçek geometri aşağıda inşa ediliyor).
  const x = side * (type === "rock" ? wallX - 1.3 : wallX - 0.55);
  return { room: room.id, x, z, radius: 1.4, type, side };
}

function generateHideSpots(): HideSpot[] {
  const spots: HideSpot[] = [];
  for (const room of ROOMS.filter((r) => HIDE_SPOT_ROOM_IDS.includes(r.id))) {
    const count = HIDE_SPOTS_PER_ROOM[room.id] ?? 1;
    const usedZ: number[] = [];
    for (let i = 0; i < count; i++) {
      const spot = randomHideSpotFor(room, usedZ);
      usedZ.push(spot.z);
      spots.push(spot);
    }
  }
  return spots;
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

// Bulundu (sahip talebi, 26 Ağu 2026, iki aşamalı):
// 1) "en çok dev'in odasında yerde yemekler olacak" — orijinal dağılım (2
//    depo / 3 ağıllar / 2 iç nöy) ağıllarda en çoktu; 2/2/3'e çekildi, İç
//    nöy tek başına en kalabalık oda oldu. O anda "güvenli minimal rota"
//    (depo+ağıllar) hâlâ tam hedefi (4) karşılıyordu — sıfır tampon ama
//    teorik olarak İç nöy'e hiç girmeden bitirilebiliyordu.
// 2) Sonraki talep: "mağaranın içinde yerde olan yemekler gemiye yeterli
//    kadar sayıyı karşılamıyor, yani dev'in odasına girmeleri gerekiyor" —
//    bu, level-cyclops-cave.md §9 madde 5'in açık sorusunu ("güvenli
//    minimal rota keşfediliyor mu?") kasıtlı olarak KAPATIYOR: artık böyle
//    bir rota YOK. A-02 kaldırıldı (ağıllar 2→1); depo(2)+ağıllar(1)=3 <
//    hedef(4) — en az 1 öğe İç nöy'den gelmek ZORUNDA. İç nöy'de hâlâ 3
//    öğe var (I-01/I-02/I-03), yani hangisini alacağını seçme özgürlüğü
//    kalıyor, sadece "hiç girmeme" seçeneği gitti. Buna karşılık olarak İç
//    nöy'e birkaç saklanma girintisi eklendi (aşağıda HIDE_SPOTS_PER_ROOM) —
//    zor ama tamamen çıkışsız değil.
const ITEM_DEFS: { id: string; kind: ItemKind; room: RoomId; x: number; z: number }[] = [
  { id: "D-01", kind: "cheese", room: "depot", x: -4, z: 12 },
  { id: "D-02", kind: "wine", room: "depot", x: 4, z: 20 },
  { id: "A-01", kind: "cheese", room: "pens", x: -3, z: 29 },
  { id: "I-01", kind: "cheese", room: "inner", x: -3, z: 53 },
  { id: "I-02", kind: "wine", room: "inner", x: 2, z: 63 },
  { id: "I-03", kind: "cheese", room: "inner", x: 3, z: 58 },
];

// ASSET-093/094 — plan called for "konsept + doku" (bespoke concept +
// texture) for these; given they're small (0.16-0.36 m), background pickup
// props seen only briefly, that investment isn't proportionate right now.
// Improved the PRIMITIVE silhouettes instead (still pure code mesh, 0
// credit) — a flat cylinder read as a disc, not obviously "cheese", and a
// stretched sphere read as an egg, not "wineskin". A rind ring and a real
// tied-neck bag shape are both readable from a walking distance without
// needing an actual texture.
function makeItemMesh(kind: ItemKind): THREE.Object3D {
  if (kind === "cheese") {
    const group = new THREE.Group();
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0xe8c165, roughness: 0.8 });
    const rindMat = new THREE.MeshStandardMaterial({ color: 0xc8934a, roughness: 0.9 });
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.16, 10), wheelMat);
    wheel.position.y = 0.08;
    group.add(wheel);
    // Rind — a torus hugging the wheel's outer edge, darker than the flesh.
    const rind = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.028, 6, 14), rindMat);
    rind.rotation.x = Math.PI / 2;
    rind.position.y = 0.08;
    group.add(rind);
    return group;
  }
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x7a3a2a, roughness: 0.7 });
  const tieMat = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9 });
  // Bag body — tapered top-to-bottom (wider base, narrower shoulder) rather
  // than a smooth ellipsoid, closer to a slack, half-full skin bag.
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 7), skinMat);
  body.scale.set(1, 1.25, 1);
  body.position.y = 0.19;
  group.add(body);
  const shoulder = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 8), skinMat);
  shoulder.position.y = 0.36;
  group.add(shoulder);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.1, 6), skinMat);
  neck.position.y = 0.45;
  group.add(neck);
  const tie = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.014, 5, 10), tieMat);
  tie.rotation.x = Math.PI / 2;
  tie.position.y = 0.43;
  group.add(tie);
  return group;
}

export interface CyclopsCave {
  group: THREE.Group;
  items: CaveItem[];
  /** Çim/saz rüzgâr sallanması — `cyclopsStop.ts`'in `step()`'i her karede çağırır. */
  update(t: number): void;
  /** Toggle the two local light sources between door-open and door-closed radii (tuning.md §12/§12.1). */
  setDoorOpen(open: boolean): void;
  hearthLight: THREE.PointLight;
  torchLight: THREE.PointLight;
  /** This build's randomised hide-spot placement (26 Ağu 2026) — not read by
   * cyclopsStop.ts's DETECT logic yet (that's still pure light-distance),
   * exposed for future use/debugging. */
  hideSpots: HideSpot[];
  /**
   * İç nöy'ün kendi geçidi (Boğaz B) — sahip (26 Ağu 2026): "kapısı devle
   * birlikte açılabilecek." Ana mağara kapısından ayrı, ikinci bir engel:
   * varsayılan KAPALI (görünür, geçidi kapatıyor), yalnız dev o aralıktan
   * geçerken açık (görünmez). Oyuncuyu FİZİKSEL olarak engellemiyor —
   * mevcut `corridorHalfWidthAt` çarpışması bundan habersiz, tıpkı ana
   * kapının oyuncuyu engellemediği gibi — yalnız görsel/senkron.
   */
  setInnerGateOpen(open: boolean): void;
  /** DEV-testing yalnız (__CYCLOPS_DEBUG__ üzerinden) — set-dressing koyunların
   * asenkron GLTF yüklemesi gerçekten tamamlandı mı, deterministik kontrol. */
  sheepLoaded(): boolean;
  /** DEV-testing yalnız — ASSET-090 mağara kabuğunun (tek merged GLB, async)
   * yüklemesi tamamlandı mı. */
  shellLoaded(): boolean;
  /** DEV-testing yalnız — ASSET-104'ün oval kaya kemeri (dış cephe) GLB'sinin
   * yüklemesi tamamlandı mı. */
  cliffLoaded(): boolean;
  /** DEV-testing yalnız — dünya-uzayı bounding box ölçümü için. */
  cliffGroup: THREE.Group;
  /** Sprint sonu sır özelliği (26 Ağu 2026, sahip) — T/Ü/R/K duvar levhaları,
   * sırayla dokununca İç nöy geçidini erkenden açan gizli kısayol. Konum/
   * etkileşim mantığı cyclopsStop.ts'te; burada yalnız geometri + koordinat. */
  runes: RuneMarker[];
}

export interface RuneMarker {
  letter: string;
  x: number;
  z: number;
}

/**
 * ASSET-091 v2 — real Gemini albedo (gemini-2.5-flash-image,
 * `art-source/work/prompt-asset-091-cyclops-cave-rock-wall.txt`), matched to
 * the locked interior chamber concepts (ASSET-105/106/107: raw Aegean
 * limestone, strata banding, cool blue-grey shadow + warm amber undertone).
 * Replaces the earlier PolyHaven "Worn Rock Natural 01" CC0 placeholder
 * albedo (25 Ağu 2026, "önce blenderden vs bedavaya temsili modellerle
 * kodlayalım" — before spending Tripo credit; that placeholder ran warmer/
 * tanner than art-bible's chalk-white target and needed a colour tint).
 * normalMap/roughnessMap stay the PolyHaven data maps — Gemini generates
 * appearance images, not accurate surface-normal/roughness data, so a
 * bespoke replacement for those two isn't a sensible use of a generation
 * round; a generic real-world data map paired with a different but
 * similar-scale albedo doesn't read as wrong in practice.
 */
function loadCaveRockMaterial(): THREE.MeshStandardMaterial {
  const map = loadAlbedoTexture(assetUrl("assets/textures/rock_cave_wall_02_albedo_1024.webp"));
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
    roughness: 1,
    side: THREE.BackSide,
  });
}

export function buildCyclopsCave(): CyclopsCave {
  const group = new THREE.Group();
  const rockMat = loadCaveRockMaterial();

  // Sahip (27 Ağu, on altıncı geri bildirim): "mağaranın ve adanın
  // arkasındaki sonsuzluk hissine çalışacağız" — 5 yeni Sketchfab linki
  // değerlendirildi, hiçbiri temiz kullanılabilir çıkmadı (2'si "Standard"
  // lisans/indirilemiyor, 1'i yalnız iframe-embed — sayfa görüntüleyici,
  // motora aktarılabilir bir 3D dosya vermiyor, 2'si indirilebilir ama
  // milyonlarca üçgenli fotogrametri taraması + fotogerçekçi, üstelik biri
  // ("Witcher 3 in Toussaint") kendi açıklamasında CD Projekt Red'e ait
  // olduğunu ve yalnız gayriresmi izin alındığını söylüyor — CC olarak
  // yeniden lisanslama hakkı vermez, kullanmadım). Bunun yerine Lotus'un
  // kendi, zaten üretilmiş, sıfır ek kredi/lisans riski taşıyan uzak-tepe
  // sistemini (terrain.ts `buildDistantHills`/`buildHillBackdropRing`,
  // ASSET-023 `hill_backdrop_01_albedo_2048` dokusu) tekrar kullanıyoruz —
  // ISLAND.radius+110 mesafesinde (varsayılan "real" profilde ~270 m),
  // Cyclops'un ~115 m'lik toplam koy+mağara derinliğinin çok ötesinde,
  // orijin (0,0,0) merkezli tam bir halka: hem koydan bakınca hem mağara
  // ağzından dışarı bakınca ufukta beliriyor, mağara içinden görünmüyor
  // (tavan/duvarlar zaten kapatıyor) — tam istenen yer.
  group.add(buildDistantHills(mulberry32(20260831)));

  // Sahip'in az önce indirdiği ambientCG "Terrain003" (CC0, gerçek
  // heykellenmiş arazi meshi, 2047 üçgen) — mağaranın ARKASINDA (D>0,
  // mağara içinin de ötesinde), halkanın hemen içinde tek, daha detaylı bir
  // dağ silueti olarak. **Düzeltme (27 Ağu, sahip):** "yanlış yere
  // koymuşsun mağaranın arkasına koyacaktın" — ilk denemede D=-150'ye
  // (denize doğru, kovun önü) koymuştum; mağara D=0 eşiğinden D>0'a doğru
  // kazılıyor (en derin oda "pens" D≈65'e kadar), "arkası" oraya göre daha
  // da +Z, D≈+150. `scripts/blender/convert_terrain003_ambientcg.py` ile
  // dönüştürüldü: MTL'nin bozuk Windows yolu yüzünden doku elle yeniden
  // bağlandı, yalnız albedo tutuldu (normal/roughness/AO/metallic bir
  // sis-siluetine hiç katkı yapmaz), 1024px'e küçültüldü, taban y=0'a
  // oturtulup 480 m genişliğe ölçeklendi.
  //
  // **Düzeltme (27 Ağu, sahip): "havada kaldı görünüm."** Kök neden doku
  // değildi (vertex-UV renk örneklemesiyle doğrulandı — düşük irtifa=sıcak
  // toprak, yüksek irtifa=gri kaya, doğal bir gradyan, hiç mavi/gökyüzü
  // rengi yok). Gerçek sebep: mesh'in tabanı tam y=0'a oturtulmuştu ama
  // Cyclops'un gerçek zemini yalnız ~D65'e kadar var, dağ D150'de —
  // aradaki ~85 m'de hiç zemin geometrisi yok, o boşlukta dağın alçak
  // kesimi gökyüzüne karışıp "havada asılı" bir tepe gibi okunuyordu.
  // `buildDistantHills`'in kendi koni tepeleri de aynı sorunu yaşamamak
  // için tabanlarını bilerek yerin altına gömüyor
  // (`h*0.5-h*0.42`) — aynı numara burada da: mesh'i yüksekliğinin
  // yaklaşık yarısı kadar batırıp yalnız üst/renkli kesimi görünür
  // bırakıyoruz, boşluk kapanıyor.
  //
  // **Düzeltme (27 Ağu, sahip, ekran görüntüsüyle): "hâlâ sarılıklar
  // filan kalıyor."** -10 m gömme boşluğu kapattı ama yeterince derin
  // değildi — Python'un ölçtüğü yükseklik-renk bantlarına göre "sıcak
  // toprak" tonu (RGB~170-180, R>G>B belirgin) tam ~11,3 m'ye kadar
  // sürüyor, ondan sonra griye dönüyor; -10 m'de bu sıcak bandın üst
  // ucu hâlâ ~1,3 m yerin üstünde kalıp gri sisli gövdenin altında
  // sarımsı bir "yaka" gibi görünüyordu. -14 m'ye çekilip tüm sıcak
  // bantlar (0-3, üst sınır 11,3 m) yerin altına gömüldü, yalnız
  // nötr gri-mavimsi üst bantlar (166-169 RGB, düşük doygunluk)
  // görünür kalıyor — uzak/sisli bir dağ silüetine daha uygun.
  //
  // **Düzeltme (27 Ağu, sahip): "hâlâ aynı, turuncu rengi bizim
  // dağlarla uyumlu yap, dağların boyunu da yükselt."** Gömme derinliği
  // yanlış teşhisti — "sarılık" bir yükseklik-bandı sorunu değil,
  // dokunun KENDİ genel tonu (en gri bandı bile R>G≈B, ılık bir gri)
  // `buildDistantHills`'in mevcut tepelerinin soğuk mavi-gri paletiyle
  // (`nearLayer.color` 0x8fa8bd, B>G>R) baştan uyumsuzdu — hangi
  // yükseklikte kessek de sıcak kalıyordu. Malzemeye aynı mavi-gri
  // rengi çarpan (multiply) bir `color` tint'i verilip doku o palete
  // çekildi (Blender'a dönmeye gerek yok, GLTFLoader materyali
  // `MeshStandardMaterial` çıkarıyor, `.color` doğrudan texture'ı
  // çarpıyor). Boy için: mesh'in KENDİ orijini zaten tabana (yerel
  // y=0) oturtulmuştu (Blender'daki `transform_apply`), o yüzden
  // `scene.scale.y` orijin etrafında ölçekleyip tabanı yerinde bırakır
  // — yalnız tepe yükselir. 1,8× dikey ölçek uygulandı (görünür
  // yükseklik ~7 m'den ~16 m'ye çıktı); sıcak bandın yerel eşiği de
  // aynı oranda büyüdüğünden (11,3 m → 20,3 m) gömme -14'ten -22'ye
  // büyütüldü ki hâlâ tam gizlensin.
  const TERRAIN_BACKDROP_SCALE_Y = 1.8;
  const TERRAIN_BACKDROP_BURY = -22;
  const TERRAIN_BACKDROP_TINT = 0x8fa8bd; // buildDistantHills nearLayer.color ile aynı
  loadGltfBundle("assets/models/terrain_backdrop_01_mesh_2000.glb").then((bundle) => {
    const scene = bundle.scene;
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = false;
        obj.receiveShadow = false;
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (m instanceof THREE.MeshStandardMaterial) {
            m.color.set(TERRAIN_BACKDROP_TINT);
          }
        }
      }
    });
    scene.scale.set(1, TERRAIN_BACKDROP_SCALE_Y, 1);
    scene.position.set(0, TERRAIN_BACKDROP_BURY, 150);
    group.add(scene);
  });

  // Ground strip, split at the cave mouth (D=0) so cove+path can carry a
  // real sandy coastal look + the heightAt() slope, while the cave interior
  // stays the flat rock floor it always was. Plan §4.2 (Hafif+): "bugün
  // sahilde mağara zemini var; deniz kenarı hissi sıfır" — bu bölünme onu
  // düzeltir. ASSET-110 (gemini-2.5-flash-image, ASSET-109 referanslı,
  // `art-source/work/prompt-asset-110-cyclops-cove-path-sand.txt`) — orijinal
  // 1024² çıktı köşegen gölge bantlarında dikiş gösteriyordu (aynı ASSET-015
  // sand_gold_01 dersi), merkezden 480² kırpılıp 512'ye ölçeklenerek
  // düzeltildi, 2x2 döşemede dikişsiz doğrulandı.
  //
  // 27 Ağu 2026, sahip (referans görsele bakarak): "yerler çim ve patika
  // toprak taşlık olmalı" — az önce tüm kova düz kumdu, ASSET-109/104'ün
  // referans görseli ise yalnız kıyı şeridinde kum, geri kalanı kuru/altın
  // bir çim yamacı + üstüne döşenmiş taş bir patika gösteriyor. Üç ayrı
  // düzlem (Lotus'un `buildGroundMaterial()`'ındaki tam onBeforeCompile
  // splat-shader'ı burada gerekmiyor — Cyclops'un koridoru zaten düz bir
  // şerit, karmaşık bir path-mask'e ihtiyaç yok): kıyıda dar bir kum
  // şeridi (Lotus'un aynı ASSET-110 dokusu), onun ötesi çim (Lotus'un
  // terrain.ts'in kullandığı AYNI `flora_drygrass_01` dokusu — "Lotus
  // adasındaki assetlerle" isteğiyle birebir), ikisinin üstüne bindirilmiş
  // dar bir taş patika şeridi (`rock_chalk_01`, sıkı tekrarla "döşeli taş"
  // okunsun diye) — hepsi aynı `heightAt(z)` tümseğine oturuyor, D=0'da
  // aynı dikişsiz sıfıra iniyor.
  const makeGroundGeo = (
    width: number,
    zMin: number,
    zMax: number,
    segs: number,
    yOffset = 0,
    xAt?: (z: number) => number,
  ) => {
    const geo = new THREE.PlaneGeometry(width, zMax - zMin, 1, segs);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, (zMin + zMax) / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      pos.setY(i, heightAt(z) + yOffset);
      if (xAt) pos.setX(i, pos.getX(i) + xAt(z));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };

  // Sahip (27 Ağu, ASSET-109'un yaklaşım açısı/kompozisyonu geri bildirimi):
  // dosdoğru bir patika oyuncunun kameradan gördüğü şey her zaman düz-önden
  // okunuyordu, referans görselin "deniz bir yanda, kayalık+mağara öbür
  // yanda, patika çapraz yükseliyor" hissi hiç çıkmıyordu. Patikayı (yalnız
  // GÖRSEL şerit — mekanik `corridorHalfWidthAt` kelepçesi D=-8..0'da hâlâ
  // dosdoğru |x|<3, dokunulmadı) tek bir yay ile büküyor: spawn'da (D≈-26)
  // ve koridor başlangıcında (D=-8) x=0'a oturuyor (ikisi de sabit oyuncu
  // konumları — bükülme onları kaçırmasın diye), aradaki açık koyda bir
  // sinüs yayıyla yana savruluyor. Ağaç/kaya dekoru da AYNI eğriyi
  // (`pathCenterX`) kullanıyor, patikanın üstüne ekilmesinler diye.
  //
  // Sahip (27 Ağu, altıncı VE onikinci geri bildirim): "denizden mağara
  // arası biraz daha uzun olsun (yürüme yolu uzasın)" — iki turda kıyı
  // D=-20 → D=-30 → D=-40'a çekildi, mağara ağzı D=0 sabit kaldı
  // (odalar/kapılar D>=0'da, bu değişiklikten hiç etkilenmiyor).
  // `player.position.z` clamp'i ve spawn/gemi konumları `cyclopsStop.ts`'te
  // bu yeni uzunluğa göre güncellendi (bkz. o dosyadaki not).
  const pathCenterX = (z: number): number => {
    if (z <= -48 || z >= -8) return 0;
    const t = (z + 48) / 40; // 0 @ z=-48, 1 @ z=-8
    return -4.5 * Math.sin(Math.PI * t);
  };

  // Sahip (27 Ağu, onbeşinci geri bildirim): "suyu adanın içine kadar
  // gelmesini kes, buraya da kayalardan oluşan bir sahil görüntüsü
  // kazandır." Kum düzlemi Y=0, deniz `SEA_TEX.floorY`=-0,16 — bu 16 cm'lik
  // fark önceki turda (`shoreBlend:false`) düzeltilen z-fighting'den
  // BAĞIMSIZ bir sorunla karşılaşıyor: gerçek Gerstner dalga tepe genliği
  // zaman zaman bu farkı gerçekten aşıyor (koy uzadıkça daha fazla açık
  // deniz aynı anda görünür oluyor, bir dalga tepesinin bunu yakalama
  // ihtimali arttı) — deniz kuma "sızmıyor", gerçekten kumdan daha yükseğe
  // dalgalanıyor. Kalıcı çözüm: gerçek kıyı hattında (D=-50, kumun dış
  // kenarı) yükselen kayalık bir set — dalga genliğinden çok daha yüksek
  // (~0,7 m), fiziksel bir engel; aynı zamanda sahibin "kayalık sahil"
  // isteğini karşılıyor.
  const RIDGE_PEAK_Z = -50.6;
  const ridgeNoise = mulberry32(20260829);
  const ridgeXNoise: number[] = [];
  for (let i = 0; i < 48; i++) ridgeXNoise.push(ridgeNoise());
  const ridgeHeightAt = (x: number, z: number): number => {
    // D profili: kumla (z=-49) dikişsiz birleşiyor, tepe -50,6'da, denize
    // doğru (z=-52) kısmen alçalıyor (yarı-batık kayalar hissi).
    const d = Math.max(0, Math.min(1, (z + 49) / (-52 + 49)));
    const base = Math.sin(d * Math.PI * 0.85) * 0.75;
    const bucket = Math.max(0, Math.min(47, Math.round((x + 20) / 40 * 47)));
    const jag = (ridgeXNoise[bucket] - 0.5) * 0.35;
    return Math.max(0, base + jag * Math.sin(d * Math.PI));
  };
  const ridgeGeo = new THREE.PlaneGeometry(40, 3.5, 64, 10);
  ridgeGeo.rotateX(-Math.PI / 2);
  ridgeGeo.translate(0, 0, RIDGE_PEAK_Z);
  {
    const pos = ridgeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, ridgeHeightAt(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    ridgeGeo.computeVertexNormals();
  }
  const ridgeTex = loadAlbedoTexture(assetUrl("assets/textures/rock_chalk_01_albedo_1024.webp")).clone();
  ridgeTex.needsUpdate = true;
  ridgeTex.wrapS = THREE.RepeatWrapping;
  ridgeTex.wrapT = THREE.RepeatWrapping;
  ridgeTex.repeat.set(16, 1.5);
  const ridge = new THREE.Mesh(
    ridgeGeo,
    new THREE.MeshStandardMaterial({ color: 0xa39d8c, roughness: 0.97, map: ridgeTex }),
  );
  ridge.receiveShadow = true;
  ridge.castShadow = true;
  group.add(ridge);
  {
    // Kayalardan oluşan sahil — sırtın üstüne/etrafına LOT-28 kaya kiti
    // (zaten var, ekstra kredi yok), 1D bir sırt yerine gerçekten
    // "kayalık" okunsun diye.
    const shoreRockRand = mulberry32(20260830);
    type ShoreSpot = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number };
    const shoreBoulders: ShoreSpot[] = [];
    const shorePebbles: ShoreSpot[] = [];
    for (let i = 0; i < 22; i++) {
      const x = (shoreRockRand() * 2 - 1) * 19.5;
      const z = -52 + shoreRockRand() * 4.5;
      const s = 0.5 + shoreRockRand() * 1.1;
      const spot: ShoreSpot = {
        x,
        y: ridgeHeightAt(x, z) - s * 0.15,
        z,
        sx: s * (0.85 + shoreRockRand() * 0.4),
        sy: s * (0.6 + shoreRockRand() * 0.4),
        sz: s * (0.85 + shoreRockRand() * 0.4),
        rotY: shoreRockRand() * Math.PI * 2,
      };
      (i % 3 === 0 ? shorePebbles : shoreBoulders).push(spot);
    }
    void placeKit(group, ISLAND_KIT.boulder, shoreBoulders);
    void placeKit(group, ISLAND_KIT.pebble, shorePebbles);
  }

  const SAND_Z_MAX = -44; // kıyı şeridi: D -50..-44
  const sandGeo = makeGroundGeo(40, -50, SAND_Z_MAX, 16);
  const sandTex = loadAlbedoTexture(assetUrl("assets/textures/sand_coastal_01_albedo_512.webp")).clone();
  sandTex.needsUpdate = true;
  sandTex.wrapS = THREE.RepeatWrapping;
  sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(8, 2.4);
  const sand = new THREE.Mesh(
    sandGeo,
    new THREE.MeshStandardMaterial({ color: 0xd8c090, roughness: 1, map: sandTex }),
  );
  sand.receiveShadow = true;
  group.add(sand);

  // Sahip (27 Ağu, altıncı geri bildirim): "yerler hâlâ bizim Lotus
  // adasındaki gibi çimen değil" — doku dosyası zaten Lotus'un ta kendi
  // `flora_drygrass_01`'iydi ama malzeme rengi (`0xcbb96a`, sıcak altın/kum
  // tonu) onu çimden çok kuma yakın gösteriyordu. Lotus'un terrain.ts'i
  // `PALETTE.grass{,Dry,Deep}` (gerçek yeşilimsi zeytin tonları, `constants.ts`)
  // ile bir `vTint` vertex-rengi çarpıyor — burada aynı üç tonun basit bir
  // vertex-color karışımı eklendi (Lotus'un tam `onBeforeCompile` shader'ı
  // değil, sadece `vertexColors:true` + üç ton arası deterministik bir
  // gürültü), düz tek-renk dokunun "boyalı plastik" hissini kırıyor.
  //
  // Sahip (27 Ağu, ondördüncü geri bildirim): "adanın çimen olan zemini
  // ağaçlarla uyumlu olmamış" — ilk denemem (paketin kendi
  // "plant-ground-green-01" dokusunu döşemek) yanlış çıktı: o doku tek bir
  // bitki demeti FOTOĞRAFI, siyah arka planlı bir "kesim" sprite'ı (tek
  // obje olarak yerleştirilmek için), döşenebilir bir zemin deseni değil —
  // tekrarlanınca ekranda çirkin siyah lekeler bıraktı, geri alındı.
  // Gerçek kök neden renkti: `PALETTE.grass*` (Lotus'un SICAK/PARLAK yaz
  // çayırı) bu paketin gerçek yaprak dokularından ÖRNEKLENEN ortalama
  // renklerden (tree-branches-mix ≈ #475A32, grass-01 ≈ #384427 — çok daha
  // KOYU/SOĞUK bir orman-yeşili) belirgin şekilde farklıydı. Üç ton bu
  // ölçülen renklere göre yeniden ayarlandı, aynı doku/vertex-tint tekniği
  // kalıyor.
  const grassGeo = makeGroundGeo(40, SAND_Z_MAX, 0, 40);
  {
    const cDry = new THREE.Color(0x5a6a3a);
    const cMid = new THREE.Color(0x475a32);
    const cDeep = new THREE.Color(0x384427);
    const pos = grassGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n =
        0.5 +
        0.5 * (Math.sin(x * 0.6 + z * 0.37) * 0.6 + Math.sin(x * 1.3 - z * 0.9 + 1.7) * 0.4);
      tmp.copy(n < 0.5 ? cDry : cMid).lerp(n < 0.5 ? cMid : cDeep, (n < 0.5 ? n : n - 0.5) * 2);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    grassGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  const grassTex = loadAlbedoTexture(assetUrl("assets/textures/flora_drygrass_01_albedo_1024.webp")).clone();
  grassTex.needsUpdate = true;
  grassTex.wrapS = THREE.RepeatWrapping;
  grassTex.wrapT = THREE.RepeatWrapping;
  grassTex.repeat.set(13, 8);
  const grass = new THREE.Mesh(
    grassGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: grassTex }),
  );
  grass.receiveShadow = true;
  group.add(grass);

  const PATH_HALF_W = 2.2; // COVE_CLEAR_HALF_X (4.5) içinde kalır — kenarda çim payı
  const pathGeo = makeGroundGeo(PATH_HALF_W * 2, -48, 0, 96, 0.015, pathCenterX);
  const pathTex = loadAlbedoTexture(assetUrl("assets/textures/rock_chalk_01_albedo_1024.webp")).clone();
  pathTex.needsUpdate = true;
  pathTex.wrapS = THREE.RepeatWrapping;
  pathTex.wrapT = THREE.RepeatWrapping;
  pathTex.repeat.set(PATH_HALF_W * 2 * 0.45, 48 * 0.45);
  const path = new THREE.Mesh(
    pathGeo,
    new THREE.MeshStandardMaterial({ color: 0xc9c2af, roughness: 0.95, map: pathTex }),
  );
  path.receiveShadow = true;
  group.add(path);

  // Cove exterior dressing (27 Ağu 2026, sahip): "mağaranın dışarısı bizim
  // ilk oyundaki ada gibi olsun — belli patika mağaraya giden, gerçek
  // ağaçlar/yeşillik, taşlar, gemimiz." Önce sadece düz kum vardı — kova/
  // patika bandı hiç giydirilmemişti. Lotus'un kendi LOT-28 ada kiti
  // (`islandKit.ts`, `placeKit`) sıfır yeni asset üretimiyle doğrudan
  // yeniden kullanıldı — aynı Ege palet/silüeti, ekstra kredi yok. Patika
  // görsel olarak zaten mekanik bir gerçek: `corridorHalfWidthAt` D=-8..0'da
  // oyuncuyu |x|<3'e kelepçeliyor (LOT-53'ün "belli belirsiz patika" ruhu) —
  // dekor bu koridoru sadece GÖRÜNÜR kılıyor, ağaçları/kayaları ondan uzak
  // tutarak. Oyuncu spawn'ı ve gemi çevresi de temiz tutuluyor (konumlar
  // `cyclopsStop.ts`'in yeni spawn'ıyla eşleşecek şekilde altıncı geri
  // bildirim turunda güncellendi).
  const COVE_CLEAR_HALF_X = 4.5; // corridorHalfWidthAt(path) 3 + tampon
  const COVE_SPAWN_CLEAR = { x: 0, z: -46, r: 3.5 };
  // z=-51 — kayalık sahil sırtının (RIDGE_PEAK_Z=-50.6) hemen ötesi, gemi
  // artık kuru kumun ortasında değil suyun kıyısında duruyor (onbeşinci
  // geri bildirim turunda sırt eklenince eski z=-47 kumun içinde kalmıştı).
  const COVE_SHIP_CLEAR = { x: 11, z: -51, r: 9 };
  function coveDressingClear(x: number, z: number): boolean {
    if (Math.abs(x - pathCenterX(z)) < COVE_CLEAR_HALF_X) return false;
    if (Math.hypot(x - COVE_SPAWN_CLEAR.x, z - COVE_SPAWN_CLEAR.z) < COVE_SPAWN_CLEAR.r) return false;
    if (Math.hypot(x - COVE_SHIP_CLEAR.x, z - COVE_SHIP_CLEAR.z) < COVE_SHIP_CLEAR.r) return false;
    return true;
  }
  // Rüzgâr/sallanma güncellemesi (çim + saz) — `placeKit()`'in döndürdüğü
  // `update(t)` callback'leri burada toplanıp `CyclopsCave.update()` ile
  // dışa açılıyor, `cyclopsStop.ts`'in kendi `step()`'i her karede çağırıyor.
  const kitUpdaters: Array<(t: number) => void> = [];
  {
    const rand = mulberry32(20260827);
    type KitSpot = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number };
    const reed: KitSpot[] = [];
    const boulder: KitSpot[] = [];
    const pebble: KitSpot[] = [];
    const scatter = (
      list: KitSpot[],
      count: number,
      zMin: number,
      zMax: number,
      scaleMin: number,
      scaleRange: number,
    ) => {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard < count * 20) {
        guard++;
        // Onikinci geri bildirim (bkz. aşağıdaki `scatterPack`): saf
        // rastgele X küçük sayılarda bir tarafa yığılabiliyor, sırayla
        // sol/sağ üretiliyor.
        const side = placed % 2 === 0 ? 1 : -1;
        const x = side * (1 + rand() * 18);
        const z = zMin + rand() * (zMax - zMin);
        if (!coveDressingClear(x, z)) continue;
        const s = scaleMin + rand() * scaleRange;
        list.push({
          x,
          y: heightAt(z),
          z,
          sx: s * (0.86 + rand() * 0.22),
          sy: s * (0.9 + rand() * 0.2),
          sz: s * (0.86 + rand() * 0.22),
          rotY: rand() * Math.PI * 2,
        });
        placed++;
      }
    };
    // Sayılar/aralıklar altıncı ve onikinci geri bildirim turlarında (koy
    // iki kez uzadı) orantılı büyütüldü — aynı yoğunluk, daha uzun bir
    // alana yayılıyor. Sahip (27 Ağu, onüçüncü geri bildirim): "diğer
    // bizim ağaçları kaldır, tüm çevre benim gösterdiğim ile tasarlansın"
    // — LOT-28 kitinin selvi/zeytin'i (cypress/olive) tamamen kaldırıldı,
    // ağaç çeşitliliği artık yalnız ASSET-116 (Sketchfab paketi) — bkz.
    // aşağıdaki `scatterPack` sayılarının bunu telafi etmek için artırıldığı
    // yer. Kaya/saz/çim kitleri (bunlar "ağaç" değil) dokunulmadan kaldı.
    // zMin -39 (not -40, the sand plane's own far edge) — a reed cluster
    // right at that seam read as floating over the sea from a low, close
    // camera angle (sahip'in referans görsel geri bildirimi turunda
    // bulundu).
    scatter(reed, 14, -49, -42, 0.7, 0.5);
    scatter(boulder, 11, -49, -0.5, 0.5, 0.5);
    scatter(pebble, 20, -49, -0.5, 0.35, 0.35);
    void placeKit(group, ISLAND_KIT.reed, reed, 0.08).then((u) => {
      if (u) kitUpdaters.push(u.update);
    });
    void placeKit(group, ISLAND_KIT.boulder, boulder);
    void placeKit(group, ISLAND_KIT.pebble, pebble);

    // Sahip (27 Ağu, onuncu geri bildirim): "neden Lotus adasındaki çimler
    // burda kullanılmıyor? hâlâ yerler düz yeşil." Doğru tespit — o zamana
    // kadar yalnız DÜZ, dokulu bir zemin vardı (kum→çim geçişi), Lotus'un
    // asıl "çim" hissi ise `terrain.ts`'in kendi `buildGrassTufts()`'ü:
    // yere yatık binlerce gerçek 3B çim demeti (`ISLAND_KIT.grass`), ince
    // dokulu bir alt-zemin değil. O katman burada hiç yoktu. Aynı hex-grid
    // dağılım tekniği + aynı `FLORA.grass*` sabitleri (Lotus'un tam
    // adasına göre kalibre, burada da aynı yoğunluk/ölçek) — yalnız alan
    // Cyclops'un kendi çim bandına (`SAND_Z_MAX`..0) ve patika/spawn/gemi
    // boşluklarına kısıtlandı.
    const grassPoses: KitSpot[] = [];
    {
      const spacing = FLORA.grassFieldSpacing;
      const hexH = spacing * 0.8660254;
      let row = 0;
      for (let z = SAND_Z_MAX; z <= 0; z += hexH) {
        const ox = (row % 2) * spacing * 0.5;
        row++;
        for (let x = -19; x <= 19; x += spacing) {
          const jx = x + ox + (rand() - 0.5) * spacing * 0.38;
          const jz = z + (rand() - 0.5) * hexH * 0.38;
          if (jz < SAND_Z_MAX || jz > 0) continue;
          if (!coveDressingClear(jx, jz)) continue;
          const spread = FLORA.grassSpreadScale * (0.9 + rand() * 0.2);
          const h = FLORA.grassHeightScale * (0.85 + rand() * 0.3);
          grassPoses.push({
            x: jx,
            y: heightAt(jz) - FLORA.grassSink,
            z: jz,
            sx: spread,
            sy: h,
            sz: spread,
            rotY: rand() * Math.PI * 2,
          });
        }
      }
    }
    void placeKit(group, ISLAND_KIT.grass, grassPoses, {
      sway: FLORA.grassSway,
      doubleSide: true,
      castShadow: false,
      receiveShadow: false,
      envMapIntensity: 0,
      vertexColors: false,
      color: PALETTE.grassDeep,
      lambert: true,
      lumaMax: 0.3,
      chunkMeters: FLORA.grassChunkMeters,
    }).then((u) => {
      if (u) kitUpdaters.push(u.update);
    });
  }

  // ASSET-116 — Sketchfab "Low poly trees, flowers and grass" (Márcio
  // Meireles, CC-BY-4.0). Sahip (27 Ağu, onbirinci geri bildirim): "sana
  // ağaç/maki/çim modeli bulup göndericem" — bu paket LOT-28 kitinin
  // (selvi/zeytin/kaya) yanına ek çeşitlilik katıyor: gerçek yaprak
  // dokulu bir yaz ağacı, kuru bir "maki" ağacı, üç küçük çiçek türü,
  // iki çim demeti varyantı. Autumn (sonbahar sarı/kahve) iki ağaç
  // varyantı ve "brown" zemin yaması, bu oyunun sıcak Ege YAZ paletiyle
  // çelişeceğinden Blender export'undan önce tamamen atıldı
  // (`scripts/blender/convert_lowpoly_trees_sketchfab.py`) — hiç
  // yüklenmiyorlar bile. Kalan her "tür" kendi glTF node grubu olarak
  // geldiğinden (`tree-stylized-04-green` gibi, kendi 1-2 alt-mesh'iyle
  // birlikte) — LOT-28 kitinin tek-geometri `instanceKit()` deseni yerine
  // (bu paket çoklu-malzemeli, tek geometriye birleşmiyor) boulderCluster
  // deseniyle aynı basit `.clone(true)` yaklaşımı kullanıldı: three.js
  // `clone()` geometri/malzemeyi PAYLAŞIR (kopyalamaz), bu yüzden onlarca
  // örnek yine ucuz.
  {
    const rand2 = mulberry32(20260828);
    type PackSpot = { name: string; x: number; z: number; scale: number; rotY: number };
    const packSpots: PackSpot[] = [];
    // Sahip (27 Ağu, ondördüncü geri bildirim): "sağ taraftaki ağaç
    // yoğunluğu az olmuş" — saf rastgele X (`(rand()*2-1)*19`) küçük
    // sayılarda (7-11 tane) şansa bağlı olarak bir tarafa yığılabiliyordu.
    // Artık her çağrı sayıyı iki yarıya bölüp SIRAYLA sol/sağ (x<0/x>0)
    // üretiyor — hangi tohum çıkarsa çıksın iki taraf da garanti dengeli.
    const scatterPack = (name: string, count: number, zMin: number, zMax: number, scaleMin: number, scaleRange: number) => {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard < count * 20) {
        guard++;
        const side = placed % 2 === 0 ? 1 : -1;
        const x = side * (1 + rand2() * 18);
        const z = zMin + rand2() * (zMax - zMin);
        if (!coveDressingClear(x, z)) continue;
        packSpots.push({ name, x, z, scale: scaleMin + rand2() * scaleRange, rotY: rand2() * Math.PI * 2 });
        placed++;
      }
    };
    // Sayılar sahibin "diğer ağaçları kaldır" isteği sonrası (LOT-28
    // selvi/zeytin çıkınca boşalan çeşitliliği telafi etmek için), sonra
    // "sağ taraf az" geri bildirimiyle bir kez daha artırıldı; koy da
    // -40'tan -50'ye uzadığı için aralıklar da genişletildi.
    scatterPack("tree-stylized-04-green", 14, -48, -2, 0.9, 0.5);
    scatterPack("tree-stylized-02-dry", 11, -48, -2, 0.7, 0.4);
    scatterPack("tree-stylized-01", 9, -48, -2, 0.8, 0.4);
    scatterPack("daisy-flower-diffuse-01", 9, -49, -0.5, 0.8, 0.4);
    scatterPack("daisy-flower-diffuse-02", 9, -49, -0.5, 0.8, 0.4);
    scatterPack("daisy-flower-diffuse-03", 9, -49, -0.5, 0.8, 0.4);
    scatterPack("daffodil-flower-01", 8, -49, -0.5, 0.8, 0.4);
    scatterPack("daffodil-flower-02", 8, -49, -0.5, 0.8, 0.4);
    scatterPack("grass-bushes-01", 15, -49, -0.5, 0.7, 0.5);
    scatterPack("grass-bushes-02", 15, -49, -0.5, 0.7, 0.5);

    loadGltfBundle("assets/models/flora_lowpoly_pack_01_mesh_2336.glb").then((bundle) => {
      // Sahip (27 Ağu, onikinci geri bildirim): "ağaçlar yatık, dik
      // durmuyor, diğer materyaller de öyle" — kök neden: bu paketin
      // kaynağı bir FBX'ti (glTF'nin kendi node ağacında "RootNode"/fbx
      // ara düğümleri görülüyordu), Blender'ın import+export round-trip'i
      // FBX'in Z-up eksenini glTF'nin Y-up'ına çevirirken düzeltme
      // rotasyonunu (−90° X) TÜR grup node'unun (`tree-stylized-04-green`
      // gibi) kendi yerel transform'una gömdü (ham GLB'de doğrulandı:
      // `rotation:[-0.707,0,0,0.707]`, artı ~100x ölçek, artı büyük bir
      // translation — FBX'in kendi birim/eksen dönüşümü). Önceki kod bu
      // node'u DOĞRUDAN klonlayıp kendi grubuma iğnelediğinden, o
      // düzeltme rotasyonu hiçbir üst node'un onu iptal etmesi olmadan
      // aynen kalıyor, ağaç yan yatmış gibi görünüyordu. Düzeltme: her
      // mesh'in TAM world matrix'ini (`updateMatrixWorld` sonrası) doğrudan
      // GEOMETRİYE pişiriyoruz (`applyMatrix4`) — hangi eksen/ölçek/konum
      // tuhaflığı olursa olsun bir kere çözülüyor — sonra kendi mesh'imi
      // sıfır transform'la, XZ'de ortalanmış ve tabanı y=0'a oturmuş yeni
      // temiz bir grup içine koyuyoruz; benim kendi konum/ölçek/rotY'im
      // artık üstüne temiz biniyor.
      bundle.scene.updateMatrixWorld(true);
      const templates = new Map<string, THREE.Group>();
      for (const spot of packSpots) {
        let tpl = templates.get(spot.name);
        if (!tpl) {
          const found = bundle.scene.getObjectByName(spot.name);
          if (!found) continue;
          const baked = new THREE.Group();
          found.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            const geo = obj.geometry.clone();
            geo.applyMatrix4(obj.matrixWorld);
            const mesh = new THREE.Mesh(geo, obj.material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.frustumCulled = false;
            baked.add(mesh);
          });
          const box = new THREE.Box3().setFromObject(baked);
          const center = new THREE.Vector3();
          box.getCenter(center);
          for (const child of baked.children) {
            (child as THREE.Mesh).geometry.translate(-center.x, -box.min.y, -center.z);
          }
          tpl = baked;
          templates.set(spot.name, tpl);
        }
        const inst = tpl.clone(true);
        inst.position.set(spot.x, heightAt(spot.z), spot.z);
        inst.scale.setScalar(spot.scale);
        inst.rotation.y = spot.rotY;
        group.add(inst);
      }

    });
  }

  // "Gemimiz" — Lotus'un gerçek kahraman gemisi (aynı GLB, aynı fit/boyama
  // mantığı — `ship.ts`'ten `plantHero`/`paintHero` bu tur için export
  // edildi), Cyclops'un küçük koyuna sığması için ek bir ölçek küçültmesiyle
  // (koy yalnız 40×20 m — Lotus'un 42 m tam boyu burada sığmaz). Yalnız
  // görsel — "gemiye teslim" tetiği zaten `player.position.z<=-15`'e bağlı
  // (bkz. cyclopsStop.ts), bu geminin gerçek konumu o bandın içinde, mekanik
  // değişmedi.
  const COVE_SHIP_SCALE = 0.42; // ~17.6 m — SHIP.length (42) × bu
  loadGltfBundle(SHIP.mesh).then((bundle) => {
    const hull = bundle.scene;
    plantHero(hull);
    paintHero(hull);
    hull.scale.multiplyScalar(COVE_SHIP_SCALE);
    hull.rotation.y = -1.1;
    hull.position.x += COVE_SHIP_CLEAR.x;
    hull.position.z += COVE_SHIP_CLEAR.z;
    group.add(hull);
  });

  const floorGeo = new THREE.PlaneGeometry(40, 65);
  floorGeo.rotateX(-Math.PI / 2);
  floorGeo.translate(0, 0, 32.5); // covers D 0..65
  // .clone() — the walls (rockMat, above) use the SAME cached texture
  // object (loadAlbedoTexture caches by URL); .repeat is a property of the
  // Texture, not the material, so without cloning, setting a different
  // repeat here would silently overwrite the walls' tiling too.
  const floorTex = loadAlbedoTexture(assetUrl("assets/textures/rock_cave_wall_02_albedo_1024.webp")).clone();
  floorTex.needsUpdate = true;
  floorTex.wrapS = THREE.RepeatWrapping;
  floorTex.wrapT = THREE.RepeatWrapping;
  floorTex.repeat.set(9, 14.4);
  const floor = new THREE.Mesh(
    floorGeo,
    new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 1, map: floorTex }),
  );
  floor.receiveShadow = true;
  group.add(floor);

  // Room shell — ASSET-090, `scripts/blender/build_cyclops_cave.py`. Was 7
  // independent BackSide BoxGeometry rooms (each fully closed, so at every
  // boundary two boxes' own near-walls sat almost back-to-back); replaced
  // (26 Ağu 2026) with ONE merged, continuous tunnel mesh built by the same
  // script reading this file's own ROOMS table — visual shell and collision
  // (`corridorHalfWidthAt`) can never structurally drift apart, and there is
  // no interior end-cap face left for a camera to clip into (see this
  // session's "camera clips through room walls" finding). Cove/path stay
  // shell-less (open sky, unchanged). UV is arc-length-in-meters (script's
  // own docstring) — `repeat` here divides by a target ~4.4 m tile size to
  // match, not the box-UV 2.2 the OTHER rockMat users below still want.
  let shellLoadedFlag = false;
  const shellMat = loadCaveRockMaterial();
  // .clone() each texture — loadAlbedoTexture/loadDataTexture cache by URL,
  // so without cloning this `.repeat` would silently overwrite rockMat's
  // (used below for hide-spots/niche/gate, which want the box-UV 2.2).
  shellMat.map = shellMat.map!.clone();
  shellMat.roughnessMap = shellMat.roughnessMap!.clone();
  shellMat.normalMap = shellMat.normalMap!.clone();
  for (const t of [shellMat.map, shellMat.roughnessMap, shellMat.normalMap]) {
    t.needsUpdate = true;
    t.repeat.set(1 / 4.4, 1 / 4.4);
  }
  loadGltfBundle("assets/models/cave_cyclops_shell_01_mesh_68.glb").then((bundle) => {
    bundle.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = shellMat;
        obj.receiveShadow = true;
      }
    });
    group.add(bundle.scene);
    shellLoadedFlag = true;
  });

  // Sahip (27 Ağu 2026, ekran görüntüsü geri bildirimi): "mağara dışarıdan
  // görünümle oval bir görünüm olmasını istiyorum" — D=0 eşiğinde hiç dış-
  // yüzey geometrisi yoktu (mağara kabuğu `BackSide`, yalnız İÇERİDEN
  // görünür), yani patikadan mağaraya yürürken eşiği geçene kadar hiçbir
  // şey görünmüyordu. `scripts/blender/build_cyclops_cliff.py` — tebeşir
  // beyazı bir kaya levhasının içinden oval bir kemer (ASSET-104'ün "large
  // natural rock archway" konseptine göre) oyulmuş, D=0'ı sarıyor.
  // Blender'ın kendi glTF export'u malzemeyi gömmedi (nedeni bulunamadı,
  // zaman kaybetmemek için) — chalk rengi burada, TS tarafında veriliyor,
  // tıpkı aşağıdaki kaya/kapı proplarının rockMat override deseni gibi.
  // Sahip (27 Ağu, sekizinci geri bildirim): "Cave gate [Sketchfab] girişi
  // için kullanmayı deneyebiliriz" — bir deneme, kesin karar değil. Tek
  // satırlık bir anahtar: `false` yaparsan doğrudan eski prosedürel
  // ASSET-114 kemerine döner, hiçbir başka kod değişmez.
  const USE_SKETCHFAB_GATE = true;
  let cliffLoadedFlag = false;
  const cliffGroup = new THREE.Group();
  group.add(cliffGroup);

  if (USE_SKETCHFAB_GATE) {
    // ASSET-115 — "Cave gate Stylized" by alzarac, Sketchfab, CC-BY-4.0
    // (atıf: docs/art/asset-registry.md). Blender'da import+export
    // round-trip'iyle tek bir self-contained .glb'ye dönüştürüldü
    // (`scripts/blender/convert_cave_gate_sketchfab.py`, dokular gömülü) —
    // proje kuralı (pipeline.md §7) gereği hiçbir loose .bin/texture
    // dosyası public/'a girmedi. Modelin kendi "Floor"/"Grass" parçaları
    // (kendi diorama zemini) atlanıyor — Cyclops'un kendi zemin/patika
    // sistemiyle çakışırdı; yalnız "Cave"/"Entrance"/"Lamp_Glow" tutuluyor.
    // `ship.ts`'in `plantHero`'suyla aynı ruhta basit bir bbox-fit: hedef
    // genişliğe ölçekle, X/Z'de ortala, en alçak noktayı y=0'a otur.
    loadGltfBundle("assets/models/rock_cave_gate_stylized_01_mesh_3998.glb").then((bundle) => {
      const scene = bundle.scene;
      const keep: THREE.Mesh[] = [];
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        const matName = Array.isArray(obj.material) ? "" : (obj.material?.name ?? "");
        if (matName === "Floor" || matName === "Grass") {
          obj.visible = false;
          return;
        }
        if (matName === "Lamp_Glow") {
          // Sahip (27 Ağu, dokuzuncu geri bildirim): "girişte lamba tutan
          // figür gözükmüyor" — model dosyasının kendi malzemesi
          // (`KHR_materials_unlit`, hiç baseColor yok → glTF varsayılanı
          // düz beyaz) parlayan bir alevden çok, ışıksız/gölgesiz düz
          // beyaz bir kutu gibi render oluyordu; bu, oynanışta bariz
          // "bozuk" okunuyordu. Aynı sıcak-alev tonu (`hearthGlow`,
          // aşağıda) burada da kullanıldı — gerçek bir figür/heykel değil
          // (modelde öyle bir mesh yok), ama en azından bir alev/lamba
          // gibi okunuyor.
          obj.material = new THREE.MeshBasicMaterial({ color: 0xffcf80 });
        }
        obj.receiveShadow = true;
        obj.castShadow = true;
        obj.frustumCulled = false;
        keep.push(obj);
      });
      // Modelin kendi "ön"ü D=0 eşiğine bakmıyordu — Sketchfab'ın kendi
      // kamera kuralı bizim +Z-derinleşir kuralımızla örtüşmüyor. 0°/180°
      // ikisi de düz kayaydı (görünür açıklık yok); 90°'de gerçek oyma
      // kemer (altın sütunlar + baykuş/canavar yüzü) tam eşiğe bakıyor —
      // üç açı da tarayıcıda tek tek denenip doğrulandı. Sıra önemli:
      // rotasyon EN BAŞTA — ölçek/ortalama hesapları döndürülmüş son
      // konuma göre yapılmalı, yoksa asimetrik gövde ortadan kayar.
      scene.rotation.y = Math.PI / 2;
      scene.updateMatrixWorld(true);
      const box = new THREE.Box3();
      for (const m of keep) box.expandByObject(m);
      const size = new THREE.Vector3();
      box.getSize(size);
      // Sahip (27 Ağu, dokuzuncu geri bildirim): "biraz daha küçültelim
      // kamera kadrajına girsin" — bu modelin oranı önceki 22×15 m'lik
      // (geniş/basık) levhadan farklı, kabaca kübik (~1:1 genişlik:
      // yükseklik) — 14 m genişliğe ölçeklenince boyu da ~14 m'ye çıkıyor,
      // normal oyuncu mesafesinde kameranın dikey görüş açısını aşıyordu.
      // 10 m'ye çekildi (yükseklik de orantılı küçülüyor, tek skaler ölçek).
      const TARGET_WIDTH = 10;
      scene.scale.setScalar(TARGET_WIDTH / Math.max(size.x, 0.01));
      scene.updateMatrixWorld(true);
      const fitted = new THREE.Box3();
      for (const m of keep) fitted.expandByObject(m);
      scene.position.x -= (fitted.min.x + fitted.max.x) / 2;
      scene.position.z -= (fitted.min.z + fitted.max.z) / 2;
      scene.position.y -= fitted.min.y;
      cliffGroup.add(scene);
      cliffLoadedFlag = true;
    });
  } else {
    const cliffMat = new THREE.MeshStandardMaterial({ color: 0xe6e2d4, roughness: 0.95 });
    loadGltfBundle("assets/models/rock_cyclops_cliff_01_mesh_4460.glb").then((bundle) => {
      bundle.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.material = cliffMat;
          obj.receiveShadow = true;
          obj.castShadow = true;
          obj.frustumCulled = false;
        }
      });
      cliffGroup.add(bundle.scene);
      cliffLoadedFlag = true;
    });
  }

  // Sahip (27 Ağu, yedinci geri bildirim): "mağaranın arkasını vs de
  // kompozisyona uygun hale getir" — kayalık kütlenin TEPESİ çıplak
  // tebeşir taşıydı, referans görsel (ASSET-109) ise kayalığın üstünü
  // altın-yeşil bir çim şeridi + birkaç selviyle taçlandırıyor, yandan/
  // arkadan bakınca kütle çıplak, düz bir levha gibi okunuyordu. Kayalığın
  // kendi bounding box'ı (`cliffWorldBox` debug alanı) y-tepesi ~14'te —
  // aynı çim vertex-tint tekniği (yukarıdaki `grass` zemin bloğu) + LOT-28
  // selvi kitiyle basit bir "çim şapkası" bindirildi, gerçek bir Blender
  // yeniden-üretimi gerekmeden.
  //
  // Yalnız ASSET-114 (eski düz levha) için — sabit y=14.05 onun bilinen
  // yüksekliğine göre hesaplanmıştı. ASSET-115 (Sketchfab kapı) çok daha
  // kompakt/farklı oranlı olduğundan bu sabit yükseklik onun gerçek
  // tepesinin çok üstünde kalıyor, "ağaçlar havada asılı kalmış" (sahip,
  // dokuzuncu geri bildirim) buradan geliyordu — ayrıca kapının kendi
  // dokusunda zaten yosun/yeşillik var, ek bir şapkaya ihtiyacı yok.
  if (!USE_SKETCHFAB_GATE) {
    const capGeo = new THREE.PlaneGeometry(19, 2.6, 24, 4);
    capGeo.rotateX(-Math.PI / 2);
    capGeo.translate(0, 14.05, 0);
    const cDry = new THREE.Color(PALETTE.grassDry);
    const cMid = new THREE.Color(PALETTE.grass);
    const cDeep = new THREE.Color(PALETTE.grassDeep);
    const pos = capGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n = 0.5 + 0.5 * Math.sin(x * 0.7 + z * 1.3);
      tmp.copy(n < 0.5 ? cDry : cMid).lerp(n < 0.5 ? cMid : cDeep, (n < 0.5 ? n : n - 0.5) * 2);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    capGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const capTex = loadAlbedoTexture(assetUrl("assets/textures/flora_drygrass_01_albedo_1024.webp")).clone();
    capTex.needsUpdate = true;
    capTex.wrapS = THREE.RepeatWrapping;
    capTex.wrapT = THREE.RepeatWrapping;
    capTex.repeat.set(6, 1);
    const cap = new THREE.Mesh(
      capGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: capTex }),
    );
    cap.receiveShadow = true;
    cliffGroup.add(cap);

    const rimCypress = [
      { x: -6.5, rotY: 0.4, s: 1.1 },
      { x: -1.2, rotY: 2.1, s: 0.95 },
      { x: 3.4, rotY: 4.0, s: 1.2 },
      { x: 7.8, rotY: 1.3, s: 1.0 },
    ].map((t) => ({
      x: t.x,
      y: 14.05,
      z: 0.2,
      sx: t.s,
      sy: t.s * 1.1,
      sz: t.s,
      rotY: t.rotY,
    }));
    void placeKit(cliffGroup, ISLAND_KIT.cypress, rimCypress);
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

  // ASSET-097 — the cave-mouth "koca kaya" (great boulder, [H] IX.240 —
  // Polyphemos seals the entrance with a boulder so massive no one else
  // could move it). Until now the door was purely a logical state (setDoorOpen only
  // touched light radii) — no visible geometry blocked the threshold when
  // "closed", which was the single biggest visible gap in the plan's own
  // inventory. Reuses build_island_kit.py's existing chalk boulder (0 new
  // credit, same art-bible palette as the outdoor cliffs) as a cluster —
  // one scaled-up single rock read as an oddly smooth giant pebble; several
  // at varied scale/rotation piled across the mouth reads as a real rockfall
  // seal instead.
  const boulderCluster = new THREE.Group();
  boulderCluster.position.set(0, 0, 0.2); // just inside the D=0 threshold
  const BOULDER_SPOTS: { x: number; y: number; scale: number; rotY: number }[] = [
    { x: -3.6, y: 0, scale: 2.6, rotY: 0.4 },
    { x: -1.4, y: 0, scale: 3.1, rotY: 2.1 },
    { x: 1.1, y: 0, scale: 2.9, rotY: 5.0 },
    { x: 3.5, y: 0, scale: 2.4, rotY: 1.2 },
    { x: -2.4, y: 1.9, scale: 2.2, rotY: 3.4 },
    { x: 0.2, y: 2.3, scale: 2.5, rotY: 0.9 },
    { x: 2.6, y: 1.8, scale: 2.0, rotY: 4.2 },
  ];
  loadGltfBundle("assets/models/rock_chalk_boulder_01_mesh_800.glb").then((bundle) => {
    for (const spot of BOULDER_SPOTS) {
      const rock = bundle.scene.clone(true);
      rock.position.set(spot.x, spot.y, 0);
      rock.rotation.y = spot.rotY;
      rock.scale.setScalar(spot.scale);
      boulderCluster.add(rock);
    }
  });
  group.add(boulderCluster);

  function setDoorOpen(open: boolean): void {
    hearthLight.distance = open ? 6.0 : 3.0;
    torchLight.distance = 3.0; // unaffected by door state (tuning.md §12)
    boulderCluster.visible = !open;
  }
  setDoorOpen(true);

  // İç nöy'ün kendi geçidi — Boğaz B'yi (dMin..dMax) kapatan bir kaya
  // levhası. Kapalıyken görünür/engel, dev geçerken açılıyor (görünmez).
  const gorgeB = ROOMS.find((r) => r.id === "gorgeB")!;
  const gateGeo = new THREE.BoxGeometry(gorgeB.halfWidth * 2 - 0.3, gorgeB.ceilingY - 0.3, 0.6);
  const gate = new THREE.Mesh(gateGeo, rockMat.clone());
  (gate.material as THREE.MeshStandardMaterial).side = THREE.FrontSide;
  gate.position.set(0, (gorgeB.ceilingY - 0.3) / 2, (gorgeB.dMin + gorgeB.dMax) / 2);
  group.add(gate);
  function setInnerGateOpen(open: boolean): void {
    gate.visible = !open;
  }

  // ASSET-095 — "kuzu ağılı" (lamb/kid pen), the pens room's one piece of
  // decor called out by both [H] IX.219-ish (lambs/kids sorted by age into
  // pens) and level-cyclops-cave.md's own crokí ("▓▓ kuzu ağılı ▓▓") — until
  // now completely absent from the room. Prosedürel kod mesh per the plan
  // (§ item 9), not a generated asset: a low wattle-fence rectangle (posts +
  // rails, primitive cylinders) on the room's east side (opposite the hearth
  // at x=-4, matching the design doc's saklaş noktası reference "doğu duvarı
  // gölge cebi") with a few simple resting lamb/kid shapes inside — capsule
  // bodies, no attempt at real animal anatomy, matching this project's
  // "primitive first" convention for code-mesh set-dressing (build_island_
  // kit.py's own boulders/flora are the same register).
  {
    const pen = new THREE.Group();
    pen.position.set(5.2, 0, 33.5);
    const postMat = new THREE.MeshStandardMaterial({ color: 0x6b5a42, roughness: 1 });
    const railMat = new THREE.MeshStandardMaterial({ color: 0x7a6850, roughness: 1 });
    const PEN_W = 3.2;
    const PEN_D = 3.6;
    const POST_H = 0.7;
    const postGeo = new THREE.CylinderGeometry(0.06, 0.07, POST_H, 6);
    for (const [px, pz] of [
      [-PEN_W / 2, -PEN_D / 2],
      [PEN_W / 2, -PEN_D / 2],
      [PEN_W / 2, PEN_D / 2],
      [-PEN_W / 2, PEN_D / 2],
    ]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, POST_H / 2, pz);
      pen.add(post);
    }
    // Horizontal wattle rails — one thin rotated cylinder per side, two
    // heights, leaving a gap at -Z for an "entrance" (visual only, no
    // physical collision on this prop — matches the level's existing
    // "decorative, non-blocking" convention for hide-spot geometry).
    // Cylinder's default long axis is Y; rotate 90° around Z to lie along
    // X (back rail), or 90° around X to lie along Z (side rails).
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, 1, 5);
    function addRail(x: number, z: number, length: number, alongX: boolean, y: number): void {
      const rail = new THREE.Mesh(railGeo, railMat);
      rail.scale.y = length;
      if (alongX) rail.rotation.z = Math.PI / 2;
      else rail.rotation.x = Math.PI / 2;
      rail.position.set(x, y, z);
      pen.add(rail);
    }
    for (const y of [0.35, 0.6]) {
      addRail(0, -PEN_D / 2, PEN_W, true, y); // back
      addRail(-PEN_W / 2, 0, PEN_D, false, y); // left
      addRail(PEN_W / 2, 0, PEN_D, false, y); // right
      // front side skipped — entrance gap
    }
    // A few resting lamb/kid shapes — capsule body + small sphere head,
    // cream/tan (art-bible-adjacent, not a new palette colour: close to
    // PALETTE's existing wool/sand family).
    const lambMat = new THREE.MeshStandardMaterial({ color: 0xd8c9a8, roughness: 0.9 });
    const lambSpots: { x: number; z: number; rotY: number; scale: number }[] = [
      { x: -0.6, z: 0.4, rotY: 0.6, scale: 1.0 },
      { x: 0.5, z: -0.3, rotY: -1.1, scale: 0.85 },
      { x: -0.3, z: -0.7, rotY: 2.4, scale: 0.9 },
    ];
    for (const spot of lambSpots) {
      const lamb = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.22, 4, 8), lambMat);
      body.rotation.z = Math.PI / 2;
      body.position.y = 0.16;
      lamb.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lambMat);
      head.position.set(0.22, 0.2, 0);
      lamb.add(head);
      lamb.position.set(spot.x, 0, spot.z);
      lamb.rotation.y = spot.rotY;
      lamb.scale.setScalar(spot.scale);
      pen.add(lamb);
    }
    group.add(pen);
  }

  // ---------------------------------------------------------- set-dressing
  // Sahip (26 Ağu 2026): bir Korsika sahil köyü/koyun patikası referansı
  // verdi ("koyunların olduğu bir yoldan mağaraya girmesini istiyorum") —
  // asıl referans (Sketchfab "Village of Canari") indirilemez/lisansı
  // belirsiz bir profesyonel fotogrametri taramasıydı (766k yüzey),
  // kullanılamadı. Kapsam sahip tarafından kasıtlı olarak sınırlandı:
  // "sadece hafif set-dressing" — koy/patika geometrisi (kutular, duvarlar)
  // DEĞİŞMEDİ, yalnızca birkaç statik koyun eklendi. ASSET-112 (ID
  // düzeltmesi, asset üretim planı §7.2 — bu dosya kısa süre yanlışlıkla
  // ASSET-093 olarak numaralanmıştı), CC-BY ("Sheep" by Odin.Branigan,
  // Sketchfab). Rig yok (düz statik mesh), tek
  // `.clone(true)` her kopya için güvenli — Polyphemos'un aksine
  // SkeletonUtils'e gerek yok.
  // Altıncı geri bildirim (27 Ağu, sahip): "taş patikada etrafta yayılmış
  // koyunlar vs yok" — önceki 4 sabit nokta sabit x değerleriyle
  // konumlanmıştı, koy bu turda uzayıp patika `pathCenterX` ile eğrilince
  // ikisi arasındaki ilişki eskimişti. Artık patikanın KENDİ eğrisine göre
  // (`pathCenterX(z) + yan mesafe`) konumlanıyor — hangi D'de olurlarsa
  // olsunlar patikanın hemen kenarındaki çimde duruyorlar, üstünde değil —
  // ve yeni, daha uzun koy boyunca (D -27..-4) 6 yerine 8 koyuna çıkarıldı.
  const SHEEP_SPOTS: { x: number; z: number; rotY: number; scale: number }[] = [
    { z: -45, side: 1, rotY: 1.2, scale: 1.0 },
    { z: -41, side: -1, rotY: 0.2, scale: 0.94 },
    { z: -35, side: 1, rotY: 0.7, scale: 0.98 },
    { z: -31, side: -1, rotY: 1.9, scale: 1.03 },
    { z: -25, side: 1, rotY: 0.4, scale: 1.05 },
    { z: -22, side: -1, rotY: -1.1, scale: 0.92 },
    { z: -19, side: 1, rotY: 2.3, scale: 1.0 },
    { z: -16, side: -1, rotY: 1.6, scale: 0.95 },
    { z: -13, side: 1, rotY: -0.9, scale: 0.9 },
    { z: -10, side: -1, rotY: 2.8, scale: 1.02 },
    { z: -7, side: 1, rotY: -0.3, scale: 0.96 },
    { z: -4, side: -1, rotY: 1.1, scale: 1.0 },
  ].map((s) => ({
    x: pathCenterX(s.z) + s.side * (PATH_HALF_W + 1.3),
    z: s.z,
    rotY: s.rotY,
    scale: s.scale,
  }));
  let sheepLoadedFlag = false;
  loadGltfBundle("assets/models/creature_sheep_01_stand_3100.glb").then((bundle) => {
    for (const spot of SHEEP_SPOTS) {
      const sheep = bundle.scene.clone(true);
      sheep.position.set(spot.x, heightAt(spot.z), spot.z);
      sheep.rotation.y = spot.rotY;
      sheep.scale.setScalar(spot.scale);
      group.add(sheep);
    }
    sheepLoadedFlag = true;
  });

  // -------------------------------------------------------------- rune sırrı
  // Sahip (26 Ağu 2026, sprint sonu fikri): "duvarlarda kazili runik harflerle
  // TURK yazisi ile etkilesime girilirse eger devin odasinin kapisi gelene
  // kadar acilir. (cok gizli bir trik ve oyun icinde sadece bir kere ipucu
  // var)". Yorum kararları (belirsizdi, en makul okumayla ilerlendi —
  // sahip yanlışsa düzeltir): (1) 4 harf T/Ü/R/K sırayla, YANLIŞ sırada
  // dokunulursa sıfırlanır — "sır çözme" hissi, tek tek bulup dokunmak
  // yetmiyor. (2) Odalar derinlik sırasına göre dağıtıldı ama HEPSİ Boğaz
  // B'den (İç nöy geçidi) ÖNCE — kendi testimde bulunan bir hata: son harfi
  // (K) önce İç nöy'ün içine koymuştum, ama geçit oyuncuyu hiç fiziksel
  // olarak engellemediği için (yalnız görsel/senkron, tıpkı ana kapı gibi)
  // oyuncu zaten geçidin "öbür tarafında" bittiriyordu — "kapı gelene kadar
  // açılır" mantığı (cyclopsStop.ts'teki geri-kapanma kontrolü) anlamsız
  // oluyordu. Son harf artık Ağıllar'ın sonunda, Boğaz B'ye girmeden hemen
  // önce. (3) Gerçek Göktürk rün alfabesi glyph'leri yok (font/unicode
  // güvenilirliği riski, her tarayıcıda aynı görünmeyebilir) — "kazınmış
  // taş" hissi veren stilize Latin harfler, gerçek rün görseli sonraki bir
  // sanat turu.
  const RUNE_ROOM_ORDER: { letter: string; room: RoomId; z: number; side: -1 | 1 }[] = [
    { letter: "T", room: "depot", z: 15, side: 1 },
    { letter: "Ü", room: "gorgeA", z: 24, side: -1 },
    { letter: "R", room: "pens", z: 30, side: 1 },
    { letter: "K", room: "pens", z: 42, side: -1 }, // Boğaz B (dMin=44) girişine hemen önce
  ];

  function buildRuneCanvasTexture(letter: string): THREE.CanvasTexture {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#3a352c";
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = "#252119";
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, size - 12, size - 12);
    ctx.fillStyle = "#c9b98a";
    ctx.font = "bold 150px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 8;
    ctx.fillText(letter, size / 2, size / 2 + 8);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  const runes: RuneMarker[] = RUNE_ROOM_ORDER.map((r) => {
    const room = ROOMS.find((room) => room.id === r.room)!;
    const halfX = Number.isFinite(room.halfWidth) ? room.halfWidth : 3;
    const x = r.side * (halfX - 0.12);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, 0.8),
      new THREE.MeshBasicMaterial({ map: buildRuneCanvasTexture(r.letter), side: THREE.DoubleSide }),
    );
    mesh.position.set(x, 1.6, r.z);
    mesh.rotation.y = r.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(mesh);
    return { letter: r.letter, x, z: r.z };
  });

  return {
    group,
    items,
    update(t: number) {
      for (const fn of kitUpdaters) fn(t);
    },
    setDoorOpen,
    hearthLight,
    torchLight,
    hideSpots,
    setInnerGateOpen,
    sheepLoaded: () => sheepLoadedFlag,
    shellLoaded: () => shellLoadedFlag,
    cliffLoaded: () => cliffLoadedFlag,
    cliffGroup,
    runes,
  };
}
