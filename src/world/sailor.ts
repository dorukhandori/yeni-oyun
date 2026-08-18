import * as THREE from "three";
import { LOTUS, PALETTE, SAILOR } from "../constants";
import { assetUrl } from "../assets/paths";
import { glowSprite, loadAlbedoTexture } from "./sprite";
import {
  cloneGltfBundle,
  fitGltfHeight,
  lightGltf,
  loadGltf,
  loadGltfBundle,
  pinClipBonePositions,
  restBonePositions,
} from "./gltf";

export interface Sailor {
  root: THREE.Group;
  update(
    t: number,
    dt: number,
    moving: number,
    velX?: number,
    velZ?: number,
    camYaw?: number,
    harvest?: number,
    running?: boolean,
  ): void;
  /** Y-billboard lock — call every render frame from the real camera. */
  faceCamera(camera: THREE.Camera, dt: number): void;
  setCarried(n: number): void;
  pulse(strength: number): void;
  land(strength: number): void;
}

type Cardinal = "front" | "right" | "left" | "back";
type View =
  | Cardinal
  | "frontRight"
  | "frontLeft"
  | "backRight"
  | "backLeft";
/** Sheets we actually author; left / left-diagonals are UV-flips of these. */
type SheetKey = "front" | "right" | "back" | "frontRight" | "backRight";

const IDLE_VIEWS: Cardinal[] = ["front", "right", "left", "back"];

/**
 * 8-way octants in `facing - camYaw`, a=0 looking at camera.
 * Positive a = character's left toward the lens (screen-right strafe → left).
 * W+D lands in backLeft (~3π/4), not on a 4-way knife edge.
 */
const OCTANTS: View[] = [
  "front",
  "frontLeft",
  "left",
  "backLeft",
  "back",
  "backRight",
  "right",
  "frontRight",
];

/**
 * ASSET-001 turnaround, edge-flood keyed into four directional stills
 * (ASSET-041..044). Upright Y-billboard — not THREE.Sprite, which pitches
 * toward the shoulder camera and lifts the feet off the ground.
 * Walk: ASSET-024 / 045 / 046 + optional front-right / back-right.
 * Run: ASSET-047. Draft, sahip eye-pass pending.
 */
const VIEW_TEX: Record<Cardinal, string> = {
  front: "assets/sprites/char_doryseus_front_01_albedo_512.png",
  right: "assets/sprites/char_doryseus_right_01_albedo_512.png",
  left: "assets/sprites/char_doryseus_left_01_albedo_512.png",
  back: "assets/sprites/char_doryseus_back_01_albedo_512.png",
};

const WALK_TEX: Partial<Record<SheetKey, string>> = {
  front: "assets/spritesheets/char_doryseus_walk_front_01_sheet_2048.png",
  right: "assets/spritesheets/char_doryseus_walk_right_01_sheet_2048.png",
  back: "assets/spritesheets/char_doryseus_walk_back_01_sheet_2048.png",
  frontRight: "assets/spritesheets/char_doryseus_walk_front_right_01_sheet_2048.png",
  backRight: "assets/spritesheets/char_doryseus_walk_back_right_01_sheet_2048.png",
};

const RUN_TEX: Partial<Record<SheetKey, string>> = {
  front: "assets/spritesheets/char_doryseus_run_front_01_sheet_2048.png",
  right: "assets/spritesheets/char_doryseus_run_right_01_sheet_2048.png",
  back: "assets/spritesheets/char_doryseus_run_back_01_sheet_2048.png",
};

const HARVEST_TEX: Partial<Record<Cardinal, string>> = {
  back: "assets/spritesheets/char_doryseus_harvest_back_01_sheet_2048.png",
};

