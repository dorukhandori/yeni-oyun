import * as THREE from "three";
import {
  CAMERA,
  DAY,
  FEEL,
  FLOW,
  LAGOON,
  LOTOPHAGOS,
  LOTUS,
  MEMORY,
  PALETTE,
  PLAYER,
  PUZZLE,
  SHIP,
  STEP,
} from "./constants";
import { CameraRig } from "./render/cameraRig";
import { createStage } from "./render/stage";
import { GameAudio } from "./systems/audio";
import { Bursts } from "./systems/burst";
import { Input } from "./systems/input";
import type { GameState } from "./types";
import { Hud } from "./ui/hud";
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

  const rig = new CameraRig(stage.camera, (x, z) => Math.max(heightAt(x, z), 0));
  rig.snap(pos);

  const input = new Input();
  input.attach(canvas);
  const hud = new Hud(input.touchActive);

  const unlockAudio = () => audio.unlock();
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  const st: GameState = {
    phase: "play",
    carried: 0,
    delivered: 0,
    memory: 0.08,
    lostTimer: 0,
    depart: 0,
    cardTimer: 0,
    dayTime: 0,
  };

  const fwd = new THREE.Vector3();
  const rightV = new THREE.Vector3();
  const wish = new THREE.Vector3();
  const focus = new THREE.Vector3();
  let time = 0;

  const shipDist = () => Math.hypot(ship.anchor.x - pos.x, ship.anchor.z - pos.z);

  function pulseBloom(amount: number): void {
    stage.bloomBoost = Math.min(1.2, stage.bloomBoost + amount);
  }

  function respawnAtShip(): void {
    pos.set(PLAYER.spawn.x, 0, PLAYER.spawn.z);
    pos.y = standY(pos.x, pos.z);
    vel.set(0, 0, 0);
    st.carried = 0;
    st.memory = MEMORY.resetTo;
    st.lostTimer = 0;
    st.phase = "play";
    prevGroundY = pos.y;
    sailor.setCarried(0);
    sailor.root.visible = true;
    rig.yaw = CAMERA.yawStart;
    rig.snap(pos);
  }

  function lotusGates(): LotusGateState {
    return { stonesOpen: stones.isOpen(), hillOpen: hill.isOpen() };
  }

  function fullRestart(): void {
    hud.hideCard();
    ship.reset();
    field.reset();
    stones.reset();
    hill.reset();
    lotophagoi.reset();
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
    pos.set(PLAYER.spawn.x, 0, PLAYER.spawn.z);
    pos.y = standY(pos.x, pos.z);
    vel.set(0, 0, 0);
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
  }

  hud.setRestartHandler(fullRestart);

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
        st.phase = "lost";
        st.cardTimer = FLOW.lostCardSeconds;
        audio.lose();
      }
    } else {
      st.lostTimer = 0;
    }
  }

  function step(): void {
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
      if (input.interact || input.wantsRestart) fullRestart();
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
    const nr = Math.hypot(nx, nz);
    const limit = wadeLimitAt(nx, nz);
    if (nr > limit) {
      const s = limit / nr;
      nx *= s;
      nz *= s;
      vel.x *= 0.4;
      vel.z *= 0.4;
    }
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

    if (st.phase === "play") updateMemory(dt);

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
      if (input.interact || input.wantsRestart) fullRestart();
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
    sailor.update(time, dt, Math.min(1, speed / PLAYER.speed));
    rig.update(focus, dt);
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
