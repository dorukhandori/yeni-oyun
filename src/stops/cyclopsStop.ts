import * as THREE from "three";
import type { TestHooks } from "../game";
import { CAMERA, RENDER, SAILOR, PLAYER } from "../constants";
import { CameraRig } from "../render/cameraRig";
import { Input } from "../systems/input";
import { isCoarsePointer } from "../ui/orientation";
import { loadGltfBundle, fitGltfHeight } from "../world/gltf";
import { createHumanoidActor, type HumanoidActor } from "../world/humanoidRig";
import {
  buildCyclopsCave,
  corridorHalfWidthAt,
  roomAt,
  roomIdAt,
  roomBounds,
  heightAt,
  groundHeightAt,
  shoreLineZ,
  cliffFootZ,
  CAVE_MIN_CEILING_Y,
  CYCLOPS_FOG_COLOR,
  CYCLOPS_WAVE_SCALE,
  HEARTH_POS,
  TORCH_POS,
} from "../world/cyclopsCave";
import { Bursts } from "../systems/burst";
import { buildSea } from "../world/sea";

/**
 * Cyclops Cave (2nd Odyssey stop) — primitive playable mechanic.
 *
 * "En ilkel şekilde yap, test et, en son süsle" (sahip, 25 Ağu 2026): every
 * NUMBER below is locked (docs/design/tuning.md §12/§12.1), but every VISUAL
 * (boxes, capsules, a plain debug overlay instead of real HUD) is a
 * stand-in. K12 (real HUD), K13 (Hub wiring), and the Blender/Tripo asset
 * passes come after this is verified to actually play right.
 *
 * Deliberately NOT wired into game.ts's Lotus closure — see the comment at
 * the top of this file's previous (stub) version, still true: startGame()
 * is too entangled to safely extract from this session's budget, so this
 * stays its own self-contained loop, reached only via the ACTIVE_STOP
 * branch in game.ts.
 */

// ---------------------------------------------------------------- constants
// All from docs/design/tuning.md §12/§12.1 — names kept identical to the
// design doc so a future diff against it is trivial.
const DETECT_MAX = 100.0;
const DETECT_RATE_SHADOW_STILL = 0.0;
const DETECT_RATE_SHADOW_MOVING = 3.0;
const DETECT_RATE_LIT_STILL = 4.0;
const DETECT_RATE_LIT_MOVING = 12.0;
const DETECT_DECAY = 8.0;
// tuning.md §12'nin sabit CYCLOPS_PHASE_OUT/RETURN/PRESENT (58/8/30 s)
// süreleri buradan kaldırıldı — sahip (26 Ağu) devin tüm hareketlerinin
// gerçekten yapılmasını istedi (ışınlanma yok), bu da faz sürelerini artık
// bir zamanlayıcı değil, devin gerçek yürüyüş/uyku süresinin bir SONUCU
// yapıyor (bkz. GIANT_* sabitleri, aşağıda). Gerçek toplam döngü süresi
// ölçülüp tuning.md'ye geri yazılacak — bkz. bu commit'in notu.
const CYCLOPS_RETURN_MULTIPLIER = 1.5;
const CYCLOPS_PRESENT_MULTIPLIER = 3.0;
const CAUGHT_DROP_RADIUS = 2.0;
/** 🟡 Deneysel — tuning.md §12: playtest'e kadar kesin değil. */
const CYCLOPS_CRUSH_CAP = 3;
const CYCLOPS_ITEM_TARGET = 4;
const CYCLOPS_CARRY_CAP = 4;
const CYCLOPS_DOOR_LIGHT_REACH = 45.0;
const CYCLOPS_DOOR_LIT_THRESHOLD = 0.5;
const CYCLOPS_GIANT_SPEED = 3.0;
/**
 * Ayak kayması düzeltmesi (26 Ağu, sahip: "oyunda biraz daha iyi ama..."
 * sonrası ölçülen gerçek neden). `walk` klibi "treadmill" — kök çeviri
 * sıfırlanmış (Doryseus'un `retarget_mixamo_doryseus.py` deseniyle aynı),
 * gerçek hareketi `walkGiantTowards()` sağlıyor — ama klibin KENDİ doğal
 * temposu (bacakların bir tam döngüde ne kadar "ilerlediği hissi") ile
 * `CYCLOPS_GIANT_SPEED` arasında hiçbir bağ yoktu, bu da ayakların zeminde
 * kaymasına neden oluyordu.
 *
 * 29 Ağu: klip kaynağı değişti (ASSET-129, `boss/walk.fbx`), yani sayı da
 * değişmek zorundaydı — eski 1.669 başka bir klibin ölçümüydü ve olduğu
 * gibi bırakılsa düzeltilmiş bir hata sessizce geri gelirdi. Yeni ölçüm
 * (headless Blender, kaynak FBX'in kendi kalça kökü): 44 kare / 30 fps =
 * 1.433 sn'de 1.877 m ileri → 1.309 m/s.
 *
 * Ama asıl saklanması gereken sayı bu değil: adım uzunluğu karakterin
 * boyuyla ölçekleniyor, dev ise `GIANT_HEIGHT_M`'e büyütülüyor. Bu yüzden
 * sabit artık **boy başına** tutuluyor (1.309 / 1.838 m kaynak boyu =
 * 0.7123 boy/sn); doğal hız `× GIANT_HEIGHT_M` ile kullanım yerinde
 * türetiliyor, böylece `GIANT_HEIGHT_M` değişirse tempo kendiliğinden
 * doğru kalıyor. (Eski sabit bu ölçeklemeyi hiç yapmıyordu — Mixamo
 * ölçeğindeki m/s'yi doğrudan 5 m'lik deve uyguluyordu.)
 */
const GIANT_WALK_CLIP_HEIGHTS_PER_SEC = 0.7123;
/** Yön dönüşü/stomp — 26 Ağu, "dev'in hareketleri yok" bulgusu. Prosedürel,
 * gerçek animasyon klibi değil (bkz. walkGiantTowards'taki not). Facing
 * sabiti önce 🔬 tahminle (0) gönderildi; `producer`/`@axiom`'un asset
 * üretim planı turunda kemik rest pozisyonları ölçülerek doğrulandı —
 * ayak bileği/parmak +X'te, sol/sağ ayaklar Z'de ayrışıyor → modelin
 * yerel ileri ekseni +X, repo konvansiyonuyla (SAILOR.meshFacing'in aynı
 * mantığı) düzeltmesi −π/2. Eskisiyle dev yürüdüğü yöne 90° yan bakarak
 * ilerliyordu. */
const GIANT_MESH_FACING = -Math.PI / 2;
/** Devin dünya boyu. Eski ASSET-098 placeholder'ı doğal olarak ~5 m'ydi ve
 * workbench preset'i de onu "5 m" diye belgeliyordu; ASSET-127 rig'i Tripo
 * normalizasyonuyla ~0,85 birim geldiği için artık açıkça ölçekleniyor. */
const GIANT_HEIGHT_M = 5.0;
// Devi büyütmek sessizce mağaraya sığmamasına yol açabilir — 29 Ağu'da
// tam bu olmuştu (sahip: "kafası tavandan dışarı çıkıyor"). Tavan tabanı
// cyclopsCave'de, boy burada; ikisi ayrı dosyada olduğu için bağ DEV'de
// açıkça kontrol ediliyor, bir dahakini render'da fark etmeye kalmıyoruz.
if (import.meta.env.DEV && GIANT_HEIGHT_M > CAVE_MIN_CEILING_Y - 1.0) {
  console.error(
    `[cyclopsStop] dev (${GIANT_HEIGHT_M} m) mağara tavanına sığmıyor ` +
      `(CAVE_MIN_CEILING_Y=${CAVE_MIN_CEILING_Y} m, en az 1 m baş payı gerekli)`,
  );
}
const GIANT_TURN_SMOOTH = 0.25; // oyuncudan daha yavaş dönüyor, "ağır ama amaçlı"
const GIANT_BOB_FREQ = 5.5;
const GIANT_BOB_AMPLITUDE = 0.12;
const CYCLOPS_CRUSH_RADIUS = 2.0;
const CYCLOPS_GIANT_PROXIMITY_RADIUS = 8.0;
const CYCLOPS_PROXIMITY_MULTIPLIER = 2.0;
const PLAYER_SPEED = 4.0;
const PLAYER_RADIUS = 0.4;
const CAMERA_WALL_MARGIN = 0.5;

/**
 * Bulundu (sahip playtest'i, 27 Ağu 2026): "kamera hâlâ mağaranın dışına
 * kaçabiliyor" — kamera zoom kilidi (bkz. `rig.rotate` yorumunda) boom'u
 * sabitledi ama `CameraRig.desired()` o sabit boom'u odanın gerçek
 * çeperine hiç bakmadan focus'tan ekliyordu. Oyuncu eşiğe (D=0) ya da dar
 * bir boğaza yakınken kamera D=0'ın altına (path/cove — ROOMS'ta hiç duvar
 * verisi olmayan, `halfWidth:Infinity` açık dış alan) veya odanın
 * `halfWidth`'inin dışına savrulabiliyordu. Kabuk `BackSide` malzemeyle
 * yalnız İÇERİDEN görünür olduğundan, kamera bir kez o sınırın dışına
 * çıkınca kabuk tamamen görünmez oluyor, arkasındaki gökyüzü/deniz'e
 * bakılıyordu — sahibin "dışarı kaçıyor" dediği tam olarak buydu.
 *
 * `CameraRig`'e artık genel bir `clampPos` hook'u geçiliyor (Lotus'ta
 * kullanılmıyor, no-op): X, oyuncu çarpışmasıyla aynı `corridorHalfWidthAt`
 * kaynağından kelepçeleniyor; Y, odanın `ceilingY`'siyle; Z ise oyuncu
 * D>=0'dayken (mağaranın içindeyken) kameranın D=0 eşiğinin altına asla
 * düşmemesi ile — bu son satır olmadan X kelepçesi işe yaramıyordu, çünkü
 * path/cove'un `halfWidth:Infinity` olması X ekseninde hiç sınır koymuyor.
 */
function clampCameraInsideCave(pos: THREE.Vector3, playerZ: number): void {
  if (playerZ >= 0) pos.z = Math.max(pos.z, CAMERA_WALL_MARGIN);
  const room = roomAt(pos.z);
  if (Number.isFinite(room.halfWidth)) {
    const hw = room.halfWidth - CAMERA_WALL_MARGIN;
    pos.x = Math.max(-hw, Math.min(hw, pos.x));
  }
  if (Number.isFinite(room.ceilingY)) {
    pos.y = Math.min(pos.y, room.ceilingY - CAMERA_WALL_MARGIN);
  }
  // 28 Ağu landform: oyuncu dışarıdayken kamera kayalık kütlesinin içine
  // girmesin — oyuncu kelepçesiyle aynı eğri (`cliffFootZ`), aynı kapı
  // boğazı muafiyeti. (Deniz tarafı bilerek serbest: kameranın suyun
  // üstünden koya bakması hem güvenli hem güzel bir kadraj.)
  if (playerZ < 0 && Math.abs(pos.x) >= 8) {
    const footLim = cliffFootZ(pos.x) - 1.2;
    if (pos.z > footLim) pos.z = footLim;
  }
}
/**
 * Bulundu (sahip talebi, 26 Ağu 2026): "dash movement da olacak, yerde
 * sürünme gibi." İki yeni oyuncu hareketi — henüz tuning.md'ye işlenmedi
 * (🟡 deneysel, D isimleri de geçici), 25 Ağu'nun "en ilkel yap test et"
 * kuralı gereği burada, tek dosyada, sayılarla başlıyor.
 */
const DASH_DISTANCE = 4.5; // metre, tek atılış
const DASH_DURATION = 0.15; // s — bu sürede DASH_DISTANCE kat edilir
const DASH_COOLDOWN = 1.4; // s
const CRAWL_SPEED_MULT = 0.45; // sürünürken normal hızın oranı
const CRAWL_DETECT_MULT = 0.4; // sürünürken DETECT birikim hızı çarpanı — asıl gizlenme faydası bu
/**
 * "Dev bazen rage geçirecek kendi odasında, sarhoş gibi hareket edecek ve
 * bir aRPG'deki bosslar gibi yapacağı hareket önceden yuvarlaklarla
 * gösterilmeli." Yalnız İç nöy'de (dev'in kendi odası) ve yalnız uyanıkken
 * (wanderingPre/Post) tetikleniyor — "uyuyan dev izlemiyor" kuralıyla
 * çelişmesin diye sleeping'e karışmıyor, bkz. enterRage() çağrı noktaları.
 */
