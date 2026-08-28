import * as THREE from "three";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture, loadDataTexture } from "./sprite";
import { loadGltfBundle } from "./gltf";
import { mulberry32 } from "./rng";
import { ISLAND_KIT, placeKit } from "./islandKit";
import { plantHero, paintHero, seatHullKeel } from "./ship";
import { sampleOceanHull } from "./oceanWaves";
import { buildDistantHills } from "./terrain";
import { SHIP, PALETTE, FLORA, SEA_TEX } from "../constants";

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

/**
 * Kiklop'un atmosfer rengi — gökyüzünün ufuk bandı, `scene.fog` rengi ve
 * uzak-tepe halkasının pus karışımı ÜÇÜ de bunu kullanır (28 Ağu 2026,
 * sahip: "denizin sonsuzluk hissi çok yapay"). Tek kaynak olması şart:
 * üçü ayrı ayrı ayarlandığında aralarındaki en küçük fark bile ufukta
 * gözle görülür bir şerit üretiyor — bu hatanın kendisi iki tur sürdü.
 * Değer ASSET-109'un solgun, güneşte yıkanmış Ege ufkundan.
 */
export const CYCLOPS_FOG_COLOR = 0xdde8ea;

/**
 * Kiklop koyunun dalga dikliği çarpanı. Korunaklı bir koyun suyu açık
 * denizden çok daha sakin olmalı (27 Ağu, sahip: "suyu adanın içine kadar
 * gelmesini kes") — en büyük Lotus dalgası burada ~1,26 m yerine ~0,25 m.
 *
 * `cyclopsStop.ts` bunu `buildSea({ waveScale })` ile GPU shader'ına,
 * `buildCyclopsCave()` ise geminin CPU tarafındaki sallanma örneklemesine
 * (`sampleOceanHull`) veriyor. İkisi AYNI değeri kullanmak zorunda: aksi
 * hâlde gemi, gözle görülen dalgadan farklı bir dalganın üstünde sallanır.
 */
export const CYCLOPS_WAVE_SCALE = 0.2;

// ===================================================================
// KOY ARAZİSİ — landform (28 Ağu 2026, tam yeniden yazım)
// ===================================================================
//
// Sahip: **"adanin komplesini hic begenmiyorum geometrisel olarak.
// dikdortgen gozukuyor bir kere."** — ve haklıydı, tam anlamıyla:
// eski dış arazi GERÇEKTEN iki dikdörtgendi. `PlaneGeometry` ile kurulan
// bir kum şeridi (z=-50..-44) ve bir çim şeridi (z=-44..0), ikisi de
// x=-110..+110 arası kusursuz dikdörtgen, ve yüksekliği YALNIZ Z'ye bağlı
// tek bir fonksiyondan (`heightAt(z)`) alıyorlardı — yani ada boyunca her
// x için TIPATIP aynı profil. Bunun kaçınılmaz sonucu: cetvelle çizilmiş
// düz bir kıyı çizgisi, sert kesilmiş yan kenarlar, ve hiçbir açıdan kara
// formu okunmayan dümdüz bir masa. Üstüne ne kadar ağaç/kaya/çim serpilirse
// serpilsin altındaki geometri dikdörtgen kaldığı sürece sahne "amatör"
// okunmaya devam ediyordu — nitekim öyle de oldu.
//
// Yeni tasarım tek bir sürekli, asimetrik arazi alanı (heightfield).
// Referans görselin (ASSET-109) kendi kompozisyonunu üç eğriye çeviriyor,
// üçü de x'in fonksiyonu ve üçü de çok frekanslı gürültüyle organik:
//
//   1. `shoreLineZ(x)` — karanın suyla buluştuğu yer. Ortada koy derin
//      içeri giriyor (gemi/spawn burada), batıya doğru kıyı hızla geri
//      çekilip kara bitiyor (açık deniz = "sonsuzluk" ferahlığı, referansın
//      sol yarısı), doğuya doğru kara devam ediyor ama daralıyor.
//   2. `cliffFootZ(x)` — kayalığın yükselmeye başladığı yer, yani koyun
//      GERÇEK iç sınırı. Ortada mağara ağzının hemen arkasında (z≈+1),
//      iki yana doğru öne süpürülüyor — kova sarılan iki burun kolu.
//      Yürünebilir kara bu iki eğri arasında kalan alan: ortada geniş,
//      kollarda daralan, gerçek bir körfez planı.
//   3. `cliffTopY(x)` — kayalık platosunun yüksekliği. Doğuda büyük
//      tebeşir burnu (~28 m), batıya doğru alçalan kayalık bir mahmuz
//      (~7 m). Asimetri kasıtlı: referansın kendi asimetrisi bu
//      (sağda kayalık, solda açık deniz), ve simetri "dikdörtgen"
//      hissinin yarısıdır.
//
// Mağara İÇİ (D>=0) hiç etkilenmiyor — tüm oda/item/gizli-kapı mantığı
// hâlâ Y=0 varsayıyor, `groundHeightAt` orada hâlâ tam 0 döndürüyor.

/** Piecewise-linear tablo interpolasyonu — eğrileri elle yazmanın en
 * okunabilir/ayarlanabilir yolu. Tablolar x'e göre ARTAN sıralı olmalı. */
function lerpTable(table: readonly (readonly [number, number])[], x: number): number {
  if (x <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i];
    if (x <= x1) {
      const [x0, y0] = table[i - 1];
      const t = (x - x0) / (x1 - x0);
      // smoothstep interpolasyon — düz lineer kırılmalar araziyi yine
      // "çokgen/yapay" gösterirdi, tablonun düğüm noktalarında teğet
      // sürekliliği istiyoruz.
      return y0 + (y1 - y0) * (t * t * (3 - 2 * t));
    }
  }
  return last[1];
}

/** Kıyı çizgisi (kara/su sınırı) — kara z > shoreLineZ(x) tarafında. */
const SHORE_TABLE = [
  [-118, 6],
  [-100, -1],
  [-84, -10],
  [-66, -22],
  [-48, -34],
  [-30, -44],
  [-14, -50],
  [0, -52],
  [16, -51],
  [34, -48],
  [52, -44],
  [70, -39],
  [88, -33],
  [118, -25],
] as const;

export function shoreLineZ(x: number): number {
  return (
    lerpTable(SHORE_TABLE, x) +
    Math.sin(x * 0.055 + 1.3) * 2.6 +
    Math.sin(x * 0.131 + 0.4) * 1.4 +
    Math.sin(x * 0.317 + 2.7) * 0.7
  );
}

/** Kayalığın tabanı — yürünebilir koyun iç (mağara tarafı) sınırı. */
const FOOT_TABLE = [
  [-118, 4],
  [-102, -2],
  [-86, -10],
  [-70, -18],
  [-54, -25],
  [-40, -29],
  [-28, -25],
  [-19, -14],
  [-12, -3],
  // Mağara ağzı nişi: kayalık kapının hemen ARKASINDAN yükseliyor, iki
  // yanında öne çıkıp onu kucaklıyor — kapı bir çim tarlasının ortasına
  // konmuş bağımsız bir obje değil, kayanın içine oyulmuş bir delik gibi
  // okunsun diye.
  [-9, 1],
  [9, 1],
  [12, -3],
  [20, -12],
  [32, -19],
  [46, -25],
  [62, -29],
  [78, -32],
  [96, -33],
  [118, -27],
] as const;

export function cliffFootZ(x: number): number {
  return (
    lerpTable(FOOT_TABLE, x) +
    // Niş bölgesinde (|x|<13) gürültü YOK — kapının oturduğu düzlem temiz
    // kalmalı, yoksa taban çizgisi kapının içine dalgalanır.
    (Math.abs(x) < 13
      ? 0
      : Math.sin(x * 0.073 + 0.9) * 2.4 +
        Math.sin(x * 0.164 + 2.2) * 1.3 +
        Math.sin(x * 0.383 + 1.1) * 0.6)
  );
}

/** Kayalık platosunun tepe yüksekliği. */
const TOP_TABLE = [
  [-118, 6],
  [-96, 9],
  [-74, 12],
  [-54, 15],
  [-36, 18],
  [-20, 22],
  [0, 26],
  [22, 29],
  [44, 27],
  [66, 24],
  [88, 20],
  [118, 16],
] as const;

export function cliffTopY(x: number): number {
  return (
    lerpTable(TOP_TABLE, x) +
    Math.sin(x * 0.091 + 2.0) * 2.2 +
    Math.sin(x * 0.203 + 0.7) * 1.1 +
    Math.sin(x * 0.47 + 3.3) * 0.45
  );
}