function wrapPi(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function viewFrom(facing: number, camYaw: number, current: View): View {
  if (!Number.isFinite(facing) || !Number.isFinite(camYaw)) {
    return current;
  }
  const a = wrapPi(facing - camYaw);
  const u = a < 0 ? a + Math.PI * 2 : a;
  if (!Number.isFinite(u)) return current;
  const oct = (((Math.round(u / (Math.PI / 4)) % 8) + 8) % 8);
  const raw = OCTANTS[oct] ?? "back";
  if (raw === current) return current;
  const curIdx = OCTANTS.indexOf(current);
  if (curIdx < 0) return raw;
  const center = wrapPi(curIdx * (Math.PI / 4));
  if (Math.abs(wrapPi(a - center)) < Math.PI / 8 + SAILOR.viewHold) return current;
  return raw;
}

function sheetSrc(v: View): { key: SheetKey; idle: Cardinal; flip: number } {
  switch (v) {
    case "front":
      return { key: "front", idle: "front", flip: 1 };
    case "back":
      return { key: "back", idle: "back", flip: 1 };
    case "right":
      return { key: "right", idle: "right", flip: 1 };
    case "left":
      return { key: "right", idle: "left", flip: -1 };
    case "frontRight":
      return { key: "frontRight", idle: "right", flip: 1 };
    case "frontLeft":
      return { key: "frontRight", idle: "left", flip: -1 };
    case "backRight":
      return { key: "backRight", idle: "right", flip: 1 };
    case "backLeft":
      return { key: "backRight", idle: "left", flip: -1 };
    default:
      return { key: "back", idle: "back", flip: 1 };
  }
}

function texReady(tex: THREE.Texture | undefined): tex is THREE.Texture {
  if (!tex) return false;
  const img = tex.image as { width?: number; naturalWidth?: number; height?: number } | undefined;
  const w = img?.naturalWidth ?? img?.width ?? 0;
  const h = img?.height ?? 0;
  return Number.isFinite(w) && Number.isFinite(h) && w > 1 && h > 1;
}

function applySheet(tex: THREE.Texture, frames: number, frame: number, flip: number): void {
  const n = Math.max(1, Math.floor(Number(frames)) || 1);
  const fr = (((Math.floor(Number(frame)) % n) + n) % n);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  const col = 1 / n;
  const img = tex.image as { width?: number } | undefined;
  const imgW = img?.width && img.width > 0 ? img.width : 2048;
  const inset = 0.5 / Math.max(n * 2, imgW);
  const span = col - 2 * inset;
  if (!(span > 0) || !Number.isFinite(span) || !Number.isFinite(fr)) {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
    return;
  }
  if (flip < 0) {
    tex.repeat.set(-span, 1);
    tex.offset.set((fr + 1) * col - inset, 0);
  } else {
    tex.repeat.set(span, 1);
    tex.offset.set(fr * col + inset, 0);
  }
  if (!Number.isFinite(tex.repeat.x) || !Number.isFinite(tex.offset.x)) {
    tex.repeat.set(1, 1);
    tex.offset.set(0, 0);
  }
}

function sheetFrameCount(tex: THREE.Texture): number {
  const img = tex.image as { width?: number; height?: number } | undefined;
  const w = img?.width ?? 0;
  const h = img?.height ?? 0;
  if (!(w >= 16) || !(h >= 16) || !Number.isFinite(w) || !Number.isFinite(h)) {
    return Math.max(1, SAILOR.walkFrames);
  }
  const n = Math.round(w / h);
  return Number.isFinite(n) && n >= 1 ? n : Math.max(1, SAILOR.walkFrames);
}

const uvTwins = new WeakMap<THREE.Texture, THREE.Texture>();
function uvTwin(tex: THREE.Texture): THREE.Texture {
  let c = uvTwins.get(tex);
  if (!c) {
    try {
      c = tex.clone();
      c.generateMipmaps = false;
      uvTwins.set(tex, c);
    } catch {
      return tex;
    }
  }
  return c;
}

function smooth01(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

function makeMat(map: THREE.Texture): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    map,
    color: SAILOR.sunTint,
    roughness: SAILOR.roughness,
    metalness: SAILOR.metalness,
    emissive: SAILOR.emissive,
    emissiveIntensity: SAILOR.emissiveIntensity,
    transparent: true,
    opacity: 1,
    alphaTest: 0.32,
    depthWrite: true,
    side: THREE.FrontSide,
    fog: true,
  });
  // Half-Lambert wrap so a camera-facing plane is never black when the
  // island sun sits behind the camera (N points at the lens, L at the sun).
  const wrap = SAILOR.wrapLight.toFixed(3);
  mat.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.split(
      "float dotNL = saturate( dot( normal, lightDir ) );",
    ).join(`float dotNL = saturate( dot( normal, lightDir ) * ${wrap} + (1.0 - ${wrap}) );`);
  };
  return mat;
}

function loadSheet(url: string): THREE.Texture {
  const tex = loadAlbedoTexture(assetUrl(url));
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.repeat.set(1 / Math.max(1, SAILOR.walkFrames), 1);
  return tex;
}