const CYCLOPS_RAGE_CHANCE = 0.4; // İç nöy'de bir dolaşma hedefine varınca
const CYCLOPS_RAGE_DURATION = 7.0; // s
const CYCLOPS_RAGE_SPEED_MULT = 1.7; // "sarhoş" adımlar normalden hızlı ama dengesiz
const CYCLOPS_ATTACK_TELEGRAPH_SECONDS = 1.1; // yuvarlak belirdikten vuruşa kadar — kaçış penceresi
const CYCLOPS_ATTACK_INTERVAL = 2.3; // s, rage sırasında ardışık iki telgraf arası
const CYCLOPS_ATTACK_RADIUS = 2.4; // metre
/** Rune sırrı — bkz. üstteki state bloğunun notu. */
const RUNE_SEQUENCE = ["T", "Ü", "R", "K"];
const RUNE_INTERACT_RADIUS = 1.2;
/**
 * Vuruş hedefi — sahip (26 Ağu 2026, ikinci tur): "güvenli alanları da
 * kapsasın, her yere vurabilsin, gerçekten kaçınması zor bir mekanik olsun."
 * Önceki hâli (devin kendi konumundan CYCLOPS_ATTACK_RANGE=6m'i aşamaz)
 * bir bulduğum gerçek hatayı düzeltiyordu (mağara dışındaki oyuncu bile
 * "isabet" alabiliyordu) ama yan etkisi devin çevresine 6m'lik bir kabarcık
 * dışında kalan her köşeyi (gizlenme girintileri dahil) kalıcı güvenli
 * kılmaktı — sahip'in istediği tam tersi. Artık mesafe devin konumuna değil
 * ODANIN kendi sınırlarına göre kırpılıyor: hedef oyuncunun GERÇEK
 * konumu (devin nerede olduğu önemsiz — İç nöy'ün herhangi bir köşesi,
 * herhangi bir gizlenme girintisi dahil, tehdit altında), yalnız oda
 * sınırlarının dışına çıkamıyor — bu sayede mağara dışındaki/odayı terk
 * etmiş bir oyuncu hâlâ asla isabet alamıyor (asıl düzeltilen hata korunuyor),
 * ama odanın İÇİNDEYKEN hiçbir köşe artık kalıcı güvenli değil. Kaçınma
 * artık saf "yuvarlaktan çık" refleksine dayanıyor (CYCLOPS_ATTACK_TELEGRAPH_
 * SECONDS'lik pencere), mesafeye/köşeye saklanmaya değil.
 */
const CYCLOPS_ATTACK_ROOM_MARGIN_X = 0.5;
const CYCLOPS_ATTACK_ROOM_MARGIN_Z = 0.8;

type Phase = "out" | "return" | "present";

/**
 * Bulundu (sahip playtest'i, 26 Ağu): "bu hareketlerin hepsi gerçekten
 * yapılmalı, dev kapı açılınca dışarıya vs ışınlanmamalı, yürüyüp kapıyı
 * açıp kendi çıkmalıdır." Eski model sabit bir zamanlayıcıydı
 * (OUT/RETURN/PRESENT süreleri), dev anlık beliriyor/kayboluyordu. Şimdi
 * tam tersi: kapı durumu devin GERÇEK konumundan türüyor, zamanlayıcıdan
 * değil — `Phase` hâlâ var (DETECT/toplama kilidi onu okuyor) ama artık bu
 * state machine'in bir türevi.
 */
type GiantState =
  | "outside"
  | "entering"
  | "wanderingPre"
  | "headingToBed"
  | "sleeping"
  | "wanderingPost"
  | "raging"
  | "exiting";

interface WanderTarget {
  x: number;
  z: number;
}
// tuning.md §12.1 room weights (aynı olasılıklar — sığ eşik/depo/ağıllar/iç
// nöy). Kümülatif sınırlar GDD'nin kendi kabul-kriteri test vektörüyle
// eşleşiyor (0 / 0.15 / 0.35 / 0.75 / 0.999).
const WANDER_ROOMS: { room: "mouth" | "depot" | "pens" | "inner"; upTo: number }[] = [
  { room: "mouth", upTo: 0.15 }, // "sığ eşik"
  { room: "depot", upTo: 0.35 },
  { room: "pens", upTo: 0.75 }, // ocağın da bulunduğu oda, ama hedef nokta ayrı rastgele
  { room: "inner", upTo: 1.0 },
];

/**
 * Bulundu (sahip playtest'i, 26 Ağu 2026): "dev içeri giriyor random
 * dolaşıyor ama duvarlara yakın sağa sola hiç gitmiyor random bir şekilde."
 * Eski model tek bir sabit (x,z) noktasıydı, üçü de x=0 üstünde — dev
 * neredeyse hep merkez hatta yürüyordu. Şimdi: önce oda ağırlıklı çekiliş
 * (değişmedi), sonra o odanın GERÇEK genişliği içinde rastgele bir x + o
 * odanın derinlik aralığında rastgele bir z. Dar boğazlarda (x sınırı zaten
 * ~2 m) hâlâ doğal olarak merkeze yakın kalıyor — sadece odalarda artık
 * gerçekten kenara/duvara da gidebiliyor.
 */
function pickWanderTarget(rng: () => number = Math.random): WanderTarget {
  const r = rng();
  const pick = WANDER_ROOMS.find((w) => r < w.upTo) ?? WANDER_ROOMS[WANDER_ROOMS.length - 1];
  const b = roomBounds(pick.room);
  const marginZ = 1.5;
  const marginX = 1.2; // duvara tam yaslanmasın, yürünebilir kalsın
  const z = b.dMin + marginZ + rng() * Math.max(0.1, b.dMax - b.dMin - marginZ * 2);
  const halfX = Number.isFinite(b.halfWidth) ? Math.max(0.1, b.halfWidth - marginX) : 3;
  const x = (rng() * 2 - 1) * halfX;
  return { x, z };
}

// Devin dışarıda beklediği/mağara ağzına yürüdüğü noktalar — kapı eşiği
// z=0'ın hemen dışında, "ışınlanma yok" kuralı gereği gerçek bir konum.
const GIANT_OUTSIDE_Z = -5;
const GIANT_ENTER_START_Z = -3;
/** Primitif başlangıç değeri — gerçek süre artık devin yürüyüşünden
 * (uzaklık/hız) türüyor, `tuning.md`'nin eski sabit PRESENT=30s'i bu yeni
 * modelde artık üst sınır değil, ölçülüp güncellenecek (bkz. commit notu). */
const GIANT_SLEEP_SECONDS = 8.0;
/** Dev dışarıda beklerken (görünmezken) geçen süre — eski CYCLOPS_PHASE_OUT
 * yerine, ama artık yalnız bu bekleme dilimini kapsıyor, giriş/çıkış
 * yürüyüşü ayrıca gerçek zaman alıyor. */
const GIANT_OUT_WAIT_SECONDS = 40.0;
/** Sahip (26 Ağu 2026): "dev hep kendi yatağına yatacak" — İç nöy'ün
 * kilitli "Uyuma köşesi" konsept sanatındaki (ASSET-107) yatağın world-
 * space karşılığı, sabit. Rastgele dolaşma bitince dev HER ZAMAN buraya
 * yürüyüp yatıyor, artık rastgele bir odaya değil. */
const GIANT_BED: WanderTarget = { x: 0, z: 60 };
/** Boğaz B'nin (İç nöy geçidi) D aralığı — level-cyclops-cave.md §1.2. */
const GORGE_B_MIN = 44;
const GORGE_B_MAX = 48;

function doorGlobal(z: number): number {
  return Math.max(0, Math.min(1, 1 - z / CYCLOPS_DOOR_LIGHT_REACH));
}

