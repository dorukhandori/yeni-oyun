import * as THREE from "three";
import {
  BEAUTY,
  CAMERA,
  DAY,
  FEEL,
  FLOW,
  HALLUCINATION,
  ISLAND,
  LAGOON,
  LANDMARK,
  LOTOPHAGOS,
  LOTUS,
  MEMORY,
  PALETTE,
  PLAYER,
  PUZZLE,
  SAILOR,
  SHIP,
  STEP,
  WORLD,
  setLotusRun,
  type LotusRunKind,
} from "./constants";
import { CameraRig } from "./render/cameraRig";
import { createStage } from "./render/stage";
import { GameAudio } from "./systems/audio";
import { Bursts } from "./systems/burst";
import { Input } from "./systems/input";
import type { GameState } from "./types";
import { Hud } from "./ui/hud";
import { Menu } from "./ui/menu";
import { requestLandscapeLock } from "./ui/orientation";
import { buildHallucinations } from "./world/hallucination";
import { buildLotophagoi } from "./world/lotophagos";
import { buildLotusField, type LotusGateState } from "./world/lotus";
import { buildSailor } from "./world/sailor";
import { buildSea } from "./world/sea";
import { buildShip } from "./world/ship";
import { buildSteppingStones } from "./world/steppingStones";
import { buildHillPuzzle, updateHillPuzzleVisuals } from "./world/hillPuzzle";
import { buildTerrain, heightAt, inLagoon, islandRadiusAt, wadeLimitAt } from "./world/terrain";
import { glowSprite } from "./world/sprite";

/** Surface the sailor and camera stand on: land, or wading depth in water. */
function standY(x: number, z: number): number {
  return Math.max(heightAt(x, z), PLAYER.wadeFloor);
}

/**
 * DEV-only automation seam consumed by scripts/asset-qa/. Attached to
 * `window.__LOTOPHAGOI_TEST_HOOKS__` in main.ts behind `import.meta.env.DEV`,
 * so the whole surface is dead-code-eliminated from a production build.
 *
 * Every hook routes through the same functions the menu uses — nothing here
 * pokes at private state directly, so a test-driven phase change leaves the
 * DOM overlay, HUD and world in exactly the state real play would.
 */
export interface TestHooks {
  getState(): GameState;
  setPhase(phase: "title" | "hub" | "play", opts?: { kind?: LotusRunKind; seed?: number }): void;
  setProfile(profile: "test" | "real"): void;
  /** 0 = clear headed, 1 = fully lotus-drunk. Drives the haze/forgetting pass. */
  setMemory(v: number): void;
  /** Replace Math.random with a seeded PRNG so particles/NPCs are reproducible. */
  seedRandom(seed: number): void;
  /** Zero the world clock, day clock and bloom boost (test-only). */
  resetClock(): void;
  /** Advance exactly n fixed 60 Hz steps. Only meaningful while frozen. */
  runSteps(n: number): void;
  /** Stop the simulation so screenshots are byte-stable. */
  freeze(): void;
  unfreeze(): void;
  /** Point the camera at a world position (frozen shots of the sun, etc.). */
  lookAt(x: number, y: number, z: number): void;
}