export function buildSailor(): Sailor {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const hips = new THREE.Group();
  const card = new THREE.Group();
  root.add(body);
  body.add(hips);
  hips.add(card);
  if (SAILOR.meshEnabled) {
    console.info("[sailor] playable body is the rigged GLB");
  }

  const hipY = SAILOR.height * SAILOR.harvestHip;
  const meshHold = new THREE.Group();
  meshHold.visible = false;
  body.add(meshHold);
  let meshLive = false;
  let mixer: THREE.AnimationMixer | null = null;
  let clipName: "idle" | "walk" | "run" | "harvest" = "idle";
  const acts: Partial<Record<"idle" | "walk" | "run" | "harvest", THREE.AnimationAction>> = {};

  const pickClip = (clips: THREE.AnimationClip[], keys: string[]) => {
    for (const key of keys) {
      const hit = clips.find((c) => c.name.toLowerCase().includes(key));
      if (hit) return hit;
    }
    return undefined;
  };

  const mountMesh = (scene: THREE.Group, clips: THREE.AnimationClip[]) => {
    lightGltf(scene);
    scene.traverse((obj) => {
      const skinned = obj as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh) skinned.frustumCulled = false;
    });
    const rest = restBonePositions(scene);
    scene.rotation.set(0, 0, 0);
    fitGltfHeight(scene, SAILOR.height);
    while (meshHold.children.length > 0) meshHold.remove(meshHold.children[0]);
    meshHold.position.set(0, SAILOR.meshYLift, 0);
    meshHold.rotation.set(0, SAILOR.meshYaw, 0);
    meshHold.add(scene);
    meshHold.visible = true;
    meshLive = true;
    card.visible = false;
    mixer = null;
    acts.idle = acts.walk = acts.run = acts.harvest = undefined;
    if (clips.length > 0) {
      mixer = new THREE.AnimationMixer(scene);
      const idleSrc = pickClip(clips, ["idle", "wait", "stand"]) ?? clips[0];
      const walkSrc = pickClip(clips, ["walk"]) ?? clips[Math.min(1, clips.length - 1)];
      const runSrc = pickClip(clips, ["run", "sprint"]) ?? walkSrc;
      // No exact "pick/harvest" preset exists in Tripo's biped catalog
      // (checked 2026-08-18: 90+ presets, nothing named pick/gather/harvest).
      // `preset:biped:dig` is the closest physical match — a repeated
      // bend-and-reach toward the ground — so it stands in for "koparma"
      // until/unless a bespoke Blender clip replaces it (LOT-37).
      const harvestSrc = pickClip(clips, ["dig", "harvest", "pick", "gather"]);
      const idleClip = idleSrc ? pinClipBonePositions(idleSrc, rest) : undefined;
      const walkClip = walkSrc ? pinClipBonePositions(walkSrc, rest) : undefined;
      const runClip = runSrc ? pinClipBonePositions(runSrc, rest) : undefined;
      const harvestClip = harvestSrc ? pinClipBonePositions(harvestSrc, rest) : undefined;
      if (idleClip) acts.idle = mixer.clipAction(idleClip);
      if (walkClip) acts.walk = mixer.clipAction(walkClip);
      if (runClip) acts.run = mixer.clipAction(runClip);
      if (harvestClip) acts.harvest = mixer.clipAction(harvestClip);
      for (const action of Object.values(acts)) {
        if (!action) continue;
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
      acts.idle?.play();
      mixer.update(0);
      clipName = "idle";
    }
  };

  if (SAILOR.meshEnabled) {
    loadGltfBundle(SAILOR.meshRig)
      .then((bundle) => {
        if (bundle.animations.length === 0) throw new Error("rig GLB has no clips");
        mountMesh(cloneGltfBundle(bundle), bundle.animations);
      })
      .catch(() =>
        loadGltf(SAILOR.mesh).then((scene) => {
          mountMesh(scene, []);
        }),
      )
      .catch(() => {
        /* Billboard remains the playable body. */
      });
  }

  const maps = {} as Record<Cardinal, THREE.Texture>;
  for (const v of IDLE_VIEWS) {
    const tex = loadAlbedoTexture(assetUrl(VIEW_TEX[v]));
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    maps[v] = tex;
  }

  const walkMaps = {} as Partial<Record<SheetKey, THREE.Texture>>;
  for (const v of Object.keys(WALK_TEX) as SheetKey[]) {
    const url = WALK_TEX[v];
    if (url) walkMaps[v] = loadSheet(url);
  }
  const runMaps = {} as Partial<Record<SheetKey, THREE.Texture>>;
  for (const v of Object.keys(RUN_TEX) as SheetKey[]) {
    const url = RUN_TEX[v];
    if (url) runMaps[v] = loadSheet(url);
  }
  const harvestMaps = {} as Partial<Record<Cardinal, THREE.Texture>>;
  for (const v of Object.keys(HARVEST_TEX) as Cardinal[]) {
    const url = HARVEST_TEX[v];
    if (url) harvestMaps[v] = loadSheet(url);
  }

  const gaitSheet = (bank: Partial<Record<SheetKey, THREE.Texture>>, key: SheetKey) => {
    const order: SheetKey[] =
      key === "frontRight"
        ? ["frontRight", "right", "front"]
        : key === "backRight"
          ? ["backRight", "right", "back"]
          : [key, "right", "front", "back"];
    for (const k of order) {
      if (texReady(bank[k])) return bank[k];
    }
    return undefined;
  };

  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);

  // One Y-billboard (Doom / Daggerfall / HD-2D). Twin planes and a core box
  // read as a pole down the spine. A second plane exists only for view crossfade.
  const matA = makeMat(maps.back);
  const matB = makeMat(maps.back);
  matB.opacity = 0;
  matB.depthWrite = false;
  matB.alphaTest = 0.08;

  const meshA = new THREE.Mesh(geo, matA);
  const meshB = new THREE.Mesh(geo, matB);
  meshA.position.set(0, -hipY, 0);
  meshB.position.set(0, -hipY, 0);
  meshB.visible = false;
  meshB.renderOrder = 1;
  card.add(meshA, meshB);

  hips.position.y = hipY;

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 16),
    new THREE.MeshBasicMaterial({
      color: 0x1a120c,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  root.add(shadow);

  const bloomMat = new THREE.SpriteMaterial({
    map: glowSprite(),
    color: PALETTE.petalRipeTint,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const blooms: THREE.Sprite[] = [];
  for (let i = 0; i < LOTUS.carryCap; i++) {
    const b = new THREE.Sprite(bloomMat);
    b.center.set(0.5, 0.2);
    b.scale.set(0.16, 0.16, 1);
    b.position.set(-0.12 + i * 0.07, 0.92 - hipY, 0.02);
    b.visible = false;
    hips.add(b);
    blooms.push(b);
  }

  let phase = 0;
  let gaitClock = 0;
  let squash = 0;
  let stretch = 0;
  let landSquash = 0;
  let view: View = "back";
  let incoming: View | null = null;
  let fade = 1;

  const pickTex = (
    v: View,
    moving: number,
    harvestAmt: number,
    running: boolean,
  ): { tex: THREE.Texture; frames: number; animating: boolean } => {
    const src = sheetSrc(v);
    const harvestMap = v === "back" ? harvestMaps.back : undefined;
    if (harvestAmt > 0.08 && texReady(harvestMap)) {
      const n = sheetFrameCount(harvestMap);
      return { tex: harvestMap, frames: n, animating: n > 1 };
    }
    if (moving > SAILOR.gaitMin && harvestAmt < 0.08) {
      const dedicatedRun = runMaps[src.key];
      if (running && texReady(dedicatedRun)) {
        const n = sheetFrameCount(dedicatedRun);
        if (n >= 1) return { tex: dedicatedRun, frames: n, animating: n > 1 };
      }
      const walkMap = gaitSheet(walkMaps, src.key);
      if (texReady(walkMap)) {
        const n = sheetFrameCount(walkMap);
        if (n >= 1) return { tex: walkMap, frames: n, animating: n > 1 };
      }
      const runFallback = running ? gaitSheet(runMaps, src.key) : undefined;
      if (texReady(runFallback)) {
        const n = sheetFrameCount(runFallback);
        if (n >= 1) return { tex: runFallback, frames: n, animating: n > 1 };
      }
    }
    const idle = maps[src.idle] ?? maps.back;
    return { tex: idle, frames: 1, animating: false };
  };

  const paint = (
    mat: THREE.MeshStandardMaterial,
    v: View,
    moving: number,
    harvestAmt: number,
    gaitPhase: number,
    harvestAmtFrame: number,
    running: boolean,
    useTwin: boolean,
  ): { tex: THREE.Texture; frames: number; animating: boolean } => {
    const picked = pickTex(v, moving, harvestAmt, running);
    const flip = sheetSrc(v).flip;
    const n = Math.max(1, picked.animating ? picked.frames : 1);
    const srcTex = picked.tex;
    if (!srcTex) {
      return { tex: maps.back, frames: 1, animating: false };
    }
    const mapped = useTwin ? uvTwin(srcTex) : srcTex;
    let frame = 0;
    if (picked.animating && n > 1 && Number.isFinite(gaitPhase)) {
      const f =
        harvestAmt > 0.08 ? harvestAmtFrame * (n - 0.001) : gaitPhase * n;
      if (Number.isFinite(f)) {
        frame = (((Math.floor(f) % n) + n) % n);
      }
    }
    applySheet(mapped, n, frame, flip);
    if (mat.map !== mapped) {
      mat.map = mapped;
      mat.needsUpdate = true;
    }
    return { tex: srcTex, frames: n, animating: picked.animating && n > 1 };
  };

  const setFade = (mat: THREE.MeshStandardMaterial, opacity: number, settling: boolean) => {
    mat.opacity = opacity;
    mat.depthWrite = settling;
    mat.alphaTest = settling ? 0.32 : 0.08;
  };

  let lastMoving = 0;
  let lastHarvest = 0;
  let lastRunning = false;
  let lastGaitPhase = 0;

  const orientCard = (camYaw: number) => {
    card.rotation.set(0, camYaw - root.rotation.y, 0);
  };

  const applyView = (camYaw: number, dt: number) => {
    const facing = root.rotation.y;
    const next = viewFrom(facing, camYaw, incoming ?? view);
    if (next !== view && next !== incoming) {
      incoming = next;
      fade = 0;
      meshB.visible = true;
      setFade(matA, 1, false);
      setFade(matB, 0, false);
    }
    const harvestPhase = lastHarvest;
    paint(
      matA,
      view,
      lastMoving,
      lastHarvest,
      lastGaitPhase,
      harvestPhase,
      lastRunning,
      false,
    );
    if (incoming) {
      paint(
        matB,
        incoming,
        lastMoving,
        lastHarvest,
        lastGaitPhase,
        harvestPhase,
        lastRunning,
        true,
      );
      fade = Math.min(1, fade + dt / SAILOR.viewFade);
      const k = smooth01(fade);
      setFade(matA, 1 - k, false);
      setFade(matB, k, false);
      if (fade >= 1) {
        view = incoming;
        incoming = null;
        matA.map = matB.map;
        matA.needsUpdate = true;
        setFade(matA, 1, true);
        setFade(matB, 0, false);
        meshB.visible = false;
        paint(
          matA,
          view,
          lastMoving,
          lastHarvest,
          lastGaitPhase,
          harvestPhase,
          lastRunning,
          false,
        );
      }
    } else {
      setFade(matA, 1, true);
      setFade(matB, 0, false);
      meshB.visible = false;
    }
  };

  return {
    root,
    setCarried(n: number) {
      for (let i = 0; i < blooms.length; i++) blooms[i].visible = i < n;
    },
    pulse(strength: number) {
      squash = Math.max(squash, strength);
      stretch = Math.max(stretch, strength * 0.65);
    },
    land(strength: number) {
      landSquash = Math.max(landSquash, strength);
    },
    faceCamera(camera, dt) {
      if (meshLive) return;
      const yaw = Math.atan2(
        camera.position.x - root.position.x,
        camera.position.z - root.position.z,
      );
      const camYaw = Number.isFinite(yaw) ? yaw : 0;
      orientCard(camYaw);
      applyView(camYaw, Number.isFinite(dt) ? dt : 0);
    },
    update(t, dt, moving, _velX = 0, _velZ = 0, _camYaw = 0, harvest = 0, running = false) {
      lastMoving = moving;
      lastHarvest = harvest;
      lastRunning = running;

      if (mixer) {
        mixer.update(Number.isFinite(dt) ? dt : 0);
        const next: "idle" | "walk" | "run" | "harvest" =
          harvest > 0.08
            ? acts.harvest
              ? "harvest"
              : "idle"
            : moving > SAILOR.gaitMin
              ? running
                ? "run"
                : "walk"
              : "idle";
        if (next !== clipName && acts[next]) {
          acts[clipName]?.fadeOut(0.16);
          acts[next]?.reset().fadeIn(0.16).play();
          clipName = next;
        }
        if (clipName === "walk" && acts.walk) {
          acts.walk.timeScale = 0.85 + Math.min(1, moving) * 0.45;
        }
        if (clipName === "run" && acts.run) {
          acts.run.timeScale = 0.95 + Math.min(1, moving) * 0.25;
        }
        if (clipName === "harvest" && acts.harvest) {
          // Loop the dig cycle at a steady pace — not tied to gait speed
          // since the character is stationary while harvesting.
          acts.harvest.timeScale = 1;
        }
      }

      const liveGait = moving > SAILOR.gaitMin && harvest < 0.08;
      const cycle = running ? SAILOR.runCycle : SAILOR.walkCycle;
      if (liveGait && cycle > 0 && Number.isFinite(dt)) gaitClock += dt / cycle;
      if (!Number.isFinite(gaitClock)) gaitClock = 0;
      lastGaitPhase = gaitClock - Math.floor(gaitClock);
      if (!Number.isFinite(lastGaitPhase)) lastGaitPhase = 0;

      phase += dt * (4.4 + moving * 6.2);
      squash *= Math.exp(-10 * dt);
      stretch *= Math.exp(-8 * dt);
      landSquash *= Math.exp(-12 * dt);

      const sheetOn =
        !meshLive && liveGait && (texReady(walkMaps.back) || texReady(runMaps.back));
      const gait = sheetOn ? lastGaitPhase * Math.PI * 2 : phase;
      const stride = Math.sin(gait);
      const plant = 1 - Math.abs(stride);
      const moveAmt = Math.min(1, moving) * (1 - harvest);
      const fakeWalk = sheetOn ? 0 : moveAmt;
      const stepSquash = plant * SAILOR.walkStepSquash * fakeWalk;
      const stepStretch = Math.abs(stride) * SAILOR.walkStepStretch * fakeWalk;
      const breath = sheetOn ? 1 : 1 + Math.sin(t * 2.05) * 0.006 * (1 - moving) * (1 - harvest);
      const knee = smooth01(harvest / 0.45);
      const hinge = smooth01((harvest - 0.12) / 0.88);
      const bend = sheetOn ? 0 : knee * SAILOR.harvestBend;
      const sheetHarvest =
        harvest > 0.08 &&
        texReady(harvestMaps.back) &&
        (view === "back" || incoming === "back");
      const leanMax = sheetHarvest ? SAILOR.harvestSheetLean : SAILOR.harvestLean;
      const lean = hinge * leanMax;

      const juice = sheetOn ? 0.45 : 1;
      const sx =
        1 +
        (squash * 0.18 + landSquash * 0.22 + stepSquash - stretch * 0.08 - stepStretch * 0.4) *
          juice +
        bend * 0.1;
      const sy =
        (1 -
          (squash * 0.22 + landSquash * 0.28 + stepSquash * 1.15 - stretch * 0.14 - stepStretch) *
            juice -
          bend) *
        breath;

      hips.position.x = 0;
      hips.rotation.z = 0;
      if (meshLive) {
        hips.rotation.x = 0;
        body.position.y = 0;
        body.position.z = 0;
        meshHold.scale.set(1, 1, 1);
        // The rig clip (`preset:biped:dig`) supplies some of its own bend,
        // but nothing here used to add to it — see SAILOR.meshHarvestLean.
        // `hinge`/`knee` are the same 0..1 harvest-progress curves the
        // billboard path below uses, so the two paths ease in together.
        const meshLean = hinge * SAILOR.meshHarvestLean;
        meshHold.position.set(
          0,
          SAILOR.meshYLift - knee * SAILOR.meshHarvestDrop,
          hinge * SAILOR.meshHarvestReach,
        );
        // meshYaw lives in SAILOR so a constants HMR still turns the body.
        meshHold.rotation.set(meshLean, SAILOR.meshYaw, 0);
        for (const child of meshHold.children) child.rotation.y = 0;
      } else {
        hips.rotation.x = -lean;
        body.position.y =
          -SAILOR.height * SAILOR.feetPad -
          squash * 0.03 * juice -
          landSquash * 0.06 * juice -
          hipY * (1 - Math.cos(lean));
        body.position.z = hinge * SAILOR.harvestReach - hipY * Math.sin(lean);
        const h = SAILOR.height;
        meshA.scale.set(h * sx, h * sy, 1);
        meshB.scale.set(h * sx, h * sy, 1);
      }
      shadow.scale.setScalar(0.95 + bend * 0.12);
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.24 + moving * 0.06;
      bloomMat.opacity = 0.75 + Math.sin(t * 2.4) * 0.15 + squash * 0.25;
    },
  };
}
