import * as THREE from "three";
import type { TestHooks } from "../game";
import { CAMERA, PLAYER, SAILOR } from "../constants";
import { createStage } from "../render/stage";
import { CameraRig } from "../render/cameraRig";
import { Input } from "../systems/input";
import { GameAudio } from "../systems/audio";
import { isCoarsePointer } from "../ui/orientation";
import { createHumanoidActor, type HumanoidActor } from "../world/humanoidRig";
import { buildSirensWorld, straitToWorld } from "../world/sirensStrait";
import { crushShock, shockFlashAt, type CrushShock } from "./cyclopsRules";
import { HUB_URL, TITLE_URL, markCleared } from "./progress";
import { hideLotusMenus, mountPause } from "./stopChrome";
import {
  SIRENS_HULL_CAP,
  SIRENS_ROWERS,
  SIRENS_SAIL_SPEED,
  initialSirens,
  pluggedCount,
  sirensObjective,
  songIntensity,
  stepDeck,
  stepPassage,
  type SirensEvent,
  type SirensState,
} from "./sirensRules";

/**
 * Sirens Passage — the 3rd and last stop (docs/design/gdd-sirens-passage.md).
 * Own loop, like cyclopsStop.ts: reached only via `?stop=sirens`.
 * Deck (walk, wax, rowers, mast) → passage (steer the galley against the song).
 */

const PLAYER_DECK_SPEED = 2.6;
const PLAYER_DECK_RADIUS = 0.3;
const DECK_Y_FALLBACK = 1.2;
/** Lotus day-progress for the sky: warm late afternoon, before the rose. */
const SIRENS_DAY = 0.45;
const SHIP_BOB_AMPLITUDE = 0.12;
const PASSAGE_CAMERA_EXTRA_DIST = 14;
const PASSAGE_CAMERA_EXTRA_HEIGHT = 5;
const SONG_CAMERA_ROLL = 0.035;
const CAMERA_WALL_MARGIN = 0.4;
const CAMERA_MIN_BOOM = 0.8;
/** On deck the default boom sits inside the mast and sail — lift it and pull back. */
const DECK_CAMERA_EXTRA_DIST = 0.5;
const DECK_CAMERA_EXTRA_HEIGHT = 2.6;