/** Mağara ağzının önündeki düz "avlu" — arazi eşiğe doğru tam 0'a iner. */
const FORECOURT = { x: 0, z: 1.5, inner: 5.5, outer: 18 };

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
/** Kayalık yüzey profili: taban çizgisinden (d=0) plato tepesine (d>=20).
 * Üç `smoothstep` katmanı — talus eteği, dik tebeşir yüzü, tepe yuvarlaması.
 * Bir heightfield gerçek bir dikey duvar üretemez; bunun yerine ~65-70°'lik
 * bir yüz + dikey strata renk bandı (aşağıdaki `chalkTint`) + tabana
 * serpilen moloz kayalarla referansın uçurum hissi kuruluyor. */
function cliffProfile(d: number, h: number): number {
  if (d <= 0) return 0;
  const talus = THREE.MathUtils.smoothstep(d, 0, 3.2);
  const face = THREE.MathUtils.smoothstep(d, 1.6, 9.5);
  const rim = THREE.MathUtils.smoothstep(d, 8, 21);
  return h * (0.1 * talus + 0.6 * face + 0.3 * rim);
}

/** Mağara ağzının ARKASI (|x|<13). Burada kayalık çok daha hızlı yükselmek
 * ZORUNDA: eşiğin (D=0) hemen ötesinde mağara ağzı odasının tavanı yalnız
 * 5 m'de ve oyuncu kovadan kapıya baktığında kapının ÜSTÜNDE gökyüzü
 * görmemeli (önceki turların "turuncu sızıntı"sının asıl geometrik sebebi
 * buydu — kapı bağımsız bir obje olarak duruyordu, arkasında kütle yoktu).
 * Bu yüzden niş bölgesinde ayrı, çok dik bir profil: 3,5 m derinlikte
 * zaten 12 m yüksekte, yani kapının kendi tepesinin (~12 m) üstünde. */
function browProfile(d: number, h: number): number {
  if (d <= 0) return 0;
  // İki kademe (28 Ağu, ekran görüntüsü + raycast bulgusu; ikinci tur
  // daha da dikleştirildi): ilk kademe 1,4 m derinlikte %62 yüksekliğe
  // fırlıyor — kapı gövdesiyle kaya yüzü arasındaki krevas o kadar
  // inceliyor ki arkadaki karartma kutularının düz kenarı hiçbir açıdan
  // görünmüyor (ilk hâlinde d=0,9'da yalnız ~6 m vardı ve kutunun keskin
  // kenarı kapının sağında dik siyah bir DİKDÖRTGEN gibi okunuyordu —
  // raycast ile doğrulandı); ikinci kademe 6 m'de platoya tamamlanıyor.
  return h * (0.62 * THREE.MathUtils.smoothstep(d, 0, 1.4) + 0.38 * THREE.MathUtils.smoothstep(d, 1.2, 6));
}

/** Kayalığın görsel yüzeyi — YALNIZ mesh için. Oyuncu/dekor bunu kullanmaz
 * (bkz. `groundHeightAt`), yoksa kayalığa "tırmanmış" olurlardı. */
export function cliffSurfaceY(x: number, z: number): number {
  const d = z - cliffFootZ(x);
  if (d <= 0) return 0;
  const h = cliffTopY(x);
  const ax = Math.abs(x);
  const steep = browProfile(d, h);
  const normal = cliffProfile(d, h);
  // |x|<11 tam dik "kaş", 11-17 arası geçiş, ötesi normal uçurum profili.
  const brow = 1 - THREE.MathUtils.smoothstep(ax, 11, 17);
  let y = normal + (steep - normal) * brow;
  // Kapı AĞZI oyuğu (28 Ağu): kaş, koridor ağzının tam önünde de
  // yükseliyordu — kapı kemerinin içinden karanlık tünel yerine AYDINLIK
  // gri kaya yüzü görünüyordu (kemer içi grisi ekran görüntüsüyle
  // yakalandı). Koridor genişliğinde (|x|<~3,2, 5,2'ye yumuşayan) ve
  // ~7 m derinliğe kadar kaş bastırılıyor — kemerin içi yine karartma
  // perdesinin karanlığını gösteriyor; oyuğun bittiği derinlik zaten
  // perdenin arkasında, hiçbir açıdan görünmüyor.
  // x-aralığı BİLİNÇLİ dar (2,2→3,6): kapı açıklığı zaten yalnız ±1,9 —
  // ilk deneme (3,2→5,2) perde kanatlarının durduğu x=4-5 bandında da kaşı
  // yarı-bastırıp kanatların üst köşesini yeniden açığa çıkarmıştı.
  const doorMask = (1 - THREE.MathUtils.smoothstep(ax, 2.2, 3.6)) * (1 - THREE.MathUtils.smoothstep(d, 5, 8.5));
  y *= 1 - doorMask;
  // Yüzeyde dikey oluk/rib deseni (art-director speci: dikey erozyon
  // kolonları, 1,5-2,5 m periyot) — salt renk değil GERÇEK geometri, çünkü
  // silüet ve gölge de bu desenden beslenmeli.
  const faceMask = THREE.MathUtils.smoothstep(d, 0.6, 5) * (1 - THREE.MathUtils.smoothstep(d, 12, 22));
  // Genlikler ilk turdan (0,42/0,75) belirgin büyütüldü + ince üçüncü
  // frekans eklendi — 0,7 m'lik yeni vertex aralığında desen artık
  // çözünüyor ama eski genlikte yüz hâlâ "gerilmiş kumaş" gibi pürüzsüz
  // okunuyordu; gölge/silüet ancak gerçek girinti-çıkıntıyla oluşuyor.
  y += faceMask * (Math.sin(x * 3.1 + 0.6) * 0.85 + Math.sin(x * 1.27 + 2.4) * 1.25 + Math.sin(x * 6.4 + 1.9) * 0.32);
  return Math.max(0, y);
}

/** Yürünebilir koy zemini — kıyı çizgisinden kayalığın tabanına. */
function coveFloorY(x: number, z: number): number {
  if (z >= 0) return 0;
  const sz = shoreLineZ(x);
  if (z < sz) {
    // Su altı: kıyı çizgisinin ötesinde zemin hızla deniz tabanına iniyor.
    return -0.05 - THREE.MathUtils.smoothstep(sz - z, 0, 9) * 1.6;
  }
  const fz = cliffFootZ(x);
  // A. Kumsaldan içeri yükselen kıyı rampası (ıslak kum → kuru kum → çim).
  let y = 0.04 + THREE.MathUtils.smoothstep(z, sz, sz + 11) * 1.35;
  // B. Kayalığın eteğine doğru yükselen çayır yamacı — referansın koyunların
  //    otladığı altın yamacı bu; koy artık düz bir masa değil eğimli bir kase.
  y += THREE.MathUtils.smoothstep(z, fz - 26, fz - 1) * 2.2;
  // C. Alçak frekanslı dalgalanma — "dümdüz levha" okumasını kıran asıl şey.
  y +=
    Math.sin(x * 0.075 + z * 0.055) * 0.42 +
    Math.sin(x * 0.185 - z * 0.12 + 2.1) * 0.26 +
    Math.sin(x * 0.44 + z * 0.31 + 1.1) * 0.13;
  // D. Mağara ağzı avlusu: eşiğe yaklaşan her şey tam 0'a iniyor — mağara
  //    içi (D>=0) hâlâ Y=0 varsayıyor, eşikte basamak olmamalı.
  const dx = x - FORECOURT.x;
  const dz = z - FORECOURT.z;
  const r = Math.sqrt(dx * dx + dz * dz);
  y *= THREE.MathUtils.smoothstep(r, FORECOURT.inner, FORECOURT.outer);
  return y;
}

/**
 * Oyuncunun/dekorun üstünde durduğu zemin. Mağara içi (D>=0) her zaman TAM
 * 0 — tüm oda/item/gizli-kapı mantığı bunu varsayıyor, dokunulmadı.
 * Kayalık kütlesi BİLEREK dahil değil: kayalık tırmanılabilir bir yüzey
 * değil, koyun duvarı (bkz. `cyclopsStop.ts`'teki yürünebilirlik kelepçesi).
 */
export function groundHeightAt(x: number, z: number): number {
  if (z >= 0) return 0;
  return coveFloorY(x, z);
}

/** Geriye dönük uyumluluk: yalnız-Z imzası hâlâ birkaç çağrı noktasında
 * (dev'in Y'si, kamera kelepçesi) kullanılıyor — merkez hattı örnekliyor. */
export function heightAt(z: number): number {
  return groundHeightAt(0, z);
}

/** Bir nokta yürünebilir kara mı? Hem kıyı çizgisinin içinde hem kayalığın
 * tabanının dışında olmalı. Oyuncu kelepçesi, dekor serpme ve koyun
 * gezinmesi TEK bu fonksiyonu paylaşıyor — "dekor suda/kayanın içinde"
 * sınıfı hatalar yapısal olarak imkânsız hâle geliyor. */
