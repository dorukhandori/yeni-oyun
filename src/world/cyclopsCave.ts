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

// Genişletilmiş adanın (`ISLAND_WIDTH`, x=±110) dış kesimi için X-farkındalı
// taban — `heightAt(z)` yalnız Z'ye göre hesaplıyor ve mağara eşiği/sırt
// tabanına doğru BİLEREK sıfıra iniyor (dar orijinal şeritte sorun değildi,
// bkz. `buildCyclopsCave()` içindeki uzun not) — `|x|>18`'de gerçek bir
// taban (`COVE_PLATEAU+0,35`) garanti ediyor, x=18-26 yumuşak geçiş.
// **Modül seviyesine taşındı ve export edildi (27 Ağu, on sekizinci geri
// bildirim: "karakter ve koyunlar ve çimenler zeminin altında kalıyor"):**
// önceden yalnız `buildCyclopsCave()` içinde yerel bir closure'du, TÜM dış
// bölge dekoru (ağaç/kaya/koyun/çim) onu kullanıyordu — ama `cyclopsStop.ts`
// oyuncunun kendi Y'sini hâlâ düz `heightAt(player.position.z)` ile
// hesaplıyordu (X'i hiç bilmiyordu), oyuncu geniş dış bölgeye (|x|>18)
// yürüyünce görsel olarak yükseltilmiş zeminin ALTINDA kalıyordu — aynı
// eski "gömülü dekor" hatasının bu kez OYUNCUNUN KENDİSİNDE tekrarı.
// Kalıcı çözüm: TEK bir modül-seviyesi export, hem `buildCyclopsCave()`
// hem `cyclopsStop.ts` aynı fonksiyonu çağırıyor — uyumsuzluk yapısal
// olarak imkânsız hâle geldi.
const OUTER_FLOOR = COVE_PLATEAU + 0.35;
export function groundHeightAt(x: number, z: number): number {
  const base = heightAt(z);
  const ax = Math.abs(x);
  if (ax <= 18) return base;
  const blend = THREE.MathUtils.smoothstep(ax, 18, 26);
  return base + blend * Math.max(0, OUTER_FLOOR - base);
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
  /** Çim/saz rüzgâr sallanması + koyun dolaşma AI'ı — `cyclopsStop.ts`'in
   * `step()`'i her karede çağırır. `dt` koyunların kendi hareket
   * entegrasyonu için (rüzgâr sallanması hâlâ yalnız mutlak `t` kullanıyor). */
  update(t: number, dt: number): void;
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
 *
 * **ASSET-120 (27 Ağu, sahip):** "Cave on an alien planet (skybox)
 * mağaranın içi için" (oturumun en başındaki isteği) + bu turda "mağaranın
 * içi bundan olacak mutlaka" ile gönderdiği GLB — 4096×2048 equirect
 * panorama, parıldayan camgöbeği biyolüminesan gölcükler + damlayan
 * sarkıtlarla bir "yabancı gezegen mağarası." Tam gökküre olarak
 * kullanılamadı: tünel kabuğu (ASSET-090) tamamen kapalı bir merged mesh,
 * hiçbir açıklığı yok — bir gökküre küresi eklemek görünmez kalırdı (kabuk
 * her zaman önünde/arkasında). Bunun yerine equirect'ten TEK bir albedo
 * dokusu türetildi (`cave_alien_wall_01_albedo_1024.webp`, iki parlak
 * "hotspot" bulut kümesi kırpılıp dışarıda bırakıldı — döşemede tekrar
 * eden aydınlık lekeler yaratırdı) ve buradaki `map` bununla değiştirildi
 * — mağaranın TÜM iç yüzeyleri (kabuk + niş/kaya/kapı proplarının hepsi bu
 * fonksiyonu paylaşıyor) artık gerçekten "bundan" — sahibin istediği gibi.
 * normalMap/roughnessMap yine PolyHaven'ın kendi data map'lerinde kaldı
 * (yukarıdaki aynı gerekçe — equirect'ten gerçek yüzey-normal/pürüzlülük
 * verisi çıkaramayız).
 */
function loadCaveRockMaterial(): THREE.MeshStandardMaterial {
  const map = loadAlbedoTexture(assetUrl("assets/textures/cave_alien_wall_01_albedo_1024.webp"));
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

  // Sahip (27 Ağu): "aynı zamanda yerdeki beyaz taşları bizim rock
  // katalogdaki gerçek taşlarla değiştir. doğal gözüksün." Kovda dağılmış
  // LOT-28 kitinin düz-beyaz `boulder`/`pebble` parçaları (kıyı sırtı +
  // genel kova taşları, iki ayrı `placeKit` çağrısı) ASSET-119'un aynı
  // 11 parçalık gerçek kaya kiti ile değiştiriliyor. Kit bir kez
  // yükleniyor, her iki dağılım noktası da aynı promise'i paylaşıyor.
  type RockSpot = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number };
  const rockKitPieces: Promise<THREE.Mesh[]> = loadGltfBundle(
    "assets/models/rock_stylized_kit_01_mesh_11pcs.glb",
  ).then((bundle) => {
    const pieces: THREE.Mesh[] = [];
    bundle.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) pieces.push(obj);
    });
    return pieces;
  });
  const scatterRockKit = (parent: THREE.Object3D, spots: RockSpot[], rand: () => number) => {
    void rockKitPieces.then((pieces) => {
      if (pieces.length === 0) return;
      for (const spot of spots) {
        const template = pieces[Math.floor(rand() * pieces.length)];
        const piece = template.clone();
        piece.material = template.material;
        // ASSET-119'un ilk denemesindeki ders: `.set()` GLTF düğümünün
        // kendi taban ölçeğini (0.01) silerdi — `.multiply()` üstüne
        // çarpıyor, doğru.
        piece.scale.multiply(new THREE.Vector3(spot.sx, spot.sy, spot.sz));
        piece.position.set(spot.x, spot.y, spot.z);
        piece.rotation.y = spot.rotY;
        piece.receiveShadow = true;
        piece.castShadow = true;
        piece.frustumCulled = false;
        parent.add(piece);
      }
    });
  };

  // ASSET-122 — sahip: "sahili ve kumları biz mi tasarlasak? gerçekçi,
  // asimetrik ve gerçek bir sahil hissi veren modelleme yapalım uçtan uca
  // adamızı kaplayabilsin. ama kum hissi önemli." ASSET-121'in (fotogrametri
  // tarama, geri alındı — aşağıdaki not) yerine PROSEDÜREL bir kıyı kaya
  // kiti: `build_coast_rock_kit.py`, `build_island_kit.py`'nin AYNI,
  // kanıtlanmış tekniğiyle (vertex-renk tebeşir gölgeleme + cavity-crease
  // boyama — ASSET-068/069 ile birebir aynı, Lotus'ta hâlâ canlı) ama
  // ÇOK-BLOB birleşimiyle genişletildi (kayaya göre 2-4 üst üste binen,
  // rastgele döndürülmüş/ölçeklenmiş ico-sphere — `build_olive()`'in
  // kanopi tekniğiyle aynı `join()` mantığı): her kaya gerçekten
  // düzensiz/asimetrik bir siluet, tek deforme küre değil. Tarama riski
  // YOK — tamamen üretilmiş geometri, occlusion/delik sorunu yapısal
  // olarak imkânsız. 12 parça, 3 boy sınıfı (küçük çakıl → orta kaya →
  // büyük mahmuz), `rock_coast_kit_01_mesh_12pcs.glb`.
  type CoastRockSpot = { x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number };
  const coastRockKitPieces: Promise<THREE.Mesh[]> = loadGltfBundle(
    "assets/models/rock_coast_kit_01_mesh_12pcs.glb",
  ).then((bundle) => {
    const pieces: THREE.Mesh[] = [];
    bundle.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) pieces.push(obj);
    });
    return pieces;
  });
  const scatterCoastRockKit = (parent: THREE.Object3D, spots: CoastRockSpot[], rand: () => number) => {
    void coastRockKitPieces.then((pieces) => {
      if (pieces.length === 0) return;
      for (const spot of spots) {
        // Kit küçükten büyüğe sıralı (SM_CoastRock_01..12) — ağırlıklı
        // seçim: çoğunlukla küçük/orta (doğal kıyıda çakıl/orta taş
        // çoğunlukta), seyrek büyük mahmuz (dramatik ama nadir aksan).
        const r = rand();
        let idx: number;
        if (r < 0.45) idx = Math.floor(rand() * 4);
        else if (r < 0.85) idx = 4 + Math.floor(rand() * 4);
        else idx = 8 + Math.floor(rand() * 4);
        const template = pieces[Math.min(pieces.length - 1, idx)];
        const piece = template.clone();
        piece.material = template.material;
        // ASSET-119'un 100x büyüme dersi: `.multiply()`, asla `.set()`.
        piece.scale.multiply(new THREE.Vector3(spot.sx, spot.sy, spot.sz));
        piece.position.set(spot.x, spot.y, spot.z);
        piece.rotation.y = spot.rotY;
        piece.receiveShadow = true;
        piece.castShadow = true;
        piece.frustumCulled = false;
        parent.add(piece);
      }
    });
  };
  // Küme-tabanlı kıyı yerleşimi — bağımsız rastgele serpme yerine, gerçek
  // kıyılar gibi bazı noktalarda kaya kümeleri, aralarında GERÇEK açık kum
  // (sahip: "kum hissi önemli"). `gapChance` boş bırakılan slot oranı —
  // kıyının ~%35-45'i kasıtlı olarak taşsız kalıyor.
  const buildCoastClusters = (
    rand: () => number,
    slotCount: number,
    gapChance: number,
    posAt: (i: number) => { x: number; z: number },
    jitterRadius: number,
    scaleRange: [number, number],
    heightFn: (x: number, z: number) => number,
    clearFn?: (x: number, z: number) => boolean,
  ): CoastRockSpot[] => {
    const spots: CoastRockSpot[] = [];
    for (let i = 0; i < slotCount; i++) {
      if (rand() < gapChance) continue;
      const center = posAt(i);
      const n = 1 + Math.floor(rand() * 4); // 1-4 taş / küme
      for (let k = 0; k < n; k++) {
        const x = center.x + (rand() - 0.5) * jitterRadius * 2;
        const z = center.z + (rand() - 0.5) * jitterRadius * 2;
        if (clearFn && !clearFn(x, z)) continue;
        const s = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
        spots.push({
          x,
          y: heightFn(x, z),
          z,
          sx: s * (0.85 + rand() * 0.3),
          sy: s * (0.8 + rand() * 0.3),
          sz: s * (0.85 + rand() * 0.3),
          rotY: rand() * Math.PI * 2,
        });
      }
    }
    return spots;
  };

  // ASSET-121 denemesi (fotogrametri sahil kaya taraması) GERİ ALINDI —
  // kaynağın kendi verisinde düzeltilemez bir kusur bulundu: kayalar
  // sahada sıkışık bir YIĞIN olarak taranmış, birbirlerini kapatıyorlar
  // (occlusion). Tek tek ayrıştırılınca (loose-parts + weld sonrası)
  // her "kaya" delik deşik/yırtık bir kabuk çıkıyor (kamera onları hiçbir
  // açıdan tam göremediği için fotogrametri o yüzeyleri hiç
  // rekonstrükte edemiyor) — oyunda tam da sahibin tarif ettiği "parça
  // parça ve alakasız" görüntü buradan geliyordu. Ayrıntı ve kaynak
  // dosya: `docs/art/asset-registry.md` ASSET-121 satırı. Sahil kıyısı
  // yeniden ASSET-119'un (temiz, stilize) kaya kitini kullanıyor.

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
  //
  // **Düzeltme (27 Ağu, sahip): "mağara uzunluk derinlik arkaplana
  // yerleştirdiğimiz dağ görselinin önünde kaldığı için girişte anormallik
  // gözüküyor. adanın sağ ve sol sınırlarına da dağ modelini yerleştir."**
  // Tek bir dağ örneği yalnız mağaranın arkasındaydı (D=150) — kapının
  // hemen arkasında AÇIK GÖKYÜZÜNE karşı yalnız o dar açıda duruyordu, sağ/
  // sol açılardan bakınca (kapının kendi "Cave" gövdesinin göründüğü
  // açılar) arkada hiç dağ yoktu, çıplak ufuk + yakın kaba geometri yan
  // yana bir "anormallik" gibi okunuyordu. Aynı meshin iki kopyası daha
  // (`.clone(true)` — geometri/malzeme paylaşılıyor, ucuz; malzeme
  // paylaşıldığı için tint bir kez uygulanması üç örneğe de yansıyor)
  // adanın sağ ve sol sınırına eklendi — artık koydan hangi yöne bakarsa
  // baksın ufukta bir dağ siluetinin devam ettiği hissi var.
  loadGltfBundle("assets/models/terrain_backdrop_01_mesh_2000.glb").then((bundle) => {
    const original = bundle.scene;
    original.traverse((obj) => {
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
    // **Düzeltme (27 Ağu, sahip): "sağ ve sol tarafta dağ görsellerine
    // kadar hâlâ boşluk var."** x=±180 kapının arkasına oturttuğumuz yakın
    // kütleden (±20) çok uzaktaydı — koydan yana bakınca aradaki ~160 m
    // boş gökyüzü olarak görünüyordu. **İlk denemede x=±25'e çekildi ama
    // bu, mesh'in kendi gerçek kalınlığını hesaba katmıyordu:** 90°
    // döndürülünce meshin yerel X ekseni (480 m, "genişlik") dünya Z'ye
    // (kovun uzunluğu boyunca — istenen), yerel Z ekseni (~182 m, "diğer
    // yatay eksen") dünya X'ine (yana doğru KALINLIK) karşılık geliyor —
    // yarı-kalınlık ~91 m, x=25'te merkezlenince yakın kenarı x≈-66'ya
    // kadar kova içine gömülüyordu (tarayıcıda kamera meshin içinde
    // sıkıştı, doğrulandı). Merkez x=±120'ye çekildi (yakın kenar
    // ≈120-91=29, kovun ~20 m kenarını güvenle geçiyor) — hem x=±180'den
    // belirgin daha yakın/bağlantılı hem kovu istila etmiyor.
    // **Düzeltme (27 Ağu, sahip): "yanlardan gelen dağ görüntüsü çok yakın
    // onu inceltmemiz lazım."** x=120'de yarı-kalınlığı (~91 m, yukarıdaki
    // notta ölçülen yerel-Z→dünya-X eksen takası) hâlâ tam haliyle
    // duruyordu — kalın/bulky bir kütle gibi yakın hissediliyordu. Yalnız
    // yan örneklerde (`i>0`) yerel Z'ye (dünya X'teki KALINLIK) ekstra bir
    // `SIDE_THICKNESS_SCALE` çarpanı uygulanıyor — uzunluk (dünya Z boyunca
    // kovun kenarı) ve yükseklik dokunulmadan kalıyor, yalnız yana doğru
    // ince bir sırt gibi okunuyor. İncelme sayesinde merkez de daha güvenle
    // yakınlaştırılabildi (yeni yarı-kalınlık ~91×0,35≈32 m, x=60'ta yakın
    // kenar ≈28 m — kovun ~20 m kenarını hâlâ güvenle geçiyor).
    // **Düzeltme (27 Ağu, sahip): "sağa ve sola gelen dağ görüntüsünü de
    // kıs, sadece uzak bir siluet olucak."** x=60 + incelme (0,35×) yakın
    // mesafede hâlâ fazla belirgin/hazır bir kütle gibi duruyordu. Merkez
    // x=±150'ye geri çekildi (incelme aynı kaldı) — hem thin hem uzak,
    // gerçekten yalnız hazy bir ufuk siluetine dönüşsün diye.
    // **Düzeltme (27 Ağu, sahip, ekran görüntüsüyle): "mağaranın yanları
    // hâlâ sonsuzluk efekti yok, buraların görünmemesi lazım."** Yukarıdaki
    // üç örnek yalnız z=20/150'de (mağara ağzının hemen arkası) duruyordu —
    // ama koy o zamandan beri iki kez uzadı, oyuncu artık z=-50'ye kadar
    // (açık koyun tamamı, gemi dahil) serbestçe geziyor. O bölgeden yana
    // baktığında en yakın "sağ/sol sınır" örneği hâlâ z=20'deydi — 40-70 m
    // GERİDE, tam yana bakan bir açıda görünür bir boşluk bırakıyordu
    // (yalnız halkanın seyrek/rastgele 12 konisi o açıyı garanti kapsamıyor).
    // İki örnek daha eklendi (z=-40, açık koyun ortası) — sağ/sol sınır artık
    // koyun HEM mağara ağzına yakın hem açık deniz ucuna yakın kesiminde de
    // dolu, oyuncunun asıl gezdiği tüm z aralığında sürekli bir siluet var.
    const SIDE_THICKNESS_SCALE = 0.35;
    const placements = [
      { x: 0, z: 150, rotY: 0, thin: false }, // mağaranın arkası
      { x: 150, z: 20, rotY: Math.PI / 2, thin: true }, // sağ sınır — mağara ağzı yakını
      { x: -150, z: 20, rotY: -Math.PI / 2, thin: true }, // sol sınır — mağara ağzı yakını
      { x: 150, z: -40, rotY: Math.PI / 2, thin: true }, // sağ sınır — açık koy ortası
      { x: -150, z: -40, rotY: -Math.PI / 2, thin: true }, // sol sınır — açık koy ortası
    ];
    placements.forEach((p, i) => {
      const inst = i === 0 ? original : original.clone(true);
      inst.scale.set(1, TERRAIN_BACKDROP_SCALE_Y, p.thin ? SIDE_THICKNESS_SCALE : 1);
      inst.position.set(p.x, TERRAIN_BACKDROP_BURY, p.z);
      inst.rotation.y = p.rotY;
      group.add(inst);
    });
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
    opts?: { xSegs?: number; edgeJitter?: (x: number, edge: "min" | "max") => number },
  ) => {
    // `xSegs` (varsayılan 1, tüm eski çağrıları birebir aynı bırakır) —
    // sahip (27 Ağu, on yedinci geri bildirim): "sahil kumu ... adayla
    // bütünleşik değil." Kum/çim dikişi X ekseninde HİÇ alt bölünmemiş
    // (xSegs=1) düz bir kenardı — hiçbir jitter'ın kırabileceği bir şey
    // yoktu. `edgeJitter(x, "min"|"max")` yalnız o kenardaki satırın Z'sini
    // kaydırıyor — sand/grass ÇAĞRILARI AYNI fonksiyonu paylaştığı sürece
    // (biri "max", öbürü "min" kenarında) iki mesh dikişsiz iç içe geçiyor.
    const xSegs = opts?.xSegs ?? 1;
    const geo = new THREE.PlaneGeometry(width, zMax - zMin, xSegs, segs);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, (zMin + zMax) / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      let z = pos.getZ(i);
      if (opts?.edgeJitter) {
        if (Math.abs(z - zMin) < 1e-4) z += opts.edgeJitter(x, "min");
        else if (Math.abs(z - zMax) < 1e-4) z += opts.edgeJitter(x, "max");
        pos.setZ(i, z);
      }
      pos.setY(i, heightAt(z) + yOffset);
      if (xAt) pos.setX(i, pos.getX(i) + xAt(z));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  };
  // Kum/çim dikişinin paylaştığı kenar eğrisi — deterministik, düşük
  // frekanslı iki sinüs toplamı (kum dilleri çime, çim parmakları kuma
  // uzanıyor gibi). Genlik ~2 m: gerçek bir kıyı çizgisinin kendi
  // düzensizliğine yakın, ama abartılı bir "testere dişi" değil.
  const sandGrassSeamJitter = (x: number): number =>
    Math.sin(x * 0.17) * 1.4 + Math.sin(x * 0.61 + 1.3) * 0.7;

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
    // ASSET-122 — kıyı sırtı artık ASSET-119'un düz-serpme kalıbı yerine
    // `buildCoastClusters`: 16 slot boyunca (x=-19.5..19.5), ~%40'ı boş
    // (açık kum), doluysa 1-4 taşlık doğal bir küme.
    const shoreRockRand = mulberry32(20260830);
    const shoreSpots = buildCoastClusters(
      shoreRockRand,
      16,
      0.4,
      (i) => ({ x: -19.5 + (i / 15) * 39, z: -49.7 }),
      2.7,
      [0.45, 1.15],
      (x, z) => ridgeHeightAt(x, z) - 0.12,
    );
    scatterCoastRockKit(group, shoreSpots, shoreRockRand);
  }

  // Sahip (27 Ağu, on yedinci geri bildirim): "sahil kumu hiç gerçekçi
  // değil ve adayla bütünleşik değil." İki ayrı gerçek sorun: (1) kum
  // şeridi hâlâ eski 40 m'lik dar genişlikte kalmıştı (`ISLAND_WIDTH`
  // aşağıda 220'ye büyütülmeden ÖNCE tanımlanmamıştı burada) — genişleyen
  // 220 m'lik çim ADAYI'nın büyük kısmı hiç kum GÖRMEDEN doğrudan suya
  // iniyordu, tam da "adayla bütünleşik değil" şikayeti. (2) düz tek renk
  // (`color:0xd8c090`) + döşenen tek doku, hiç ton varyasyonu olmadan —
  // "boyalı" okunuyordu (grass'ın kendi `vertexColors` tekniğiyle aynı
  // sorunun aynısı, orada zaten bir kez çözülmüştü). `ISLAND_WIDTH` bu
  // yüzden buraya taşındı (aşağıda tekrar kullanılıyor, grass'ın kendi
  // genişliğiyle paylaşılıyor).
  const ISLAND_WIDTH = 220;
  const SAND_Z_MAX = -44; // kıyı şeridi: D -50..-44
  const sandGeo = makeGroundGeo(ISLAND_WIDTH, -50, SAND_Z_MAX, 16, 0, undefined, {
    xSegs: 90,
    edgeJitter: (x, edge) => (edge === "max" ? sandGrassSeamJitter(x) : 0),
  });
  {
    // `makeGroundGeo` yalnız Z'ye göre yükseklik veriyor (`heightAt(z)`) —
    // grass'ın kendi outer-floor yükseltmesini (`groundHeightAt`, |x|>18'de
    // +0,35 m'ye kadar) UYGULAMAZSA, dış bölgede kum SAND_Z_MAX dikişinde
    // grass'tan alçak kalır, aradaki ~0,35 m görünür bir basamak/uçurum
    // oluşturur. Grass'la TUTARLI olsun diye kum da aynı fonksiyonu
    // uyguluyor.
    const pos = sandGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, groundHeightAt(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    sandGeo.computeVertexNormals();
  }
  const sandTex = loadAlbedoTexture(assetUrl("assets/textures/sand_coastal_01_albedo_512.webp")).clone();
  sandTex.needsUpdate = true;
  sandTex.wrapS = THREE.RepeatWrapping;
  sandTex.wrapT = THREE.RepeatWrapping;
  sandTex.repeat.set(8 * (ISLAND_WIDTH / 40), 2.4);
  {
    // Grass'ın kendi tri-tone `vertexColors` tekniğiyle aynı desen: (a) ince
    // taneli ton varyasyonu (düz-boyalı hissi kırar), (b) kıyı sırtına/denize
    // yakın uçta (z→-50) koyulaşan "ıslak kum" bandı — gerçek bir sahilde
    // dalga/sıçrama her zaman oradan başlar, (c) çim sınırına yakın uçta
    // (z→SAND_Z_MAX) hafif yeşilimsi bir geçiş — iki dokunun sert dikişi
    // yerine yumuşak bir el değişimi.
    const cDry = new THREE.Color(0xe0c69c);
    const cMid = new THREE.Color(0xcda877);
    const cWet = new THREE.Color(0x8f7550);
    const cGrassEdge = new THREE.Color(0x6d7a4c);
    const pos = sandGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n =
        0.5 +
        0.5 * (Math.sin(x * 0.55 + z * 0.42) * 0.6 + Math.sin(x * 1.4 - z * 0.8 + 2.1) * 0.4);
      tmp.copy(cDry).lerp(cMid, n);
      const wetT = 1 - THREE.MathUtils.smoothstep(z, -50, -46.5);
      tmp.lerp(cWet, wetT * 0.65);
      const grassT = THREE.MathUtils.smoothstep(z, -47, SAND_Z_MAX);
      tmp.lerp(cGrassEdge, grassT * 0.3);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    sandGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  const sand = new THREE.Mesh(
    sandGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: sandTex }),
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
  // Sahip (27 Ağu): "gemi hariç, diğer deniz olan her yer adanın tabanı
  // gibi olsun — adayı genişlet, aynı assetleri kullanabilirsin, koyunları
  // da doğal random at." Çim düzleminin GENİŞLİĞİ 40'tan 220'ye
  // (x=±20→±110) büyütüldü — Z aralığı (SAND_Z_MAX..0) hiç değişmedi, bu
  // yüzden gemi/sırt/deniz bölgesine (z<SAND_Z_MAX) hiç dokunmuyor,
  // "gemi alanı hariç" otomatik sağlanıyor: çim asla oraya uzanmıyor. Doku
  // tekrarı (`repeat.x`) genişlikle orantılı büyütüldü (13→72) ki aynı
  // texel yoğunluğu korunsun, gerilip bulanıklaşmasın. (`ISLAND_WIDTH`
  // artık yukarıda, kum şeridiyle paylaşılan tek bir tanım olarak duruyor.)
  // **Düzeltme (27 Ağu, sahip): "hâlâ zemin tam oturmadı, alttan su
  // dalgalandıkça gözüküyor, mağara tarafında hâlâ deniz görüyorum."**
  // `heightAt(z)` mağara eşiğine (D=0) ve sırtın tabanına (D=-49) doğru
  // BİLEREK sıfıra iniyor (dar patikanın kendi eşiğiyle dikişsiz
  // birleşmesi için, `COVE_RISE_END`/`COVE_FALL_START` arası yumuşak
  // geçiş) — dar 40 m şeritte bu hiç sorun değildi, ama genişleyen 220 m'lik
  // dış bölge AYNI sıfıra-inen geçişi çok daha geniş/görünür bir alanda
  // miras aldı, dalga oradan sızıyor. Paylaşılan bir `groundHeightAt(x,z)`
  // — yalnız dış kesimde (|x|>18) `heightAt`'in eğrisi ne olursa olsun
  // gerçek bir taban garanti ediyor (x=18..26 yumuşak geçiş, x>26 tam
  // taban) — hem zemin MESH'i hem AŞAĞIDAKİ tüm dış bölge scatter'ları
  // (ağaç/kaya/koyun) TEK bir fonksiyonu paylaşıyor. **İkinci bulunan bug
  // (aynı sahip mesajı, "çiçekler/koyunlar/çimenler gömülmüş gibi"):** ilk
  // denemede yalnız MESH yükseltilmişti, scatter'lar hâlâ düz `heightAt(z)`
  // kullanıyordu — zemin onların üstüne çıkıp gömülü gösteriyordu. Artık
  // hepsi aynı fonksiyonu çağırıyor, uyumsuzluk yapısal olarak imkânsız.
  // (`groundHeightAt` artık modül seviyesinde tanımlı/export edilmiş —
  // yukarıdaki `heightAt`'in hemen altına bkz., 27 Ağu on sekizinci geri
  // bildirim: oyuncunun kendisi de aynı fonksiyonu kullanmalıydı.)
  const grassGeo = makeGroundGeo(ISLAND_WIDTH, SAND_Z_MAX, 0, 40, 0, undefined, {
    xSegs: 90,
    edgeJitter: (x, edge) => (edge === "min" ? sandGrassSeamJitter(x) : 0),
  });
  {
    const pos = grassGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, groundHeightAt(pos.getX(i), pos.getZ(i)));
    }
    pos.needsUpdate = true;
    grassGeo.computeVertexNormals();
  }
  {
    const cDry = new THREE.Color(0x5a6a3a);
    const cMid = new THREE.Color(0x475a32);
    const cDeep = new THREE.Color(0x384427);
    // Sahip (27 Ağu, on yedinci geri bildirim): "sahil kumu ... adayla
    // bütünleşik değil" — kumun kendi tarafı (yukarıda) çim rengine doğru
    // hafif kayıyordu ama çim tarafı bunu KARŞILAMIYORDU, dikiş hâlâ tek
    // yönlü/sert okunuyordu. Simetrik: çimin de kendi SAND_Z_MAX ucu kuma
    // doğru hafifçe sıcaklaşıyor.
    const cSandEdge = new THREE.Color(0xa8975f);
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
      const sandT = 1 - THREE.MathUtils.smoothstep(z, SAND_Z_MAX, SAND_Z_MAX + 3.5);
      tmp.lerp(cSandEdge, sandT * 0.3);
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
  grassTex.repeat.set(13 * (ISLAND_WIDTH / 40), 8);
  const grass = new THREE.Mesh(
    grassGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, map: grassTex }),
  );
  grass.receiveShadow = true;
  group.add(grass);

  // Sahip (28 Ağu): "ben o beyaz şerit gibi mağaraya giden belirli olan
  // yolu istemiyorum, daha doğal görünümlü bir patika istiyorum." Eskisi
  // (parlak `0xc9c2af` tebeşir tonu + sabit PATH_HALF_W ile dümdüz
  // dikdörtgen kenarlar + sık döşenmiş tek tip taş dokusu) gerçekten
  // "döşenmiş bir yol" gibi okunuyordu. Üç düzeltme: (1) renk çok daha
  // koyu/toprak tonuna çekildi + grass/sand'la aynı vertex-renk teknigiyle
  // aşınmış/kuru leke varyasyonu eklendi (düz-boyalı hissi kırar), (2)
  // patikanın GENİŞLİĞİ artık sabit değil — uzunluğu boyunca organik
  // biçimde daralıp genişliyor (gerçek bir keçi yolu/patika gibi, cetvelle
  // çizilmiş bir şerit değil), (3) doku tekrarı seyrekleştirildi ki tek
  // tip "döşeme" deseni daha az göze batsın.
  const PATH_HALF_W = 2.2; // COVE_CLEAR_HALF_X (4.5) içinde kalır — kenarda çim payı
  const pathGeo = makeGroundGeo(PATH_HALF_W * 2, -48, 0, 96, 0.015, pathCenterX);
  {
    const pos = pathGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      const localX = pos.getX(i) - pathCenterX(z);
      const side = localX < 0 ? -1 : 1;
      const widthJitter = Math.sin(z * 0.5 + side * 10) * 0.35 + Math.sin(z * 1.3 - side * 3) * 0.15;
      pos.setX(i, pos.getX(i) + side * widthJitter);
    }
    pos.needsUpdate = true;
    pathGeo.computeVertexNormals();
  }
  {
    const cDirtDry = new THREE.Color(0x8a7355);
    const cDirtWorn = new THREE.Color(0x6f5c42);
    const cDirtDust = new THREE.Color(0x9c8468);
    const pos = pathGeo.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const tmp = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n =
        0.5 + 0.5 * (Math.sin(x * 0.9 + z * 0.5) * 0.6 + Math.sin(x * 2.1 - z * 1.4 + 0.8) * 0.4);
      tmp.copy(n < 0.5 ? cDirtDry : cDirtWorn).lerp(n < 0.5 ? cDirtWorn : cDirtDust, (n < 0.5 ? n : n - 0.5) * 2);
      col[i * 3] = tmp.r;
      col[i * 3 + 1] = tmp.g;
      col[i * 3 + 2] = tmp.b;
    }
    pathGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  }
  const pathTex = loadAlbedoTexture(assetUrl("assets/textures/rock_chalk_01_albedo_1024.webp")).clone();
  pathTex.needsUpdate = true;
  pathTex.wrapS = THREE.RepeatWrapping;
  pathTex.wrapT = THREE.RepeatWrapping;
  pathTex.repeat.set(PATH_HALF_W * 2 * 0.22, 48 * 0.22);
  const path = new THREE.Mesh(
    pathGeo,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.97, map: pathTex }),
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
  // Patika/spawn/gemi'ye saygılı temel kontrol — göllerin KENDİ yerleşimi
  // bunu kullanıyor (aşağıda). `coveDressingClear` (asıl dışa açık isim,
  // tüm mevcut çağrı noktaları — ağaç/kaya/koyun/çim demeti — değişmeden
  // kalıyor) bunun üstüne göl kaçınmasını da ekliyor; döngüsel bağımlılık
  // olmasın diye göllerin kendisi bu ham fonksiyonu kullanıyor.
  function baseDressingClear(x: number, z: number): boolean {
    if (Math.abs(x - pathCenterX(z)) < COVE_CLEAR_HALF_X) return false;
    if (Math.hypot(x - COVE_SPAWN_CLEAR.x, z - COVE_SPAWN_CLEAR.z) < COVE_SPAWN_CLEAR.r) return false;
    if (Math.hypot(x - COVE_SHIP_CLEAR.x, z - COVE_SHIP_CLEAR.z) < COVE_SHIP_CLEAR.r) return false;
    return true;
  }

  // Sahip (27 Ağu, yirmi üçüncü geri bildirim): "ada içerisinde ufak
  // çukurlar ve su birikintileri olsun lotus adası gibi." Lotus'un kendi
  // `ponds.ts`'i tamamen ada-yarıçapı/lagün-merkezli polar koordinatlara
  // bağlı (LAGOON, LOTUS.zones, ISLAND.radius) — Cyclops'un düz D/derinlik
  // tabanlı koordinat sistemine hiç uymuyor, doğrudan içe aktarılamaz. Aynı
  // RUHU (heightmap'e oyulmuş bir çukur + içinde durgun su diski, aynı
  // `PALETTE.lagoon` rengi/malzeme tarifi) Cyclops'un kendi basit
  // koordinatlarıyla yeniden üretiyoruz.
  type Puddle = { x: number; z: number; radius: number };
  const PUDDLES: Puddle[] = [];
  {
    const puddleRand = mulberry32(20260911);
    let guard = 0;
    while (PUDDLES.length < 9 && guard < 500) {
      guard++;
      const side = PUDDLES.length % 2 === 0 ? 1 : -1;
      const x = side * (4 + puddleRand() * 100);
      const z = -46 + puddleRand() * 42;
      const radius = 1.5 + puddleRand() * 2.1;
      if (!baseDressingClear(x, z)) continue;
      let ok = true;
      for (const p of PUDDLES) {
        if (Math.hypot(x - p.x, z - p.z) < p.radius + radius + 5) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      PUDDLES.push({ x, z, radius });
    }
  }
  // Sahip (28 Ağu): "su birikintisi filan görmüyorum." Gerçek bir bug
  // bulundu — saf parabolik çanak (`t*t`) merkeze çok yakın hariç HER
  // YERDE sığdı (örn. yarıçapın yarısında dip yalnız ~%25 derinlik), ama
  // su diski TEK bir düz yükseklikte (merkezin TAM derinliğinde) o
  // yarıçapın %72'sine kadar yayılıyordu — sonuç: disk kendi kenarlarına
  // doğru gerçek zeminin ONLARCA santim ALTINDA kalıyordu, tamamen toprağa
  // gömülü, görünmez. Lotus'un kendi `ponds.ts`'iyle aynı düzeltme: DÜZ bir
  // taban (iç yarıçapta TAM derinlik) + yalnız kenarda (`PUDDLE_RIM_BLEND`
  // genişliğinde) yere doğru yumuşak bir geçiş — su diski artık düz tabanın
  // İÇİNDE kalıyor, her noktada gerçek zeminle eşleşiyor.
  const PUDDLE_DEPTH = 0.3;
  const PUDDLE_RIM_BLEND = 0.6;
  const puddleDipAt = (x: number, z: number): number => {
    let dip = 0;
    for (const p of PUDDLES) {
      const d = Math.hypot(x - p.x, z - p.z);
      const floorR = p.radius - PUDDLE_RIM_BLEND;
      if (d <= floorR) {
        dip = Math.max(dip, PUDDLE_DEPTH);
      } else if (d < p.radius) {
        const t = (p.radius - d) / PUDDLE_RIM_BLEND;
        dip = Math.max(dip, PUDDLE_DEPTH * t * t);
      }
    }
    return dip;
  };
  function coveDressingClear(x: number, z: number): boolean {
    if (!baseDressingClear(x, z)) return false;
    for (const p of PUDDLES) {
      if (Math.hypot(x - p.x, z - p.z) < p.radius + 1.0) return false;
    }
    return true;
  }
  // Sahip (28 Ağu): "yolun kenarındaki çimenler kaybolmuş gibi
  // gözüküyor." `COVE_CLEAR_HALF_X=4.5` — ağaç/büyük kaya gibi iri
  // objeler için makul bir tampon — ama patikanın kendi görsel genişliği
  // yalnız ~2,2-2,7 m (`PATH_HALF_W` + organik kenar dalgalanması). 3B çim
  // demeti (ince, küçük) o geniş tamponu miras alınca patikanın iki
  // yanında ~1,8-2,3 m'lik gerçekten ÇIPLAK bir şerit bırakıyordu — çim
  // "kaybolmuş" gibi okunuyordu. Yalnız çim demeti alanı için daha dar,
  // patikanın kendi genişliğine yakın bir pay.
  const GRASS_PATH_HALF_X = 2.8;
  function grassDressingClear(x: number, z: number): boolean {
    if (Math.abs(x - pathCenterX(z)) < GRASS_PATH_HALF_X) return false;
    if (Math.hypot(x - COVE_SPAWN_CLEAR.x, z - COVE_SPAWN_CLEAR.z) < COVE_SPAWN_CLEAR.r) return false;
    if (Math.hypot(x - COVE_SHIP_CLEAR.x, z - COVE_SHIP_CLEAR.z) < COVE_SHIP_CLEAR.r) return false;
    for (const p of PUDDLES) {
      if (Math.hypot(x - p.x, z - p.z) < p.radius + 1.0) return false;
    }
    return true;
  }
  if (PUDDLES.length > 0) {
    // Çim mesh'i zaten yukarıda tam kuruldu (`groundHeightAt` ile) — burada
    // yalnız göl sitelerinin ETRAFINDA bir çukur oymak için vertex'leri
    // tekrar dokunuyoruz (ayrı bir geçiş — grassGeo zaten `group`'un içinde,
    // referansla değişiklik görünür oluyor).
    const pos = grassGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const dip = puddleDipAt(pos.getX(i), pos.getZ(i));
      if (dip > 0) pos.setY(i, pos.getY(i) - dip);
    }
    pos.needsUpdate = true;
    grassGeo.computeVertexNormals();

    const puddleWaterMat = new THREE.MeshStandardMaterial({
      color: PALETTE.lagoon,
      roughness: 0.78,
      metalness: 0,
      transparent: true,
      opacity: 0.88,
      envMapIntensity: 0.1,
    });
    const puddleWobbleRand = mulberry32(20260912);
    for (const p of PUDDLES) {
      const segments = 20;
      // Düz tabanın (`floorR`) İÇİNDE kalmalı — dışına taşarsa disk yine
      // eğimli kenar bölgesinde toprağın altında kalır.
      const waterR = Math.max(0.5, (p.radius - PUDDLE_RIM_BLEND) * 0.9);
      const shape = new THREE.Shape();
      const seed = p.x * 0.13 + p.z * 0.07;
      for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const rr = waterR * (1 + 0.14 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 5 - seed * 1.7));
        const px = Math.cos(a) * rr;
        const pz = -Math.sin(a) * rr;
        if (i === 0) shape.moveTo(px, pz);
        else shape.lineTo(px, pz);
      }
      const geo = new THREE.ShapeGeometry(shape, segments);
      geo.rotateX(-Math.PI / 2);
      const disc = new THREE.Mesh(geo, puddleWaterMat);
      disc.position.set(p.x, groundHeightAt(p.x, p.z) - PUDDLE_DEPTH + 0.04, p.z);
      disc.receiveShadow = true;
      group.add(disc);
      // Çukurun kenarına birkaç küçük taş — ıslak bir gölcük gibi okunsun,
      // salt geometrik bir çanak değil.
      const rimSpots: RockSpot[] = [];
      const rimCount = 3 + Math.floor(puddleWobbleRand() * 3);
      for (let i = 0; i < rimCount; i++) {
        const a = puddleWobbleRand() * Math.PI * 2;
        const d = p.radius * (0.85 + puddleWobbleRand() * 0.3);
        const rx = p.x + Math.cos(a) * d;
        const rz = p.z + Math.sin(a) * d;
        const s = 0.35 + puddleWobbleRand() * 0.35;
        rimSpots.push({
          x: rx,
          y: groundHeightAt(rx, rz) - 0.08,
          z: rz,
          sx: s,
          sy: s * 0.75,
          sz: s,
          rotY: puddleWobbleRand() * Math.PI * 2,
        });
      }
      scatterRockKit(group, rimSpots, puddleWobbleRand);
    }
  }

  // Sahip (28 Ağu): "güzel patika boyunca kayalar ve taşlar serpilmiş
  // olsun." Ana patikanın (`pathGeo`) hemen iki yanına, gerçek 3D kaya/
  // taş parçaları (aynı yüklü ASSET-119 kiti) — sürekli bir duvar değil,
  // doğal/seyrek bir serpinti (kayıt gap'i ~%40), küçükten ortaya boy
  // varyasyonu.
  {
    const pathRockRand = mulberry32(20260915);
    const pathRockSpots: RockSpot[] = [];
    for (let z = -45; z <= -3; z += 1.6) {
      for (const side of [-1, 1] as const) {
        if (pathRockRand() < 0.42) continue;
        const x = pathCenterX(z) + side * (2.9 + pathRockRand() * 3.2);
        const jz = z + (pathRockRand() - 0.5) * 1.2;
        if (!coveDressingClear(x, jz)) continue;
        const s = 0.35 + pathRockRand() * 0.55;
        pathRockSpots.push({
          x,
          y: groundHeightAt(x, jz) - 0.05,
          z: jz,
          sx: s,
          sy: s * 0.7,
          sz: s,
          rotY: pathRockRand() * Math.PI * 2,
        });
      }
    }
    scatterRockKit(group, pathRockSpots, pathRockRand);
  }

  // Sahip (28 Ağu, ikinci tur): "hâlâ yolun üzerinde seyrek taşları
  // göremiyorum." Yukarıdaki parça patikanın YANINA (2,9-6,1 m dışına)
  // serpiliyordu — sahip "yolun üzerinde" (patikanın kendi yüzeyinde)
  // istiyordu, gerçek bir toprak yolda çakıl/taş poking-through hissi.
  // Bunlar `coveDressingClear`'ı BİLEREK kullanmıyor (o zaten patikayı
  // dışlıyor) — yalnız patikanın kendi genişliği + spawn/gemi ucu
  // dışında kalıyor, kayalar/koyunlarınkinden belirgin küçük (çakıl
  // ölçeği) ki patikayı kapatmasın.
  {
    const pathPebbleRand = mulberry32(20260916);
    const pathPebbleSpots: RockSpot[] = [];
    for (let z = -44; z <= -4; z += 1.1) {
      if (pathPebbleRand() < 0.55) continue; // seyrek
      const x = pathCenterX(z) + (pathPebbleRand() - 0.5) * PATH_HALF_W * 1.5;
      const jz = z + (pathPebbleRand() - 0.5) * 0.8;
      if (Math.hypot(x - COVE_SPAWN_CLEAR.x, jz - COVE_SPAWN_CLEAR.z) < COVE_SPAWN_CLEAR.r) continue;
      if (Math.hypot(x - COVE_SHIP_CLEAR.x, jz - COVE_SHIP_CLEAR.z) < COVE_SHIP_CLEAR.r) continue;
      // İlk denemede (0,16-0,34, 3 cm gömülü) neredeyse görünmüyordu —
      // aynı "çok küçük + gömülü" hatası (kıyı/kapı izlerinde daha önce
      // bulunan ders) burada da tekrarlandı. Büyütüldü, gömme kaldırıldı.
      const s = 0.4 + pathPebbleRand() * 0.35;
      pathPebbleSpots.push({
        x,
        y: groundHeightAt(x, jz),
        z: jz,
        sx: s,
        sy: s * 0.55,
        sz: s,
        rotY: pathPebbleRand() * Math.PI * 2,
      });
    }
    scatterRockKit(group, pathPebbleSpots, pathPebbleRand);
  }

  // Sahip (27 Ağu, yirmi üçüncü geri bildirim): "ada içerisinde belli
  // belirsiz taş katalogumuzdan seçtiğin taşlarla mağara girişine
  // patikalar olsun." Ana patika (`pathGeo`, dokulu tek şerit) zaten var —
  // bunlar ONA EK, adanın çeşitli noktalarından kapıya doğru uzanan, seyrek/
  // kesik (gerçek bir "belli belirsiz" iz — sürekli döşeli bir yol değil)
  // küçük taş dizileri. Aynı ASSET-119 kitini (`scatterRockKit`, zaten
  // yüklü) küçük ölçekte kullanıyor.
  {
    const trailRand = mulberry32(20260913);
    const gateX = 0;
    const gateZ = -3.5; // ana patikanın COVE_CLEAR_HALF_X'e girdiği yer civarı
    const trailStarts = [
      { x: 70, z: -8 },
      { x: -60, z: -30 },
      { x: 90, z: -40 },
      { x: -95, z: -14 },
    ];
    const trailSpots: RockSpot[] = [];
    for (const start of trailStarts) {
      const steps = 26;
      const wobbleSeed = trailRand() * 100;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        if (trailRand() < 0.5) continue; // "belli belirsiz" — sürekli değil, kesik kesik
        const bx = start.x + (gateX - start.x) * t;
        const bz = start.z + (gateZ - start.z) * t;
        const wobble = Math.sin(t * 9 + wobbleSeed) * 2.2 * (1 - t * 0.6);
        const x = bx + wobble;
        const z = bz + (trailRand() - 0.5) * 1.5;
        if (Math.abs(x - pathCenterX(z)) < COVE_CLEAR_HALF_X - 0.5) continue; // ana patikanın üstüne binmesin
        if (!coveDressingClear(x, z)) continue;
        // İlk denemede taşlar neredeyse görünmüyordu — hem küçük (0,3-0,6)
        // hem 10 cm gömülüydüler, ada boyunca genişletilmiş yoğun 3B çim
        // demeti alanı (bkz. yirmi birinci geri bildirim) altında tamamen
        // kayboluyorlardı. Ölçek büyütüldü, gömme neredeyse sıfıra indirildi
        // (gerçek bir taş yüzeyi gibi zeminin biraz üstünde okunsun).
        const s = 0.55 + trailRand() * 0.4;
        trailSpots.push({
          x,
          y: groundHeightAt(x, z) - 0.02,
          z,
          sx: s,
          sy: s * 0.5,
          sz: s,
          rotY: trailRand() * Math.PI * 2,
        });
      }
    }
    scatterRockKit(group, trailSpots, trailRand);
  }

  // Sahip (28 Ağu): "gemiye doğru giden kıvrımlı yolu da bizim
  // taşlarımızdan yap. ama daha belirgin bir patika olsun." Ana patika
  // (`pathGeo`) yalnız D=-48..0'ı kaplıyor — gemi D=-51'de, o dokulu
  // şeridin hiç ulaşmadığı bir yerde. Yukarıdaki kapı izlerinden (seyrek/
  // kesik, "belli belirsiz") FARKLI olarak burada gerçekten sürekli/yoğun
  // bir taş patika: neredeyse hiç atlama yok, taşlar belirgin daha büyük,
  // gerçek bir "döşeli yol genişliği" hissi için iki paralel sıra.
  // **Bulunan bug, düzeltildi:** ilk denemede rota (0,-44)→gemi MERKEZİ
  // (11,-51) idi ve genel `coveDressingClear`'ı (gemi için 9 m — genel
  // dekor kaçınması için kalibre, bilerek geniş) kullanıyordu — rotanın
  // neredeyse tamamı ya ana patikanın ya da geminin geniş "temiz" alanının
  // içine düşüp neredeyse hiç taş hayatta kalmıyordu (36 yerine yalnız 8-9,
  // ölçülüp bulundu). Rota artık ikisinden de baştan uzak bir noktadan
  // (7,-42) başlıyor, sadece bu patikaya özel daha DAR bir gemi payı
  // (`SHIP_PATH_KEEPOUT=5.5`, genel 9 m'nin yerine) kullanıyor — patika
  // gerçekten gemiye kadar uzanabiliyor.
  {
    const shipTrailRand = mulberry32(20260914);
    const SHIP_PATH_KEEPOUT = 5.5;
    const shipPathClear = (x: number, z: number): boolean => {
      if (Math.abs(x - pathCenterX(z)) < COVE_CLEAR_HALF_X - 0.5) return false;
      if (Math.hypot(x - COVE_SPAWN_CLEAR.x, z - COVE_SPAWN_CLEAR.z) < COVE_SPAWN_CLEAR.r) return false;
      if (Math.hypot(x - COVE_SHIP_CLEAR.x, z - COVE_SHIP_CLEAR.z) < SHIP_PATH_KEEPOUT) return false;
      for (const p of PUDDLES) {
        if (Math.hypot(x - p.x, z - p.z) < p.radius + 1.0) return false;
      }
      return true;
    };
    const start = { x: 7, z: -42 }; // ana patikadan/spawn'dan baştan ayrık
    const end = { x: COVE_SHIP_CLEAR.x, z: COVE_SHIP_CLEAR.z };
    const steps = 40;
    const shipTrailSpots: RockSpot[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const bx = start.x + (end.x - start.x) * t;
      const bz = start.z + (end.z - start.z) * t;
      // Gerçek bir "kıvrım" — tek bir dalga değil, iki farklı frekansın
      // toplamı, doğal bir patika kıvrımı gibi.
      const wobble = Math.sin(t * 5.2) * 2.6 + Math.sin(t * 11 + 1.4) * 0.9;
      const nx = Math.cos(Math.atan2(end.z - start.z, end.x - start.x) + Math.PI / 2);
      const nz = Math.sin(Math.atan2(end.z - start.z, end.x - start.x) + Math.PI / 2);
      const cx = bx + nx * wobble;
      const cz = bz + nz * wobble;
      for (const laneOffset of [-0.55, 0.55]) {
        if (shipTrailRand() < 0.12) continue; // hafif düzensizlik — çok mekanik/ızgara gibi görünmesin
        const x = cx + nx * laneOffset + (shipTrailRand() - 0.5) * 0.4;
        const z = cz + nz * laneOffset + (shipTrailRand() - 0.5) * 0.4;
        if (!shipPathClear(x, z)) continue;
        const s = 0.75 + shipTrailRand() * 0.45;
        shipTrailSpots.push({
          x,
          y: groundHeightAt(x, z) - 0.03,
          z,
          sx: s,
          sy: s * 0.5,
          sz: s,
          rotY: shipTrailRand() * Math.PI * 2,
        });
      }
    }
    scatterRockKit(group, shipTrailSpots, shipTrailRand);
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
          y: groundHeightAt(x, z),
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
    // Sahip (27 Ağu, on yedinci geri bildirim): "sahil kumu ... adayla
    // bütünleşik değil." Yukarıdaki `scatter()`'ın sazlığı yalnız iç şeridi
    // (x<19) kapsıyordu — genişletilmiş dış kıyının (x=20..105) tamamında
    // kum/çim dikişi hiçbir dekorla kırılmadan çıplak, dümdüz bir çizgi
    // olarak kalıyordu (yeni `coastRock` kümeleri bunu kısmen kırıyor ama
    // seyrek — asıl çizgi hâlâ görünüyordu). Aynı sazlığı dikişin TAM
    // üstüne (z jitter SAND_Z_MAX'ın her iki yanına) serpiyoruz — gerçek 3B
    // geometri düz çizgiyi fiziksel olarak kırıyor, salt renk geçişinden
    // çok daha güçlü bir "gerçek" hissi.
    {
      const edgeRand = mulberry32(20260908);
      let placed = 0;
      let guard = 0;
      while (placed < 44 && guard < 44 * 20) {
        guard++;
        const side = placed % 2 === 0 ? 1 : -1;
        const x = side * (20 + edgeRand() * 85);
        const z = SAND_Z_MAX + (edgeRand() - 0.5) * 5.5; // dikişin her iki yanı
        if (edgeRand() < 0.4) {
          placed++; // gerçek boşluklar da kalsın, tam bir çit gibi olmasın
          continue;
        }
        if (!coveDressingClear(x, z)) continue;
        const s = 0.6 + edgeRand() * 0.55;
        reed.push({
          x,
          y: groundHeightAt(x, z),
          z,
          sx: s,
          sy: s,
          sz: s,
          rotY: edgeRand() * Math.PI * 2,
        });
        placed++;
      }
    }
    void placeKit(group, ISLAND_KIT.reed, reed, 0.08).then((u) => {
      if (u) kitUpdaters.push(u.update);
    });
    scatterRockKit(group, boulder, rand);
    scatterRockKit(group, pebble, rand);
    // Sahip (27 Ağu): "adayı genişlet, aynı assetleri kullanabilirsin" —
    // dış bölgeye (x=20..105) de aynı gerçek kaya kiti (ASSET-119)
    // ekleniyor, `scatter()` paylaşılan yardımcısına dokunmadan (reed'in
    // kendi dar kıyı aralığını bozmamak için) kendi basit döngüsüyle.
    const outerRock: KitSpot[] = [];
    {
      let placed = 0;
      let guard = 0;
      while (placed < 34 && guard < 34 * 20) {
        guard++;
        const side = placed % 2 === 0 ? 1 : -1;
        const x = side * (20 + rand() * 85);
        const z = -44 + rand() * 43.5;
        if (!coveDressingClear(x, z)) continue;
        const s = 0.45 + rand() * 0.9;
        outerRock.push({
          x,
          y: groundHeightAt(x, z),
          z,
          sx: s * (0.86 + rand() * 0.22),
          sy: s * (0.9 + rand() * 0.2),
          sz: s * (0.86 + rand() * 0.22),
          rotY: rand() * Math.PI * 2,
        });
        placed++;
      }
    }
    scatterRockKit(group, outerRock, rand);
    // Sahip (27 Ağu): "sahil düz bir çizgi gibi olmasın, girintili çıkıntılı
    // ve rock kataloğumuzdan büyük kayalarla asimetrik bir görüntü
    // oluştursun." Genişleyen çim düzleminin arka kenarı (z=SAND_Z_MAX=-44,
    // dış bölgenin denize bakan sınırı) düz bir mesh kenarıydı, hiç dekor
    // yoktu. Sınıra bitişik, BÜYÜK ölçekli (yukarıdaki genel `outerRock`
    // kümesinden belirgin daha iri) bir kaya dizisi — her kaya kendi z
    // konumunda rastgele ileri/geri kaydırılıyor (`jitter`), sınırı fiziksel
    // olarak girintili/çıkıntılı yapıyor.
    // ASSET-122 — genişletilmiş ada sınırındaki "büyük kayalar" da artık
    // aynı prosedürel kit'ten (ASSET-119 değil), küme+boşluk düzeniyle —
    // sahip: "uçtan uca adamızı kaplayabilsin ama kum hissi önemli." Her
    // tarafta 10 slot, ~%40'ı boş, doluysa 1-4 taşlık küme (nadiren kit'in
    // en büyük 4 parçasından biri — "büyük mahmuz" aksanı).
    const coastRockRand = mulberry32(20260907);
    const outerCoastSpots: CoastRockSpot[] = [];
    for (const side of [1, -1] as const) {
      outerCoastSpots.push(
        ...buildCoastClusters(
          coastRockRand,
          10,
          0.4,
          (i) => ({ x: side * (20 + (i / 9) * 85), z: SAND_Z_MAX }),
          4.5,
          [0.7, 2.0],
          (x, z) => groundHeightAt(x, z),
          coveDressingClear,
        ),
      );
    }
    scatterCoastRockKit(group, outerCoastSpots, coastRockRand);

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
    // **Düzeltme (27 Ağu, sahip, yirmi birinci geri bildirim):** "adanın
    // diğer kalan yeşil zemininde çimenler yok, sadece belli bir yerinde
    // var." Doğru — `x` aralığı hâlâ eski dar kova göreydi (-19..19),
    // genişletilmiş dış bölge (x=20..105, ağaç/kaya/koyunun zaten
    // kapladığı aynı alan) hiç çim demeti almıyordu. Aralık tek bir
    // sürekli `-105..105`'e çıkarıldı — artık ada boyunca aynı yoğunluk.
    const grassPoses: KitSpot[] = [];
    {
      const spacing = FLORA.grassFieldSpacing;
      const hexH = spacing * 0.8660254;
      let row = 0;
      for (let z = SAND_Z_MAX; z <= 0; z += hexH) {
        const ox = (row % 2) * spacing * 0.5;
        row++;
        for (let x = -105; x <= 105; x += spacing) {
          const jx = x + ox + (rand() - 0.5) * spacing * 0.38;
          const jz = z + (rand() - 0.5) * hexH * 0.38;
          if (jz < SAND_Z_MAX || jz > 0) continue;
          if (!grassDressingClear(jx, jz)) continue;
          const spread = FLORA.grassSpreadScale * (0.9 + rand() * 0.2);
          const h = FLORA.grassHeightScale * (0.85 + rand() * 0.3);
          grassPoses.push({
            x: jx,
            y: groundHeightAt(jx, jz) - FLORA.grassSink,
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
    // Sahip (27 Ağu): "gemi hariç deniz olan her yer adanın tabanı gibi
    // olsun — adayı genişlet, aynı assetleri kullanabilirsin." `xMin`/`xMax`
    // eklendi (varsayılan 1/18 — TÜM mevcut çağrıları birebir aynı
    // davranışta bırakıyor) ki aşağıda aynı ağaç türleriyle yeni, geniş
    // "dış bölge" (x=20..105) taze bir çağrı seti kullanabilsin, iç
    // kovun zaten ayarlanmış yoğunluğuna dokunmadan.
    const scatterPack = (
      name: string,
      count: number,
      zMin: number,
      zMax: number,
      scaleMin: number,
      scaleRange: number,
      xMin = 1,
      xMax = 18,
    ) => {
      let placed = 0;
      let guard = 0;
      while (placed < count && guard < count * 20) {
        guard++;
        const side = placed % 2 === 0 ? 1 : -1;
        const x = side * (xMin + rand2() * (xMax - xMin));
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
    // Dış bölge (x=20..105, ISLAND_WIDTH ile aynı sınır) — aynı türler,
    // daha geniş bir alana daha seyrek bir yoğunlukla (sayılar iç kovun
    // ~4 katı alanına göre orantılı, ama tıka basa doldurmuyor — "ada"
    // hissi versin, tek tip bir orman duvarı değil).
    scatterPack("tree-stylized-04-green", 30, -44, -2, 0.9, 0.6, 20, 105);
    scatterPack("tree-stylized-02-dry", 24, -44, -2, 0.7, 0.5, 20, 105);
    scatterPack("tree-stylized-01", 20, -44, -2, 0.8, 0.5, 20, 105);
    scatterPack("daisy-flower-diffuse-01", 16, -44, -0.5, 0.8, 0.4, 20, 105);
    scatterPack("daisy-flower-diffuse-02", 16, -44, -0.5, 0.8, 0.4, 20, 105);
    scatterPack("daffodil-flower-01", 14, -44, -0.5, 0.8, 0.4, 20, 105);
    scatterPack("grass-bushes-01", 26, -44, -0.5, 0.7, 0.5, 20, 105);
    scatterPack("grass-bushes-02", 26, -44, -0.5, 0.7, 0.5, 20, 105);

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
        inst.position.set(spot.x, groundHeightAt(spot.x, spot.z), spot.z);
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
    // Sahip (27 Ağu): "kesilmiş ve birbirini tekrarlayan ufak bir desen
    // gözüküyor sadece." ASSET-120'nin ilk kırpımı büyük/tekil sarkıt
    // silüetleri taşıyordu — göz bunları anında tekrar eden bir motif
    // olarak yakalıyordu, tek başına tekrar sıklığı sorunu değildi. Doku
    // daha tekdüze/soyut bir bant ile değiştirildi (aynı dosya yolu,
    // ASSET-120 notu güncellendi) AYRICA döşeme boyutu 4,4 m'den 9 m'ye
    // büyütüldü — aynı yüzeyde daha az tekrar, panel sınırları daha az
    // göze batıyor.
    t.repeat.set(1 / 9, 1 / 9);
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
      // Sahip (27 Ağu, yirminci geri bildirim): "kapıyı biraz daha büyüt
      // ve biraz daha öne çıkart. kapının tüm ayrıntıları görüntülenebilir
      // olsun istiyorum." 10 m'den 12 m'ye büyütüldü (~%20); ayrıca merkez
      // sonradan `GATE_FORWARD_OFFSET` kadar -Z'ye (mağara ağzı D=0'dan
      // dışarıya, açık koya/oyuncuya doğru) kaydırılıyor — oyuncu eşiğe
      // yaklaşmadan da kapının oymalarını/ayrıntılarını daha yakından
      // görebilsin diye.
      const TARGET_WIDTH = 12;
      const GATE_FORWARD_OFFSET = 1.3;
      scene.scale.setScalar(TARGET_WIDTH / Math.max(size.x, 0.01));
      scene.updateMatrixWorld(true);
      const fitted = new THREE.Box3();
      for (const m of keep) fitted.expandByObject(m);
      scene.position.x -= (fitted.min.x + fitted.max.x) / 2;
      scene.position.z -= (fitted.min.z + fitted.max.z) / 2 + GATE_FORWARD_OFFSET;
      scene.position.y -= fitted.min.y;
      // Sahip (27 Ağu): "mağara girişinin modelinde kullanılan taşı yanlara
      // doğru genişlet." Yalnız "Cave" gövdesi (Entrance/Lamp_Glow'a
      // dokunulmuyor) kendi yerel ekseninde genişletiliyor — bu adım
      // yukarıdaki TARGET_WIDTH bbox-fit hesaplamasından SONRA yapılıyor ki
      // genişletme genel ölçeği küçültüp kendi kendini geçersiz kılmasın.
      // Eksen ampirik bulunacak (kapının kendi 90° döndürme kuralıyla
      // aynı yöntem): `scene.rotation.y=90°` uygulandığından mesh'in
      // yerel Z ekseni dünya X'ine (yanlara) karşılık gelmesi bekleniyor.
      // **Düzeltme (27 Ağu, sahip, üç turda):** "çok çekiştirilmiş
      // göründü... duvar gibi bitişik uzatalım" → "sana verdiğim taş
      // kataloğunu kullanarak doğal görünen mağara duvarları yap, böyle
      // iğrenç" → **"şimdi mevcut mağarayı sil. sana gönderdiğim mağara
      // için kullanabileceğimiz assetlerden bu kapıya mağarayı oturt.
      // mağara enlemesine tüm ada kadar olsun. yanlarda hiç boşluk
      // kalmasın. girişe tam oturmuş gibi gözüksün."** Dört deneme
      // sırayla reddedildi: `.scale.x` germe (deforme), "Cave" mesh'ini
      // döşemek (mor ağaç gövdesi tekrarlanıyordu), düz `rockMat` kutu
      // (çirkin), LOT-28 tarzı dağınık kaya kümesi (`rock_stylized_kit`
      // — bu artık silindi, kapının hemen yanına kullanılmıyor, aşağıdaki
      // §"beyaz taşlar" scatter'ında hâlâ kullanılıyor). Sahip "terrain
      // klasörüne bak" dedi — ASSET-117'nin ZATEN dönüştürülmüş meshini
      // (`terrain_backdrop_01_mesh_2000.glb`, ambientCG Terrain003)
      // burada TEKRAR ama FARKLI bir amaçla kullanıyoruz: orada uzak/
      // buğulu bir ufuk silüetiydi (480 m genişlik, ~150 m uzaklıkta),
      // burada kapının HEMEN arkasına, kovun tam genişliğine (40 m,
      // x=±20) oturan, gerçek bir "dağın içine oyulmuş kapı" hissi veren
      // yakın bir kütle. Doğal en/boy oranı (480 m'de ~21 m yükseklik)
      // bu ölçekte fazla düz/basık kalırdı — bağımsız bir dikey gerdirme
      // (`SEAT_SCALE_Y`) ile gerçek bir kütle hissi veriyor.
      loadGltfBundle("assets/models/terrain_backdrop_01_mesh_2000.glb").then((seatBundle) => {
        const seat = seatBundle.scene;
        const SEAT_TINT = 0x8fa8bd; // buildDistantHills nearLayer.color ile aynı, tutarlılık
        seat.traverse((obj) => {
          if (obj instanceof THREE.Mesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
            obj.frustumCulled = false;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) {
              if (m instanceof THREE.MeshStandardMaterial) m.color.set(SEAT_TINT);
            }
          }
        });
        // Doğal boyut (GLB'nin kendi bake edilmiş ölçeği, `convert_
        // terrain003_ambientcg.py`'deki TARGET_WIDTH=480'e göre): genişlik
        // 480 m, yükseklik ~21,2 m. İlk denemede `seatScaleXZ * SEAT_
        // SCALE_Y` formülü yanlış hesaplandı — sonuç kapının kendi 12 m
        // yüksekliğinden bile KISA çıktı (`cliffWorldBox.y` değişmedi,
        // ölçümle yakalandı). Hedef yükseklik/genişlik artık BAĞIMSIZ ve
        // doğrudan hesaplanıyor.
        // **Düzeltme (27 Ağu, sahip, ekran görüntüsüyle): "hâlâ aynı boşluk
        // var. kapının hemen arkasında olan plaka sağa ve sola doğru
        // çimenler ne kadar uzanıyorsa uzansın."** `SEAT_WIDTH=40` kovun
        // ESKİ genişliğine göreydi (x=±20) — ada o zamandan beri `ISLAND_
        // WIDTH=220`'ye genişledi, plaka artık çok dar kalıyor, iki
        // yanında çimenle plaka arasında kapının kendi teal iç dokusunun
        // sızdığı çirkin bir boşluk/kenar bırakıyordu.
        // **Düzeltme (27 Ağu, sahip, ikinci ekran görüntüsüyle): "hayır tüm
        // gökyüzü ve giriş kapısı buna gömüldü, böyle olmaması lazım.
        // sadece yatay uzaması lazım."** İlk düzeltme HATALIYDI — `X` VE
        // `Z` (derinlik) ikisi de AYNI `SEAT_WIDTH/NATIVE_WIDTH` oranıyla
        // ölçekleniyordu, yani genişliği 40'tan 220'ye büyütmek kütlenin
        // DERİNLİĞİNİ de (öne doğru, oyuncuya/gökyüzüne doğru) 5,5×
        // büyütüp koca bir blok hâline getirdi — kapıyı ve gökyüzünü
        // gerçekten yuttu. Genişlik (X) ve derinlik (Z) artık BAĞIMSIZ:
        // yalnız X, `ISLAND_WIDTH` ile büyüyor; derinlik eski 40 m'lik
        // orana sabit kalıyor (`SEAT_DEPTH`) — kütle yalnız YATAY uzanıyor,
        // kendi eski (onaylanmış) inceliğini/profilini koruyor.
        const SEAT_WIDTH = ISLAND_WIDTH;
        const SEAT_DEPTH = 40; // eski SEAT_WIDTH değeri — yalnız derinlik için, hiç büyümüyor
        // **Düzeltme (27 Ağu, sahip, üçüncü tur — "hâlâ aynı, yukarısında
        // kapının dalları içerde gözüküyor"):** yalnız Z'de geri itmek
        // (2→5) yetmedi — kütle geriye kayınca aynı mutlak yükseklikte
        // kalıp kameraya göre ekranda daha YUKARI görünüyor (perspektif),
        // bu da düşük-poly meshin kendi doğal olmayan düz üst/arka
        // kenarını dalların TAM ÜSTÜNDE, gökyüzüne karşı ortaya
        // çıkarıyordu — kaynağın kendisi (2047 üçgen, uzak silüet için
        // optimize) bu kadar yakından bakılınca organik detay taşımıyor.
        // Yükseklik belirgin artırıldı (22→34) ki o düz kenar çerçevenin
        // çok üstünde, dalların asla göremeyeceği bir yükseklikte kalsın.
        const SEAT_HEIGHT = 34; // kapının kendi ~12 m'sinden belirgin daha uzun, gerçek bir kütle hissi
        const NATIVE_WIDTH = 480;
        const NATIVE_HEIGHT = 21.2;
        seat.scale.set(SEAT_WIDTH / NATIVE_WIDTH, SEAT_HEIGHT / NATIVE_HEIGHT, SEAT_DEPTH / NATIVE_WIDTH);
        // Taban zaten yerel y=0'da (Blender'daki transform_apply) — dikey
        // gerdirme orijin etrafında olduğundan taban yerinde kalıyor,
        // yalnız tepe yükseliyor; ekstra "gömme" gerekmiyor (ASSET-117'nin
        // uzak örneğinin aksine, bu mesh zemine hemen oturuyor).
        // **Düzeltme (27 Ağu, sahip, ekran görüntüsüyle): "kapının üst
        // tarafındaki ağaç dalları dağın içinde kalıyor."** Kapı bu turda
        // %20 büyütüldü (dalları da orantılı uzadı) — mağara kütlesi hâlâ
        // eski z=2'deydi, artık daha uzun dalların tepesiyle aynı derinlik
        // aralığına giriyor, gerçek bir Z-örtüşme/kesişme oluşuyordu. z=5'e
        // itilip dallara gerçek bir boşluk/mesafe bırakıldı.
        seat.position.set(0, 0, 5);
        cliffGroup.add(seat);
      });
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

  // Sahip (27 Ağu): "dışarıdan baktığımda yandan mağaranın içini
  // görüyorum." Sahip onayladı — gerçek bir boşluk, sadece koyu doku
  // değil. ASSET-115'in kendi "Cave" gövdesi GLB'den ölçülünce aslında
  // yeterince büyük bir hacim (~9×8×8 m) ve her iki yüzü de render
  // ediliyor (`doubleSided:true`, backface-culling sorunu değil) — ama
  // Sketchfab'ın kendi organik/düzensiz heykel şekli, mağara ağzı
  // odasının ("mouth", `halfWidth=5`, `ceilingY=5`) gerçek dikdörtgen
  // kesitiyle her açıdan tam örtüşmüyor, bazı yan açılarda gerçek bir
  // boşluktan tünelin karanlığı sızıyor.
  //
  // Önceki iki deneme (Sketchfab mesh'ine `rockMat` dokusu vermek —
  // UV'si bozuk çıktı; Cave'i gizleyip LOT-28 kaya kümesiyle sarmak) her
  // ikisi de sahip tarafından geri alındı. Bu kez Sketchfab'ın kendi
  // kusurlu mesh'ine hiç dokunulmuyor — onun YERİNE, arkasına basit,
  // kendi UV'si düzgün, GARANTİ SIZDIRMAZ bir kutu-geometri "arka
  // perde" ekleniyor: mağara ağzı odasının gerçek kesitini (halfWidth 5,
  // ceilingY 5) dolduran, yalnız kapının kendi açıklığını (x∈[-1.9,1.9],
  // y<2.4) boş bırakan üç parça (sol/sağ/üst) — `rockMat` ile (temiz
  // BoxGeometry UV'sinde önceki bozuk desen sorunu oluşmaz). Görsel
  // olarak hemen hiç fark edilmiyor (zaten Cave/Entrance'ın arkasında
  // kalıyor), yalnız gerçek boşluklardan artık düz kaya görünüyor,
  // tünel karanlığı değil.
  {
    // **Düzeltme (27 Ağu, sahip, ekran görüntüsüyle): "kapının hemen
    // arkasında olan plaka..."** Bu arka perde `rockMat` (=
    // `loadCaveRockMaterial()`) kullanıyordu — o fonksiyon kurulduğunda
    // (yukarıdaki not) "hemen hiç fark edilmiyor" diye tasarlanmıştı,
    // AMA aynı gün ilerleyen bir turda `loadCaveRockMaterial()`'ın kendi
    // dokusu ASSET-120'nin parlak camgöbeği "yabancı gezegen" dokusuna
    // çevrildi (mağara İÇİ için) — bu paylaşılan referans yüzünden arka
    // perde de sessizce aynı parlak teal dokuyu miras aldı, artık kapının
    // yanından dışarıdan gayet göze batan mavi-teal bir dikdörtgen gibi
    // okunuyordu (tam ekran görüntüsündeki "plaka"). Arka perdenin işi
    // sadece boşluğu KARARTMAK (tünel karanlığı yerine düz koyu yüzey) —
    // hiç doku gerekmiyor, kendi ayrı/nötr koyu malzemesi.
    const backstopMat = new THREE.MeshStandardMaterial({ color: 0x2a241d, roughness: 1 });
    const backHalfWidth = 5;
    const backHeight = 5;
    const doorHalfWidth = 1.9;
    const doorHeight = 2.4;
    const backDepth = 3;
    const backZ = 1.6;
    const sideWidth = backHalfWidth - doorHalfWidth;
    const leftWall = new THREE.Mesh(
      new THREE.BoxGeometry(sideWidth, backHeight, backDepth),
      backstopMat,
    );
    leftWall.position.set(-doorHalfWidth - sideWidth / 2, backHeight / 2, backZ);
    const rightWall = leftWall.clone();
    rightWall.position.x = doorHalfWidth + sideWidth / 2;
    const topWall = new THREE.Mesh(
      new THREE.BoxGeometry(doorHalfWidth * 2, backHeight - doorHeight, backDepth),
      backstopMat,
    );
    topWall.position.set(0, doorHeight + (backHeight - doorHeight) / 2, backZ);
    for (const m of [leftWall, rightWall, topWall]) {
      m.receiveShadow = true;
      m.castShadow = false;
      group.add(m);
    }

    // Sahip (27 Ağu): "kapının yanlarına doğru uzanan ama kapıyı asla
    // kapatmayan yoğun bir sis olsun." `sunDisk.ts`'in `discTexture`/
    // `haloTexture`'ıyla aynı basit radial-gradient canvas deseni — dışa
    // bağımlılık yok. Sprite'lar her zaman kameraya dönük (billboard),
    // gerçek bir sis hacmi hissi için ucuz. Açıklığın (`doorHalfWidth`)
    // dışında, iki yana yayılan bir küme — merkeze en yakın sprite bile
    // `doorHalfWidth + 1,5` m'den başlıyor, kapı hiçbir zaman kapanmıyor.
    // Hafif bir dikey/opaklık dalgalanmasıyla (`kitUpdaters`, zaten
    // rüzgâr/çim sallanması için var olan aynı mekanizma) durağan değil,
    // "yaşayan" bir sis hissi.
    const fogTex = (() => {
      const size = 256;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      const cx = size / 2;
      const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      g.addColorStop(0, "rgba(214,222,230,0.85)");
      g.addColorStop(0.35, "rgba(200,210,220,0.55)");
      g.addColorStop(0.7, "rgba(190,200,212,0.22)");
      g.addColorStop(1, "rgba(190,200,212,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, size, size);
      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.needsUpdate = true;
      return tex;
    })();
    // **Düzeltme (27 Ağu, sahip, yirmi birinci geri bildirim): "sisi daha
    // yatay şekilde uzun yay ama asla kapıyı kapatmasın."** Eski menzil
    // (3,4-19,4 m) dar kalıyordu — sis kapının hemen yanında toplanmış bir
    // küme gibi okunuyordu, geniş kovu boydan boya kucaklayan bir "yay"
    // hissi vermiyordu. Menzil ~48 m'ye kadar uzatıldı (kapıya en yakın
    // sınır AYNI, `doorHalfWidth+1.5` — açıklık hiç değişmiyor, hâlâ asla
    // kapanmıyor), aynı yoğunluğu daha uzun bir mesafede korumak için
    // parça sayısı da artırıldı.
    // **Düzeltme (27 Ağu, sahip, ekran görüntüsüyle): "sis sadece duvara
    // yapışık yuvarlak ışık huzmeleri gibi gözüküyor, yatay bir sis
    // bulutu olsun istiyorum."** Kök neden: `sprite.scale.setScalar(...)`
    // her sprite'ı EŞİT en/boy ile ölçekliyordu — bir Sprite her zaman
    // kameraya dönük düz bir kare olduğundan, eşit ölçek kaçınılmaz
    // olarak YUVARLAK bir ışık topu/huzme gibi okunuyordu, dokunun kendi
    // radial-gradient şekli yüzünden. Artık X çok daha geniş, Y çok daha
    // basık (`scaleX`/`scaleY` ayrı) — her parça yuvarlak bir top değil
    // yatay, yassı bir sis şeridi. Ayrıca yükseklik aralığı daraltıldı
    // (0,2-1,6 m, önceki 0,3-3,8) — zeminde sürünen bir sis bulutu hissi,
    // havada asılı duran ayrı ışık küreleri değil; opaklık da hafif
    // düşürüldü (daha çok parça üst üste binince tek tek "top" olarak
    // ayırt edilmesinler, sürekli bir bulut gibi kaynaşsınlar diye).
    const fogRand = mulberry32(20260904);
    const fogSprites: Array<{ sprite: THREE.Sprite; baseY: number; phase: number; speed: number }> = [];
    for (const side of [-1, 1]) {
      for (let i = 0; i < 16; i++) {
        // Sahip (28 Ağu): "mağara girişindeki sis biraz daha kalın ve
        // yüksek bir sis olsun." Opaklık artırıldı (daha "kalın"/yoğun),
        // dikey ölçek (`scaleY`) ve taban yüksekliği (`baseY`) büyütüldü
        // (daha "yüksek").
        const mat = new THREE.SpriteMaterial({
          map: fogTex,
          transparent: true,
          depthWrite: false,
          opacity: 0.4 + fogRand() * 0.3,
        });
        const sprite = new THREE.Sprite(mat);
        const dist = doorHalfWidth + 1.5 + fogRand() * 46; // açıklığa hiç girmiyor
        const scaleX = 7 + fogRand() * 9;
        const scaleY = 2.6 + fogRand() * 2.6;
        sprite.scale.set(scaleX, scaleY, 1);
        const baseY = 1.6 + fogRand() * 2.6;
        sprite.position.set(side * dist, baseY, -1 + fogRand() * 6);
        group.add(sprite);
        fogSprites.push({ sprite, baseY, phase: fogRand() * Math.PI * 2, speed: 0.15 + fogRand() * 0.2 });
      }
    }
    kitUpdaters.push((t) => {
      for (const f of fogSprites) {
        f.sprite.position.y = f.baseY + Math.sin(t * f.speed + f.phase) * 0.12;
      }
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
  const HEARTH_BASE_INTENSITY = 3.2;
  const hearthLight = new THREE.PointLight(0xeeae6a, HEARTH_BASE_INTENSITY, 6.0, 2);
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
  const TORCH_BASE_INTENSITY = 2.2;
  const torchLight = new THREE.PointLight(0xeeae6a, TORCH_BASE_INTENSITY, 3.0, 2);
  torchLight.position.set(TORCH_POS.x, 1.6, TORCH_POS.z);
  group.add(torchLight);
  // Sahip (27 Ağu, on dokuzuncu geri bildirim): "mağaranın dışı hep
  // aydınlık, mağaranın içinde ışık yanıp sönmeli, dışarısı sabit aydınlık
  // olmalıdır." Önceden `ambient`/`hemi` (cyclopsStop.ts, TÜM sahneyi
  // kaplayan tek global ışık) kapı açık/kapalı durumuna göre iki sabit
  // seviye arasında geçiş yapıyordu — hem "yanıp sönme" değil düz bir
  // anahtar/switch'ti, hem de GLOBAL olduğu için dışarıyı da etkiliyordu
  // (istenen "dışarısı sabit" ile çelişiyordu). Doğru mimari zaten
  // buradaydı: ocak/meşale ışıkları (`hearthLight`/`torchLight`) yalnız
  // mağara İÇİNDE, kısa menzilli (3-6 m) noktasal ışıklar — düşme mesafeleri
  // dışarıya hiç ulaşmıyor, bu yüzden onları titretmek YAPISAL olarak
  // yalnız içeriyi etkiliyor, dışarıya hiç sızmıyor. Katmanlı sinüs
  // (birkaç farklı frekans + ışık başına faz kayması, gerçek bir alev
  // gibi düzensiz ama deterministik) `update(t)`'te uygulanıyor —
  // `ambient`/`hemi`'nin kendisi artık HİÇ değişmiyor (cyclopsStop.ts'teki
  // üç eski atama kaldırıldı).
  const lightFlicker = (t: number, phase: number): number =>
    1 +
    0.16 * Math.sin(t * 6.1 + phase) +
    0.09 * Math.sin(t * 13.7 + phase * 1.7) +
    0.05 * Math.sin(t * 2.3 + phase * 0.4);

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
  // Sahip (27 Ağu): "koyunları da doğal random at." Sabit `SHEEP_SPOTS`
  // (yalnız patikanın kenarı) dokunulmadan bırakıldı — dış bölgeye
  // (x=20..105) gerçekten RASTGELE bir küme ekleniyor, `coveDressingClear`
  // ile aynı yasak bölgelere (patika/spawn/gemi) saygılı.
  {
    const outerSheepRand = mulberry32(20260906);
    let placed = 0;
    let guard = 0;
    while (placed < 16 && guard < 16 * 25) {
      guard++;
      const side = placed % 2 === 0 ? 1 : -1;
      const x = side * (20 + outerSheepRand() * 85);
      const z = -44 + outerSheepRand() * 43.5;
      if (!coveDressingClear(x, z)) continue;
      SHEEP_SPOTS.push({
        x,
        z,
        rotY: outerSheepRand() * Math.PI * 2,
        scale: 0.88 + outerSheepRand() * 0.28,
      });
      placed++;
    }
  }
  let sheepLoadedFlag = false;
  // Sahip (27 Ağu, yirmi ikinci geri bildirim): "koyunlar artık hareket
  // etsin. random adanın her yerinde dolaşsın." Önceden koyunlar TAMAMEN
  // statikti — tek seferlik `SHEEP_SPOTS` yerleşiminden sonra hiç
  // güncellenmiyordu (`cyclopsStop.ts`'in `step()`'i yalnız yükleme
  // durumunu okuyordu, pozisyon dokunulmuyordu). Basit bir "hedefe yürü,
  // biraz dur, yeni rastgele hedef seç" davranışı — dev'in
  // `walkGiantTowards`'ıyla aynı ruhta ama çok daha basit (koşum/animasyon
  // yok, yalnız pozisyon+rotasyon). Her koyun kendi mevcut konumunun
  // yakınında (≤22 m) yeni bir hedef seçiyor — `coveDressingClear` ile
  // patika/spawn/gemi bölgelerine hâlâ saygılı, ada sınırları içinde kalıyor.
  type SheepWanderer = {
    obj: THREE.Object3D;
    target: { x: number; z: number };
    speed: number;
    facing: number;
    idleT: number;
  };
  const sheepWanderers: SheepWanderer[] = [];
  const sheepWanderRand = mulberry32(20260909);
  const SHEEP_WANDER_MIN_X = -ISLAND_WIDTH / 2 + 6;
  const SHEEP_WANDER_MAX_X = ISLAND_WIDTH / 2 - 6;
  const SHEEP_WANDER_MIN_Z = -48;
  const SHEEP_WANDER_MAX_Z = -3;
  const pickSheepTarget = (fromX: number, fromZ: number): { x: number; z: number } => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const ang = sheepWanderRand() * Math.PI * 2;
      const dist = 6 + sheepWanderRand() * 16;
      const x = Math.max(SHEEP_WANDER_MIN_X, Math.min(SHEEP_WANDER_MAX_X, fromX + Math.cos(ang) * dist));
      const z = Math.max(SHEEP_WANDER_MIN_Z, Math.min(SHEEP_WANDER_MAX_Z, fromZ + Math.sin(ang) * dist));
      if (coveDressingClear(x, z)) return { x, z };
    }
    return { x: fromX, z: fromZ }; // uygun hedef bulunamadıysa yerinde kal
  };
  loadGltfBundle("assets/models/creature_sheep_01_stand_3100.glb").then((bundle) => {
    for (const spot of SHEEP_SPOTS) {
      const sheep = bundle.scene.clone(true);
      sheep.position.set(spot.x, groundHeightAt(spot.x, spot.z), spot.z);
      sheep.rotation.y = spot.rotY;
      sheep.scale.setScalar(spot.scale);
      group.add(sheep);
      sheepWanderers.push({
        obj: sheep,
        target: pickSheepTarget(spot.x, spot.z),
        speed: 0.55 + sheepWanderRand() * 0.5,
        facing: spot.rotY,
        idleT: sheepWanderRand() * 4,
      });
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
    update(t: number, dt: number) {
      for (const fn of kitUpdaters) fn(t);
      hearthLight.intensity = HEARTH_BASE_INTENSITY * lightFlicker(t, 0);
      torchLight.intensity = TORCH_BASE_INTENSITY * lightFlicker(t, 2.3);
      for (const w of sheepWanderers) {
        if (w.idleT > 0) {
          w.idleT -= dt;
          continue;
        }
        const dx = w.target.x - w.obj.position.x;
        const dz = w.target.z - w.obj.position.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.4) {
          w.target = pickSheepTarget(w.obj.position.x, w.obj.position.z);
          w.idleT = 1.5 + sheepWanderRand() * 4.5; // yeni bacağa geçmeden önce doğal bir mola
          continue;
        }
        const targetFacing = Math.atan2(dx, dz);
        let fd = targetFacing - w.facing;
        while (fd > Math.PI) fd -= Math.PI * 2;
        while (fd < -Math.PI) fd += Math.PI * 2;
        w.facing += fd * (1 - Math.exp(-dt / 0.4)); // dev'in kendi dönüş yumuşatmasıyla aynı desen
        w.obj.rotation.y = w.facing;
        const step = Math.min(dist, w.speed * dt);
        w.obj.position.x += (dx / dist) * step;
        w.obj.position.z += (dz / dist) * step;
        w.obj.position.y = groundHeightAt(w.obj.position.x, w.obj.position.z);
      }
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