export function startCyclopsStop(canvas: HTMLCanvasElement): TestHooks | null {
  // K13 (real Hub card + lock state) isn't built yet — until then, reaching
  // this function at all (only possible via ?stop=cyclops) means "skip
  // straight to play", not "sit behind the Lotus Title/Hub DOM with no way
  // in" (sahip: "Oyna çalışmıyor, normal localde de Kiklop kilitli", 25 Ağu).
  // Not a design decision about the real unlock flow — pure dev-testing
  // convenience, reverted the moment K13 lands.
  // Bulundu (25 Ağu): #hud (Lotus'un "Gemiye teslim: 0/12" paneli, unutuş
  // çubuğu vb.) statik HTML'de varsayılan görünür — yalnız Lotus'un kendi
  // step() döngüsü faz'a göre gizler/gösterir, o kod bu yolda hiç
  // çalışmıyor, panel kalıcı görünür kalıp yeni HUD'ın üstüne biniyordu.
  for (const id of ["titleScreen", "hubScreen", "hud"]) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  // 28 Ağu, sahip: "böyle hiç beğenmiyorum ve güzel de gözükmüyor" +
  // "adanın bu hali çok amatör". Kök neden bulundu ve ölçüldü: Kiklop
  // durağı Lotus'un `createStage()`'ını KULLANMADIĞI için (kendi ayrı
  // render yolu — CLAUDE.md'nin standing note'u) Lotus'ta uzun süredir
  // ayarlı olan render kurulumunun HİÇBİRİNİ miras almamıştı:
  // `toneMapping` hiç set edilmemişti (yani `NoToneMapping` — ham lineer
  // çıktı, ACES'in omuz eğrisi yok, tüm parlak alanlar donuk), `shadowMap`
  // kapalıydı (sahnedeki her `castShadow=true` bayrağı ölü koddu — hiçbir
  // ağacın/kayanın/kayalığın gölgesi yoktu, bu yüzden hiçbir hacim/derinlik
  // okunmuyordu), `outputColorSpace` varsayılana bırakılmıştı. Bunlar
  // Lotus'un `render/stage.ts` satır 49-53'ünde zaten çözülmüş; burada
  // birebir aynı kurulum uygulanıyor (`RENDER.exposure` paylaşılıyor).
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDER.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // Fallback flat colour — only ever seen for the first frame before the
  // sky sphere below is added (or if it somehow fails to load), so it
  // doesn't need to match the real sky.
  scene.background = new THREE.Color(0x1a222c);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 400);

  // ASSET-109's "Tam" exterior pass (sahip, 27 Ağu): "dışarısı hiç referans
  // görsele benzemiyor" — Cyclops bilerek Lotus'un `createStage()`'ını
  // kullanmıyor (kendi ayrı render yolu, CLAUDE.md'nin standing note'u),
  // ama koy/patika artık gerçek bir gökyüzü + deniz hak ediyor. Lotus'un
  // günlük döngüsünü (skyTime/dayProgress) TAMAMEN atlıyoruz — Cyclops'ta
  // hiç gün/dusk kavramı yok, sabit "sun-drenched Aegean" öğleden sonrası
  // yeter. `stage.ts`'in gradyan gökyüzü shader'ı burada statik
  // uniform'larla (day-progress update loop'u olmadan) birebir kopyalandı;
  // asıl bulut/güneş-diski sistemleri (`clouds.ts`/`sunDisk.ts`) atlandı —
  // onlar update-loop'a bağlı, bu ilk geçiş için orantısız bir yatırım.
  const skyTop = new THREE.Color(RENDER.skyTop);
  // 28 Ağu, sahip (üçüncü tur, "daha radikal bir çözüm lazım"): kova
  // etrafına elle iğnelenmiş sonlu dağ kopyaları (yukarıda kaldırıldı,
  // bkz. `cave.horizonGroup`) hem boşluk bırakıyor hem adanın içinde
  // duruyormuş gibi görünüyordu — kök neden fiziksel kapatma değil, RENK
  // uyuşmazlığıydı: `RENDER.skyHorizon` (0xf5d29a, sıcak amber) Lotus'un
  // güneşli öğleden sonrası için doğru, ama uzak-tepe halkasının kendi
  // KASITLI solma tasarımı (`buildHillBackdropRing`'in `topFade`
  // shader'ı — yüksekliğinin büyük kısmı zaten gökyüzüne doğru şeffaflaşan
  // bir geçiş bandı) HER ZAMAN bir miktar çıplak ufuk rengini gösteriyor;
  // bu Lotus'ta sıcak/güneşli bir haze gibi okunup hoş dururken, Cyclops'un
  // soğuk/puslu mağara paletiyle (`0x8fa8bd` tüm sis/dağ tint'lerinde)
  // çelişip "turuncu sızıntı" gibi okunuyordu. Kalıcı çözüm: fiziksel
  // kapatmayı iyileştirmeye devam etmek yerine (kırılgan, önceki turlarda
  // defalarca başarısız oldu) sorunun KÖKÜNÜ kesiyoruz — Cyclops kendi
  // gökyüzü shader'ında `RENDER.skyHorizon` yerine sisin/dağın aynı soğuk
  // ailesinden bir ufuk rengi kullanıyor. Bu tamamen Cyclops-yerel (bu
  // shader zaten Lotus'un `stage.ts`'inden ayrı, statik bir kopya — bkz.
  // yukarıdaki not), Lotus'un kendi RENDER.skyHorizon'ına dokunulmadı.
  // Artık halka nerede/ne kadar solursa solsun, altından sızan renk daima
  // sahnenin geri kalanıyla uyumlu — "kötü gözükmeyen" tasarım budur.
  // **Düzeltme (28 Ağu, aynı gün, sahip: "böyle hiç beğenmiyorum"):**
  // `0x9fb2c2` (koyu, soğuk gri-mavi) turuncu sızıntıyı gerçekten çözdü ama
  // yanlış yöne aştı — referans görselin (ASSET-109) ufku SOLGUN, neredeyse
  // beyaz, hafif sıcak bir pus; koyu gri-mavi bir ufuk sahneyi bütün olarak
  // kapalı/fırtınalı gösteriyordu. Doğru cevap "sıcak amber (Lotus) mı,
  // soğuk gri (yama) mi" ikilemi değil: ikisinin de dışında, referansın
  // kendi rengi olan yüksek-değerli solgun bir ufuk. Turuncu şikayeti
  // yine gelmez (bu renk amber değil), ama sahne artık güneşli okunuyor.
  // Tek kaynak: gökyüzü ufku + fog + uzak-tepe halkasının pusu aynı rengi
  // paylaşmalı (bkz. cyclopsCave.ts `CYCLOPS_FOG_COLOR` notu).
  const skyHorizon = new THREE.Color(CYCLOPS_FOG_COLOR);

  // 28 Ağu, sahip: **"ama şimdi de denizin sonsuzluk hissi çok yapay."**
  // Kök neden ölçümle bulundu: Kiklop sahnesinde `scene.fog` HİÇ
  // kurulmamıştı. Bu tek başına iki ayrı yapaylık üretiyor:
  //   (1) `sea.ts`'in kendi shader'ı atmosferik mesafeyi FOG ÜZERİNDEN
  //       kuracak şekilde yazılmış (`#include <fog_vertex>` /
  //       `<fog_fragment>`, `fog: true`) — Lotus `stage.ts:56`'da
  //       `FogExp2(RENDER.fogColor, 0.0044)` ile bunu besliyor. Cyclops
  //       kendi ayrı render yolunu kullandığı için (CLAUDE.md standing
  //       note) o satırı hiç miras almamıştı: deniz, tam doygun turkuazını
  //       ufka kadar koruyordu. Gerçek denizde uzak su ile gökyüzü aynı
  //       pusta birleşir; burada iki ayrı düz renk bandı gibi duruyordu.
  //   (2) Deniz düzlemi (`floodMeters` 1100 m) kameranın uzak kesme
  //       düzleminden (400 m) çok daha uzağa uzanıyor, yani ~400 m'de
  //       DONANIMSAL olarak kesiliyor — ufuk çizgisinin hemen altında
  //       (göz yüksekliği ~4 m'de yalnız ~0,6°) sert, dümdüz bir kenar.
  //       Fog'suz bu kenar doygun mavi ile gökyüzü arasında keskin bir
  //       şerit olarak okunuyordu (sahibin gördüğü "yapay" çizgi).
  // Çözüm ikisini birden kapatıyor: fog rengi gökyüzünün KENDİ ufuk
  // rengiyle aynı (`CYCLOPS_SKY_HORIZON`) ve yoğunluk, kesme düzleminden
  // ÖNCE tam doyacak şekilde seçildi — 350 m'de fog faktörü ~%95, yani
  // denizin kesilen kenarı zaten %100 gökyüzü rengine boyanmış oluyor,
  // birleşme noktası görünmez hâle geliyor. Yakın koy ise korunuyor:
  // 60 m'de yalnız ~%9 pus (gerçek atmosferik perspektif, kayalığa
  // istenen derinliği veriyor), 20 m'de ~%1.
  const FOG_DENSITY_OUTDOOR = 0.005;
  // Mağara İÇİ ayrı: aynı açık-gri pus kapalı bir mağarada yanlış olur
  // (duvarları soluk bir perdeyle yıkardı). İçeride hem çok daha koyu hem
  // daha yoğun bir fog — tünelin derinliğe doğru kararmasını güçlendiriyor,
  // ışık profiliyle (aşağıdaki `inside`) aynı anda karışıyor.
  const FOG_COLOR_OUTDOOR = new THREE.Color(CYCLOPS_FOG_COLOR);
  const FOG_COLOR_INDOOR = new THREE.Color(0x0d1418);
  const FOG_DENSITY_INDOOR = 0.02;
  scene.fog = new THREE.FogExp2(FOG_COLOR_OUTDOOR.getHex(), FOG_DENSITY_OUTDOOR);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      top: { value: skyTop },
      horizon: { value: skyHorizon },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      varying vec3 vPos;
      void main() {
        float h = clamp(normalize(vPos).y * 1.6 + 0.12, 0.0, 1.0);
        vec3 c = mix(horizon, top, pow(h, 0.7));
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(new THREE.SphereGeometry(360, 32, 20), skyMat);
  skyMesh.renderOrder = -3;
  skyMesh.frustumCulled = false;
  scene.add(skyMesh);

  // ASSET-109'un koyu — "sea shading shallow turquoise near the shore to
  // mid/deep lapis further out". Lotus'un zaten var olan Gerstner deniz
  // sistemi (`buildSea()`, tam bağımsız fonksiyon, Lotus-özel global
  // duruma bağlı değil) yeniden kullanıldı — yeni bir su shader'ı
  // yazılmadı. Koy D=-40..-8 aralığında (bkz. ROOMS, altıncı VE onikinci
  // geri bildirim turlarında -20 → -30 → -40'a uzatıldı — "denizden mağara
  // arası biraz daha uzun olsun"); deniz D=-46'ya (kıyı şeridinin kendi
  // yakın kenarı D=-40'ın ~6 m ötesi — kıyı çizgisi kabaca kum/su geçişine
  // denk gelsin diye, hep aynı oran) taşındı, oradan öteye (daha negatif
  // D'ye, oyuncunun hiç erişemeyeceği açık denize) uzanıyor —
  // `player.position.z` zaten -39'da clamp'leniyor, bu yüzden deniz
  // yalnızca bir arka plan, hiç yürünebilir alan değil.
  // includeLagoon: false — Lotus'un durgun gölet+nilüfer diski Lotus'un
  // kendi LAGOON.center sabitine (yerel orijine yakın) konumlanıyor; sea
  // grubu buraya -26 kaydırılınca o gölet Cyclops'un koyunun tam ortasında,
  // denizin üstünde soluk/beyaz bir "blob" olarak beliriyordu (sahip
  // ekran görüntüsünde görüldü). Gölet Cyclops'a ait değil, kapatıldı.
  //
  // islandRadius: 0 — sahip "deniz hâlâ düzgün görünmüyor" dedi (27 Ağu,
  // ikinci geri bildirim). Kök neden: sea shader'ının hem vertex hem
  // fragment kısmı `uIslandR` (Lotus'un kendi adası) yarıçapında dairesel
  // bir "discard" deliği açıyor — normalde Lotus adası o deliğin içine
  // oturuyor, deniz ada geometrisiyle çakışmasın diye. Cyclops'ta orada
  // hiç ada yok; o delik dümdüz gökyüzünün (RENDER.skyHorizon, sıcak
  // amber) direkt görünmesine yol açıyordu — kumsalla asıl dalgalı deniz
  // arasında düz, sert kenarlı turuncu bir şerit olarak fark edildi. `r <
  // coast - uOverlap` (fragment) / `coastR()` (vertex) uIslandR=0 iken hep
  // false/aktif kalıyor, delik tamamen kapanıyor — Lotus/workbench'in
  // varsayılanı (`ISLAND.radius`) değişmedi.
  // clipZMax: -1 — sahip (27 Ağu, yedinci geri bildirim): "deniz suyu
  // mağara girişine kadar ulaşıyor ve içerisine de geliyor." Kök neden:
  // patch/flood düzlemleri yüzlerce metre (SEA_TEX.patchMeters/floodMeters)
  // — `islandRadius: 0` deliği kapattığından beri hiçbir şey onların D=0
  // eşiğini, hatta mağaranın 65 m'lik iç kompleksinin tamamını geçmesini
  // engellemiyordu (Y=-0.16'da, opak zeminin altında olsa da bazı açılarda/
  // Gerstner dalga tepelerinde görünür oluyordu). `uClipZMax` fragment
  // discard'ı ekledi (sea.ts) — deniz artık D=-1'in ötesinde hiç render
  // edilmiyor, eşiğe ya da içeriye asla sızamaz.
  // waveScale: 0.2 — sahip (27 Ağu, onbeşinci geri bildirim): "suyu adanın
  // içine kadar gelmesini kes." Yukarıdaki `clipZMax` yalnız D=0 eşiğini
  // korur — kök neden bambaşkaydı: en büyük Lotus dalgası (steepness 0.22,
  // wavelength 36) ~1,26 m'lik gerçek bir Gerstner genliğine sahip,
  // kumun/çimin dünya-Y'sinden (`heightAt()`, en fazla ~0,4 m plato) kolayca
  // yükseliyor — deniz kumun/çimin ORTASINDA (yalnız kıyıda değil) görünür
  // oluyordu. Korunaklı bir koyun suyu zaten açık denizden çok daha sakin
  // olmalı — dalga dikliği burada %20'ye indirildi (genlik de aynı oranda
  // düşer), en büyük dalga artık ~0,25 m, platonun rahatça altında.
  const sea = buildSea({
    includeLagoon: false,
    islandRadius: 0,
    shoreBlend: false,
    clipZMax: -1,
    // Tek kaynak: geminin CPU sallanma örneklemesi de aynı sabiti kullanıyor
    // (bkz. cyclopsCave.ts `CYCLOPS_WAVE_SCALE`) — ayrışırlarsa gemi
    // gördüğümüzden başka bir dalganın üstünde sallanır.
    waveScale: CYCLOPS_WAVE_SCALE,
  });
  sea.group.position.z = -56;
  scene.add(sea.group);

  // ASSET-118 (Sketchfab dalga meshi, "hero" kıyı parçası) — sahip geri
  // aldırdı (27 Ağu): "deniz olmamış, tüm denize yayılmamış, girişini
  // yaptığın değişikliği geri al." Tek bir ~28m'lik yama, 400m'lik deniz
  // yamasının çok küçük bir kısmını kaplıyordu, "artık deniz böyle
  // gözüksün" beklentisini karşılamadı. Kod tamamen kaldırıldı (asset
  // dosyası/registry kaydı duruyor, gelecekte farklı bir yaklaşımla —
  // örn. tüm görünür deniz alanını gerçekten kaplayan bir çözümle —
  // tekrar denenebilir).

  // Bulundu (sahip playtest'i, 25 Ağu): sahne neredeyse hiç görünmüyordu —
  // ışık sabitti, kapı açık/kapalı hiçbir fark yaratmıyordu (tasarım
  // "mağara ağzı kapı açıkken 0,95 aydınlık" diyor, kod öyle davranmıyordu).
  // Tam `doorGlobal(D)` derinlik-bazlı formülü (K5'in asıl işi) hâlâ yok,
  // ama en azından kapı durumuna göre değişen, oynanabilir bir taban var.
  // 28 Ağu, sahip ("güzel de gözükmüyor" / "çok amatör"): buradaki asıl
  // eksik bir renk ayarı değil, **sahnede hiç güneş olmamasıydı**. Ambient
  // + Hemisphere ikisi de YÖNSÜZ dolgu ışığıdır — tek başlarına hiçbir
  // yüzeyin diğerinden daha parlak olmasını sağlamazlar, yani hiçbir form,
  // hacim ya da gölge okunmaz. Referans görselin (ASSET-109) tüm kimliği
  // ise sert, sıcak, yüksek bir Ege güneşi: aydınlık tebeşir yüzü, koyu
  // mağara deliği, çimende uzanan gölgeler. Lotus'un kendi güneşiyle
  // (`stage.ts`, `RENDER.sunColor/sunIntensity`) aynı ruhta ama Kiklop'a
  // özel sabit bir yön: koya denizden/-Z tarafından, soldan, ~46° yükseklikle
  // vuruyor — böylece +Z'ye (mağaraya) bakan oyuncu kayalığın AYDINLIK
  // yüzünü, mağara ağzını ise onun içindeki karanlık deliği görüyor.
  const OUTDOOR_AMBIENT = 0.34;
  const OUTDOOR_HEMI = 0.5;
  // Mağara İÇİ hâlâ eski, yönsüz/parlak dolguya muhtaç (orada güneş yok ve
  // oynanış görünürlüğe bağlı — ocak/meşale/oyuncu feneri tek başına
  // yetmiyordu, 25 Ağu playtest'i). Bu yüzden iki ayrı ışık "profili" var,
  // oyuncunun D'sine göre yumuşak geçişle karışıyorlar (aşağıda step()).
  const INDOOR_AMBIENT = 1.1;
  const INDOOR_HEMI = 0.7;
  const ambient = new THREE.AmbientLight(0xb9c8d2, OUTDOOR_AMBIENT);
  scene.add(ambient);
  // Zemin yarısı artık koyu kahve (0x30281f) değil sıcak kum/tebeşir sekmesi —
  // gerçek bir kumsalda yukarı sekmesi gereken renk bu, referansın alttan
  // aydınlatılmış sıcak gölgelerini de bu veriyor.
  const hemi = new THREE.HemisphereLight(0xcfe4f2, 0x9c8a68, OUTDOOR_HEMI);
  scene.add(hemi);
  const SUN_DIR = new THREE.Vector3(-0.46, 0.72, -0.52).normalize();
  const OUTDOOR_SUN = 2.3;
  const INDOOR_SUN = 0.35;
  const sun = new THREE.DirectionalLight(0xfff1d8, OUTDOOR_SUN);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  {
    // Gölge kamerası kovun kendi ölçeğine göre (Lotus'un 44 m'lik
    // `shadowExtent`'i burada dar kalıyor — kova 100 m uzunluğunda ve
    // kayalık 25 m yüksekliğinde, kayalığın gölgesi çimin yarısına düşmeli).
    const half = 62;
    const cam = sun.shadow.camera as THREE.OrthographicCamera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 1;
    cam.far = 260;
    sun.shadow.bias = -0.0022;
    sun.shadow.normalBias = 0.12;
  }
  scene.add(sun);
  scene.add(sun.target);
  /** Oyuncuyu takip eden ışık — hangi odada olursan ol yakın çevreni
   * görebilmen için (bir "meşale taşıyorsun" varsayımı, temsili). */
  const INDOOR_PLAYER_LIGHT = 1.6;
  /** Dışarıda neredeyse kapalı — bkz. step()'teki karışım notu (28 Ağu). */
  const OUTDOOR_PLAYER_LIGHT = 0.12;
  const playerLight = new THREE.PointLight(0xfff2d8, INDOOR_PLAYER_LIGHT, 14, 1.6);

  const cave = buildCyclopsCave();
  scene.add(cave.group);

  // ASSET-096 — ocak kor parçacığı. Ocak önceden yalnız bir `PointLight` +
  // düz parlak küreydi (level-cyclops-cave.md §3.4'ün "ocak = en yoğun
  // aydınlık" kimliğini taşıyordu ama hiç hareket yoktu). Lotus'un zaten
  // var olan genel parçacık havuzunu (`Bursts`, harvest/dust/splash'ta
  // kullanılıyor) yeniden kullanıyor — yeni bir sistem yazılmadı. Kısa
  // ömürlü (0.5–1 s), hafif yukarı fırlatılan sıcak parçacıklar, yerçekimi
  // altında hızla sönüyor — "köz sıçraması", gerçek bir alev simülasyonu
  // değil.
  const hearthEmbers = new Bursts();
  scene.add(hearthEmbers.points);
  let emberSpawnT = 0;

  // -------------------------------------------------------------- player
  // Sahip (26 Ağu 2026, ucuz kazanımlar turu): "önce Doryseus'u gerçek
  // rig'e geçir" — kapsül gitti, aynı GLB Lotus'ta zaten çalışıyor
  // (`createHumanoidActor`/`SAILOR`), burada yeni bir asset üretilmedi,
  // sadece bağlandı. `player` bir Group: `.position` her yerde aynı
  // (giant'ın aynı deseni, 26 Ağu'nun ilk turu), model asenkron ekleniyor.
  // Rig'in kendi orijini AYAKLARDA (fitGltfHeight), eski kapsülün MERKEZİ
  // değil — bu yüzden y artık 0 (bkz. aşağıdaki iki `player.position.set`).
  const player = new THREE.Group();
  player.position.set(0, 0, -46); // koy üç kez uzadı, spawn D=-18→-26→-36→-46
  scene.add(player);
  playerLight.position.copy(player.position);
  playerLight.position.y += 1.4;

  let playerActor: HumanoidActor | null = null;
  let playerFacing = 0; // world +z (mağaraya doğru) — spawn'ın baktığı yön
  createHumanoidActor(SAILOR.meshRig, {
    heightMeters: SAILOR.height,
    expectedBytes: SAILOR.meshRigBytes,
    clipFade: SAILOR.meshClipFade,
  })
    .then((a) => {
      playerActor = a;
      player.add(a.scene);
    })
    .catch((err) => {
      console.warn("[cyclopsStop] player rig failed to load", err);
    });
  scene.add(playerLight);

  // Bulundu (sahip playtest'i, 25 Ağu): "mouse'u oynattığımda kamera
  // dönmüyor" — hiç mouse-look bağlanmamıştı, kamera sabit +Z'ye
  // bakıyordu. Lotus'un zaten çalışan `CameraRig`'i bağımsız bir sınıf
  // (Lotus'a özgü hiçbir şey tutmuyor) — sıfırdan yazmak yerine yeniden
  // kullanıldı. Zemin hep y=0 (primitif geometri), gerçek `heightAt`
  // eşdeğeri yok.
  const rig = new CameraRig(
    camera,
    // 28 Ağu landform: zemin artık X'e de bağlı — kamera hedef yüksekliği
    // oyuncununkiyle aynı 2B fonksiyondan gelsin (eski z-only `heightAt`
    // dalgalı çayırda kamerayı yer yer zemine gömüyordu).
    (x, z) => groundHeightAt(x, z),
    isCoarsePointer() ? CAMERA.distTouch : CAMERA.dist,
    (pos) => clampCameraInsideCave(pos, player.position.z),
  );
  rig.snap(player.position);
  const fwd = new THREE.Vector3();
  const rightV = new THREE.Vector3();

  // ---------------------------------------------------------------- giant
  // Polyphemos — ASSET-098 (ID düzeltmesi, asset üretim planı §7.2 — bu
  // dosya kısa süre yanlışlıkla ASSET-092 olarak numaralanmıştı), "Cyclop"
  // (Sketchfab, lucasprs51450, CC-BY),
  // sahip'in seçtiği "temsili ücretsiz model" (26 Ağu 2026), plain kapsülün
  // yerine. `giant` bir Group: içi asenkron dolduruluyor (GLTFLoader), ama
  // `.position`/`.visible` her yerde AYNI şekilde okunuyor/yazılıyor —
  // step()'in geri kalanı bu satırın nereden geldiğini bilmiyor, tek
  // değişen üç `giant.position.set(0, 2.4, …)` çağrısının y'si oldu (2.4
  // eski kapsülün MERKEZİ içindi, yeni model ayakları kendi orijininde
  // (y≈0) — bkz. aşağıdaki üç `giant.position.set(0, 0, …)`).
  const giant = new THREE.Group();
  giant.position.set(0, 0, -100); // parked off-scene while OUT/RETURN (D10: only ever visible during PRESENT)
  giant.visible = false;
  scene.add(giant);
  let giantFacing = 0;

  // Rage tint (26 Ağu 2026): eski kapsülün tek `giantMat.color.setHex(...)`i
  // artık işlemiyor — model gerçek dokulu, albedo'yu ezmek yerine emissive
  // bir kızıl parıltı ekleniyor (dokuyu bozmadan "çıldırdı" hissi verir).
  // Materyal listesi model yüklenene kadar boş — hiçbir çağrı hata vermez,
  // yalnızca no-op olur (giant zaten 40+ sn görünmüyor, yükleme payı bol).
  const giantMaterials: THREE.MeshStandardMaterial[] = [];
  function setGiantRageTint(active: boolean): void {
    for (const m of giantMaterials) {
      m.emissive.setHex(active ? 0xb8321a : 0x000000);
      m.emissiveIntensity = active ? 0.55 : 0;
    }
  }
  // Ham `AnimationMixer` (createHumanoidActor DEĞİL — o, HUMANOID_CLIPS'in
  // `preset:*` isimlerini hardcode ediyor ve devin kendi moveset'i farklı
  // olacak). Klip adları `idle`/`walk` aranıyor; ASSET-127 rig'i şu an
  // klipsiz geldiği için mixer null kalıyor ve dev statik duruyor —
  // aşağıdaki `else` dalı bunu sessizce karşılıyor, boss moveset klipleri
  // eklenince kendiliğinden çalışmaya başlar.
  let giantMixer: THREE.AnimationMixer | null = null;
  let giantIdleAction: THREE.AnimationAction | null = null;
  let giantWalkAction: THREE.AnimationAction | null = null;
  let giantAnimSlot: "idle" | "walk" = "idle";
  function playGiantAnim(slot: "idle" | "walk"): void {
    if (slot === giantAnimSlot || !giantIdleAction || !giantWalkAction) return;
    giantAnimSlot = slot;
    const next = slot === "idle" ? giantIdleAction : giantWalkAction;
    const prev = slot === "idle" ? giantWalkAction : giantIdleAction;
    next.reset().fadeIn(0.25).play();
    prev.fadeOut(0.25);
  }
  // ASSET-129 — ASSET-127 Tripo rig'inin ÜZERİNE retarget edilmiş 7 Mixamo
  // klibi (`scripts/blender/retarget_mixamo_polyphemos_boss_tripo.py`).
  // ASSET-127'nin mesh'i, vertex grupları ve bind matrisleri bit birebir
  // korunuyor — yalnız kemik rotasyonları yazılıyor. ASSET-128'i (mesh'i
  // Mixamo iskeletine taşıma denemesi) mahveden şey tam olarak buydu:
  // ağırlık, çözüldüğü bind matrisi olmadan anlamsız (sahip: "klipler ve
  // hareketler çok kötü... berbat olmuş"). Bu sürüm hiç ağırlık taşımıyor,
  // o hata sınıfı yapısal olarak imkânsız.
  // Bakış yönü: model +X'e bakıyor, `GIANT_MESH_FACING` (-π/2) geçerli —
  // retarget da bu 90°'yi kendi ölçüp klipleri ona göre hizalıyor.
  // Şu an yalnız idle/walk oynatılıyor; run/sweep/slam/punch/roar dosyada
  // hazır duruyor ama boss faz tasarımı (@helix) yapılmadan bağlanmıyor.
  loadGltfBundle("assets/models/char_polyphemos_boss_03_anim.glb").then((bundle) => {
    const model = bundle.scene;
    // Tripo çıktısı ~0,85 birim yüksekliğinde normalize geliyor; eski
    // ASSET-098 placeholder'ı ise ~5 m'lik doğal ölçekteydi ve kod hiç
    // ölçeklemiyordu. Ölçek atlanırsa dev, oyuncudan (1,7 m) kısa bir cüce
    // olarak beliriyor (ölçümle yakalandı: giantWorldBox.y=0.85). Aynı
    // `fitGltfHeight` yardımcısı Doryseus'ta da kullanılıyor — tabanı y=0'a
    // oturtup XZ'de ortalıyor, yani `giant.position` sözleşmesi bozulmuyor.
    fitGltfHeight(model, GIANT_HEIGHT_M);
    model.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        o.castShadow = false; // primitif geçiş — gölge haritası yok
        giantMaterials.push(o.material);
      }
    });
    giant.add(model);
    const idleClip = bundle.animations.find((c) => c.name === "idle");
    const walkClip = bundle.animations.find((c) => c.name === "walk");
    if (idleClip && walkClip) {
      giantMixer = new THREE.AnimationMixer(model);
      giantIdleAction = giantMixer.clipAction(idleClip);
      giantWalkAction = giantMixer.clipAction(walkClip);
      giantWalkAction.timeScale =
        CYCLOPS_GIANT_SPEED / (GIANT_WALK_CLIP_HEIGHTS_PER_SEC * GIANT_HEIGHT_M); // ayak kayması düzeltmesi, bkz. sabitin üstündeki not
      giantIdleAction.play();
    } else {
      console.warn("[cyclopsStop] Polyphemos GLB missing idle/walk clips", bundle.animations.map((c) => c.name));
    }
  });

  // Rage attack telegraph — a flat ring decal on the floor, aRPG-style
  // ("hareketi önceden yuvarlaklarla gösterilmeli, dodge'layabilmesi için").
  // Hidden by default, positioned/scaled/faded only while a hit is pending
  // (see the "attack telegraph" block inside step()).
  const attackRing = new THREE.Mesh(
    new THREE.RingGeometry(CYCLOPS_ATTACK_RADIUS * 0.85, CYCLOPS_ATTACK_RADIUS, 32),
    new THREE.MeshBasicMaterial({ color: 0xff3322, transparent: true, opacity: 0.5, side: THREE.DoubleSide }),
  );
  attackRing.rotation.x = -Math.PI / 2;
  attackRing.visible = false;
  scene.add(attackRing);

  const input = new Input();
  input.attach(canvas);
  /** DEV-only override so the mechanic can be driven deterministically when
   * requestAnimationFrame is throttled (backgrounded/automated tab) instead
   * of waiting on real keyboard + wall-clock frames. See __CYCLOPS_DEBUG__
   * below — same idea as game.ts's __LOTOPHAGOI_TEST_HOOKS__.runSteps. */
  const manualMove = { x: 0, z: 0 };

  // ------------------------------------------------------------ K12 HUD
  // Primitive styling (plain CSS, no parchment/art-bible pass yet — that's
  // polish, comes after the mechanic itself is signed off), but the
  // DISCIPLINE is the real one, not a placeholder: DETECT and crush count
  // are never shown as numbers (P2 — "ölçek ekranın kendisidir", and the
  // crush cap is explicitly "ekranda gösterilmez" per tuning.md §12). The
  // delivery counter IS shown on purpose — unlike Lotus's forgetting meter,
  // this is a plain progress target, not the thing being hidden.
  const hud = document.createElement("div");
  hud.style.cssText =
    "position:fixed;top:14px;left:14px;color:#f3e6c8;font:600 14px system-ui,sans-serif;text-shadow:0 1px 3px rgba(0,0,0,.8);z-index:40;pointer-events:none;";
  document.body.appendChild(hud);

  const promptEl = document.createElement("div");
  promptEl.style.cssText =
    "position:fixed;left:50%;bottom:64px;transform:translateX(-50%);color:#f3e6c8;font:15px/1.4 system-ui,sans-serif;text-align:center;text-shadow:0 1px 4px rgba(0,0,0,.9);z-index:40;pointer-events:none;max-width:70vw;transition:opacity .4s;";
  document.body.appendChild(promptEl);

  const hideWarnEl = document.createElement("div");
  hideWarnEl.textContent = "Saklan!";
  hideWarnEl.style.cssText =
    "position:fixed;left:50%;top:14px;transform:translateX(-50%);color:#e8b0a0;font:700 16px system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;text-shadow:0 1px 4px rgba(0,0,0,.9);z-index:40;pointer-events:none;opacity:0;transition:opacity .4s;";
  document.body.appendChild(hideWarnEl);

  // ------------------------------------------------------- loss screen
  // Sahip (26 Ağu 2026): "ezilme 3/3 olunca KAYBETTIN, yeniden oyna ekranı
  // gelsin" — eskiden sessizce (bir toast mesajıyla) sıfırlanıyordu.
  // Primitif overlay (art-bible geçmedi henüz, salt işlevsel): step()
  // lostRun true iken tamamen duruyor (aşağıdaki erken return), sahne son
  // kare donuk kalıyor arkada — "yakalandığın an" görüntüsü kasıtlı.
  const lossOverlay = document.createElement("div");
  lossOverlay.style.cssText =
    "position:fixed;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:rgba(10,4,4,.82);z-index:60;";
  const lossTitle = document.createElement("div");
  lossTitle.textContent = "KAYBETTİN";
  lossTitle.style.cssText =
    "color:#e8574a;font:800 42px system-ui,sans-serif;letter-spacing:.06em;text-shadow:0 2px 8px rgba(0,0,0,.7);";
  const lossSub = document.createElement("div");
  lossSub.textContent = "Dev seni üç kez yakaladı.";
  lossSub.style.cssText = "color:#e8d8c8;font:16px system-ui,sans-serif;opacity:.85;";
  const lossBtn = document.createElement("button");
  lossBtn.textContent = "Yeniden Oyna";
  lossBtn.style.cssText =
    "padding:12px 28px;font:600 16px system-ui,sans-serif;color:#2a1a12;background:#e8c165;border:none;border-radius:6px;cursor:pointer;";
  lossBtn.addEventListener("click", () => resetRun());
  lossOverlay.append(lossTitle, lossSub, lossBtn);
  document.body.appendChild(lossOverlay);

  // ------------------------------------------------------- debug HUD (dev)
  // Kept alongside the real HUD above — useful while K5-K11 are still
  // being tuned. Not shown to a real player once this ships; small and
  // out of the way so it doesn't get confused for the real HUD.
  const debugEl = document.createElement("div");
  debugEl.style.cssText =
    "position:fixed;bottom:8px;left:8px;color:#9c9;font:10px monospace;background:rgba(0,0,0,.5);padding:6px;white-space:pre;z-index:50;pointer-events:none;opacity:.75;";
  document.body.appendChild(debugEl);

  // ------------------------------------------------------------- run state
  let phase: Phase = "out";
  let giantState: GiantState = "outside";
  let outWaitT = GIANT_OUT_WAIT_SECONDS;
  let sleepT = 0;
  /** wanderingPre/wanderingPost'ta yürünecek tek nokta — girişte rastgele
   * bir ara nokta (dolaşma hissi), uyandıktan sonra kapıya dönmeden önce
   * bir nokta daha. İkisi de aynı ağırlıklı dağılımdan (tuning.md §12.1). */
  let giantTarget: WanderTarget = { x: 0, z: 15 };
  /** wanderingPre/wanderingPost'ta kalan rastgele-nokta sayısı. */
  let wanderLegsLeft = 0;
  /** Yalnız HUD pulse animasyonu için — gerçek/faz zamanlayıcısı değil. */
  let simTime = 0;
  let detect = 0;
  let crushCount = 0;
  /** Bulundu test ederken (25 Ağu): bağışıklık penceresi yoktu — oyuncu
   * mağara ağzına ışınlanınca dev hâlâ o civarda geçiyorsa aynı anda/hemen
   * ardından ikinci bir onCaught() tetiklenip CRUSH_CAP'i haksızca hızla
   * tüketiyordu. Kısa bir dokunulmazlık süresi ekleniyor. */
  let crushGraceT = 0;
  const CRUSH_GRACE_SECONDS = 2.0;
  let delivered = 0;
  let carriedCount = 0;
  let message = "";
  let messageT = 0;
  /** true after the 3rd crush — step() freezes (see the early return at its
   * top), lossOverlay is shown, only resetRun() (via the button) clears it. */
  let lostRun = false;

  // ---------------------------------------------------------- dash / crawl
  let dashT = 0; // >0 while a dash burst is actively moving the player
  let dashCooldownT = 0;
  let dashDirX = 0;
  let dashDirZ = 1;
  /** son gerçek hareket yönü — dash tuşuna basılırken oyuncu duruyorsa
   * (input yok) hangi yöne atılacağını buradan alıyoruz. */
  let facingX = 0;
  let facingZ = 1;

  // ------------------------------------------------------------- rage/attack
  let rageT = 0;
  let rageStepT = 0; // "sarhoş adım" — bir sonraki rastgele mikro-hedefe kadar
  let rageAttackT = 0; // bir sonraki telgraf/vuruşa kadar
  let rageTarget: WanderTarget = { x: 0, z: 0 };
  /** raging bitince hangi wander akışına dönüleceği (finishWanderLeg'e iletiliyor). */
  let rageReturnState: "wanderingPre" | "wanderingPost" = "wanderingPre";
  let attackTelegraph: { x: number; z: number; t: number } | null = null;

  // ---------------------------------------------------------------- rune sırrı
  // "duvarlarda kazili runik harflerle TURK yazisi... devin odasinin kapisi
  // gelene kadar acilir" (sahip, 26 Ağu, sprint sonu fikri). T→Ü→R→K sırayla
  // dokunulunca İç nöy geçidi erkenden açılır ve oyuncu Boğaz B'yi geçene
  // kadar (normal dev-senkron mantığından bağımsız) açık kalır. Yanlış
  // sırada dokunma sıfırlar. `hintShown` bilerek resetRun()'da sıfırlanmıyor
  // — "oyun içinde sadece bir kere ipucu var" oyuncunun kendi bilgisi, run
  // sıfırlansa da unutulmuyor; `runeProgress`/`secretGateForcedOpen` ise her
  // denemede taze başlıyor (diğer her şeyle aynı "3/3'te her şey sıfırlanır"
  // disiplini).
  let runeProgress: string[] = [];
  let secretGateForcedOpen = false;
  let hintShown = false;

  function say(msg: string): void {
    message = msg;
    messageT = 3;
  }

  function doorOpen(): boolean {
    return phase !== "present";
  }

  function onCaught(): void {
    crushCount++;
    // D2/C2: carried items drop near the catch point, not destroyed.
    for (const it of cave.items) {
      if (!it.carried) continue;
      it.carried = false;
      const ang = Math.random() * Math.PI * 2;
      const r = Math.random() * CAUGHT_DROP_RADIUS;
      it.pos = { x: player.position.x + Math.cos(ang) * r, z: player.position.z + Math.sin(ang) * r };
      it.mesh.position.x = it.pos.x;
      it.mesh.position.z = it.pos.z;
      it.mesh.visible = true;
    }
    carriedCount = 0;
    detect = 0;
    crushGraceT = CRUSH_GRACE_SECONDS;
    if (crushCount >= CYCLOPS_CRUSH_CAP) {
      // Sahip (26 Ağu 2026): "3/3 olunca KAYBETTIN, yeniden oyna ekranı
      // gelsin" — eski davranış (sessiz sıfırlama + toast) bir hard-stop'a
      // yükseltildi. Respawn'a gerek yok, run zaten duruyor; item/ilerleme
      // sıfırlaması resetRun()'a taşındı (yeniden oyna basılana kadar).
      triggerLoss();
      return;
    }
    // Sahip (26 Ağu 2026, üçüncü tur): "dev beni bir kere ezdiğinde girişe
    // ışınlanıyorum. bunu ben sadece 3/3 olduğunda istiyorum." 1./2. ezilmede
    // artık HİÇ konum değişikliği yok — oyuncu tam yakalandığı yerde kalıyor,
    // yalnız `crushGraceT` (2 sn) bağışıklığıyla kendi ayaklarıyla uzaklaşma
    // şansı var. Işınlanma yalnız 3/3'te, ve o da otomatik değil: triggerLoss()
    // hiçbir yere taşımıyor (donmuş "yakalandığın an" karesi kalıyor), gerçek
    // konum sıfırlaması yalnız "Yeniden Oyna" tıklanınca resetRun() içinde olur.
    say(`Ezildin (${crushCount}/${CYCLOPS_CRUSH_CAP})${crushCount === 2 ? " — bir daha kaldıramazsın." : ""}`);
  }

  function triggerLoss(): void {
    lostRun = true;
    lossOverlay.style.display = "flex";
  }

  /** Yeniden Oyna — tüm run durumunu sıfırlar, overlay'i kapatır, step() döngüsü
   * kaldığı yerden (sıfırlanmış haliyle) devam eder. Sayfa reload YOK — sahne/
   * kamera/renderer'ı yeniden kurmaya gerek yok, sadece oynanış durumu. */
  function resetRun(): void {
    phase = "out";
    giantState = "outside";
    outWaitT = GIANT_OUT_WAIT_SECONDS;
    sleepT = 0;
    wanderLegsLeft = 0;
    detect = 0;
    crushCount = 0;
    crushGraceT = 0;
    delivered = 0;
    carriedCount = 0;
    message = "";
    messageT = 0;
    runeProgress = [];
    secretGateForcedOpen = false; // hintShown BİLEREK sıfırlanmıyor, bkz. state notu
    dashT = 0;
    dashCooldownT = 0;
    rageT = 0;
    rageStepT = 0;
    rageAttackT = 0;
    attackTelegraph = null;
    attackRing.visible = false;
    setGiantRageTint(false);
    giant.position.set(0, 0, -100);
    giant.rotation.y = 0;
    giantFacing = 0;
    giant.visible = false;
    cave.setDoorOpen(true);
    cave.setInnerGateOpen(false);
    // `ambient`/`hemi` artık hiç değişmiyor (bkz. "dışarısı sabit aydınlık"
    // notu aşağıda) — burada yeniden atamaya gerek yok.
    player.position.set(0, 0, -46); // koy üç kez uzadı, spawn D=-18→-26→-36→-46
    playerFacing = 0;
    // Bulundu (kendi testimde, 26 Ağu): rig.snap yalnız kurulumda çağrılıyordu
    // — resetRun() sonrası kamera KAYBETTIN anındaki (mağara içi) konumundan
    // gemi spawn'ına yavaşça sürünerek geliyordu, gerçek oyuncu için de
    // aynı sarsıcı gecikme olurdu, salt bir test artefaktı değil.
    rig.snap(player.position);
    for (const it of cave.items) {
      it.carried = false;
      it.delivered = false;
      it.pos = { ...it.home };
      it.mesh.position.x = it.home.x;
      it.mesh.position.z = it.home.z;
      it.mesh.visible = true;
    }
    lostRun = false;
    lossOverlay.style.display = "none";
  }

  function step(dt: number): void {
    // KAYBETTIN ekranı açıkken tüm simülasyon donuyor — yalnız Yeniden Oyna
    // butonu (resetRun) devam ettirebilir. input.endFrame() yine de
    // çağrılıyor ki overlay'in arkasında sızan bir tuş sonraki step'e taşınmasın.
    if (lostRun) {
      input.endFrame();
      return;
    }
    simTime += dt;
    if (crushGraceT > 0) crushGraceT = Math.max(0, crushGraceT - dt);

    // -------------------------------------------------- giant state machine
    // walkGiantTowards: gerçek yürüyüş, ışınlanma yok. Vardığında true döner.
    function walkGiantTowards(target: WanderTarget, speed: number = CYCLOPS_GIANT_SPEED): boolean {
      playGiantAnim("walk");
      const dx = target.x - giant.position.x;
      const dz = target.z - giant.position.z;
      const dist = Math.hypot(dx, dz);
      // Bulundu (26 Ağu, "dev'in hareketleri yok"): dev hiçbir zaman
      // döndürülmüyordu — yürüme yönüne bakmadan kayıyordu, animasyon
      // eksikliğinden daha göze batan bir sorundu. Kaynak modelin kendi
      // "koşu" klibi güvenilir değildi (root bone'da açıklanamayan büyük
      // bir Z ofseti — tek bozuk kare değil, sürekli garip veri; ad hoc
      // patch riskini almadık, bkz. agent memory `blender-rig-fix-lessons`).
      // Bunun yerine: gerçek yön dönüşü (game.ts'in facing deseniyle aynı
      // üstel yumuşatma) + prosedürel bir "stomp" sekmesi — düşük risk,
      // sıfır asset bağımlılığı.
      if (dist > 0.01) {
        const targetFacing = Math.atan2(dx, dz);
        let fd = targetFacing - giantFacing;
        while (fd > Math.PI) fd -= Math.PI * 2;
        while (fd < -Math.PI) fd += Math.PI * 2;
        giantFacing += fd * (1 - Math.exp(-dt / GIANT_TURN_SMOOTH));
        giant.rotation.y = giantFacing + GIANT_MESH_FACING;
      }
      // heightAt() taban + üstüne prosedürel "stomp" sekmesi — dev entering/
      // exiting sırasında patikadan geçtiğinde (D -8..0) zemine gömülmesin.
      giant.position.y = heightAt(giant.position.z) + Math.abs(Math.sin(simTime * GIANT_BOB_FREQ)) * GIANT_BOB_AMPLITUDE;
      const step = speed * dt;
      if (dist <= step) {
        giant.position.x = target.x;
        giant.position.z = target.z;
        return true;
      }
      giant.position.x += (dx / dist) * step;
      giant.position.z += (dz / dist) * step;
      return false;
    }

    // "wanderingPre/Post bir hedefe varınca ne olur" ortak kuyruğu — raging
    // dönüşünde de aynı yoldan devam edilsin diye ayrı bir fonksiyon.
    function finishWanderLeg(continueState: GiantState, doneState: GiantState): void {
      wanderLegsLeft--;
      if (wanderLegsLeft > 0) {
        giantTarget = pickWanderTarget();
        giantState = continueState;
      } else {
        giantState = doneState;
      }
    }

    // "Dev bazen rage geçirecek kendi odasında, sarhoş gibi hareket edecek."
    // Yalnız İç nöy'de, yalnız uyanıkken (sleeping'e karışmıyor — "uyuyan
    // dev izlemiyor" kuralı korunuyor).
    function enterRage(returnState: "wanderingPre" | "wanderingPost"): void {
      rageReturnState = returnState;
      rageT = CYCLOPS_RAGE_DURATION;
      rageStepT = 0;
      rageAttackT = CYCLOPS_ATTACK_INTERVAL * 0.5; // ilk telgraf hemen değil, kısa bir gecikmeyle
      attackTelegraph = null;
      setGiantRageTint(true);
      giantState = "raging";
      say("Dev çıldırdı!");
    }

    if (giantState === "outside") {
      phase = "out";
      giant.visible = false;
      outWaitT -= dt;
      if (outWaitT <= 0) {
        giantState = "entering";
        giant.position.set(0, 0, GIANT_ENTER_START_Z);
        giant.visible = true;
        say("Dışarıdan bir gürleme yaklaşıyor…");
      }
    } else if (giantState === "entering") {
      // Eşiği (z=0) geçene kadar kapı hâlâ açık — RETURN telgrafı, toplama
      // hâlâ mümkün. Eşiği geçince kapı gerçekten kapanıyor.
      phase = "return";
      if (walkGiantTowards({ x: 0, z: 0 })) {
        cave.setDoorOpen(false);
        // Sahip (27 Ağu, on dokuzuncu geri bildirim): "dışarısı sabit
        // aydınlık olmalıdır" — `ambient`/`hemi` TÜM sahneyi kaplayan
        // global ışıklar, kapı durumuna göre artık değişmiyor (bkz.
        // cyclopsCave.ts'teki hearthLight/torchLight titreşim notu —
        // "içeride yanıp sönme" ihtiyacı artık yalnız o yerel ışıklarla
        // karşılanıyor).
        say("Kapı kapandı.");
        wanderLegsLeft = 2; // "bir süre random dolaşıyor" — 2 rastgele nokta
        giantTarget = pickWanderTarget();
        giantState = "wanderingPre";
      }
    } else if (giantState === "wanderingPre") {
      phase = "present";
      if (walkGiantTowards(giantTarget)) {
        if (roomIdAt(giant.position.z) === "inner" && Math.random() < CYCLOPS_RAGE_CHANCE) {
          enterRage("wanderingPre");
        } else {
          // "Dev hep kendi yatağına yatacak" — rastgele dolaşma bitince
          // son adım artık başka bir rastgele oda değil, hep aynı yatak.
          finishWanderLeg("wanderingPre", "headingToBed");
        }
      }
    } else if (giantState === "headingToBed") {
      phase = "present";
      if (walkGiantTowards(GIANT_BED)) {
        sleepT = GIANT_SLEEP_SECONDS;
        giantState = "sleeping";
        playGiantAnim("idle"); // yatarken "walk" klibinde donmuş kalmasın
      }
    } else if (giantState === "sleeping") {
      phase = "present";
      // "Yatarken çok fazla hareket edecek" — huzursuz, ama yataktan
      // ayrılmayan küçük bir titreşim (iki farklı frekans üst üste).
      giant.position.x = GIANT_BED.x + Math.sin(simTime * 1.3) * 0.4 + Math.sin(simTime * 3.7) * 0.15;
      giant.position.z = GIANT_BED.z + Math.cos(simTime * 1.7) * 0.35 + Math.cos(simTime * 4.1) * 0.12;
      giant.position.y = 0; // walkGiantTowards'ın stomp bob'u yatarken kalmasın
      sleepT -= dt;
      if (sleepT <= 0) {
        wanderLegsLeft = 1; // uyanınca kapıya dönmeden önce bir tur daha
        giantTarget = pickWanderTarget();
        giantState = "wanderingPost";
        say("Dev uyandı.");
      }
    } else if (giantState === "wanderingPost") {
      phase = "present";
      if (walkGiantTowards(giantTarget)) {
        if (roomIdAt(giant.position.z) === "inner" && Math.random() < CYCLOPS_RAGE_CHANCE) {
          enterRage("wanderingPost");
        } else {
          finishWanderLeg("wanderingPost", "exiting");
        }
      }
    } else if (giantState === "raging") {
      phase = "present";
      rageT -= dt;
      rageStepT -= dt;
      rageAttackT -= dt;
      // "Sarhoş gibi hareket edecek" — düzenli bir dolaşma hedefi değil, sık
      // sık değişen küçük rastgele mikro-adımlar, normalden hızlı.
      if (rageStepT <= 0) {
        const b = roomBounds("inner");
        const marginX = 1.0;
        const marginZ = 1.5;
        const halfX = Number.isFinite(b.halfWidth) ? Math.max(0.1, b.halfWidth - marginX) : 3;
        rageTarget = {
          x: (Math.random() * 2 - 1) * halfX,
          z: b.dMin + marginZ + Math.random() * Math.max(0.1, b.dMax - b.dMin - marginZ * 2),
        };
        rageStepT = 0.4 + Math.random() * 0.5;
      }
      walkGiantTowards(rageTarget, CYCLOPS_GIANT_SPEED * CYCLOPS_RAGE_SPEED_MULT);
      // aRPG-tarzı telgraf: bir vuruş beklerken yeni bir tane başlatma —
      // önce ekli olan çözülsün (bkz. "attack telegraph" bloğu aşağıda).
      if (rageAttackT <= 0 && !attackTelegraph) {
        // "Güvenli alanları da kapsasın, her yere vurabilsin" — hedef
        // oyuncunun GERÇEK konumu, devin kendi konumundan bağımsız (bkz.
        // CYCLOPS_ATTACK_ROOM_MARGIN_*'in üstündeki not). Yalnızca İç nöy'ün
        // kendi sınırlarına kırpılıyor ki oyuncu odayı tamamen terk etmişse
        // (mağara dışı, depo, ağıllar…) hâlâ asla isabet almasın — bu, ilk
        // versiyonda bulduğum "mağara dışından bile vuruluyorsun" hatasının
        // düzeltmesini korurken, oda İÇİNDEKİ her köşeyi (gizlenme
        // girintileri dahil) gerçek tehdit altında bırakıyor.
        const ib = roomBounds("inner");
        const ihalfX = Number.isFinite(ib.halfWidth) ? Math.max(0.1, ib.halfWidth - CYCLOPS_ATTACK_ROOM_MARGIN_X) : 4;
        const tx = Math.max(-ihalfX, Math.min(ihalfX, player.position.x));
        const tz = Math.max(
          ib.dMin + CYCLOPS_ATTACK_ROOM_MARGIN_Z,
          Math.min(ib.dMax - CYCLOPS_ATTACK_ROOM_MARGIN_Z, player.position.z),
        );
        attackTelegraph = { x: tx, z: tz, t: CYCLOPS_ATTACK_TELEGRAPH_SECONDS };
        rageAttackT = CYCLOPS_ATTACK_INTERVAL;
      }
      if (rageT <= 0 && !attackTelegraph) {
        setGiantRageTint(false);
        finishWanderLeg(rageReturnState, rageReturnState === "wanderingPre" ? "headingToBed" : "exiting");
      }
    } else {
      // exiting — eşiğe (z=0) kadar hâlâ "present" (kapı hâlâ kapalı),
      // eşiği geçince kapıyı kendi açıyor, sonra dışarı yürüyüp kayboluyor.
      phase = "present";
      if (giant.position.z > 0) {
        walkGiantTowards({ x: 0, z: 0 });
        if (giant.position.z <= 0) {
          cave.setDoorOpen(true);
          say("Kapı açıldı.");
          phase = "out";
        }
      } else {
        phase = "out";
        if (walkGiantTowards({ x: 0, z: GIANT_OUTSIDE_Z })) {
          giant.visible = false;
          giantState = "outside";
          outWaitT = GIANT_OUT_WAIT_SECONDS;
        }
      }
    }

    // -------------------------------------------------------- inner gate
    // "Kapısı devle birlikte açılabilecek" — İç nöy'ün kendi geçidi (Boğaz
    // B), dev o aralıktan geçerken açık, geri kalan her zaman kapalı.
    // Oyuncuyu engellemiyor (ana kapı gibi) — yalnız görsel/senkron.
    // `secretGateForcedOpen`: rune sırrı çözülünce aynı geçit erkenden açılır
    // — "kapısı ... gelene kadar açılır" — oyuncu Boğaz B'yi geçene kadar.
    if (secretGateForcedOpen && player.position.z > GORGE_B_MAX) secretGateForcedOpen = false;
    cave.setInnerGateOpen(
      secretGateForcedOpen || (giant.visible && giant.position.z >= GORGE_B_MIN && giant.position.z <= GORGE_B_MAX),
    );

    // -------------------------------------------------- attack telegraph
    // aRPG-tarzı: yuvarlak belirir, büyür/parlaklaşır, süre dolunca isabet
    // kontrolü yapılır. Oyuncu bu pencerede (CYCLOPS_ATTACK_TELEGRAPH_SECONDS)
    // dash'le veya yürüyerek yuvarlağın dışına çıkabilir.
    if (attackTelegraph) {
      attackTelegraph.t -= dt;
      const p = 1 - Math.max(0, attackTelegraph.t) / CYCLOPS_ATTACK_TELEGRAPH_SECONDS;
      attackRing.visible = true;
      attackRing.position.set(attackTelegraph.x, 0.05, attackTelegraph.z);
      attackRing.scale.setScalar(0.55 + 0.45 * p);
      (attackRing.material as THREE.MeshBasicMaterial).opacity = 0.3 + 0.5 * p;
      if (attackTelegraph.t <= 0) {
        const dist = Math.hypot(player.position.x - attackTelegraph.x, player.position.z - attackTelegraph.z);
        attackTelegraph = null;
        attackRing.visible = false;
        if (dist < CYCLOPS_ATTACK_RADIUS && crushGraceT <= 0) {
          say("Dev'in vuruşu isabet etti!");
          onCaught();
        }
      }
    } else {
      attackRing.visible = false;
    }

    // ------------------------------------------------------- camera look
    const sens = input.touchActive ? CAMERA.touchSens : CAMERA.mouseSens;
    const md = input.mouseDelta();
    rig.rotate(md.x * sens, md.y * sens);
    rig.rotate(input.yawKeys() * CAMERA.keySens, input.pitchKeys() * CAMERA.keySens * 0.6);
    // Sahip (26 Ağu 2026): "kamera karaktere bir yükseklikte sabitlenmeli ve
    // zoom in/out yapılamaz olmalı" — Lotus'un mouse-wheel zoom'u burada
    // bilerek yok. `CameraRig.desired()`'ın kendi yükseklik formülü zaten
    // `CAMERA.height * (boom/CAMERA.dist)` — boom hiç değişmeyince (zoomDist
    // hep `startDist`'te kalır) yükseklik de karaktere göre sabit kalıyor,
    // ayrı bir sabitleme kodu gerekmiyor.

    // ------------------------------------------------------------ input
    // manualMove (DEV hook) bypasses camera-relative transform on purpose —
    // deterministic tests shouldn't depend on wherever yaw happens to be.
    rig.forward(fwd);
    rig.right(rightV);
    const usingManual = manualMove.x !== 0 || manualMove.z !== 0;
    let mx: number;
    let mz: number;
    if (usingManual) {
      mx = manualMove.x;
      mz = manualMove.z;
    } else {
      const wish = fwd.clone().multiplyScalar(input.moveZ()).addScaledVector(rightV, input.moveX());
      mx = wish.x;
      mz = wish.z;
    }
    const moving = Math.abs(mx) > 0.05 || Math.abs(mz) > 0.05;
    if (moving) {
      const len = Math.hypot(mx, mz) || 1;
      facingX = mx / len;
      facingZ = mz / len;
    }

    // -------------------------------------------------------------- dash
    // "dash movement da olacak" — tek atılımlık hızlı hamle, dodge amaçlı
    // (rage telgraflarından kaçmak için asıl kullanım yeri). Yön: hareket
    // ediliyorsa o yön, duruyorsa son bakılan/hareket edilen yön.
    if (dashCooldownT > 0) dashCooldownT = Math.max(0, dashCooldownT - dt);
    if (dashT > 0) dashT = Math.max(0, dashT - dt);
    if (input.dash && dashCooldownT <= 0 && dashT <= 0) {
      dashDirX = moving ? facingX : facingX || 0;
      dashDirZ = moving ? facingZ : facingZ || 1;
      dashT = DASH_DURATION;
      dashCooldownT = DASH_COOLDOWN;
    }

    // ------------------------------------------------------------- crawl
    // "yerde sürünme" — hem yavaşlatan hem de gizleyen bir duruş (bkz. DETECT
    // bloğundaki CRAWL_DETECT_MULT). Dash sırasında anlamsız, o yüzden kapalı.
    const crawling = input.crawlHeld && dashT <= 0;
    player.scale.y = crawling ? 0.5 : 1;

    if (dashT > 0) {
      const burstSpeed = DASH_DISTANCE / DASH_DURATION;
      player.position.x += dashDirX * burstSpeed * dt;
      player.position.z += dashDirZ * burstSpeed * dt;
    } else if (moving) {
      const speed = PLAYER_SPEED * (crawling ? CRAWL_SPEED_MULT : 1);
      player.position.x += facingX * speed * dt;
      player.position.z += facingZ * speed * dt;
    }
    const hw = corridorHalfWidthAt(player.position.z);
    if (Number.isFinite(hw)) {
      player.position.x = Math.max(-hw + PLAYER_RADIUS, Math.min(hw - PLAYER_RADIUS, player.position.x));
    }
    player.position.z = Math.min(64.5, player.position.z);
    // 28 Ağu landform: koy artık dikdörtgen değil — yürünebilir alan iki
    // organik eğrinin arasında (`shoreLineZ` deniz tarafı, `cliffFootZ`
    // kayalık tarafı). Kelepçeler Z ekseninde "duvar boyunca kayma" gibi
    // davranıyor: kıyıya/kayalığa doğru çapraz yürüyüş, oyuncuyu geri
    // itmek yerine sınır eğrisi boyunca kaydırıyor.
    if (player.position.z < 0) {
      const shoreLim = shoreLineZ(player.position.x) + 1.1;
      if (player.position.z < shoreLim) player.position.z = shoreLim;
      // Kapı boğazı (|x|<8) muaf — orada koridor kelepçesi devralıyor ve
      // taban çizgisi zaten kapının arkasında (z≈+1).
      if (Math.abs(player.position.x) >= 8) {
        const footLim = cliffFootZ(player.position.x) - 1.0;
        if (player.position.z > footLim) player.position.z = footLim;
      }
    }
    // Sahip (27 Ağu, on sekizinci geri bildirim): "karakter ve koyunlar ve
    // çimenler zeminin altında kalıyor." Kök neden: burada hâlâ düz
    // `heightAt(z)` kullanılıyordu — X'i hiç bilmiyordu. Genişletilmiş
    // adanın dış kesimi (|x|>18) görsel olarak `groundHeightAt`'in taban
    // yükseltmesini (+0,35 m'ye kadar) kullanıyor (bkz. cyclopsCave.ts) —
    // oyuncu oraya yürüyünce eski kod onu görsel zeminin ALTINDA
    // bırakıyordu. Aynı, tek paylaşılan fonksiyona geçildi.
    player.position.y = groundHeightAt(player.position.x, player.position.z); // koy/patika yokuşu
    // Kabuk yalnız eşiğe yaklaşınca render edilir (bkz. cyclopsCave.ts,
    // `setShellVisible` notu — dıştan BackSide sızıntısı). Eşik -3:
    // oyuncu kapının hemen önündeyken kabuk çoktan görünür, geçişte
    // hiçbir "pat diye belirme" yakalanmıyor (kapı açıklığı o mesafede
    // tüm kadrajı dolduruyor).
    cave.setShellVisible(player.position.z > -3);

    // ------------------------------------------------------- player rig
    // game.ts'in aynı deseni (facing + SAILOR.meshFacing, üstel yumuşatma) —
    // Cyclops'un kendi "run" tuşu yok (Shift dash'e ayrıldı), o yüzden
    // walk/idle yeterli, run klibi hiç seçilmiyor.
    if (moving || dashT > 0) {
      const dirX = dashT > 0 ? dashDirX : facingX;
      const dirZ = dashT > 0 ? dashDirZ : facingZ;
      const targetFacing = Math.atan2(dirX, dirZ);
      let fd = targetFacing - playerFacing;
      while (fd > Math.PI) fd -= Math.PI * 2;
      while (fd < -Math.PI) fd += Math.PI * 2;
      playerFacing += fd * (1 - Math.exp(-dt / PLAYER.turnSmooth));
    }
    player.rotation.y = playerFacing + SAILOR.meshFacing;
    if (playerActor) {
      playerActor.play(moving || dashT > 0 ? "walk" : "idle");
      playerActor.update(dt);
    }
    giantMixer?.update(dt);

    // ASSET-096 — ocak kor sıçraması, ~6/s, sabit hafif rastgele aralıkla.
    emberSpawnT -= dt;
    if (emberSpawnT <= 0) {
      emberSpawnT = 0.12 + Math.random() * 0.08;
      hearthEmbers.spawn(
        new THREE.Vector3(HEARTH_POS.x, 0.55, HEARTH_POS.z),
        0xeeae6a,
        2,
        0.6,
      );
    }
    hearthEmbers.update(dt);
    cave.update(simTime, dt); // çim/saz rüzgâr sallanması + koyun dolaşma AI'ı (dt hareket için)

    // Sea's own hull/foam-wake uniforms default to Lotus's SHIP.pos if not
    // given — harmless here since Cyclops has no ship, but parked far
    // outside the visible patch anyway so the wake shader never draws
    // anything near the cove. (The actual white blob seen in-screenshot
    // was the Lotus lagoon disc, fixed via buildSea({ includeLagoon: false })
    // above — this hull parking is unrelated, kept as cheap insurance.)
    sea.update(simTime, new THREE.Vector3(0, 0, -400), 0);

    // -------------------------------------------------------------- crush
    // giant.visible (fiziksel varlığı), phase==="present" değil — dev artık
    // gerçekten yürüyerek girip çıktığı için girerken/çıkarken de (RETURN/
    // OUT'a dönerken hâlâ görünürken) çarpışmak fiziksel olarak mümkün.
    if (crushGraceT <= 0 && giant.visible) {
      const dist = Math.hypot(player.position.x - giant.position.x, player.position.z - giant.position.z);
      if (dist < CYCLOPS_CRUSH_RADIUS) onCaught();
    }
    if (lostRun) return; // onCaught() yukarıda KAYBETTIN'i tetiklemiş olabilir

    // -------------------------------------------------------------- DETECT
    // Bulundu test ederken (25 Ağu): doorGlobal(z) negatif z (koy/patika,
    // mağara dışı) için de 1'e doğru clamp'leniyordu, yani oyuncu gemideyken
    // bile DETECT birikiyordu. Algılanma yalnız mağara içinde (z>=0, eşikten
    // itibaren) anlamlı — dışarısı hiçbir zaman risk taşımaz.
    if (crushGraceT <= 0 && phase !== "out" && player.position.z >= 0) {
      const room = roomIdAt(player.position.z);
      const inHearth =
        Math.hypot(player.position.x - HEARTH_POS.x, player.position.z - HEARTH_POS.z) <
        cave.hearthLight.distance;
      const inTorch =
        Math.hypot(player.position.x - TORCH_POS.x, player.position.z - TORCH_POS.z) < cave.torchLight.distance;
      const lit = inHearth || inTorch || (doorOpen() && doorGlobal(player.position.z) >= CYCLOPS_DOOR_LIT_THRESHOLD);
      let rate = lit ? (moving ? DETECT_RATE_LIT_MOVING : DETECT_RATE_LIT_STILL) : moving ? DETECT_RATE_SHADOW_MOVING : DETECT_RATE_SHADOW_STILL;
      if (phase === "return") rate *= CYCLOPS_RETURN_MULTIPLIER;
      if (phase === "present" && (room === "pens" || room === "inner")) rate *= CYCLOPS_PRESENT_MULTIPLIER;
      // "Yerleştikten (uyuduktan) sonra düşer — uyuyan dev izlemiyor"
      // (tuning.md §12.1) — giantSettled tekil bayrağının yerini giantState
      // aldı, "sleeping" dışındaki her state hareket halinde demek.
      if (giant.visible && giantState !== "sleeping") {
        const gDist = Math.hypot(player.position.x - giant.position.x, player.position.z - giant.position.z);
        if (gDist < CYCLOPS_GIANT_PROXIMITY_RADIUS) rate *= CYCLOPS_PROXIMITY_MULTIPLIER;
      }
      // "yerde sürünme gibi" — asıl mekanik fayda burada: gizlenirken
      // birikim çok daha yavaş.
      if (crawling) rate *= CRAWL_DETECT_MULT;
      if (rate > 0) detect = Math.min(DETECT_MAX, detect + rate * dt);
      else detect = Math.max(0, detect - DETECT_DECAY * dt);
      if (detect >= DETECT_MAX) onCaught();
    }
    if (lostRun) return; // DETECT_MAX'a değip onCaught() KAYBETTIN'i tetiklemiş olabilir

    // -------------------------------------------------------------- pickup
    if (input.interact && doorOpen()) {
      for (const it of cave.items) {
        if (it.carried || it.delivered || !it.mesh.visible) continue;
        if (carriedCount >= CYCLOPS_CARRY_CAP) break;
        const d = Math.hypot(player.position.x - it.pos.x, player.position.z - it.pos.z);
        if (d < 1.2) {
          it.carried = true;
          carriedCount++;
          it.mesh.visible = false;
          say(`${it.kind === "cheese" ? "Peynir" : "Şarap tulumu"} alındı (${carriedCount}/${CYCLOPS_CARRY_CAP})`);
          break;
        }
      }
    }

    // --------------------------------------------------------- rune sırrı
    // Tek ipucu, oyun boyunca bir kez — Depo'ya ilk girişte belli belirsiz
    // bir cümle, ne olduğunu asla açıklamıyor.
    if (!hintShown && roomIdAt(player.position.z) === "depot") {
      hintShown = true;
      say("Taşlarda tuhaf, kazınmış işaretler fark ediyorsun…");
    }
    // Sıra (E ile, kapı durumundan bağımsız — devin varlığı riski artırır
    // ama sırrı engellemez, "gizli trik" ancak öyle bir şey olabilir).
    if (input.interact) {
      for (const r of cave.runes) {
        const d = Math.hypot(player.position.x - r.x, player.position.z - r.z);
        if (d >= RUNE_INTERACT_RADIUS) continue;
        const nextExpected = RUNE_SEQUENCE[runeProgress.length];
        if (r.letter === nextExpected) {
          runeProgress.push(r.letter);
          if (runeProgress.length === RUNE_SEQUENCE.length) {
            secretGateForcedOpen = true;
            runeProgress = [];
            say("Taş gıcırdayarak yerinden oynuyor…");
          }
        } else if (r.letter === RUNE_SEQUENCE[0]) {
          runeProgress = [r.letter]; // yanlış sıradan sonra baştan başlamak da mümkün
        } else {
          runeProgress = [];
        }
        break;
      }
    }

    // ------------------------------------------------------------ delivery
    if (carriedCount > 0 && player.position.z <= -15) {
      for (const it of cave.items) {
        if (!it.carried) continue;
        it.carried = false;
        it.delivered = true;
        delivered++;
      }
      carriedCount = 0;
      if (delivered >= CYCLOPS_ITEM_TARGET) say(`Hedef tamam: ${delivered}/${CYCLOPS_ITEM_TARGET} — durak bitti!`);
      else say(`Gemiye teslim: ${delivered}/${CYCLOPS_ITEM_TARGET}`);
    }

    // -------------------------------------------------------------- camera
    rig.update(player.position, dt);
    playerLight.position.set(player.position.x, player.position.y + 1.4, player.position.z);
    // Sky sphere is camera-centered (same convention as stage.ts) — copy
    // AFTER rig.update() so it uses this frame's final camera position.
    skyMesh.position.copy(camera.position);
    // 28 Ağu, sahip: "daha radikal bir çözüm lazım, tam bir ada görünümü ve
    // sonsuzluk hissi." Uzak-tepe halkası (`cave.horizonGroup`) artık kova
    // etrafına elle iğnelenmiş sonlu kopyalar yerine AYNI sky-sphere
    // tekniğiyle kamerayı takip ediyor — halkaya olan mesafe kamera nereye
    // giderse gitsin her yönde hep sabit (~310 m), hem hiçbir açıda boşluk
    // kalmıyor hem de adanın kendi ~110 m'lik yarısına asla giremiyor
    // (bkz. `cyclopsCave.ts`, `buildDistantHills` çağrısının hemen üstündeki
    // not). Sky sphere'in aksine yalnız X/Z alınıyor DEĞİL — tam pozisyon
    // kopyalanıyor (Y dahil), tıpkı skyMesh gibi, ki ufuk çizgisi kamera
    // yüksekliğiyle birlikte doğru hizada kalsın.
    cave.horizonGroup.position.copy(camera.position);

    // Güneş yönlü bir ışık — konumu anlamsız, YÖNÜ anlamlı; ama gölge
    // kamerası ortografik ve sonlu, bu yüzden Lotus'un `placeSunLight()`
    // deseniyle her karede kameranın üstüne taşınıyor ki gölge hacmi hep
    // oyuncunun çevresini kapsasın (yoksa kova boyunca yürürken gölgeler
    // aniden kesilir).
    sun.target.position.set(camera.position.x, 0, camera.position.z);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 120);
    sun.target.updateMatrixWorld();
    // Dış/iç ışık profili karışımı — eşiğin (D=0) iki yanında yumuşak geçiş.
    // Dışarıda: sert güneş + zayıf dolgu (referansın kontrastı). İçeride:
    // güneş neredeyse yok + güçlü yönsüz dolgu (oynanış görünürlüğü, 25 Ağu).
    {
      const inside = THREE.MathUtils.smoothstep(player.position.z, -7, 6);
      ambient.intensity = THREE.MathUtils.lerp(OUTDOOR_AMBIENT, INDOOR_AMBIENT, inside);
      hemi.intensity = THREE.MathUtils.lerp(OUTDOOR_HEMI, INDOOR_HEMI, inside);
      // Sahip (28 Ağu): "karakterin parlamasını normal haline getir."
      // Kök neden: `playerLight` bir "meşale taşıyorsun" varsayımı — mağara
      // içinde yakın çevreyi görmek için ŞART, ama dışarıda hiç kısılmıyordu.
      // Açık havada zaten sert bir güneş (2,3) + dolgu varken 14 m menzilli,
      // 1,6 yoğunluklu sıcak bir nokta ışığı tam karakterin üstünde durup onu
      // yıkıyordu — sahnenin geri kalanı doğru pozlanmışken karakter tek
      // başına parlıyordu. Diğer üç ışıkla aynı `inside` karışımına bağlandı:
      // dışarıda neredeyse yok, mağarada tam güçte.
      playerLight.intensity = THREE.MathUtils.lerp(OUTDOOR_PLAYER_LIGHT, INDOOR_PLAYER_LIGHT, inside);
      sun.intensity = THREE.MathUtils.lerp(OUTDOOR_SUN, INDOOR_SUN, inside);
      // Oyuncu tamamen içerideyken gölge haritasını hesaplamanın hiçbir
      // görsel karşılığı yok (güneş zaten 0.35'e inmiş) — bedava kare süresi.
      sun.castShadow = inside < 0.98;
      // Fog da aynı `inside` karışımını takip ediyor (bkz. yukarıdaki
      // FOG_* notu): dışarıda açık gökyüzü pusu ufku kapatıyor, içeride
      // koyu/yoğun bir pus tünel derinliğini taşıyor.
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(FOG_COLOR_OUTDOOR).lerp(FOG_COLOR_INDOOR, inside);
        scene.fog.density = THREE.MathUtils.lerp(FOG_DENSITY_OUTDOOR, FOG_DENSITY_INDOOR, inside);
      }
    }

    if (messageT > 0) messageT -= dt;

    // -------------------------------------------------------------- K12 HUD
    hud.innerHTML =
      `<div style="font-size:17px;letter-spacing:.02em;">Azık — gemiye teslim: ${delivered} / ${CYCLOPS_ITEM_TARGET}</div>` +
      `<div style="opacity:.85;margin-top:2px;">Taşınan: ${carriedCount} / ${CYCLOPS_CARRY_CAP}</div>`;
    promptEl.textContent = message;
    promptEl.style.opacity = messageT > 0 ? "1" : "0";
    // Present = the real hide-or-be-caught window, pulses harder than the
    // return telegraph. No countdown number shown either way (P2).
    if (phase === "present") {
      hideWarnEl.style.opacity = String(0.55 + 0.45 * Math.sin(simTime * 4));
    } else if (phase === "return") {
      hideWarnEl.style.opacity = "0.6";
    } else {
      hideWarnEl.style.opacity = "0";
    }

    // --------------------------------------------------------- debug (dev)
    debugEl.textContent =
      `[dev] faz:${phase} dev:${giantState}  oda:${roomIdAt(player.position.z)}  DETECT:${detect.toFixed(0)}/${DETECT_MAX}  ezilme:${crushCount}/${CYCLOPS_CRUSH_CAP}\n` +
      `dash:${dashCooldownT.toFixed(1)}  crawl:${crawling}  rage:${giantState === "raging" ? rageT.toFixed(1) : "-"}  telgraf:${attackTelegraph ? attackTelegraph.t.toFixed(1) : "-"}`;

    input.endFrame();
  }

  function onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);
  onResize();

  let last = performance.now();
  function tick(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  document.getElementById("loading")?.classList.add("gone");

  // DEV-only, dead-code-eliminated from prod (same seam as game.ts's
  // __LOTOPHAGOI_TEST_HOOKS__, import.meta.env.DEV is statically false in
  // build). Lets scripts/browser automation step the sim without depending
  // on real rAF timing (throttled in a backgrounded/automated tab).
  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__CYCLOPS_DEBUG__ = {
      step: (dt = 1 / 60, n = 1) => {
        for (let i = 0; i < n; i++) step(dt);
      },
      render: () => renderer.render(scene, camera),
      rotateCamera: (yaw: number, pitch = 0) => rig.rotate(yaw, pitch),
      cameraPos: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
      // 28 Ağu, sahip'in "turuncu sızıntı" raporunu ekran-pikseline kadar
      // izlemek için — geçici tanı aracı, DEV-only. nx/ny -1..1 NDC.
      // Tanı: isim alt-dizesine göre görünürlük kapat/aç — "şu siyah
      // dikdörtgen hangi mesh?" sınıfı soruları ikiye-bölme yöntemiyle
      // saniyeler içinde cevaplamak için (28 Ağu). DEV-only.
      setVisibleByName: (substr: string, v: boolean) => {
        let n = 0;
        scene.traverse((o) => {
          if (o.name && o.name.includes(substr)) {
            o.visible = v;
            n++;
          }
        });
        return n;
      },
      listMeshNames: () => {
        const names = new Set<string>();
        scene.traverse((o) => {
          if ((o as THREE.Mesh).isMesh && o.name) names.add(o.name);
        });
        return [...names];
      },
      raycastScreen: (nx: number, ny: number) => {
        const ray = new THREE.Raycaster();
        ray.setFromCamera(new THREE.Vector2(nx, ny), camera);
        const hits = ray.intersectObjects(scene.children, true);
        return hits.slice(0, 10).map((h) => ({
          name: h.object.name || h.object.type,
          dist: Number(h.distance.toFixed(1)),
          point: { x: Number(h.point.x.toFixed(1)), y: Number(h.point.y.toFixed(1)), z: Number(h.point.z.toFixed(1)) },
        }));
      },
      setMove: (x: number, z: number) => {
        manualMove.x = x;
        manualMove.z = z;
      },
      teleport: (x: number, z: number) => {
        player.position.x = x;
        player.position.z = z;
      },
      forceDash: (dirX: number, dirZ: number) => {
        const len = Math.hypot(dirX, dirZ) || 1;
        dashDirX = dirX / len;
        dashDirZ = dirZ / len;
        dashT = DASH_DURATION;
        dashCooldownT = DASH_COOLDOWN;
      },
      /** 29 Ağu — devin İSKELETİNİN gerçekten oynadığını oyunun içinde
       * ölçmek için. `giantWorldBox` bunu yapamaz: `Box3.setFromObject`
       * SkinnedMesh'te deforme olmamış geometriyi kullanır, o yüzden klip
       * oynarken bile sabit kalır (26 Ağu'da "stabil kutu"nun yanlışlıkla
       * sağlık işareti sayılmasının nedeni buydu). Bu ise gerçek kemik
       * dünya konumunu döndürür — 744c7f8'in dersinin ölçüm tarafı. */
      giantBone: (name: string) => {
        let found: THREE.Object3D | null = null;
        giant.traverse((o) => {
          if (o instanceof THREE.Bone && o.name === name) found = o;
        });
        if (!found) return null;
        const v = new THREE.Vector3();
        (found as THREE.Object3D).getWorldPosition(v);
        return { x: Number(v.x.toFixed(3)), y: Number(v.y.toFixed(3)), z: Number(v.z.toFixed(3)) };
      },
      giantAnim: () => ({ slot: giantAnimSlot, mixerTime: giantMixer ? Number(giantMixer.time.toFixed(2)) : null }),
      restart: () => resetRun(),
      state: () => ({
        phase,
        giantState,
        outWaitT: Number(outWaitT.toFixed(2)),
        sleepT: Number(sleepT.toFixed(2)),
        room: roomIdAt(player.position.z),
        detect: Number(detect.toFixed(1)),
        carriedCount,
        delivered,
        crushCount,
        crushGraceT: Number(crushGraceT.toFixed(2)),
        lostRun,
        playerPos: { x: player.position.x, y: player.position.y, z: player.position.z },
        giantVisible: giant.visible,
        giantModelLoaded: giant.children.length > 0,
        sheepLoaded: cave.sheepLoaded(),
        shellLoaded: cave.shellLoaded(),
        cliffLoaded: cave.cliffLoaded(),
        cliffWorldBox: (() => {
          const box = new THREE.Box3().setFromObject(cave.cliffGroup);
          if (box.isEmpty()) return null;
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          return {
            size: { x: Number(size.x.toFixed(2)), y: Number(size.y.toFixed(2)), z: Number(size.z.toFixed(2)) },
            center: { x: Number(center.x.toFixed(2)), y: Number(center.y.toFixed(2)), z: Number(center.z.toFixed(2)) },
          };
        })(),
        runeProgress: [...runeProgress],
        secretGateForcedOpen,
        runes: cave.runes.map((r) => ({ letter: r.letter, x: r.x, z: r.z })),
        giantPos: { x: giant.position.x, y: giant.position.y, z: giant.position.z },
        giantRotY: Number(giant.rotation.y.toFixed(3)),
        giantWorldBox: (() => {
          const box = new THREE.Box3().setFromObject(giant);
          if (box.isEmpty()) return null;
          const size = new THREE.Vector3();
          box.getSize(size);
          return { x: Number(size.x.toFixed(2)), y: Number(size.y.toFixed(2)), z: Number(size.z.toFixed(2)) };
        })(),
        rageT: Number(rageT.toFixed(2)),
        attackTelegraph: attackTelegraph ? { ...attackTelegraph, t: Number(attackTelegraph.t.toFixed(2)) } : null,
        dashCooldownT: Number(dashCooldownT.toFixed(2)),
        items: cave.items.map((it) => ({ id: it.id, carried: it.carried, delivered: it.delivered, pos: it.pos })),
      }),
    };
  }

  return null;
}