export function isCoveLand(x: number, z: number, margin = 0): boolean {
  if (z >= 0) return true; // mağara içi kendi duvar mantığını kullanıyor
  return z > shoreLineZ(x) + margin && z < cliffFootZ(x) - margin;
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
  /** 28 Ağu: kabuk yalnız oyuncu eşiğe yaklaşınca render edilir — dışarıdan
   * BackSide kabuğun iç-duvar arka yüzleri kapı çevresindeki boşluklardan
   * "siyah dikdörtgen" olarak sızıyordu. cyclopsStop.ts step()'i sürer. */
  setShellVisible(v: boolean): void;
  /** DEV-testing yalnız — ASSET-104'ün oval kaya kemeri (dış cephe) GLB'sinin
   * yüklemesi tamamlandı mı. */
  cliffLoaded(): boolean;
  /** DEV-testing yalnız — dünya-uzayı bounding box ölçümü için. */
  cliffGroup: THREE.Group;
  /** Uzak-tepe halkası (`buildDistantHills`) — 28 Ağu köktenreki tasarım:
   * sky sphere'le aynı teknik, `cyclopsStop.ts` her karede bunun
   * `.position`'ını kameranın (x,z)'sine kopyalıyor ki halka gerçekten
   * "sonsuz" görünsün (kamera nereye giderse gitsin ondan hep aynı
   * mesafede kalır) — kova etrafına elle iğnelenmiş sonlu kopyaların
   * yerini aldı. */
  horizonGroup: THREE.Group;
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

  // Sahip (27 Agu, on altinci geri bildirim): "magaranin ve adanin
  // arkasindaki sonsuzluk hissine calisacagiz" - 5 yeni Sketchfab linki
  // degerlendirildi, hicbiri temiz kullanilabilir cikmadi. Bunun yerine
  // Lotus'un kendi, zaten uretilmis uzak-tepe sistemini (terrain.ts
  // `buildDistantHills`/`buildHillBackdropRing`, ASSET-023
  // `hill_backdrop_01_albedo_2048` dokusu) kullaniyoruz.
  //
  // **KOKTEN YENIDEN TASARIM (28 Agu, sahip, ucuncu tur): "hala
  // turunculuklar var ve bu sefer de sag ve sol taraftan gelen dag
  // goruntusu direkt adanin icinde gozukuyor... bize daha radikal bir
  // cozum lazim. tam bir ada gorunumu ve sonsuzluk hissi verecek bir
  // tasarim istiyorum."** Sahip haklaydi - onceki yaklasim temelden
  // kirilgandi: `terrain_backdrop_01_mesh_2000.glb`'den elle 5-7 kopya,
  // her biri sabit bir dunya (x,z) + tahmini bir gomme derinligiyle
  // kova etrafina "ignelenmisti" (z=150 arkada, x=+-150 yanlarda, en son
  // turda x=+-35 kapi yaninda). Bu, sonlu/parcali bir kaplama - her
  // parca yalniz DAR bir aci penceresini kapatiyor, aralarinda kacinilmaz
  // boslulklar kaliyor (turuncu sizinti) VE bazi parcalar (x=+-35, ISLAND_
  // WIDTH=220'nin/2=110 icinde, yani adanin kendi cim alaninin TAM
  // ORTASINDA) adanin icinde duruyormus gibi gorunuyordu - sahibin son
  // sikayeti buydu, kendi ekledigim yama tam bu hatayi yaratmisti.
  //
  // Kalici/radikal cozum: bu parcali sistemi TAMAMEN kaldirip, sky
  // sphere'in zaten kullandigi KANITLANMIS teknigi (`skyMesh.position.
  // copy(camera.position)`, cyclopsStop.ts) `buildDistantHills`'in
  // dondurdugu gruba da uyguluyoruz: `horizonGroup`'u her karede
  // kameranin (x,z)'sine kopyaliyoruz (bkz. `CyclopsCave.horizonGroup`,
  // `cyclopsStop.ts`'teki `skyMesh.position.copy(...)`'nin hemen
  // yanindaki cagri). Sonuc: halka ARTIK gercekten "sonsuz" - kamera
  // nereye giderse gitsin (kapi onu, kova ortasi, gemi yani) merkezi
  // her zaman kameranin kendisi, yani halkaya olan mesafe HER YONDE HER
  // ZAMAN sabit ~310 m. Bu uc seyi ayni anda cozer: (1) hicbir acida
  // asla bosluk yok - halka zaten kesintisiz 360 derece bir silindir
  // (bkz. `buildHillBackdropRing`), onceden onu sonlu/sabit parcalarla
  // "yamalamaya" calismak gereksizdi; (2) adanin icinde gorundugu hissi
  // imkansiz hale gelir - 310 m sabit mesafe, adanin kendi ~110 m'lik
  // yari-genisliginin cok otesinde, kamera oraya asla "yaklasamaz";
  // (3) tek bir teknik, tum kova + magara agzi + gemi ucu acilarini ayni
  // anda kapsiyor, konuma ozel elle-ayarlanmis istisna/bury/scale
  // parametresi kalmadi. Kapinin hemen ARKASINDAKI yakin "seat" kutlesi
  // (asagida, `USE_SKETCHFAB_GATE` blogunda) ayri kaldi - o, sonsuzluk
  // ufku degil, kapinin oyuldugu kayanin kendi yakin dokusu, kasitli
  // olarak sabit/yakin.
  // `cones: false` — `buildDistantHills`'in 12 düz-renk konisi Lotus'un
  // kendi adası çevresinde işe yarıyor ama Cyclops'un açık deniz ufkunda,
  // kameraya kilitli grupta, suyun ÜSTÜNDE asılı duran sert kenarlı soluk
  // üçgenler gibi okunuyordu (28 Ağu ekran görüntüsüyle doğrulandı).
  //
  // `hazeAmount: 0.9` — sahip: "denizin sonsuzluk hissi çok yapay."
  // Ölçümle bulunan iki kök nedenden ikincisi: halkanın malzemesi
  // `fog: false` olduğu için, sahneye yeni eklenen `scene.fog`'a hiç
  // katılmıyordu; sonuç, gökyüzü ile deniz arasında doygun/koyu, sert
  // kenarlı bir şerit (dikey piksel taraması: gökyüzü rgb(140,177,201),
  // halka bandı rgb(104,150,201) — belirgin bir kopuş). Halka
  // `SKY_TEX.hillDistance`=310 m'de ve kameraya kilitli olduğundan fog
  // faktörü sabit: FogExp2 ile 1-exp(-(0.005·310)²) ≈ 0,91. Tam o oranda
  // pus rengine karıştırılıyor — halka artık sahnenin kendi atmosferine
  // ait, yalnızca sezilen bir uzak kara silüeti.
  const horizonGroup = buildDistantHills(mulberry32(20260831), {
    cones: false,
    hazeColor: CYCLOPS_FOG_COLOR,
    hazeAmount: 0.9,
    // Halkanın alpha fade yönü ölçümle TERS bulundu — bkz. terrain.ts
    // `uSilhouette` notu. Cyclops doğru yönü kullanıyor: uzak tepeler
    // opak, fotoğrafın kendi gökyüzü şeffaf.
    silhouetteFade: true,
  });
  group.add(horizonGroup);

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
      if (xAt) pos.setX(i, pos.getX(i) + xAt(z));
      // Yükseklik SON X konumundan örnekleniyor (28 Ağu landform) — zemin
      // artık X'e de bağlı dalgalanıyor; merkez hattın yüksekliğini (eski
      // `heightAt(z)`) kullanmak patikayı yamaçta yer yer yüzdürür/gömerdi.
      pos.setY(i, groundHeightAt(pos.getX(i), z) + yOffset);
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

  // ================================================================
  // KOY ARAZİSİ MESH'İ — tek sürekli heightfield
  // ================================================================
  //
  // Sahip (28 Ağu): "adanin komplesini hic begenmiyorum geometrisel
  // olarak. dikdortgen gozukuyor bir kere."
  //
  // Burada ESKİDEN üç ayrı dikdörtgen `PlaneGeometry` vardı — kum şeridi
  // (z=-50..-44), çim şeridi (z=-44..0) ve bir de düz kıyı sırtı — her biri
  // x=-110..+110 arası tam dikdörtgen, yüksekliği yalnız Z'ye bağlı. Yani
  // kıyı çizgisi cetvelle çizilmiş düz bir çizgi, adanın yan kenarları
  // sert kesik, zemin dümdüz bir masaydı. Hepsi kaldırıldı.
  //
  // Yerine: modül başındaki üç landform eğrisinden (`shoreLineZ` /
  // `cliffFootZ` / `cliffTopY`) örneklenen TEK bir sürekli arazi.
  // Kum, çim, tebeşir kayalık ve deniz altı zemini artık ayrı mesh'ler
  // değil — aynı yüzeyin, eğime ve yüksekliğe göre farklı boyanmış
  // bölgeleri. Bu, "kum ile çim arasında dikiş", "adanın kenarı sert
  // kesik", "kayalık ayrı bir obje gibi duruyor" sınıfı hataların
  // tamamını yapısal olarak imkânsız kılıyor: tek yüzey, tek fonksiyon.
  const ISLAND_WIDTH = 236;
  const TERRAIN_Z_MIN = -64;
  const TERRAIN_Z_MAX = 44;

  /** Görsel yüzey: yürünebilir koy zemini VE kayalık kütlesi birlikte. */
  const terrainY = (x: number, z: number): number => {
    const floor = coveFloorY(x, z);
    const cliff = cliffSurfaceY(x, z);
    // `cliffSurfaceY` kayalığın ÖNÜNDEKİ her nokta için tam 0 döndürür
    // (d<=0 → 0). Düz bir `Math.max(floor, cliff)` bu yüzden SU ALTI
    // yamacını da 0'a kırpıyordu: deniz yüzeyi -0,16'da olduğundan
    // kıyının ötesindeki bütün deniz tabanı suyun ÜSTÜNDE, dümdüz bir kum
    // sahanlığı olarak kalıyordu — kıyı çizgisi diye bir şey oluşmuyor,
    // gemi de kumun üstünde asılı duruyordu (deniz shader'ı düzelip su
    // gerçekten render olmaya başlayınca ortaya çıktı, 28 Ağu).
    // Kayalık yalnız GERÇEKTEN yükseldiği yerde (cliff > 0) devreye girer;
    // aksi hâlde zemin tamamen `coveFloorY`'nin kendi eğrisidir.
    return cliff > 0 ? Math.max(floor, cliff) : floor;
  };

  const terrainGeo = (() => {
    // 300×170 (~51k vertex) — önceki 190×104'te hücreler ~1,2 m'ydi ve
    // kayalık yüzünün 1,5-2,5 m'lik dikey oluk deseni Nyquist'in tam
    // sınırında kalıp alias'lanıyordu (yüzey pürüzsüz bir çarşaf gibi
    // okunuyordu — ajan turunun kendi tespit ettiği "strata aliasing"
    // hatası). ~0,7 m hücreyle desen gerçekten çözünüyor.
    const xSegs = 300;
    const zSegs = 170;
    const geo = new THREE.PlaneGeometry(ISLAND_WIDTH, TERRAIN_Z_MAX - TERRAIN_Z_MIN, xSegs, zSegs);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, 0, (TERRAIN_Z_MIN + TERRAIN_Z_MAX) / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      // Izgara düğümlerini kendi içinde de kaydırıyoruz — kusursuz kare
      // ızgara, özellikle sığ eğimlerde, gözle görülür bir "kumaş dokusu"
      // moiré'si üretiyor ve yine yapay/dikdörtgen okunuyor.
      const gx = pos.getX(i);
      const gz = pos.getZ(i);
      const jx = gx + Math.sin(gx * 0.9 + gz * 1.7) * 0.42;
      const jz = gz + Math.sin(gx * 1.3 - gz * 0.8) * 0.38;
      pos.setX(i, jx);
      pos.setZ(i, jz);
      pos.setY(i, terrainY(jx, jz));
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  })();

  {
    // Boyama tamamen prosedürel: her vertex kendi yüksekliğine, eğimine ve
    // kıyı çizgisine olan mesafesine bakıp hangi "malzeme" olduğuna karar
    // veriyor. Hex'lerin tamamı art-bible §2'den (art-director speci,
    // 28 Ağu) — palet dışı renk yok.
    const cWetSand = new THREE.Color(0x8f7550);
    const cSand = new THREE.Color(0xe0c69c);
    const cGrass = new THREE.Color(0x93964f); // bible "Kavruk yeşil"
    const cGrassShade = new THREE.Color(0x6b7f4a); // bible "Zeytin yeşili"
    const cChalk = new THREE.Color(0xe6e2d4); // bible "Tebeşir beyazı kaya"
    // Bible "Kaya gölgesi"nden bir tık daha koyu (0xb9b6ab→0x9c9787):
    // güneş + ACES altında strata bantlarının koyusu aksi hâlde beyaza
    // yıkanıp kayboluyordu (ekran görüntüsüyle doğrulandı) — bant
    // kontrastı ancak böyle ekranda gerçekten okunuyor.
    const cChalkShade = new THREE.Color(0x9c9787);
    const pos = terrainGeo.attributes.position;
    const nrm = terrainGeo.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    // Splat ağırlıkları (x=kaya, y=kum) — aşağıdaki malzeme shader'ı bu
    // attribute ile hangi DOKUnun örnekleneceğini seçiyor; vertex rengi
    // yalnız ton/palet katmanı olarak kalıyor (doku detayı ortalamaya
    // normalize edilip çarpıldığından paleti kaydırmıyor).
    const splat = new Float32Array(pos.count * 2);
    const tmp = new THREE.Color();
    const rock = new THREE.Color();
    const soil = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      // Eğim: normalin dikeyden sapması. Art-director speci: >60° saf kaya,
      // 40-60° karışım, <40° tam çim.
      const slopeDeg = Math.acos(Math.min(1, Math.max(0, nrm.getY(i)))) * (180 / Math.PI);
      let rockT = THREE.MathUtils.smoothstep(slopeDeg, 38, 60);
      // Eğim tek başına yetmez: kayalığın TEPESİ de düzdür ama çim değil
      // kaya olmalı... hayır, referansta tam tersi — tepe altın çim
      // şapkası. Bu yüzden yalnız "kayalık kütlesinin gerçekten yükseldiği"
      // yerde (yüzey, yürünebilir zeminin belirgin üstünde) kaya zorlanıyor,
      // plato düz olduğu için doğal olarak çime dönüyor.
      const cliffRise = cliffSurfaceY(x, z) - coveFloorY(x, z);
      rockT = Math.max(rockT, THREE.MathUtils.smoothstep(cliffRise, 1.2, 4.5) * 0.92);
      // Plato tepesi: eğim düşükse ve gerçekten yüksekteysek çime geri dön
      // (referansın kayalık üstündeki kuru ot şeridi).
      if (slopeDeg < 26 && y > 6) rockT *= 1 - THREE.MathUtils.smoothstep(slopeDeg, 22, 8);
      // Dikey strata: art-director speci "1,5-2,5 m periyot, lit:shade 60:40,
      // yumuşak kenar". İki frekans + faz kayması, düzenli çizgi olmasın diye.
      const band =
        0.5 +
        0.5 * Math.sin(x * 2.75 + Math.sin(x * 0.61) * 1.6 + z * 0.22) * 0.7 +
        0.5 * Math.sin(x * 1.13 + 2.2) * 0.3;
      rock.copy(cChalkShade).lerp(cChalk, THREE.MathUtils.smoothstep(band, 0.18, 0.72));
      // Taban gölgesi — kayalığın dibi her zaman biraz daha koyu (moloz,
      // kendi üstünden gelen kapanma). Silüetin "kesilmiş karton" gibi
      // görünmesini engelleyen ucuz numara.
      rock.lerp(cChalkShade, (1 - THREE.MathUtils.smoothstep(y, 0.5, 7)) * 0.35);

      // Çim: alçak frekanslı iki tonlu karışım.
      const gn =
        0.5 + 0.5 * (Math.sin(x * 0.29 + z * 0.21) * 0.6 + Math.sin(x * 0.77 - z * 0.53 + 1.7) * 0.4);
      soil.copy(cGrassShade).lerp(cGrass, gn);
      // Kum: kıyı çizgisinin yakınında. Islak bant tam su kenarında.
      const sz = shoreLineZ(x);
      const sandT = 1 - THREE.MathUtils.smoothstep(z, sz + 1.5, sz + 10);
      tmp.copy(cSand).lerp(cWetSand, 1 - THREE.MathUtils.smoothstep(z, sz - 1.5, sz + 2.2));
      soil.lerp(tmp, sandT);

      soil.lerp(rock, rockT);
      col[i * 3] = soil.r;
      col[i * 3 + 1] = soil.g;
      col[i * 3 + 2] = soil.b;
      splat[i * 2] = rockT;
      splat[i * 2 + 1] = sandT * (1 - rockT);
    }
    terrainGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    terrainGeo.setAttribute("aSplat", new THREE.BufferAttribute(splat, 2));
  }

  // ------------------------------------------------------------------
  // Arazi malzemesi — vertex paleti × normalize edilmiş doku detayı.
  // Ajan turunun bıraktığı hâl SALT vertex rengiydi (hiç doku yok) —
  // ~0,7-1,2 m'lik vertex aralığında hiçbir orta-frekans detay taşınamaz,
  // kayalık dev, pürüzsüz beyaz bir çarşaf gibi okunuyordu (ekran
  // görüntüleriyle doğrulandı — "amatör" görünümün bir numaralı kalanı).
  //
  // Çözüm üç katman: (1) vertex rengi PALETİ taşır (art-bible tonları,
  // strata bantları, ıslak kum — yukarıdaki döngü), (2) elimizdeki üç
  // gerçek doku (tebeşir kaya / kuru çim / kıyı kumu) DETAYI taşır,
  // (3) `aSplat` attribute'u hangi noktada hangi dokunun örnekleneceğini
  // söyler. Doku örnekleri kendi (lineer-uzay) ortalama parlaklıklarına
  // bölünerek "ortalaması 1 olan detay çarpanı"na çevrilir — böylece doku,
  // paletin RENGİNİ kaydırmadan yalnız yüzey dokusunu ekler. Kaya dokusu
  // TRIPLANAR örnekleniyor (üç eksen düzleminden, normale göre karışım):
  // ~70°'lik tebeşir yüzünde tepeden-bakan UV'ler sonsuza gerilirdi —
  // triplanar bunu yapısal olarak çözer, elle UV açmak gerekmez.
  const terrainMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    // FrontSide (varsayılan) — BİLİNÇLİ: mağara İÇİ (D>=0) terrain
    // yüzeyinin ALTINDA kalıyor; DoubleSide denendi ve içerideki kamera
    // dağ kütlesinin arka yüzünü siyah bir perde gibi gördü (28 Ağu,
    // "iç mekan simsiyah" regresyonu — ekran görüntüsüyle bulundu).
    // Backface-culling içeriden bakışta yüzeyi görünmez yapar, iç mekan
    // kendi kabuğunu görür; kameranın DIŞARIDA yamaç içine girmesini ise
    // cyclopsStop'un `cliffFootZ` kelepçesi engelliyor.
  });
  {
    const rockTex = loadAlbedoTexture(assetUrl("assets/textures/rock_chalk_01_albedo_1024.webp")).clone();
    const grassTex = loadAlbedoTexture(assetUrl("assets/textures/flora_drygrass_01_albedo_1024.webp")).clone();
    const sandTex = loadAlbedoTexture(assetUrl("assets/textures/sand_coastal_01_albedo_512.webp")).clone();
    for (const t of [rockTex, grassTex, sandTex]) {
      t.wrapS = THREE.RepeatWrapping;
      t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
    }
    const uniforms = {
      uRockMap: { value: rockTex },
      uGrassMap: { value: grassTex },
      uSandMap: { value: sandTex },
      // Lineer-uzay ortalama parlaklıklar — doku yüklenince aşağıdaki
      // `measureLinearAvg` gerçek değeri ölçüp üstüne yazıyor; bunlar
      // yalnız ilk kareler için makul tahminler.
      uRockAvg: { value: 0.55 },
      uGrassAvg: { value: 0.2 },
      uSandAvg: { value: 0.5 },
    };
    // Dokunun gerçek (lineer) ortalama parlaklığını ölç — tahmine dayalı
    // normalizasyon ya soluk ya patlak görünürdü; 32×32'lik bir canvas
    // örneklemesi tam değeri verir. Görsel async yüklendiği için hazır
    // olana dek kısa aralıkla yeniden dener, ölçünce durur.
    const measureLinearAvg = (tex: THREE.Texture, uni: { value: number }) => {
      const tryMeasure = (): boolean => {
        const img = tex.image as (HTMLImageElement & { complete?: boolean }) | undefined;
        if (!img || !img.width || (img.complete === false)) return false;
        const c = document.createElement("canvas");
        c.width = c.height = 32;
        const g = c.getContext("2d");
        if (!g) return true;
        g.drawImage(img, 0, 0, 32, 32);
        const d = g.getImageData(0, 0, 32, 32).data;
        const lin = (v: number) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) {
          sum += 0.2126 * lin(d[i] / 255) + 0.7152 * lin(d[i + 1] / 255) + 0.0722 * lin(d[i + 2] / 255);
        }
        uni.value = Math.max(0.05, sum / (d.length / 4));
        return true;
      };
      if (!tryMeasure()) {
        const id = setInterval(() => {
          if (tryMeasure()) clearInterval(id);
        }, 250);
      }
    };
    measureLinearAvg(rockTex, uniforms.uRockAvg);
    measureLinearAvg(grassTex, uniforms.uGrassAvg);
    measureLinearAvg(sandTex, uniforms.uSandAvg);
    terrainMat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          attribute vec2 aSplat;
          varying vec2 vSplat;
          varying vec3 vTerrainWP;
          varying vec3 vTerrainNW;`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          vSplat = aSplat;
          vTerrainWP = (modelMatrix * vec4(position, 1.0)).xyz;
          vTerrainNW = normalize(mat3(modelMatrix) * normal);`,
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform sampler2D uRockMap;
          uniform sampler2D uGrassMap;
          uniform sampler2D uSandMap;
          uniform float uRockAvg;
          uniform float uGrassAvg;
          uniform float uSandAvg;
          varying vec2 vSplat;
          varying vec3 vTerrainWP;
          varying vec3 vTerrainNW;`,
        )
        .replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          {
            vec3 wp = vTerrainWP;
            vec3 an = abs(normalize(vTerrainNW));
            an /= max(an.x + an.y + an.z, 1e-4);
            vec3 rockS =
              texture2D(uRockMap, wp.zy * vec2(0.17, 0.13)).rgb * an.x +
              texture2D(uRockMap, wp.xz * 0.17).rgb * an.y +
              texture2D(uRockMap, wp.xy * vec2(0.17, 0.13)).rgb * an.z;
            vec3 grassS = texture2D(uGrassMap, wp.xz * 0.16).rgb;
            vec3 sandS = texture2D(uSandMap, wp.xz * 0.12).rgb;
            // Detay yalnız PARLAKLIK olarak uygulanıyor (luma / ortalama):
            // rengi %100 vertex paleti (art-bible) taşır — doku kendi
            // kromasını eklerse palet kayıyordu (ör. kum dokusunun turuncusu
            // × kum vertex rengi = referansta olmayan doygun turuncu bant).
            const vec3 LUMA = vec3(0.2126, 0.7152, 0.0722);
            float rockL = pow(max(dot(rockS, LUMA) / uRockAvg, 0.0), 1.6);
            float grassL = dot(grassS, LUMA) / uGrassAvg;
            float sandL = dot(sandS, LUMA) / uSandAvg;
            float detail = mix(grassL, sandL, clamp(vSplat.y, 0.0, 1.0));
            detail = mix(detail, rockL, clamp(vSplat.x, 0.0, 1.0));
            diffuseColor.rgb *= clamp(detail, 0.25, 2.1);
          }`,
        );
    };
  }
  const terrain = new THREE.Mesh(terrainGeo, terrainMat);
  terrain.receiveShadow = true;
  terrain.castShadow = true;
  group.add(terrain);

  // Sırt selvileri — referans görselin (ASSET-109) en okunaklı imzası:
  // tebeşir kayalığın tepesinde tek tük koyu selvi mızrakları. LOT-28
  // selvi kiti koy ZEMİNİNDEN sahip isteğiyle kaldırılmıştı (27 Ağu,
  // "tüm çevre benim gösterdiğim ile tasarlansın" — koy dekoru ASSET-116
  // paketi); ama sahip 28 Ağu'da "ağaçlar referans görseldeki gibi
  // gözükmeli" dedi ve referansın sırtındaki silüetler net selvi —
  // bu yüzden kit yalnız SIRTTA, koy zeminine hiç inmeden kullanılıyor.
  {
    const rimRand = mulberry32(20260913);
    const rimCypress: Array<{ x: number; y: number; z: number; sx: number; sy: number; sz: number; rotY: number }> = [];
    for (let cx = -104; cx <= 104; cx += 13) {
      if (rimRand() < 0.5) continue;
      const x = cx + (rimRand() - 0.5) * 6;
      // Taban çizgisinin 9-15 m gerisi: platonun ön kenarı — selviler
      // koydan bakınca gökyüzüne karşı gerçek bir silüet çizsin diye
      // kasıtlı olarak rimde, platonun derinliklerinde değil.
      const z = cliffFootZ(x) + 9 + rimRand() * 6;
      const y = cliffSurfaceY(x, z);
      if (y < cliffTopY(x) * 0.68) continue;
      const s = 0.8 + rimRand() * 0.6;
      rimCypress.push({ x, y: y - 0.1, z, sx: s, sy: s * (1 + rimRand() * 0.25), sz: s, rotY: rimRand() * Math.PI * 2 });
    }
    // Kapının üstündeki taca 2 belirgin selvi — referans kadrajının odağı.
    for (const t of [
      { x: -6.5, dz: 9.5, s: 1.15 },
      { x: 6, dz: 10.5, s: 1.3 },
    ]) {
      const z = cliffFootZ(t.x) + t.dz;
      rimCypress.push({
        x: t.x,
        y: cliffSurfaceY(t.x, z) - 0.1,
        z,
        sx: t.s,
        sy: t.s * 1.15,
        sz: t.s,
        rotY: rimRand() * Math.PI * 2,
      });
    }
    void placeKit(group, ISLAND_KIT.cypress, rimCypress);
  }

  // Kayalığın dibine moloz (talus) — @quarry araştırması ve art-director
  // speci ikisi de aynı şeyi söyledi: "amatör" görünümün en yaygın tekil
  // sebebi kayalığın zemine KESKİN bir çizgiyle oturmasıdır. Elimizdeki
  // kaya kitleri (ASSET-119/122) zaten vardı ama kovun geneline
  // serpiliyorlardı, tam da en çok gerektikleri yere değil.
  {
    const talusRand = mulberry32(20260911);
    const talus: RockSpot[] = [];
    for (let i = 0; i < 190; i++) {
      const x = -116 + talusRand() * 232;
      const fz = cliffFootZ(x);
      // Taban çizgisinin 0.5-6 m ÖNÜNE (koya doğru) — eteğe yığılmış döküntü.
      const z = fz - 0.4 - talusRand() * 5.8;
      if (z < shoreLineZ(x) + 0.5) continue;
      if (Math.abs(x) < 13 && z > -4) continue; // kapının önünü kapatma
      const s = 0.35 + talusRand() * talusRand() * 1.7; // çoğu küçük, birkaçı iri
      talus.push({
        x,
        y: terrainY(x, z) - s * 0.12,
        z,
        sx: s * (0.85 + talusRand() * 0.3),
        sy: s * (0.7 + talusRand() * 0.4),
        sz: s * (0.85 + talusRand() * 0.3),
        rotY: talusRand() * Math.PI * 2,
      });
    }
    scatterRockKit(group, talus, talusRand);
  }

  // Kapı-kaya dikişi (28 Ağu): ASSET-115 kapı kayasının kendi organik
  // silüeti ile kayalık kaşı her açıdan tam örtüşmüyor — aralarındaki dar
  // dikişten karartma perdesinin düz kenarı ince, dik bir "siyah şerit"
  // olarak okunuyordu. Dikişe iki yandan sıkışmış/devrilmiş tebeşir
  // kayaları — düz kenar organik bir moloz yığınına dönüşüyor (referans
  // görselde de mağara ağzının çevresi kaya bloklarıyla çevrili).
  {
    const seamRand = mulberry32(20260914);
    const seam: RockSpot[] = [];
    for (const side of [-1, 1] as const) {
      for (const t of [
        { z: 0.9, y: 1.2, s: 2.3 },
        { z: 1.5, y: 3.6, s: 1.9 },
        { z: 2.1, y: 6.2, s: 2.1 },
        { z: 2.6, y: 8.8, s: 1.7 },
        { z: 3.2, y: 11.3, s: 1.9 },
      ]) {
        seam.push({
          x: side * (6.6 + seamRand() * 1.1),
          y: t.y,
          z: t.z,
          sx: t.s * (0.85 + seamRand() * 0.3),
          sy: t.s * (0.8 + seamRand() * 0.35),
          sz: t.s * (0.85 + seamRand() * 0.3),
          rotY: seamRand() * Math.PI * 2,
        });
      }
    }
    scatterRockKit(group, seam, seamRand);
  }

  // Kıyı çizgisi boyunca kayalar — eski düz `RIDGE_PEAK_Z=-50.6` sırtının
  // yerine geçiyor. Artık düz bir çizgi değil, `shoreLineZ`'nin kendi
  // organik eğrisini takip ediyor.
  {
    const coastRand = mulberry32(20260830);
    const spots: CoastRockSpot[] = [];
    for (let i = 0; i < 120; i++) {
      const x = -116 + coastRand() * 232;
      if (coastRand() < 0.34) continue; // gerçek boşluklar — çit gibi olmasın
      const sz = shoreLineZ(x);
      const z = sz + (coastRand() - 0.45) * 4.5;
      if (Math.abs(x - 11) < 8 && Math.abs(z + 51) < 8) continue; // gemi payı
      if (Math.abs(x) < 4 && z > -48) continue; // spawn/patika ağzı
      const s = 0.4 + coastRand() * coastRand() * 1.9;
      spots.push({
        x,
        y: terrainY(x, z) - 0.14,
        z,
        sx: s * (0.86 + coastRand() * 0.28),
        sy: s * (0.72 + coastRand() * 0.4),
        sz: s * (0.86 + coastRand() * 0.28),
        rotY: coastRand() * Math.PI * 2,
      });
    }
    scatterCoastRockKit(group, spots, coastRand);
  }

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
      // Kenar jitter'ı X'i kaydırdı — dalgalı zeminde Y'yi son konumdan
      // tekrar örnekle, yoksa şerit kenarı zeminden kopar/gömülür.
      pos.setY(i, groundHeightAt(pos.getX(i), z) + 0.015);
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
  // z=-53,5: yeni kıyı eğrisinde (`shoreLineZ(11)`≈-50,5) gemi artık net
  // biçimde SUDA — eski -51 tam su çizgisindeydi ve gövde kumun üstünde
  // asılı görünüyordu (ajan turu ekran görüntüsüyle doğrulandı).
  const COVE_SHIP_CLEAR = { x: 11, z: -53.5, r: 9 };
  // Patika/spawn/gemi'ye saygılı temel kontrol — göllerin KENDİ yerleşimi
  // bunu kullanıyor (aşağıda). `coveDressingClear` (asıl dışa açık isim,
  // tüm mevcut çağrı noktaları — ağaç/kaya/koyun/çim demeti — değişmeden
  // kalıyor) bunun üstüne göl kaçınmasını da ekliyor; döngüsel bağımlılık
  // olmasın diye göllerin kendisi bu ham fonksiyonu kullanıyor.
  function baseDressingClear(x: number, z: number): boolean {
    // Yeni landform (28 Ağu): dekor yalnız yürünebilir koy zemininde —
    // ne denizde ne kayalık kütlesinin içinde/üstünde. Ajan turunun kendi
    // tespit ettiği "decor spawning inside the cliff" hatasının kök
    // düzeltmesi: TEK kapı fonksiyonu, tüm serpme sistemleri miras alıyor.
    if (!isCoveLand(x, z, 1.0)) return false;
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
      // Sahip (28 Ağu, ikinci tur): "yokuş görünümünde hâlâ altından su
      // gözüküyor." Kök neden: bazı göller z=-9..-4 (mağara ağzına
      // yükselen `PATH_MAX_RISE` rampası) veya z=-46 civarı (kıyı
      // sırtına inen taper) gibi zaten DOĞAL OLARAK alçak/ince zemin
      // bölgelerine düşüyordu — oraya ekstra `PUDDLE_DEPTH` (0,3 m)
      // kazmak zemini deniz seviyesinin altına itip denizin sızmasına
      // yol açıyordu. Göl siteleri artık yalnız z=-42..-9 (güvenli, kalın
      // zemin) aralığında.
      const z = -42 + puddleRand() * 33;
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
    if (!isCoveLand(x, z, 0.5)) return false;
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
    // Savunma amaçlı bir taban — yukarıdaki z-aralığı sınırlaması esas
    // düzeltme, ama olası bir kenar durumunda bile kazının deniz
    // seviyesinin altına inmesini yapısal olarak imkânsız kılıyor.
    const PUDDLE_MIN_Y = 0.15;
    const pos = terrainGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const dip = puddleDipAt(pos.getX(i), pos.getZ(i));
      if (dip > 0) pos.setY(i, Math.max(PUDDLE_MIN_Y, pos.getY(i) - dip));
    }
    pos.needsUpdate = true;
    terrainGeo.computeVertexNormals();

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
      disc.position.set(p.x, Math.max(PUDDLE_MIN_Y, groundHeightAt(p.x, p.z) - PUDDLE_DEPTH) + 0.04, p.z);
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
    // Sazlık artık sabit bir z-bandına değil kıyı ÇİZGİSİNE bağlı — eski
    // düz kıyıda (-49..-42) doğru olan bant, yeni organik kıyıda kimi
    // yerde denizin ortasına kimi yerde kuru çayırın içine düşüyordu.
    {
      let placed = 0;
      let guard = 0;
      while (placed < 14 && guard < 14 * 20) {
        guard++;
        const side = placed % 2 === 0 ? 1 : -1;
        const x = side * (1 + rand() * 18);
        const z = shoreLineZ(x) + 0.6 + rand() * 3.2;
        if (!coveDressingClear(x, z)) continue;
        const s = 0.7 + rand() * 0.5;
        reed.push({
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
        // Kum/çim geçişi artık kıyı çizgisine göreli (+1,5..+7 m içeride) —
        // eski sabit SAND_Z_MAX çizgisi yeni organik kıyıyla örtüşmüyor.
        const z = shoreLineZ(x) + 1.5 + edgeRand() * 5.5;
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
          (i) => {
            const cx = side * (20 + (i / 9) * 85);
            return { x: cx, z: shoreLineZ(cx) + 0.8 }; // kıyı çizgisini takip et
          },
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
      for (let z = -50; z <= 0; z += hexH) {
        const ox = (row % 2) * spacing * 0.5;
        row++;
        for (let x = -105; x <= 105; x += spacing) {
          const jx = x + ox + (rand() - 0.5) * spacing * 0.38;
          const jz = z + (rand() - 0.5) * hexH * 0.38;
          if (jz > 0) continue;
          // Kum bandında çim demeti olmaz — kıyı çizgisinden en az 8 m
          // içeride başlasın (renk geçişindeki kum bandı ~10 m; yeşil
          // demetlerin kumun ortasında bitmesi ilk turda göze battı).
          if (jz < shoreLineZ(jx) + 8) continue;
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
    // `y` opsiyonel: verilmezse koy zemini (`groundHeightAt`) — kayalık
    // PLATOSU üstündeki taç bitkileri kendi `cliffSurfaceY`'lerini geçiyor.
    type PackSpot = { name: string; x: number; z: number; scale: number; rotY: number; y?: number };
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
      // Ağaç taçları geniş — gövde koy zemininde olsa bile taç kayalık
      // yüzünün İÇİNE girebiliyordu (ajan turu ekran görüntüsüyle
      // doğrulandı). Ağaçlar kayalık tabanından ve kıyıdan en az 5 m
      // içeride; çiçek/çalı gibi küçük dekor 1,2 m ile yetiniyor
      // (`coveDressingClear`'ın kendi 1 m'lik payının hafif üstü).
      const landMargin = name.startsWith("tree") ? 5 : 1.2;
      // Ağaçlar kum bandında bitmez — kıyı çizgisinden en az 9 m içeride
      // (renk geçişindeki kum bölgesi ~10 m; referansta plaj çıplak).
      const shoreMargin = name.startsWith("tree") ? 9 : 2;
      let placed = 0;
      let guard = 0;
      while (placed < count && guard < count * 20) {
        guard++;
        const side = placed % 2 === 0 ? 1 : -1;
        const x = side * (xMin + rand2() * (xMax - xMin));
        const z = zMin + rand2() * (zMax - zMin);
        if (!isCoveLand(x, z, landMargin)) continue;
        if (z < shoreLineZ(x) + shoreMargin) continue;
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

    // ---------------------------------------------------------------
    // KAYALIK TACI — sahip (28 Ağu): "sonsuzluk hissi olan, en azından
    // mağaranın üzerinde bir tepe görüntüsü ve ağaçlar referans
    // görseldeki gibi gözükmeli." Referans (ASSET-109) kayalığın tepesini
    // altın çim + selvi kümeleri + tek tük çalıyla taçlandırıyor — plato
    // rengi zaten terrain boyamasında (düşük eğim + yüksek y → çim), bu
    // blok da ÜSTÜNE gerçek bitki örtüsünü koyuyor. Noktalar plato
    // yüzeyinde (`cliffSurfaceY`), koy zemini fonksiyonlarıyla işi yok.
    {
      const crownRand = mulberry32(20260912);
      // Sırt boyunca, taban çizgisinin 11-22 m gerisinde (plato içi) —
      // her ~9 m'de bir aday, ~%45'i boş geçiliyor (küme + boşluk ritmi).
      for (let cx = -108; cx <= 108; cx += 9) {
        if (crownRand() < 0.45) continue;
        const x = cx + (crownRand() - 0.5) * 5;
        const z = cliffFootZ(x) + 11 + crownRand() * 11;
        const y = cliffSurfaceY(x, z);
        // Yalnız gerçekten platoya oturan noktalar (yüz/etek değil) —
        // tepenin %70'inin altında kalan yükseklik hâlâ dik yüz demektir.
        if (y < cliffTopY(x) * 0.7) continue;
        const kind = crownRand();
        packSpots.push({
          name: kind < 0.55 ? "tree-stylized-02-dry" : "grass-bushes-01",
          x,
          z,
          y: y - 0.06,
          scale: 0.55 + crownRand() * 0.5,
          rotY: crownRand() * Math.PI * 2,
        });
      }
      // Kapının TAM üstüne bilinçli, sık bir küme — referans kadrajının
      // kalbi burası: mağara ağzı + üstünde yeşil taç.
      for (const t of [
        { x: -10, dz: 10.5, s: 0.9 },
        { x: -4.5, dz: 13, s: 0.75 },
        { x: 2.5, dz: 11, s: 1.0 },
        { x: 8.5, dz: 12.5, s: 0.7 },
        { x: 14, dz: 11.5, s: 0.85 },
      ]) {
        const z = cliffFootZ(t.x) + t.dz;
        packSpots.push({
          name: "tree-stylized-02-dry",
          x: t.x,
          z,
          y: cliffSurfaceY(t.x, z) - 0.06,
          scale: t.s,
          rotY: crownRand() * Math.PI * 2,
        });
      }
    }

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
        inst.position.set(spot.x, spot.y ?? groundHeightAt(spot.x, spot.z), spot.z);
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
    // Demirli bir geminin karinası SU İÇİNDE olmalı. `plantHero` omurgayı
    // y=0'a oturtuyor ama bunu KENDİ ölçeğinde yapıyor; yukarıdaki
    // `COVE_SHIP_SCALE` ondan SONRA uygulandığı için omurga oturma
    // düzleminden kayıyor ve gemi suyun üstünde asılı kalıyordu (sabit bir
    // -0,62 kaydırmayla telafi denendi, ölçek değişince yine bozulur —
    // kalıcı çözüm ölçüm). `seatHullKeel` tüm dönüşümlerden SONRA çağrılıyor.
    //
    // Hedef yükseklik ölçümle bulundu: `hullKeelY` bu Tripo gövdesinde
    // gerçek omurga DEĞİL, daha yukarıdaki bir "gövde-altı kuantili"
    // (oturtma düzlemi -0,66'dayken AABB min.y=-2,77 ölçüldü; aradaki
    // ~2,1 m kürekler/dümen). Bu yüzden düzlemi deniz seviyesinin ALTINA
    // koymak gemiyi güvertesine kadar batırıyor (yakın plan ekran
    // görüntüsünde batık gibi okundu). Su hattının gövdenin alt üçte
    // birinde durması için düzlem su seviyesinin ~1,5 m ÜSTÜNDE olmalı.
    seatHullKeel(hull, SEA_TEX.floorY + 1.55);
    group.add(hull);

    // Sahip (28 Ağu): "gemimiz suyun üzerinde sallansın. zaten bu hareket
    // var." Doğru — Lotus'un kahraman gemisi `ship.ts`'te `sampleOceanHull`
    // ile aynı Gerstner spektrumundan (GPU'nun çizdiği dalganın CPU
    // karşılığı, `oceanWaves.ts`) yükseklik + pitch + roll örnekliyor.
    // Cyclops o kodu hiç kullanmıyordu (gemisi salt dekor, statik).
    //
    // Doğrudan yeniden kullanılamadı çünkü `sampleOcean` genliği Lotus'un
    // ada yarıçapına bağlı `shoreAmp()` ile sönümlüyor — Cyclops kendi
    // denizini `islandRadius: 0` ile kurduğundan bu her noktada 0 verip
    // dalgayı tamamen siliyordu. `oceanWaves.ts`'e opsiyonel bir genlik
    // parametresi eklendi (Lotus'un davranışı birebir aynı kaldı) ve
    // buradan GPU shader'ıyla AYNI `CYCLOPS_WAVE_SCALE` geçiliyor — gemi
    // gerçekten gözle görülen dalganın üstünde sallanıyor.
    const baseY = hull.position.y;
    // Tekne yarı-boyutları geminin KENDİ ölçeğinde (Lotus'un `deckHalf*`
    // sabitleri tam boy gemiye göre; burada 0,42 küçültme var).
    const halfL = SHIP.deckHalfL * COVE_SHIP_SCALE * 0.62;
    const halfW = SHIP.deckHalfW * COVE_SHIP_SCALE * 0.7;
    // Koy dalgası zaten çok sakin (~0,25 m); Lotus'un kendi takip
    // katsayıları burada hareketi neredeyse görünmez bırakıyordu, bu yüzden
    // pitch/roll biraz yükseltildi — demirli bir teknenin tembel
    // yalpalaması okunacak kadar, "fırtınada" gibi görünmeyecek kadar.
    const FOLLOW_Y = 0.9;
    const FOLLOW_PITCH = 1.6;
    const FOLLOW_ROLL = 1.6;
    kitUpdaters.push((t) => {
      const w = sampleOceanHull(
        hull.position.x,
        hull.position.z,
        hull.rotation.y,
        t,
        halfL,
        halfW,
        CYCLOPS_WAVE_SCALE,
      );
      hull.position.y = baseY + w.y * FOLLOW_Y;
      hull.rotation.x = w.pitch * FOLLOW_PITCH;
      hull.rotation.z = w.roll * FOLLOW_ROLL;
    });
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
  // 28 Ağu landform bulgusu (kapı gizlenerek + isimle-gizle tanı aracıyla
  // kanıtlandı): kabuk `BackSide` olduğu için DIŞARIDAN bakan kamera, kapı
  // kayası ile kayalık kaşı arasındaki boşluklardan kabuğun İÇ duvarlarının
  // arka yüzlerini görüyor — kapının yanında keskin kenarlı "siyah
  // dikdörtgen" tam buydu (eski dağ levhası bunu tesadüfen kapatıyordu,
  // levha kalkınca ortaya çıktı). Kalıcı çözüm: kabuk yalnız oyuncu
  // eşiğe yaklaşınca/içerideyken render ediliyor (`setShellVisible`,
  // cyclopsStop.ts step()'i sürüyor) — dışarıdan kapı açıklığı zaten
  // yalnız karartma perdesinin karanlığını gösteriyor, kabuğun dışarıda
  // hiçbir görsel katkısı yok, yalnız sızıntısı vardı.
  let shellRoot: THREE.Object3D | null = null;
  let shellVisibleWanted = true;
  loadGltfBundle("assets/models/cave_cyclops_shell_01_mesh_68.glb").then((bundle) => {
    bundle.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.material = shellMat;
        obj.receiveShadow = true;
      }
    });
    shellRoot = bundle.scene;
    shellRoot.visible = shellVisibleWanted;
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
      //
      // **Düzeltme (28 Ağu, sahip, ekran görüntüsüyle): "aynı ekran
      // görüntüsünde turuncu bir sızıntı daha var... zemin sorunu var
      // bence."** Bu kütleyi yükleyen çağrı (aşağıda `seatPromise`) daha
      // önce TAM BURADA, kapının kendi `loadGltfBundle(...).then()`'i
      // İÇİNE İÇ İÇE (nested) yazılıydı — kapı yüklenmeden bu ikinci ağ
      // isteği hiç BAŞLAMIYORDU bile, iki ayrı network+parse turu SERİ
      // (art arda) çalışıyordu. Konumu/ölçeği (`seat.position.set(0,0,5)`,
      // `SEAT_WIDTH/HEIGHT`) kapının kendi ölçülen kutusuna (`fitted`) hiç
      // bağlı değil — sabit değerler — yani iç içe olmasının hiçbir gerçek
      // nedeni yoktu. O seri gecikme penceresinde (kapı yükleniyor + bu
      // kütle henüz BAŞLAMAMIŞ) oyuncu kovu görürse, bu kütlenin kapatması
      // gereken boşluktan çıplak gökyüzü ufku (`RENDER.skyHorizon`, sıcak
      // amber) sızıyordu — sahibin gördüğü "turuncu sızıntı" tam buydu,
      // ölçümle doğrulandı (tarayıcıda taze `navigate` sonrası ilk kare
      // sızıntıyı gösterdi, ~2 sn bekleyip yeniden render edince kayboldu).
      // Kalıcı çözüm: bu isteği kapının KENDİ isteğiyle PARALEL başlat
      // (aşağıya, `if` bloğunun hemen dışına taşındı) — iki ayrı ağ isteği
      // artık aynı anda gidiyor, seri gecikme yarı yarıya kısaldı, sızıntı
      // penceresi önemli ölçüde daraldı.
      cliffGroup.add(scene);
      cliffLoadedFlag = true;
    });
    // **KALDIRILDI (28 Ağu, sahip: "adanin komplesini hic begenmiyorum
    // geometrisel olarak").** Burada eskiden kapının hemen arkasına
    // oturtulan bir "seat" kütlesi vardı: `terrain_backdrop_01_mesh_2000.glb`
    // (ASSET-117), 220 m genişliğinde 34 m yüksekliğinde, soğuk gri-mavi
    // (0x8fa8bd) boyanmış, tek skalerle gerdirilmiş jenerik bir dağ mesh'i.
    // Üç ayrı sorunu vardı ve üçü de yamayla çözülemezdi:
    //   (1) Kapının arkasına "iğnelenmiş" sonlu bir levhaydı — arazinin
    //       kendisi değil. Bu yüzden her turda başka bir açıdan ya boşluk
    //       (gökyüzü sızıntısı) ya da adanın içine gömülme üretti; bugünkü
    //       tur geçmişinin (bkz. ACTIVE_WORK.md) neredeyse tamamı buydu.
    //   (2) Rengi ATMOSFERİK PERSPEKTİF rengiydi (uzak, puslu katman için
    //       doğru) ama nesne YAKINDAYDI — bu yüzden hep "arka plan resmi
    //       önümde duruyor" gibi okundu.
    //   (3) Provenans: `@quarry` araştırması (28 Ağu) bu mesh'in registry'de
    //       yazdığı gibi ambientCG Terrain003 OLMADIĞINI kanıtladı (176 KB
    //       vs. ambientCG'nin en küçük 118 MB indirmesi; dosyanın kendi
    //       .mtl başlığı "3ds Max Wavefront OBJ Exporter" ve `C:\Users\
    //       Hunter\` yolları taşıyor). Kaynağı ve lisansı BİLİNMİYOR ve
    //       sahnedeki ana dağ kütlesi olarak sevk ediliyordu.
    // Yerine geçen: modül başındaki landform eğrilerinden üretilen gerçek
    // kayalık (`cliffSurfaceY`) — kapının arkasında ve iki yanında yükselen,
    // koyun kendi arazisinin parçası olan sürekli bir kütle. Ne iğneleme,
    // ne boşluk, ne bilinmeyen lisans.
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
    // `MeshBasicMaterial` — ışıktan TAMAMEN bağımsız. Standart malzemeyle
    // güneş (28 Ağu, -Z'den vuruyor) bu kutuların ön yüzünü aydınlatıp
    // kapının üstünde parlak gri bir DİKDÖRTGEN olarak ortaya çıkarıyordu
    // (raycast ile doğrulandı: ekrandaki gri levha = leftWall'un y≈5 üst
    // bandı). İşi "boşluğu tünel karanlığı gibi göstermek" olan bir perde
    // hiçbir zaman ışık almamalı.
    const backstopMat = new THREE.MeshBasicMaterial({ color: 0x120f0b });
    // Boyut BİLEREK mütevazı (5×5, yalnız açıklığın hemen çevresi) — bir
    // ara 7×13'e büyütüldü ve bu HATAYDI: 13 m'lik ışıksız kara perde,
    // kapının silüeti çevresinde asıl görünmesi gereken AYDINLIK tebeşir
    // yüzünü kapatan dev bir pano gibi okundu (ekran görüntüsüyle
    // doğrulandı, geri alındı). Kapı çevresindeki asıl sızıntının (dıştan
    // görünen `cave_cyclops_shell` kesiti — "siyah dikdörtgen", isimle-
    // gizle tanı aracıyla kanıtlandı) gerçek çözümü aşağıda:
    // `setShellVisible` — oyuncu dışarıdayken kabuk hiç render edilmiyor.
    const backHalfWidth = 5;
    // 5→8 m: kemer açıklığının üst kesiminden bakan sightline'lar da
    // perdenin karanlığında bitsin (perde artık z=3,1'de, dağ gövdesine
    // tam gömülü — yükseltmek hiçbir açıdan dışarı taşırmıyor).
    const backHeight = 8;
    const doorHalfWidth = 1.9;
    const doorHeight = 2.4;
    const backDepth = 3;
    // 4,6 m (28 Ağu, raycast ile kesinleşti): perde kutusunun ÖN yüzü
    // artık z=3,1'de — kaş yüzeyi orada ~19-21 m, kutu (5 m) dağın
    // gövdesine TAMAMEN gömülü. Önceki 2,7'de ön yüz z=1,2'ye uzanıyordu
    // ve dağ yüzeyi orada daha ~1-2 m'yken kutunun üst köşesi yamacın
    // DIŞINA taşıp kapının yanında çıplak siyah bir çentik oluşturuyordu
    // (kapı önü A-kadrajında raycast: ilk opak vuruş z=1,2'de kutunun
    // kendisiydi). Kapı açıklığından bakınca hâlâ kutunun karanlığı
    // görünüyor (z=3,1-6,1 ağız odasının içinde) — işlev değişmedi.
    const backZ = 4.6;
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
      if (!(globalThis as { __CYC_HIDE_BACKSTOP__?: boolean }).__CYC_HIDE_BACKSTOP__) group.add(m);
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
    horizonGroup,
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
    setShellVisible(v: boolean) {
      shellVisibleWanted = v;
      if (shellRoot) shellRoot.visible = v;
    },
    cliffLoaded: () => cliffLoadedFlag,
    cliffGroup,
    runes,
  };
}
