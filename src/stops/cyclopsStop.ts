import * as THREE from "three";
import type { TestHooks } from "../game";
import { CAMERA } from "../constants";
import { CameraRig } from "../render/cameraRig";
import { Input } from "../systems/input";
import { isCoarsePointer } from "../ui/orientation";
import {
  buildCyclopsCave,
  corridorHalfWidthAt,
  roomIdAt,
  HEARTH_POS,
  TORCH_POS,
  CAVE_MOUTH_D,
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
type GiantState = "outside" | "entering" | "wanderingPre" | "sleeping" | "wanderingPost" | "exiting";

interface WanderTarget {
  x: number;
  z: number;
}
// tuning.md §12.1 stop points + weights. Cumulative bounds match the GDD's
// own acceptance-criteria test vector (0 / 0.15 / 0.35 / 0.75 / 0.999).
const WANDER_TARGETS: { target: WanderTarget; upTo: number }[] = [
  { target: { x: 0, z: 8 }, upTo: 0.15 }, // shallow
  { target: { x: 0, z: 15 }, upTo: 0.35 }, // depot
  { target: { x: -4, z: 35 }, upTo: 0.75 }, // pens (hearth)
  { target: { x: 0, z: 60 }, upTo: 1.0 }, // inner
];

function pickWanderTarget(rng: () => number = Math.random): WanderTarget {
  const r = rng();
  for (const w of WANDER_TARGETS) if (r < w.upTo) return w.target;
  return WANDER_TARGETS[WANDER_TARGETS.length - 1].target;
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
  const giant = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.9, 3.2, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x8a5a4a }),
  );
  giant.position.set(0, 2.4, -100); // parked off-scene while OUT/RETURN (D10: only ever visible during PRESENT)
  giant.visible = false;
  scene.add(giant);

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
    player.position.set(0, 1.0, CAVE_MOUTH_D);
    if (crushCount >= CYCLOPS_CRUSH_CAP) {
      say(`DENEME BAŞARISIZ (${crushCount}. ezilme) — sıfırlanıyor`);
      // Full attempt reset: progress AND crush count both clear, run is
      // freely retriable (tuning.md §12 CYCLOPS_CRUSH_CAP row).
      delivered = 0;
      crushCount = 0;
      for (const it of cave.items) {
        it.carried = false;
        it.delivered = false;
        it.pos = { ...it.home };
        it.mesh.position.x = it.home.x;
        it.mesh.position.z = it.home.z;
        it.mesh.visible = true;
      }
    } else {
      say(`Ezildin (${crushCount}/${CYCLOPS_CRUSH_CAP})${crushCount === 2 ? " — bir daha kaldıramazsın." : ""}`);
    }
  }

  function step(dt: number): void {
    simTime += dt;
    if (crushGraceT > 0) crushGraceT = Math.max(0, crushGraceT - dt);

    // -------------------------------------------------- giant state machine
    // walkGiantTowards: gerçek yürüyüş, ışınlanma yok. Vardığında true döner.
    function walkGiantTowards(target: WanderTarget): boolean {
      const dx = target.x - giant.position.x;
      const dz = target.z - giant.position.z;
      const dist = Math.hypot(dx, dz);
      const step = CYCLOPS_GIANT_SPEED * dt;
      if (dist <= step) {
        giant.position.x = target.x;
        giant.position.z = target.z;
        return true;
      }
      giant.position.x += (dx / dist) * step;
      giant.position.z += (dz / dist) * step;
      return false;
    }

    if (giantState === "outside") {
      phase = "out";
      giant.visible = false;
      outWaitT -= dt;
      if (outWaitT <= 0) {
        giantState = "entering";
        giant.position.set(0, 2.4, GIANT_ENTER_START_Z);
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
        wanderLegsLeft--;
        if (wanderLegsLeft > 0) {
          giantTarget = pickWanderTarget();
        } else {
          sleepT = GIANT_SLEEP_SECONDS;
          giantState = "sleeping";
        }
      }
    } else if (giantState === "sleeping") {
      phase = "present";
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
        wanderLegsLeft--;
        if (wanderLegsLeft > 0) {
          giantTarget = pickWanderTarget();
        } else {
          giantState = "exiting";
        }
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
      player.position.x += (mx / len) * PLAYER_SPEED * dt;
      player.position.z += (mz / len) * PLAYER_SPEED * dt;
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
      if (rate > 0) detect = Math.min(DETECT_MAX, detect + rate * dt);
      else detect = Math.max(0, detect - DETECT_DECAY * dt);
      if (detect >= DETECT_MAX) onCaught();
    }

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
      `[dev] faz:${phase} dev:${giantState}  oda:${roomIdAt(player.position.z)}  DETECT:${detect.toFixed(0)}/${DETECT_MAX}  ezilme:${crushCount}/${CYCLOPS_CRUSH_CAP}`;

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
        playerPos: { x: player.position.x, z: player.position.z },
        giantVisible: giant.visible,
        giantPos: { x: giant.position.x, z: giant.position.z },
        items: cave.items.map((it) => ({ id: it.id, carried: it.carried, delivered: it.delivered, pos: it.pos })),
      }),
    };
  }

  return null;
}
