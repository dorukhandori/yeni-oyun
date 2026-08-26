import * as THREE from "three";
import type { TestHooks } from "../game";
import { CAMERA } from "../constants";
import { CameraRig } from "../render/cameraRig";
import { Input } from "../systems/input";
import { isCoarsePointer } from "../ui/orientation";
import { loadGltfBundle } from "../world/gltf";
import {
  buildCyclopsCave,
  corridorHalfWidthAt,
  roomIdAt,
  roomBounds,
  HEARTH_POS,
  TORCH_POS,
} from "../world/cyclopsCave";

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
const CYCLOPS_CRUSH_RADIUS = 2.0;
const CYCLOPS_GIANT_PROXIMITY_RADIUS = 8.0;
const CYCLOPS_PROXIMITY_MULTIPLIER = 2.0;
const PLAYER_SPEED = 4.0;
const PLAYER_RADIUS = 0.4;
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

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a222c);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, window.innerWidth / window.innerHeight, 0.1, 200);

  // Bulundu (sahip playtest'i, 25 Ağu): sahne neredeyse hiç görünmüyordu —
  // ışık sabitti, kapı açık/kapalı hiçbir fark yaratmıyordu (tasarım
  // "mağara ağzı kapı açıkken 0,95 aydınlık" diyor, kod öyle davranmıyordu).
  // Tam `doorGlobal(D)` derinlik-bazlı formülü (K5'in asıl işi) hâlâ yok,
  // ama en azından kapı durumuna göre değişen, oynanabilir bir taban var.
  const ambient = new THREE.AmbientLight(0xaab4c2, 1.1);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(0xbfd0e0, 0x30281f, 0.7);
  scene.add(hemi);
  /** Oyuncuyu takip eden ışık — hangi odada olursan ol yakın çevreni
   * görebilmen için (bir "meşale taşıyorsun" varsayımı, temsili). */
  const playerLight = new THREE.PointLight(0xfff2d8, 1.6, 14, 1.6);

  const cave = buildCyclopsCave();
  scene.add(cave.group);

  // -------------------------------------------------------------- player
  const player = new THREE.Mesh(
    new THREE.CapsuleGeometry(PLAYER_RADIUS, 1.2, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0xd8c9a8 }),
  );
  player.position.set(0, 1.0, -18);
  scene.add(player);
  playerLight.position.copy(player.position);
  playerLight.position.y += 1.4;
  scene.add(playerLight);

  // Bulundu (sahip playtest'i, 25 Ağu): "mouse'u oynattığımda kamera
  // dönmüyor" — hiç mouse-look bağlanmamıştı, kamera sabit +Z'ye
  // bakıyordu. Lotus'un zaten çalışan `CameraRig`'i bağımsız bir sınıf
  // (Lotus'a özgü hiçbir şey tutmuyor) — sıfırdan yazmak yerine yeniden
  // kullanıldı. Zemin hep y=0 (primitif geometri), gerçek `heightAt`
  // eşdeğeri yok.
  const rig = new CameraRig(camera, () => 0, isCoarsePointer() ? CAMERA.distTouch : CAMERA.dist);
  rig.snap(player.position);
  const fwd = new THREE.Vector3();
  const rightV = new THREE.Vector3();

  // ---------------------------------------------------------------- giant
  // Polyphemos — ASSET-092, "Cyclop" (Sketchfab, lucasprs51450, CC-BY),
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
  loadGltfBundle("assets/models/char_polyphemos_01_stand_27000.glb").then((bundle) => {
    const model = bundle.scene;
    model.traverse((o) => {
      if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
        o.castShadow = false; // primitif geçiş — gölge haritası yok
        giantMaterials.push(o.material);
      }
    });
    giant.add(model);
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
    dashT = 0;
    dashCooldownT = 0;
    rageT = 0;
    rageStepT = 0;
    rageAttackT = 0;
    attackTelegraph = null;
    attackRing.visible = false;
    setGiantRageTint(false);
    giant.position.set(0, 0, -100);
    giant.visible = false;
    cave.setDoorOpen(true);
    cave.setInnerGateOpen(false);
    ambient.intensity = 1.1;
    hemi.intensity = 0.7;
    player.position.set(0, 1.0, -18);
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
      const dx = target.x - giant.position.x;
      const dz = target.z - giant.position.z;
      const dist = Math.hypot(dx, dz);
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
        ambient.intensity = 0.5;
        hemi.intensity = 0.3;
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
      }
    } else if (giantState === "sleeping") {
      phase = "present";
      // "Yatarken çok fazla hareket edecek" — huzursuz, ama yataktan
      // ayrılmayan küçük bir titreşim (iki farklı frekans üst üste).
      giant.position.x = GIANT_BED.x + Math.sin(simTime * 1.3) * 0.4 + Math.sin(simTime * 3.7) * 0.15;
      giant.position.z = GIANT_BED.z + Math.cos(simTime * 1.7) * 0.35 + Math.cos(simTime * 4.1) * 0.12;
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
          ambient.intensity = 1.1;
          hemi.intensity = 0.7;
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
    cave.setInnerGateOpen(giant.visible && giant.position.z >= GORGE_B_MIN && giant.position.z <= GORGE_B_MAX);

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
    rig.zoomBy(input.wheelDelta());

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
    player.position.z = Math.max(-19, Math.min(64.5, player.position.z));

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
        playerPos: { x: player.position.x, z: player.position.z },
        giantVisible: giant.visible,
        giantModelLoaded: giant.children.length > 0,
        giantPos: { x: giant.position.x, z: giant.position.z },
        rageT: Number(rageT.toFixed(2)),
        attackTelegraph: attackTelegraph ? { ...attackTelegraph, t: Number(attackTelegraph.t.toFixed(2)) } : null,
        dashCooldownT: Number(dashCooldownT.toFixed(2)),
        items: cave.items.map((it) => ({ id: it.id, carried: it.carried, delivered: it.delivered, pos: it.pos })),
      }),
    };
  }

  return null;
}
