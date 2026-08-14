import * as THREE from "three";
import {
  CAMERA,
  DAY,
  FEEL,
  FLOW,
  HALLUCINATION,
  LAGOON,
  LOTOPHAGOS,
  LOTUS,
  MEMORY,
  PALETTE,
  PLAYER,
  PUZZLE,
  SHIP,
  STEP,
  WORLD,
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

export function startGame(canvas: HTMLCanvasElement): void {
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
    memory: 0.08,
    lostTimer: 0,
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
    prevGroundY = pos.y;
    sailor.setCarried(0);
    sailor.root.visible = true;
    rig.yaw = CAMERA.yawStart;
    rig.snap(pos);
  }

  function lotusGates(): LotusGateState {
    return { stonesOpen: stones.isOpen(), hillOpen: hill.isOpen() };
  }

  /** Full world reset + actually starts play. Only entry point into "play". */
  function fullRestart(): void {
    menu.hideAll();
    hud.hideCard();
    ship.reset();
    field.reset();
    stones.reset();
    hill.reset();
    lotophagoi.reset();
    hallucinations.reset();
    st.phase = "play";
    st.carried = 0;
    st.delivered = 0;
    st.memory = 0.08;
    st.lostTimer = 0;
    st.depart = 0;
    st.cardTimer = 0;
    st.dayTime = 0;
    wonSoundPlayed = false;
    duskSoundPlayed = false;
    warnSoundPlayed = false;
    boundaryHintTimer = 0;
    driftTimer = 0;
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
    sailor.root.rotation.y = facing;
    rig.yaw = CAMERA.yawStart;
    rig.snap(pos);
    stage.setDayProgress(0);
    hud.say("Yeni bir gün — on iki lotus");
    hud.startHintTimer();
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
    st.phase = "title";
    menu.showTitle();
  }

  const menu = new Menu({
    onPlay,
    onSelectLotus: fullRestart,
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
    if (st.delivered >= LOTUS.target) {
      st.phase = "departing";
      hud.say("Yeter bu kadar — yelken aç!");
    }
  }

  function pick(index: number): void {
    if (st.carried >= LOTUS.carryCap) {
      hud.say("Sepet dolu — gemiye götür");
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
  }

  function acceptGift(index: number): void {
    const room = LOTUS.carryCap - st.carried;
    const n = lotophagoi.accept(index, room);
    if (n <= 0) {
      if (room <= 0) hud.say("Sepet dolu — ikram alınamaz");
      return;
    }
    st.carried += n;
    sailor.setCarried(st.carried);
    st.memory = Math.min(1, st.memory + LOTOPHAGOS.memCost);
    const fig = lotophagoi.group.children[index] as THREE.Object3D | undefined;
    const at = fig
      ? new THREE.Vector3(fig.position.x, fig.position.y + 1.5, fig.position.z)
      : pos.clone();
    bursts.spawnPop(at, PALETTE.petalRipeTint, 20);
    bursts.spawn(at, PALETTE.lotusHeart, 8, 1.4);
    hud.say(`İkram: ${n} olgun lotus`);
    audio.gift();
    sailor.pulse(0.4);
    pulseBloom(0.35);
  }

  function updateMemory(dt: number): void {
    const r = Math.hypot(pos.x, pos.z);
    const nearShip = shipDist() < SHIP.range;
    const inSea = r > islandRadiusAt(pos.x, pos.z) - MEMORY.seaBand;

    let rate = MEMORY.islandGain + st.carried * MEMORY.perCarriedGain;
    if (inLagoon(pos.x, pos.z)) rate += MEMORY.lagoonGain;
    if (nearShip) rate = -MEMORY.shipRecover;
    else if (inSea) rate = -MEMORY.seaRecover;

    st.memory = Math.min(1, Math.max(0, st.memory + rate * dt));

    if (st.memory >= 0.999) {
      st.lostTimer += dt;
      if (st.lostTimer >= MEMORY.loseHold && st.phase === "play") {
        if (WORLD.lossMode === "gameOver") {
          st.phase = "gameover";
        } else {
          st.phase = "lost";
          st.cardTimer = FLOW.lostCardSeconds;
        }
        audio.lose();
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
      st.dayTime = Math.min(DAY.length, st.dayTime + dt);
      const remain = DAY.length - st.dayTime;
      if (!warnSoundPlayed && remain <= DAY.warnRemaining) {
        warnSoundPlayed = true;
        audio.warn();
      }
      if (st.dayTime >= DAY.length && st.delivered < LOTUS.target) {
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
    const topSpeed = PLAYER.speed * (wading ? PLAYER.waterSpeedMul : 1);
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
    pos.y += (groundY - pos.y) * Math.min(1, 14 * dt);
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
    if (speed > 0.4) {
      const want = Math.atan2(vel.x, vel.z);
      let d = want - facing;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      facing += d * PLAYER.turnLerp;
    }
    sailor.root.position.copy(pos);
    sailor.root.rotation.y = facing;
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

    if (st.phase === "play") {
      if (nearShip) {
        hud.setPrompt(
          st.carried > 0
            ? input.touchActive
              ? `Topla · ${st.carried} lotusu gemiye ver`
              : `<b>E</b> ${st.carried} lotusu gemiye ver`
            : "Gemi burada — olgun lotus getir",
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
            ? "Sepet dolu — önce gemiye git"
            : input.touchActive
              ? `Topla · ikramı al (${Math.min(LOTOPHAGOS.gift, room)} lotus)`
              : `<b>E</b> ikramı al (${Math.min(LOTOPHAGOS.gift, room)} lotus)`,
        );
      } else if (gatedKind === "stones") {
        hud.setPrompt("Yaprak yolunu sona kadar izle");
      } else if (gatedKind === "hill") {
        hud.setPrompt("Kuzeydeki rüzgâr taşlarını çöz");
      } else if (ripe !== null) {
        hud.setPrompt(input.touchActive ? "Topla · olgun lotusu kopar" : "<b>E</b> olgun lotusu topla");
      } else if (stones.hintNear(pos.x, pos.z)) {
        hud.setPrompt("Taşlara basarak sırayla geç");
      } else if (hill.hintNear(pos.x, pos.z)) {
        hud.setPrompt("Rüzgârın işaret ettiği taşa dokun");
      } else {
        hud.setPrompt(null);
      }

      if (input.interact) {
        if (nearShip) deliver();
        else if (cairn !== null) {
          const out = hill.interact(cairn);
          if (out === "done") {
            hud.say("Rüzgâr yolu açıldı — kuzey lotusları serbest");
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
        else if (ripe !== null) pick(ripe);
      }
    } else {
      hud.setPrompt(null);
    }

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
        `${st.delivered} olgun lotus ambarda. Unutuşu geride bıraktın.`,
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
      camLift = CAMERA.pickRevealLift * closeness;
      camPullback = CAMERA.pickRevealPullback * closeness;
    }
    sailor.update(time, dt, Math.min(1, speed / PLAYER.speed), vel.x, vel.z);
    rig.update(focus, dt, camLift, camPullback);
    sea.update(time);
    field.update(dt, time);
    updateHillPuzzleVisuals(hill, time);
    ship.update(time, st.depart);
    lotophagoi.update(time);
    bursts.update(dt);

    stage.haze.amount = haze;
    stage.haze.time = time;
    hud.update(st, haze);

    input.endFrame();
  }

  let acc = 0;
  let last = performance.now();
  const loop = (now: number) => {
    acc += Math.min(now - last, 250);
    last = now;
    let guard = 0;
    while (acc >= STEP && guard++ < 5) {
      acc -= STEP;
      step();
    }
    stage.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  document.getElementById("loading")?.classList.add("gone");
}