export function startSirensStop(canvas: HTMLCanvasElement): TestHooks | null {
  hideLotusMenus();
  const stage = createStage(canvas);
  stage.setDayProgress(SIRENS_DAY);
  const { scene, camera } = stage;
  const world = buildSirensWorld(scene);

  // --------------------------------------------------------------- player
  const player = new THREE.Group();
  world.shipRoot.add(player);
  let playerActor: HumanoidActor | null = null;
  let playerFacing = 0;
  createHumanoidActor(SAILOR.meshRig, {
    heightMeters: SAILOR.height,
    expectedBytes: SAILOR.meshRigBytes,
    clipFade: SAILOR.meshClipFade,
  })
    .then((a) => {
      playerActor = a;
      player.add(a.scene);
    })
    .catch((err) => console.warn("[sirensStop] player rig failed to load", err));

  // 25 Eyl, sahip: "sirens'de de aynı kitleniyor" — fareyle çevirince kamera
  // direğin/yelkenin/gövdenin içine giriyor, görüntü ona kilitleniyordu.
  // Kiklop mağarasıyla aynı çözüm: odaktan kameraya ışın, ilk engelde dur.
  const camRay = new THREE.Raycaster();
  const camOrigin = new THREE.Vector3();
  const camDir = new THREE.Vector3();
  function collideCamera(pos: THREE.Vector3, focus: THREE.Vector3): void {
    const passage = st.stage === "passage" || st.stage === "clear";
    const colliders = world.cameraColliders(passage);
    if (colliders.length === 0) return;
    camOrigin.set(focus.x, focus.y + CAMERA.lookHeight, focus.z);
    camDir.subVectors(pos, camOrigin);
    const len = camDir.length();
    if (len < 1e-3) return;
    camDir.divideScalar(len);
    camRay.set(camOrigin, camDir);
    camRay.far = len + CAMERA_WALL_MARGIN;
    const hit = camRay.intersectObjects(colliders, false)[0];
    if (hit) pos.copy(camOrigin).addScaledVector(camDir, Math.max(CAMERA_MIN_BOOM, hit.distance - CAMERA_WALL_MARGIN));
  }
  const rig = new CameraRig(
    camera,
    () => 0,
    isCoarsePointer() ? CAMERA.distTouch : CAMERA.dist,
    (pos, focus) => collideCamera(pos, focus),
  );
  // Lotus's rest yaw looks toward −z; the galley sails +z — face the bow.
  rig.yaw = CAMERA.yawStart + Math.PI;
  const input = new Input();
  input.attach(canvas);
  const audio = new GameAudio();
  const unlockAudio = () => audio.unlock();
  window.addEventListener("pointerdown", unlockAudio, { once: true });
  window.addEventListener("keydown", unlockAudio, { once: true });

  // ------------------------------------------------------------------ HUD
  const hudRoot = document.getElementById("hud");
  if (!hudRoot) throw new Error("[sirensStop] #hud yok — index.html değişmiş");
  hudRoot.style.display = "";
  hudRoot.innerHTML = `
    <div class="panel quest">
      <div class="quest-title">Sirenler Geçidi</div>
      <div class="quest-line" id="sirObjective"></div>
    </div>
    <div class="prompt" id="sirPrompt"></div>
    <div class="hint" id="sirHint">WASD yürü · fare kamera · <b>E</b> al / etkileş · geçitte <b>A/D</b> dümen</div>
    <div class="cyc-detect sir-song" id="sirSong" aria-hidden="true"></div>
    <div class="cyc-shock" id="sirShock" aria-hidden="true"></div>
    <div class="card lost" id="sirLost" role="dialog" aria-labelledby="sirLostTitle">
      <h1 id="sirLostTitle">Battın</h1>
      <p>Gemi Sirenlerin kayalarında parçalandı. Şarkı hâlâ sürüyor.</p>
      <div class="card-actions">
        <button type="button" class="card-btn" id="sirLostAgain">Yeniden Dene</button>
        <button type="button" class="card-btn" id="sirLostHub">Haritaya dön</button>
      </div>
    </div>
    <div class="card" id="sirEnd" role="dialog" aria-labelledby="sirEndTitle">
      <h1 id="sirEndTitle">Ithaka'ya</h1>
      <p>Şarkı arkada kaldı. Tayfa ipleri çözdü; kimse ne duyduğunu sormadı.
Önde, çok uzakta, ince bir duman yükseliyor — belki bir ocak, belki bir ev.</p>
      <ul class="card-stats" id="sirEndStats"></ul>
      <p class="card-verdict">Lotophagoi — yolculuk burada biter. Oynadığın için teşekkürler.</p>
      <p class="card-key" id="sirEndSave" hidden></p>
      <div class="card-actions">
        <button type="button" class="card-btn" id="sirEndHub">Haritaya dön</button>
        <button type="button" class="card-btn" id="sirEndAgain">Yeniden Oyna</button>
      </div>
    </div>
  `;
  const el = (id: string): HTMLElement => {
    const found = document.getElementById(id);
    if (!found) throw new Error(`[sirensStop] HUD parçası yok: ${id}`);
    return found;
  };
  const objectiveEl = el("sirObjective");
  const promptEl = el("sirPrompt");
  const hintEl = el("sirHint");
  const songEl = el("sirSong");
  const shockEl = el("sirShock");
  const lostCard = el("sirLost");
  const endCard = el("sirEnd");
  hintEl.style.opacity = "1";
  window.setTimeout(() => (hintEl.style.opacity = "0"), 12000);

  function leaveTo(url: string): void {
    audio.setSirenSong(0);
    window.location.href = url;
  }
  el("sirLostAgain").addEventListener("click", () => reset());
  el("sirLostHub").addEventListener("click", () => leaveTo(HUB_URL));
  el("sirEndHub").addEventListener("click", () => leaveTo(HUB_URL));
  el("sirEndAgain").addEventListener("click", () => reset());

  // ---------------------------------------------------------------- state
  let st: SirensState = initialSirens();
  let lost = false;
  let won = false;
  let simTime = 0;
  let runSeconds = 0;
  let message = "";
  let messageT = 0;
  let shock: CrushShock | null = null;
  let shockAge = 0;
  /** DEV-only rudder override (see __SIRENS_DEBUG__.setSteer). */
  let steerOverride: number | null = null;
  const local = new THREE.Vector3(0, DECK_Y_FALLBACK, 2);
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();

  const pause = mountPause(input, {
    onRestart: () => reset(),
    onHub: () => leaveTo(HUB_URL),
    onTitle: () => leaveTo(TITLE_URL),
    canPause: () => !lost && !won,
  });

  function say(msg: string, seconds = 3): void {
    message = msg;
    messageT = seconds;
  }

  function placeShip(): void {
    const w = straitToWorld(st.ship);
    world.shipRoot.position.set(w.x, Math.sin(simTime * 0.9) * SHIP_BOB_AMPLITUDE, w.z);
    world.shipRoot.rotation.y = Math.atan2(st.vx, SIRENS_SAIL_SPEED) * 0.8;
    world.shipRoot.rotation.z = Math.sin(simTime * 0.7) * 0.015;
  }

  function reset(): void {
    st = initialSirens();
    lost = false;
    won = false;
    runSeconds = 0;
    shock = null;
    message = "";
    messageT = 0;
    local.set(0, DECK_Y_FALLBACK, 2);
    playerFacing = 0;
    for (let i = 0; i < SIRENS_ROWERS; i++) world.setRowerPlugged(i, false);
    world.setWaxVisible(true);
    world.setKneadGlow(0);
    lostCard.classList.remove("on");
    endCard.classList.remove("on");
    placeShip();
    player.position.copy(local);
    rig.snap(player.getWorldPosition(new THREE.Vector3()));
  }

  function onEvent(ev: SirensEvent): void {
    switch (ev) {
      case "waxTaken":
        audio.pick();
        world.setWaxVisible(false);
        say("Bal peteğinden bir topak balmumu kestin.");
        break;
      case "waxKneaded":
        audio.gift();
        say("Mum güneşte yumuşadı.");
        break;
      case "plugged":
        audio.pick();
        st.plugged.forEach((p, i) => world.setRowerPlugged(i, p));
        say(`Kulakları tıkandı (${pluggedCount(st)}/${SIRENS_ROWERS}).`);
        break;
      case "bound":
        audio.board();
        local.set(world.deck.mast.x, local.y, world.deck.mast.z - 0.35);
        playerFacing = 0;
        say("Tayfa seni direğe bağladı. Kürekler suya!", 4);
        break;
      case "hit":
        shock = crushShock(Math.min(st.hull, SIRENS_HULL_CAP));
        shockAge = 0;
        rig.kick(shock.shake);
        audio.roar(shock.roar * 0.6);
        say("Gövde kayaya sürtündü!");
        break;
      case "sunk":
        lost = true;
        lostCard.classList.add("on");
        audio.setSirenSong(0.3);
        audio.lose();
        document.exitPointerLock?.();
        el("sirLostAgain").focus();
        break;
      case "cleared": {
        won = true;
        const { saved } = markCleared("sirens");
        const m = Math.floor(runSeconds / 60);
        const s = Math.floor(runSeconds % 60);
        el("sirEndStats").replaceChildren(
          ...[`Kulağı tıkanan kürekçi: ${SIRENS_ROWERS} / ${SIRENS_ROWERS}`, `Gövde yarası: ${st.hull}`, `Süre: ${m}:${String(s).padStart(2, "0")}`].map(
            (line) => {
              const li = document.createElement("li");
              li.textContent = line;
              return li;
            },
          ),
        );
        const saveEl = el("sirEndSave");
        saveEl.hidden = saved;
        saveEl.textContent = saved ? "" : "İlerleme bu tarayıcıya kaydedilemedi.";
        endCard.classList.add("on");
        audio.setSirenSong(0);
        audio.win();
        document.exitPointerLock?.();
        el("sirEndHub").focus();
        break;
      }
    }
  }

  function stepDeckPhase(dt: number): void {
    rig.forward(fwd);
    rig.right(right);
    const wish = fwd.clone().multiplyScalar(input.moveZ()).addScaledVector(right, input.moveX());
    const moving = st.stage === "prep" && wish.lengthSq() > 0.0025;
    if (moving) {
      wish.normalize();
      local.x += wish.x * PLAYER_DECK_SPEED * dt;
      local.z += wish.z * PLAYER_DECK_SPEED * dt;
      const d = world.deck;
      local.x = Math.max(-d.halfBeam + PLAYER_DECK_RADIUS, Math.min(d.halfBeam - PLAYER_DECK_RADIUS, local.x));
      local.z = Math.max(-d.halfLength, Math.min(d.halfLength, local.z));
      const target = Math.atan2(wish.x, wish.z);
      let fd = target - playerFacing;
      while (fd > Math.PI) fd -= Math.PI * 2;
      while (fd < -Math.PI) fd += Math.PI * 2;
      playerFacing += fd * (1 - Math.exp(-dt / PLAYER.turnSmooth));
    }
    const y = world.deckY({ x: local.x, z: local.z });
    if (y !== null) local.y = y;
    playerActor?.play(moving ? "walk" : "idle");

    const res = stepDeck(st, {
      dt,
      player: { x: local.x, z: local.z },
      interact: input.interact,
      interactHeld: input.interactHeld,
      honeycomb: world.deck.honeycomb,
      kneadSpot: world.deck.kneadSpot,
      rowers: world.deck.rowers,
      mast: world.deck.mast,
    });
    st = res.state;
    res.events.forEach(onEvent);
    world.setKneadGlow(st.hasWax && st.knead < 1 ? 0.4 + 0.6 * st.knead : 0);
    if (st.hasWax && st.knead > 0 && st.knead < 1 && input.interactHeld) {
      message = "Mumu yoğuruyorsun…";
      messageT = 0.2;
    }
  }

  function stepPassagePhase(dt: number): void {
    playerActor?.play("idle");
    const steer = steerOverride ?? input.moveX();
    const res = stepPassage(st, { dt, steer, rocks: world.rocks });
    st = res.state;
    res.events.forEach(onEvent);
  }

  function step(dt: number): void {
    if (input.wantsPause && !lost && !won) pause.toggle();
    if (lost || won || pause.paused) {
      input.endFrame();
      return;
    }
    simTime += dt;
    runSeconds += dt;
    if (shock) shockAge += dt;
    if (messageT > 0) messageT -= dt;

    const sens = input.touchActive ? CAMERA.touchSens : CAMERA.mouseSens;
    const md = input.mouseDelta();
    rig.rotate(md.x * sens, md.y * sens);
    rig.rotate(input.yawKeys() * CAMERA.keySens, input.pitchKeys() * CAMERA.keySens * 0.6);

    if (st.stage === "prep" || st.stage === "bind") stepDeckPhase(dt);
    else if (st.stage === "passage") stepPassagePhase(dt);

    placeShip();
    player.position.copy(local);
    player.rotation.y = playerFacing + SAILOR.meshFacing;
    playerActor?.update(dt);

    const song = st.stage === "passage" ? songIntensity(st.ship) : 0;
    audio.setSirenSong(song);
    const focus = player.getWorldPosition(new THREE.Vector3());
    if (st.stage === "passage") {
      rig.update(focus, dt, PASSAGE_CAMERA_EXTRA_HEIGHT, PASSAGE_CAMERA_EXTRA_DIST);
      camera.rotateZ(Math.sin(simTime * 0.8) * SONG_CAMERA_ROLL * song);
    } else {
      rig.update(focus, dt, DECK_CAMERA_EXTRA_HEIGHT, DECK_CAMERA_EXTRA_DIST);
    }
    world.update(simTime, dt, song, camera.position);
    stage.skyTime = simTime;

    const objective = sirensObjective(st);
    objectiveEl.textContent = objective ?? "";
    if (promptEl.textContent !== message) promptEl.textContent = message;
    promptEl.classList.toggle("on", messageT > 0);
    songEl.style.opacity = (song * 0.8).toFixed(3);
    shockEl.style.opacity = shock ? shockFlashAt(shock, shockAge).toFixed(3) : "0";
    input.endFrame();
  }

  function onResize(): void {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    stage.renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener("resize", onResize);
  onResize();
  reset();

  let last = performance.now();
  function tick(): void {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    step(dt);
    stage.render();
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  document.getElementById("loading")?.classList.add("gone");

  if (import.meta.env.DEV) {
    (window as unknown as Record<string, unknown>).__SIRENS_DEBUG__ = {
      step: (dt = 1 / 60, n = 1) => {
        for (let i = 0; i < n; i++) step(dt);
      },
      state: () => ({ ...st, lost, won, local: { x: local.x, y: local.y, z: local.z }, hullLoaded: world.hullLoaded() }),
      teleportDeck: (x: number, z: number) => {
        local.x = x;
        local.z = z;
      },
      setShipX: (x: number) => {
        st = { ...st, ship: { ...st.ship, x } };
      },
      rotateCamera: (yaw: number, pitch = 0) => rig.rotate(yaw, pitch),
      rocks: () => world.rocks,
      crew: () => world.debugCrew(),
      /** Drive the rudder without a keyboard (DEV bots/tests). */
      setSteer: (v: number) => {
        steerOverride = v;
      },
      render: () => stage.render(),
    };
  }
  return null;
}