export function startGame(canvas: HTMLCanvasElement): TestHooks | null {
  const stage = createStage(canvas);

  const terrain = buildTerrain();
  const sea = buildSea();
  const field = buildLotusField();
  const stones = buildSteppingStones();
  const hill = buildHillPuzzle();
  const ship = buildShip();
  const lotophagoi = buildLotophagoi();
  const hallucinations = buildHallucinations();
  const sailor = buildSailor();
  const bursts = new Bursts();
  const audio = new GameAudio();

  stage.scene.add(
    terrain.group,
    sea.group,
    field.group,
    stones.group,
    hill.group,
    ship.group,
    lotophagoi.group,
    hallucinations.group,
    sailor.root,
    bursts.points,
  );

  // Guiding arrow home — the first thing the lotus takes from you.
  const guide = new THREE.Group();
  const guideArrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.17, 0.52, 5),
    new THREE.MeshStandardMaterial({
      color: 0xffe9b0,
      emissive: new THREE.Color(0xffc862),
      emissiveIntensity: 0.9,
      roughness: 0.4,
      flatShading: true,
    }),
  );
  guideArrow.rotation.x = Math.PI / 2;
  guide.add(guideArrow);
  const guideGlow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowSprite(),
      color: 0xffd489,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  guideGlow.scale.setScalar(0.9);
  guide.add(guideGlow);
  guide.scale.setScalar(0.7);
  stage.scene.add(guide);

  const pos = new THREE.Vector3(PLAYER.spawn.x, 0, PLAYER.spawn.z);
  pos.y = standY(pos.x, pos.z);
  sailor.root.position.copy(pos);
  const vel = new THREE.Vector3();
  let facing = Math.PI;
  let dustTimer = 0;
  let prevGroundY = pos.y;
  let wasMoving = false;
  let wonSoundPlayed = false;
  let duskSoundPlayed = false;
  let warnSoundPlayed = false;
  /** Cooldown so the "bu kadar açılabilirsin" toast doesn't spam the boundary. */
  let boundaryHintTimer = 0;
  /** Seconds remaining on the hallucination contact drift-spike (see updateDrift). */
  let driftTimer = 0;
  let harvestIndex: number | null = null;
  let harvestT = 0;
  let harvestX = 0;
  let harvestZ = 0;
  let runHoldT = 0;

  const rig = new CameraRig(stage.camera, (x, z) => Math.max(heightAt(x, z), 0));
  rig.snap(pos);

  const input = new Input();
  input.attach(canvas);
  const hud = new Hud(input.touchActive);

  const unlockAudio = () => audio.unlock();
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  const st: GameState = {
    // Boots on Title (docs/ux/screens.md §1) — Oyna -> Hub -> Lotus card is
    // the only way into "play" now, see goTitle/goHub/fullRestart below.
    phase: "title",
    carried: 0,
    delivered: 0,
    memory: 0,
    lostTimer: 0,
    forgetIframes: 0,
    depart: 0,
    cardTimer: 0,
    dayTime: 0,
    playerX: PLAYER.spawn.x,
    playerZ: PLAYER.spawn.z,
  };

  const fwd = new THREE.Vector3();
  const rightV = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const focus = new THREE.Vector3();
  const driftAxis = new THREE.Vector3(0, 1, 0);
  let time = 0;

  const shipDist = () => Math.hypot(ship.anchor.x - pos.x, ship.anchor.z - pos.z);

  function pulseBloom(amount: number): void {
    stage.bloomBoost = Math.min(1.2, stage.bloomBoost + amount);
  }

  function respawnAtShip(): void {
    pos.set(PLAYER.spawn.x, 0, PLAYER.spawn.z);
    pos.y = standY(pos.x, pos.z);
    vel.set(0, 0, 0);
    st.playerX = pos.x;
    st.playerZ = pos.z;
    st.carried = 0;
    st.memory = MEMORY.resetTo;
    st.lostTimer = 0;
    st.phase = "play";
    driftTimer = 0;
    harvestIndex = null;
    harvestT = 0;
    prevGroundY = pos.y;
    sailor.setCarried(0);
    sailor.root.visible = true;
    rig.yaw = CAMERA.yawStart;
    rig.snap(pos);
  }

  function lotusGates(): LotusGateState {
    if (WORLD.k35) return { stonesOpen: true, hillOpen: true };
    return { stonesOpen: stones.isOpen(), hillOpen: hill.isOpen() };
  }

  let hillVistaSeen = false;
  let beatM1 = false;
  let beatM2 = false;
  let forgetLinesLeft = 3;
  const opening = [
    "Dokuz gün rüzgâr. Onuncu sabah kum.",
    "Üç adam gönderdim. Üçü de burada. Üçü de gülümsüyor.",
    "Yenmemiş çiçek hatırlatır. Bu kıyıda beş yeter.",
  ];

  function queueOpening(): void {
    if (!WORLD.k35) return;
    opening.forEach((line, i) => {
      window.setTimeout(() => {
        if (st.phase === "play") hud.say(line);
      }, i * 3200);
    });
  }

  function vagueDelivered(): string {
    if (st.delivered <= 0) return "";
    if (st.delivered <= 2) return "birkaç";
    if (st.delivered <= 4) return "yarısından çok";
    return "yeter";
  }

  function isNight(): boolean {
    const p = st.dayTime / DAY.length;
    return p >= 0.8 || p < 0.1;
  }

  function pickHeroBerth(): { x: number; z: number; rotY: number } {
    const oldX = ship.anchor.x;
    const oldZ = ship.anchor.z;
    const tryOne = (a: number, slack: number): { x: number; z: number } | null => {
      const rMin = ISLAND.radius - 22;
      const rMax = ISLAND.radius - 8;
      const r = rMin + Math.random() * (rMax - rMin) * slack;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const h = heightAt(x, z);
      if (h < 0 || h > 2.5) return null;
      if (Math.hypot(x - oldX, z - oldZ) < SHIP.relocateMin * slack) return null;
      if (Math.hypot(x - pos.x, z - pos.z) < SHIP.relocatePlayerMin * slack) return null;
      const rr = Math.hypot(x, z);
      const north = Math.max(0, z / Math.max(rr, 1));
      if (LANDMARK.northSpikes.height > 0 && north >= 0.35 && rr >= LANDMARK.northSpikes.startR) {
        return null;
      }
      return { x, z };
    };
    for (let i = 0; i < 80; i++) {
      const hit = tryOne(Math.random() * Math.PI * 2, 1);
      if (hit) return { ...hit, rotY: Math.atan2(hit.z, hit.x) + Math.PI / 2 };
    }
    for (let i = 0; i < 80; i++) {
      const hit = tryOne(Math.random() * Math.PI * 2, 1.2);
      if (hit) return { ...hit, rotY: Math.atan2(hit.z, hit.x) + Math.PI / 2 };
    }
    for (let k = 0; k < 12; k++) {
      const hit = tryOne((k / 12) * Math.PI * 2, 1.4);
      if (hit) return { ...hit, rotY: Math.atan2(hit.z, hit.x) + Math.PI / 2 };
    }
    const a = Math.atan2(pos.z, pos.x) + Math.PI;
    const x = Math.cos(a) * (ISLAND.radius - 12);
    const z = Math.sin(a) * (ISLAND.radius - 12);
    return { x, z, rotY: a + Math.PI / 2 };
  }

  function runForgetEvent(): void {
    st.carried = 0;
    sailor.setCarried(0);
    st.lostTimer = 0;
    st.memory = MEMORY.forgetFloor;
    st.forgetIframes = MEMORY.forgetIframes;
    const berth = pickHeroBerth();
    ship.relocateHero(berth.x, berth.z, berth.rotY);
    if (forgetLinesLeft > 0) {
      forgetLinesLeft -= 1;
      hud.say("Denizin hangi yönde olduğunu bilmiyorum.");
      window.setTimeout(() => {
        if (st.phase === "play") hud.say("Sorun değil.");
      }, 1600);
      window.setTimeout(() => {
        if (st.phase === "play") hud.say("Buradan güzel görünüyor.");
      }, 3200);
    }
    audio.lose();
  }

  /**
   * Full world reset + actually starts play. Only entry point into "play".
   *
   * `seedOverride` exists for the asset-qa screenshot regression check
   * (scripts/asset-qa/checks/regression.mjs): lotus placement is seeded, so a
   * fixed seed makes the field reproducible frame-for-frame. Normal play never
   * passes it and keeps the random seed.
   */
  function fullRestart(kind: LotusRunKind, seedOverride?: number): void {
    setLotusRun(kind);
    menu.hideAll();
    hud.hideCard();
    ship.reset();
    const runSeed = seedOverride ?? ((Math.random() * 1e9) | 0);
    if (WORLD.k35) console.debug("[lotus-run] seed", runSeed);
    field.reset({
      seed: runSeed,
      playerX: PLAYER.spawn.x,
      playerZ: PLAYER.spawn.z,
      shipX: SHIP.pos.x,
      shipZ: SHIP.pos.z,
    });
    stones.reset();
    hill.reset();
    lotophagoi.reset();
    hallucinations.reset();
    st.phase = "play";
    st.carried = 0;
    st.delivered = 0;
    st.memory = 0;
    st.lostTimer = 0;
    st.forgetIframes = 0;
    hillVistaSeen = false;
    beatM1 = false;
    beatM2 = false;
    forgetLinesLeft = 3;
    st.depart = 0;
    st.cardTimer = 0;
    st.dayTime = 0;
    wonSoundPlayed = false;
    duskSoundPlayed = false;
    warnSoundPlayed = false;
    boundaryHintTimer = 0;
    driftTimer = 0;
    harvestIndex = null;
    harvestT = 0;
    pos.set(PLAYER.spawn.x, 0, PLAYER.spawn.z);
    pos.y = standY(pos.x, pos.z);
    vel.set(0, 0, 0);
    st.playerX = pos.x;
    st.playerZ = pos.z;
    facing = Math.PI;
    prevGroundY = pos.y;
    sailor.setCarried(0);
    sailor.root.visible = true;
    sailor.root.position.copy(pos);
    sailor.root.rotation.y = facing + (SAILOR.meshEnabled ? SAILOR.meshFacing : 0);
    rig.yaw = CAMERA.yawStart;
    rig.snap(pos);
    stage.setDayProgress(0);
    hud.say(WORLD.k35 ? "Bu kıyıda beş yeter." : "Yeni bir gün — on iki lotus");
    hud.startHintTimer();
    queueOpening();
  }

  /** Title -> Hub (docs/ux/screens.md §1 "Oyna"). */
  function goHub(): void {
    hud.hideCard();
    st.phase = "hub";
    menu.showHub();
  }

  /**
   * "Oyna" is the one guaranteed user gesture before play, so it is where the
   * mobile landscape lock has to be requested — browsers reject the call
   * outside a gesture. The CSS rotate gate (ui/orientation.ts) is the fallback
   * for the browsers that refuse anyway (iOS Safari).
   */
  function onPlay(): void {
    void requestLandscapeLock();
    goHub();
  }

  /** Hub "Ana menü" -> Title. Also boot's initial state via menu.showTitle() below. */
  function goTitle(): void {
    hud.hideCard();
    menu.setCyclopsReady(false);
    st.phase = "title";
    menu.showTitle();
  }

  const menu = new Menu({
    onPlay,
    onSelectLotus: () => fullRestart("classic"),
    onSelectLotusEdge: () => fullRestart("edge"),
    onHubMenu: goTitle,
  });
  menu.showTitle();

  hud.setRestartHandler(goHub);

  function deliver(): void {
    if (st.carried <= 0) return;
    st.delivered += st.carried;
    ship.setDelivered(st.delivered);
    const drop = new THREE.Vector3(ship.anchor.x, ship.anchor.y + 1.6, ship.anchor.z);
    bursts.spawn(drop, PALETTE.lotusHeart, 10 + st.carried * 4, 3.2);
    bursts.spawnPop(drop, PALETTE.petalRipeTint, 16 + st.carried * 3);
    hud.say(`${st.carried} lotus gemiye kondu`);
    audio.deliver();
    st.carried = 0;
    sailor.setCarried(0);
    st.memory = Math.max(0, st.memory - 0.18);
    rig.kick(0.22);
    sailor.pulse(0.55);
    pulseBloom(FEEL.deliverBloomPulse);
    if (!WORLD.k35 && st.delivered >= LOTUS.target) {
      st.phase = "departing";
      hud.say("Yeter bu kadar — yelken aç!");
    } else if (WORLD.k35 && st.delivered >= LOTUS.target) {
      hud.say("Yeter. Dümene geç.");
    }
  }

  function startDepart(): void {
    if (st.delivered < LOTUS.target) return;
    menu.setCyclopsReady(true);
    st.phase = "departing";
    hud.say("Ağlayarak kürek çektiler. Bağladım onları sıraların altına.");
  }

  function pick(index: number): void {
    if (st.carried >= LOTUS.carryCap) {
      hud.say(WORLD.k35 ? "Elin dolu" : "Sepet dolu — gemiye götür");
      return;
    }
    if (!field.pick(index, lotusGates())) return;
    st.carried += 1;
    sailor.setCarried(st.carried);
    st.memory = Math.min(1, st.memory + MEMORY.pickSpike);
    const p = field.positionOf(index);
    const at = new THREE.Vector3(p.x, LAGOON.waterY + 0.7, p.z);
    bursts.spawnPop(at, PALETTE.petalRipeTint, 26);
    bursts.spawn(at, PALETTE.lotusHeart, 10, 1.6);
    rig.kick(0.14);
    sailor.pulse(0.48);
    pulseBloom(FEEL.collectBloomPulse);
    audio.pick();
    if (WORLD.k35 && !beatM1) {
      beatM1 = true;
      hud.say("Ağzıma götürmedim. Yine de dilimde bir tat var.");
    }
  }

  function acceptGift(index: number): void {
    const room = LOTUS.carryCap - st.carried;
    const out = lotophagoi.accept(index, room);
    if (out.n <= 0) {
      if (room <= 0) hud.say("Elin dolu");
      return;
    }
    st.carried += out.n;
    sailor.setCarried(st.carried);
    st.memory = Math.min(1, st.memory + LOTOPHAGOS.memCost);
    const fig = lotophagoi.group.children[index] as THREE.Object3D | undefined;
    const at = fig
      ? new THREE.Vector3(fig.position.x, fig.position.y + 1.5, fig.position.z)
      : pos.clone();
    bursts.spawnPop(at, PALETTE.petalRipeTint, 20);
    bursts.spawn(at, PALETTE.lotusHeart, 8, 1.4);
    if (out.woman) {
      ship.addKeepsake("wreath");
      hud.say("Kal demiyor. Kalmamı bekliyor.");
    } else if (WORLD.k35 && !beatM2) {
      beatM2 = true;
      hud.say("Adım söylemiyor. Sadece uzatıyor. Elini indirmiyor.");
    } else {
      hud.say(`İkram: ${out.n} olgun lotus`);
    }
    audio.gift();
    sailor.pulse(0.4);
    pulseBloom(0.35);
  }

  function updateMemory(dt: number): void {
    const r = Math.hypot(pos.x, pos.z);
    const nearShip = shipDist() < SHIP.range;
    const inSea = r > islandRadiusAt(pos.x, pos.z) - MEMORY.seaBand;

    if (st.forgetIframes > 0) st.forgetIframes = Math.max(0, st.forgetIframes - dt);

    let rate = MEMORY.islandGain + st.carried * MEMORY.perCarriedGain;
    if (inLagoon(pos.x, pos.z)) rate += MEMORY.lagoonGain;
    if (WORLD.k35 && isNight()) rate += MEMORY.islandGain * (MEMORY.nightMul - 1);
    if (nearShip) rate = -MEMORY.shipRecover;
    else if (inSea) rate = -MEMORY.seaRecover;
    if (st.forgetIframes > 0 && rate > 0) rate = 0;

    st.memory = Math.min(1, Math.max(0, st.memory + rate * dt));

    if (st.memory >= 0.999) {
      if (WORLD.k35 && (nearShip || inSea)) {
        st.lostTimer = 0;
        return;
      }
      st.lostTimer += dt;
      if (st.lostTimer >= MEMORY.loseHold && st.phase === "play") {
        if (WORLD.k35) {
          runForgetEvent();
        } else if (WORLD.lossMode === "gameOver") {
          st.phase = "gameover";
          audio.lose();
        } else {
          st.phase = "lost";
          st.cardTimer = FLOW.lostCardSeconds;
          audio.lose();
        }
      }
    } else {
      st.lostTimer = 0;
    }
  }

  function step(): void {
    // Title/Hub freeze the world completely (multi-island-concept.md §9.1
    // "Hub'da zaman donar") — no physics, camera, memory, day clock, or
    // world-object animation runs; `time` itself doesn't advance either.
    if (st.phase === "title" || st.phase === "hub") {
      input.endFrame();
      return;
    }

    const dt = STEP / 1000;
    time += dt;

    stage.bloomBoost = Math.max(0, stage.bloomBoost - FEEL.bloomPulseDecay * dt);

    // Day clock — only ticks while actively sailing the island.
    if (st.phase === "play") {
      st.dayTime += dt;
      if (WORLD.k35) {
        if (st.dayTime >= DAY.length) {
          st.dayTime -= DAY.length;
          warnSoundPlayed = false;
        }
      } else {
        st.dayTime = Math.min(DAY.length, st.dayTime);
      }
      const remain = DAY.length - st.dayTime;
      if (!warnSoundPlayed && remain <= DAY.warnRemaining) {
        warnSoundPlayed = true;
        audio.warn();
      }
      if (!WORLD.k35 && st.dayTime >= DAY.length && st.delivered < LOTUS.target) {
        st.phase = "dusk";
      }
    }
    stage.setDayProgress(st.dayTime / DAY.length);

    if (st.phase === "lost") {
      st.cardTimer -= dt;
      hud.showCard(
        "lost",
        "Yurdunu unuttun",
        "Lotus kokusu belleğini sildi. Denizciler seni gemiye taşıdı.",
        { restart: false },
      );
      if (st.cardTimer <= 0) {
        hud.hideCard();
        respawnAtShip();
      }
    }

    if (st.phase === "dusk") {
      if (!duskSoundPlayed) {
        duskSoundPlayed = true;
        audio.lose();
      }
      hud.showCard(
        "dusk",
        "Güneş battı",
        `${st.delivered} lotus yetti, ${LOTUS.target} lazımdı. Filo kıyıda kaldı.`,
        { restart: true },
      );
      if (input.interact || input.wantsRestart) goHub();
    }

    if (st.phase === "gameover") {
      // audio.lose() already fired once at the play -> gameover transition
      // in updateMemory(), unlike "dusk" which needs a per-frame flag here.
      hud.showCard(
        "gameover",
        "Unuttun.",
        "Lotus kokusu belleğini tamamen sildi. Bu ada seni bıraktı — İthake'ye dönüş yok.",
        { restart: true },
      );
      if (input.interact || input.wantsRestart) goHub();
    }

    // ------------------------------------------------------------- camera look
    if (st.phase === "play" || st.phase === "departing") {
      const sens = input.touchActive ? CAMERA.touchSens : CAMERA.mouseSens;
      const md = input.mouseDelta();
      rig.rotate(md.x * sens, md.y * sens);
      rig.rotate(input.yawKeys() * CAMERA.keySens, input.pitchKeys() * CAMERA.keySens * 0.6);
    }

    // --------------------------------------------------------------- movement
    const canMove = st.phase === "play";
    rig.forward(fwd);
    rig.right(rightV);
    wish.set(0, 0, 0);
    if (canMove) {
      wish.addScaledVector(fwd, input.moveZ()).addScaledVector(rightV, input.moveX());
    }
    // Hallucination contact drift-spike (gdd-lotus-hallucination.md §4.2):
    // reuses the base memory-system drift primitives (MEMORY.driftMaxAngleDeg
    // / driftPeriod), temporarily amplified, regardless of the (not yet
    // implemented) eşik-3 baseline drift. Only rotates the wish direction —
    // never speed, never blocks input.
    if (canMove && driftTimer > 0 && wish.lengthSq() > 0.0001) {
      const angleDeg =
        MEMORY.driftMaxAngleDeg *
        HALLUCINATION.driftMultiplier *
        Math.sin((2 * Math.PI * time) / MEMORY.driftPeriod);
      wish.applyAxisAngle(driftAxis, THREE.MathUtils.degToRad(angleDeg));
    }
    if (driftTimer > 0) driftTimer = Math.max(0, driftTimer - dt);
    const wading = inLagoon(pos.x, pos.z);
    const wishLen = Math.hypot(wish.x, wish.z);
    const forwardAmt = wishLen > 0.001 ? wish.dot(fwd) / wishLen : 0;
    if (canMove && harvestT < 0.08 && (input.forwardHeld() || forwardAmt > 0.2)) {
      runHoldT += dt;
    } else {
      runHoldT = 0;
    }
    const running = runHoldT >= PLAYER.runHold;
    const topSpeed =
      PLAYER.speed *
      (wading ? PLAYER.waterSpeedMul : 1) *
      (running ? PLAYER.runSpeedMul : 1);
    if (wish.lengthSq() > 0.001) wish.normalize().multiplyScalar(topSpeed);

    const accel = PLAYER.accel * (wish.lengthSq() > 0.001 ? 1 : 0.55);
    const ax = (wish.x - vel.x) * accel;
    const az = (wish.z - vel.z) * accel;
    vel.x += ax * dt;
    vel.z += az * dt;
    if (wish.lengthSq() < 0.001) {
      const drag = Math.exp(-PLAYER.drag * dt);
      vel.x *= drag;
      vel.z *= drag;
    }

    let nx = pos.x + vel.x * dt;
    let nz = pos.z + vel.z * dt;

    // Obstacle collision — rocks, tree trunks, shrine columns
    // (`terrain.colliders`) read as solid but nothing ever blocked walking
    // through them. Position correction (push out to the collider's edge)
    // plus velocity projection (drop the inward component only) so the
    // player doesn't jitter against the surface every frame and can still
    // slide along it. Two passes resolve the rare double-overlap where two
    // colliders sit close together; brute-force over ~150-250 colliders is
    // trivial at 60 Hz, no spatial index needed at this island's scale.
    for (let pass = 0; pass < 2; pass++) {
      for (const c of terrain.colliders) {
        const dx = nx - c.x;
        const dz = nz - c.z;
        const minDist = PLAYER.radius + c.radius;
        const distSq = dx * dx + dz * dz;
        if (distSq >= minDist * minDist) continue;
        const dist = Math.sqrt(distSq);
        let nnx: number;
        let nnz: number;
        if (dist > 1e-6) {
          nnx = dx / dist;
          nnz = dz / dist;
        } else {
          // Degenerate — standing exactly on the collider centre. Push along facing.
          nnx = Math.sin(facing);
          nnz = Math.cos(facing);
        }
        nx = c.x + nnx * minDist;
        nz = c.z + nnz * minDist;
        const into = vel.x * nnx + vel.z * nnz;
        if (into < 0) {
          vel.x -= nnx * into;
          vel.z -= nnz * into;
        }
      }
    }

    let nr = Math.hypot(nx, nz);
    const limit = wadeLimitAt(nx, nz);
    const softStart = limit - PLAYER.boundarySoftZone;
    if (nr > softStart) {
      // Soft resistance band: outward speed bleeds off gradually the deeper
      // you push past softStart, instead of snapping to a hard wall
      // (playtest bug: "harita sınırında duvara takılma"). `depth` 0 at the
      // start of the band, 1 at the hard limit and beyond.
      const depth = Math.min(1, (nr - softStart) / PLAYER.boundarySoftZone);
      const rx = nx / nr;
      const rz = nz / nr;
      const outward = vel.x * rx + vel.z * rz;
      if (outward > 0) {
        const shed = outward * depth * PLAYER.boundaryResistance;
        vel.x -= rx * shed;
        vel.z -= rz * shed;
        nx = pos.x + vel.x * dt;
        nz = pos.z + vel.z * dt;
        nr = Math.hypot(nx, nz);
      }
      if (nr > limit) {
        // Residual push still crosses the hard limit in one step (e.g. a big
        // dt) — clamp position only, velocity already shed above.
        const s = limit / nr;
        nx *= s;
        nz *= s;
      }
      if (boundaryHintTimer <= 0) {
        boundaryHintTimer = PLAYER.boundaryHintCooldown;
        hud.say("Açık denize bu kadar açılabilirsin");
        audio.boundary();
      }
    }
    if (boundaryHintTimer > 0) boundaryHintTimer -= dt;
    pos.x = nx;
    pos.z = nz;
    const groundY = standY(pos.x, pos.z);
    const drop = prevGroundY - groundY;
    // Climb: snap up. The old 14/s lerp lagged ~16 cm below a 30° slope at
    // run speed, so the billboard's calves sat inside the hill. Descend still
    // eases, so land squash has a moment to read.
    const probeY = standY(
      pos.x + Math.sin(facing) * SAILOR.slopeProbe,
      pos.z + Math.cos(facing) * SAILOR.slopeProbe,
    );
    const wantY = groundY + Math.max(0, probeY - groundY) * SAILOR.slopeLift;
    if (wantY >= pos.y) pos.y = wantY;
    else pos.y += (wantY - pos.y) * Math.min(1, 14 * dt);
    if (drop > 0.12 && Math.hypot(vel.x, vel.z) > FEEL.landImpactSpeed * 0.4) {
      sailor.land(Math.min(0.7, drop * 1.4));
      rig.kick(Math.min(0.12, drop * 0.25));
      bursts.spawnDust(
        new THREE.Vector3(pos.x, groundY + 0.05, pos.z),
        wading ? PALETTE.seaFoam : PALETTE.sand,
        8,
        1.2,
      );
    }
    prevGroundY = groundY;

    const speed = Math.hypot(vel.x, vel.z);
    sailor.root.position.copy(pos);
    // GameState.playerX/playerZ — read by ui-programmer's minimap via
    // hud.update(st, haze); kept in lockstep with the physics position above.
    st.playerX = pos.x;
    st.playerZ = pos.z;

    stones.touch(pos);

    const movingHard = speed > FEEL.dustMinSpeed;
    if (movingHard && canMove) {
      dustTimer -= dt;
      if (dustTimer <= 0) {
        dustTimer = FEEL.dustInterval * (wading ? 0.7 : 1);
        bursts.spawnDust(
          new THREE.Vector3(pos.x, groundY + 0.02, pos.z),
          wading ? PALETTE.seaFoam : PALETTE.sand,
          wading ? 7 : 5,
          wading ? 1.4 : 0.7,
        );
      }
    } else {
      dustTimer = 0;
    }
    if (wasMoving && !movingHard && speed < 0.35) {
      sailor.land(0.28);
      bursts.spawnDust(
        new THREE.Vector3(pos.x, groundY + 0.04, pos.z),
        wading ? PALETTE.seaFoam : PALETTE.sand,
        6,
        0.9,
      );
    }
    wasMoving = movingHard;

    // ------------------------------------------------------------ interaction
    const gates = lotusGates();
    const ripe = st.phase === "play" ? field.findRipe(pos.x, pos.z, gates) : null;
    const gatedKind =
      st.phase === "play" && ripe === null ? field.findGatedRipe(pos.x, pos.z, gates) : null;
    const nearShip = shipDist() < SHIP.range;
    const offer = st.phase === "play" ? lotophagoi.findOffer(pos.x, pos.z) : null;
    const cairn = st.phase === "play" ? hill.findCairn(pos.x, pos.z) : null;

    let highlightIndex: number | null = null;
    if (ripe !== null && !nearShip && offer === null) {
      const p = field.positionOf(ripe);
      const close = Math.hypot(p.x - pos.x, p.z - pos.z) <= PUZZLE.highlightCloseRange;
      const clearHead = st.memory <= PUZZLE.highlightMemoryMax;
      if (close || clearHead) highlightIndex = ripe;
    }
    field.setHighlight(highlightIndex);

    const canHarvest =
      st.phase === "play" &&
      ripe !== null &&
      !nearShip &&
      offer === null &&
      cairn === null &&
      st.carried < LOTUS.carryCap;

    if (canHarvest && ripe !== null && input.interactHeld) {
      if (harvestIndex !== ripe) {
        harvestIndex = ripe;
        harvestT = 0;
        harvestX = pos.x;
        harvestZ = pos.z;
      }
      if (Math.hypot(pos.x - harvestX, pos.z - harvestZ) > LOTUS.cancelMove) {
        harvestIndex = null;
        harvestT = 0;
      } else {
        harvestT = Math.min(1, harvestT + dt / LOTUS.hold);
        if (harvestT >= 1) {
          pick(ripe);
          harvestIndex = null;
          harvestT = 0;
        }
      }
    } else {
      harvestIndex = null;
      harvestT = 0;
    }

    if (st.phase === "play") {
      if (nearShip) {
        const vague = WORLD.k35 && st.delivered > 0 ? ` · ${vagueDelivered()}` : "";
        hud.setPrompt(
          st.carried > 0
            ? input.touchActive
              ? `Topla · ${st.carried} lotusu gemiye ver`
              : `<b>E</b> teslim et`
            : WORLD.k35 && st.delivered >= LOTUS.target
              ? input.touchActive
                ? "Topla · ayrıl"
                : "<b>E</b> ayrıl"
              : `Gemi burada${vague}`,
        );
      } else if (cairn !== null) {
        hud.setPrompt(
          input.touchActive
            ? "Topla · rüzgâr taşına dokun"
            : "<b>E</b> rüzgâr taşı — rüzgârın sırasını izle",
        );
      } else if (offer !== null) {
        const room = LOTUS.carryCap - st.carried;
        hud.setPrompt(
          room <= 0
            ? "Elin dolu"
            : input.touchActive
              ? "Topla · uzatılanı tut"
              : "<b>E</b> uzatılanı tut",
        );
      } else if (gatedKind === "stones") {
        hud.setPrompt("Yaprak yolunu sona kadar izle");
      } else if (gatedKind === "hill") {
        hud.setPrompt("Kuzeydeki rüzgâr taşlarını çöz");
      } else if (ripe !== null) {
        if (st.carried >= LOTUS.carryCap) {
          hud.setPrompt("Sepet dolu — gemiye götür");
        } else if (harvestIndex !== null) {
          const filled = Math.round(harvestT * 5);
          const bar = "●".repeat(filled) + "○".repeat(5 - filled);
          hud.setPrompt(`Koparıyor ${bar}`);
        } else {
          hud.setPrompt(
            input.touchActive
              ? "Topla basılı tut · olgun lotusu kopar"
              : "<b>E</b> — topla",
          );
        }
      } else if (stones.hintNear(pos.x, pos.z) && !WORLD.k35) {
        hud.setPrompt("Taşlara basarak sırayla geç");
      } else if (hill.hintNear(pos.x, pos.z)) {
        hud.setPrompt(WORLD.k35 ? "<b>E</b> — bak" : "Rüzgârın işaret ettiği taşa dokun");
      } else {
        const look = WORLD.k35 ? lotophagoi.findLook(pos.x, pos.z) : null;
        hud.setPrompt(look !== null && lotophagoi.isWoman(look) ? "<b>E</b> — bak" : null);
      }

      if (WORLD.k35 && !hillVistaSeen && pos.y >= BEAUTY.hillViewHeight) {
        hillVistaSeen = true;
        hud.say("On iki direk. Beşi uyanırsa kalkarız.");
      }

      if (input.interact) {
        if (nearShip) {
          if (st.carried > 0) deliver();
          else if (WORLD.k35 && st.delivered >= LOTUS.target) startDepart();
        } else if (cairn !== null) {
          const out = hill.interact(cairn);
          if (out === "done") {
            if (WORLD.k35) {
              ship.addKeepsake("cairn");
              hud.say("Taş güvertede duracak.");
            } else {
              hud.say("Rüzgâr yolu açıldı — kuzey lotusları serbest");
            }
            bursts.spawnPop(
              new THREE.Vector3(pos.x, pos.y + 1.2, pos.z),
              PALETTE.lotusHeart,
              22,
            );
            pulseBloom(0.45);
          } else if (out === "wrong") {
            hud.say("Rüzgâr başka taşı işaret ediyor");
          }
        } else if (offer !== null) acceptGift(offer);
      }
    } else {
      hud.setPrompt(null);
    }

    const turnK = 1 - Math.exp(-dt / PLAYER.turnSmooth);
    if (harvestIndex !== null && ripe !== null) {
      const p = field.positionOf(ripe);
      let d = Math.atan2(p.x - pos.x, p.z - pos.z) - facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      facing += d * turnK;
    } else if (wish.lengthSq() > 0.001) {
      let d = Math.atan2(wish.x, wish.z) - facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      facing += d * turnK;
    }
    sailor.root.rotation.y = facing + (SAILOR.meshEnabled ? SAILOR.meshFacing : 0);

    if (st.phase === "play") {
      // Lotus Adası only — gdd-lotus-hallucination.md. Contact is a one-shot
      // memory spike + temporary drift amplification, never a speed/inventory
      // hit (the "not an enemy" contract, §1).
      const contactAt = hallucinations.update(dt, time, st.memory, pos, ship.anchor);
      if (contactAt) {
        st.memory = Math.min(1, st.memory + HALLUCINATION.contactMemSpike);
        driftTimer = HALLUCINATION.driftSpikeDuration;
        bursts.spawnPop(contactAt, PALETTE.hallucination, 14);
        audio.hallucinationTouch();
      }
      updateMemory(dt);
    }

    // ----------------------------------------------------------- guide arrow
    const guideOn =
      st.phase === "play" && st.memory < MEMORY.blindThreshold && !nearShip;
    guide.visible = guideOn;
    if (guideOn) {
      const fade = 1 - st.memory / MEMORY.blindThreshold;
      guide.position.set(pos.x, pos.y + 2.35 + Math.sin(time * 2) * 0.07, pos.z);
      guide.rotation.y = Math.atan2(ship.anchor.x - pos.x, ship.anchor.z - pos.z);
      (guideArrow.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + fade * 0.8;
      (guideGlow.material as THREE.SpriteMaterial).opacity = 0.2 + fade * 0.4;
    }

    // -------------------------------------------------------------- departure
    if (st.phase === "departing") {
      st.depart = Math.min(1, st.depart + dt / FLOW.departSeconds);
      sailor.root.visible = st.depart < 0.35;
      st.memory = Math.max(0, st.memory - dt * 0.35);
      if (st.depart >= 1) {
        st.phase = "won";
      }
    }
    if (st.phase === "won") {
      if (!wonSoundPlayed) {
        wonSoundPlayed = true;
        audio.win();
      }
      hud.showCard(
        "won",
        "İthake'ye doğru",
        WORLD.k35
          ? "Ada arkamızda küçüldü. Kimse dönüp bakmadı. Bakmamak için."
          : `${st.delivered} olgun lotus ambarda. Unutuşu geride bıraktın.`,
        { restart: true },
      );
      if (input.interact || input.wantsRestart) goHub();
    }

    // ------------------------------------------------------------------ audio
    const coast = islandRadiusAt(pos.x, pos.z);
    const rNow = Math.hypot(pos.x, pos.z);
    const nearSea = Math.min(1, Math.max(0, 1 - (coast - rNow) / 8));
    audio.setWaveProximity(nearSea, st.dayTime / DAY.length);
    const haze = Math.pow(st.memory, MEMORY.hazeGamma) * MEMORY.hazeMax;
    audio.setHaze(haze);

    // ------------------------------------------------------------------ frame
    focus.set(pos.x, pos.y, pos.z);
    if (st.phase === "departing" || st.phase === "won") {
      focus.set(ship.anchor.x, ship.anchor.y + 2, ship.anchor.z);
    }
    // Ease the camera up and back the closer the player stands to a
    // harvestable bloom, so the sailor's body doesn't block it at the moment
    // of picking (playtest bug: "toplarken karakter çiçeği kapatıyor").
    let camLift = 0;
    let camPullback = 0;
    if (ripe !== null) {
      const p = field.positionOf(ripe);
      const closeness = Math.max(0, 1 - Math.hypot(p.x - pos.x, p.z - pos.z) / CAMERA.pickRevealRange);
      const pull = Math.max(closeness, harvestT);
      camLift = CAMERA.pickRevealLift * pull;
      camPullback = CAMERA.pickRevealPullback * pull;
    }
    const topGait = PLAYER.speed * (running ? PLAYER.runSpeedMul : 1);
    const wishGait = wish.lengthSq() > 0.001 ? 1 : 0;
    const speedGait = Math.min(1, speed / Math.max(0.001, topGait));
    sailor.update(
      time,
      dt,
      Math.max(wishGait, speedGait),
      vel.x,
      vel.z,
      rig.yaw,
      harvestT,
      running,
    );
    rig.update(focus, dt, camLift, camPullback);
    sea.update(time);
    terrain.update(time);
    field.update(dt, time, {
      playerX: pos.x,
      playerZ: pos.z,
      shipX: ship.anchor.x,
      shipZ: ship.anchor.z,
    });
    updateHillPuzzleVisuals(hill, time);
    ship.update(time, st.depart);
    lotophagoi.update(dt, time, pos, ship.anchor);
    bursts.update(dt);

    stage.haze.amount = haze;
    stage.haze.time = time;
    hud.update(st, haze);

    input.endFrame();
  }

  let acc = 0;
  let last = performance.now();
  /**
   * Freeze seam for screenshot regression. When set, step() and the sailor
   * billboard spring stop running, so every time-driven uniform (haze.time,
   * sea, field, bloom) holds its last value and composer.render() produces a
   * byte-identical frame on every rAF tick. Nothing outside the DEV-gated test
   * hooks can set this.
   */
  let frozen = false;
  const loop = (now: number) => {
    const frameMs = Math.min(now - last, 250);
    last = now;
    if (!frozen) {
      acc += frameMs;
      let guard = 0;
      while (acc >= STEP && guard++ < 5) {
        acc -= STEP;
        step();
      }
      sailor.faceCamera(stage.camera, Math.min(frameMs / 1000, 0.05));
    }
    stage.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.getElementById("loading")?.classList.add("gone");

  // Gating the RETURN (not just main.ts's window assignment) is what actually
  // keeps the hooks out of the bundle. With only main.ts gated, Rollup dropped
  // the window property name but still emitted this object literal and every
  // closure it names — unreachable, but shipped. `import.meta.env.DEV` is a
  // static false in a production build, so everything below is dead code.
  if (!import.meta.env.DEV) return null;

  return {
    getState: () => ({ ...st }),
    setPhase(phase, opts) {
      if (phase === "title") goTitle();
      else if (phase === "hub") goHub();
      else fullRestart(opts?.kind ?? "classic", opts?.seed);
    },
    setProfile(profile) {
      // Deliberately a reload, not a mutation: constants.ts resolves
      // ACTIVE_PROFILE once at module load and every world builder captured
      // profile-dependent values at construction time. Flipping it in place
      // would desync the island geometry from the tuning numbers.
      const url = new URL(window.location.href);
      url.searchParams.set("profile", profile);
      window.location.replace(url.toString());
    },
    setMemory(v) {
      st.memory = Math.min(1, Math.max(0, v));
    },
    seedRandom(seed) {
      // Overwrites the global Math.random with mulberry32. Screenshot
      // regression is impossible otherwise: burst.ts alone draws 21 random
      // numbers per spawn, and the hallucination/NPC lifecycles draw more.
      // DEV-only by construction — nothing outside the test hooks reaches it.
      let a = seed >>> 0;
      Math.random = () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    },
    resetClock() {
      // fullRestart() rebuilds the world but deliberately does not touch the
      // running world clock — so the scrolling caustic/foam UVs, the sun angle
      // and the bloom boost carry over from before the restart. Harmless in
      // play, fatal for screenshot comparison: it was the entire 8-16% diff.
      // Test-only, so the restart's real semantics stay unchanged.
      time = 0;
      st.dayTime = 0;
      stage.bloomBoost = 0;
    },
    runSteps(n) {
      // Advances simulation by an exact step count instead of a wall-clock
      // wait. `await page.waitForTimeout(1200)` executes a *variable* number
      // of 60 Hz steps depending on machine load, which is what made the first
      // baseline attempt differ by 8-18% between runs.
      for (let i = 0; i < n; i++) {
        step();
        sailor.faceCamera(stage.camera, STEP / 1000);
      }
    },
    freeze() {
      frozen = true;
    },
    unfreeze() {
      frozen = false;
      last = performance.now();
      acc = 0;
    },
    lookAt(x, y, z) {
      stage.camera.lookAt(x, y, z);
    },
  };
}
