import * as THREE from "three";
import { LOTUS, PALETTE, SAILOR } from "../constants";
import { assetUrl } from "../assets/paths";
import { glowSprite, loadAlbedoTexture } from "./sprite";

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
  ): void;
  setCarried(n: number): void;
  pulse(strength: number): void;
  land(strength: number): void;
}

type View = "front" | "right" | "left" | "back";

const VIEWS: View[] = ["front", "right", "left", "back"];

/**
 * ASSET-001 turnaround, edge-flood keyed into four directional stills
 * (ASSET-041..044). Upright Y-billboard — not THREE.Sprite, which pitches
 * toward the shoulder camera and lifts the feet off the ground.
 * Walk-cycle frames: ASSET-024 (Veo image-to-video from idle stills,
 * keyed 8-frame strips). Draft pending sahip eye-pass (pipeline.md §5.5).
 */
const VIEW_TEX: Record<View, string> = {
  front: "assets/sprites/char_doryseus_front_01_albedo_512.png",
  right: "assets/sprites/char_doryseus_right_01_albedo_512.png",
  left: "assets/sprites/char_doryseus_left_01_albedo_512.png",
  back: "assets/sprites/char_doryseus_back_01_albedo_512.png",
};

/** ASSET-024 walk strips (Veo → keyed frames). Left uses the right sheet + flip. */
const WALK_TEX: Partial<Record<View, string>> = {
  front: "assets/spritesheets/char_doryseus_walk_front_01_sheet_2048.png",
  right: "assets/spritesheets/char_doryseus_walk_right_01_sheet_2048.png",
  back: "assets/spritesheets/char_doryseus_walk_back_01_sheet_2048.png",
};

/** ASSET-025 harvest strip — back view, optional until the sheet ships. */
const HARVEST_TEX: Partial<Record<View, string>> = {
  back: "assets/spritesheets/char_doryseus_harvest_back_01_sheet_2048.png",
};

function wrapPi(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Which side of the body the camera sees. `a = 0` means the sailor faces
 * the camera (front); `±π` is back. Strafing screen-right (`a = +π/2`)
 * shows the left side.
 *
 * Hysteresis (8agdg animation-blending buffer; Unity 2D Simple Directional
 * blend trees do the same) keeps the current view until the camera has
 * clearly entered the next 90° sector — a hard 4-way cut reads as a card flip.
 */
function viewFrom(facing: number, camYaw: number, current: View): View {
  const a = wrapPi(facing - camYaw);
  const abs = Math.abs(a);
  const hold = SAILOR.viewHold;
  const raw: View =
    abs <= Math.PI * 0.25 ? "front" : abs >= Math.PI * 0.75 ? "back" : a > 0 ? "left" : "right";
  if (raw === current) return current;
  if (current === "front" && abs < Math.PI * 0.25 + hold) return "front";
  if (current === "back" && abs > Math.PI * 0.75 - hold) return "back";
  if (current === "left" && a > Math.PI * 0.25 - hold && a < Math.PI * 0.75 + hold) return "left";
  if (current === "right" && a < -(Math.PI * 0.25 - hold) && a > -(Math.PI * 0.75 + hold)) {
    return "right";
  }
  return raw;
}

/**
 * Both profile stills were drawn facing screen-left (ASSET-001). Mirror via
 * UV (not mesh.scale.x) so MeshStandard lighting keeps a camera-facing normal.
 */
function profileFlip(facing: number, camYaw: number, view: View): number {
  if (view === "front" || view === "back") return 1;
  return Math.sin(facing - camYaw) >= 0 ? -1 : 1;
}

function texReady(tex: THREE.Texture | undefined): tex is THREE.Texture {
  if (!tex) return false;
  const img = tex.image as { width?: number; naturalWidth?: number } | undefined;
  return !!img && (img.naturalWidth ?? img.width ?? 0) > 1;
}

function applySheet(tex: THREE.Texture, frames: number, frame: number, flip: number): void {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const col = 1 / frames;
  tex.repeat.set(flip * col, 1);
  tex.offset.set(flip < 0 ? (frame + 1) * col : frame * col, 0);
}

function smooth01(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

function makeMat(map: THREE.Texture): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
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
}

export function buildSailor(): Sailor {
  const root = new THREE.Group();
  const body = new THREE.Group();
  const hips = new THREE.Group();
  root.add(body);
  body.add(hips);

  const maps = {} as Record<View, THREE.Texture>;
  for (const v of VIEWS) {
    const tex = loadAlbedoTexture(assetUrl(VIEW_TEX[v]));
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    maps[v] = tex;
  }

  const walkMaps = {} as Partial<Record<View, THREE.Texture>>;
  for (const v of Object.keys(WALK_TEX) as View[]) {
    const url = WALK_TEX[v];
    if (!url) continue;
    const tex = loadAlbedoTexture(assetUrl(url));
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1 / SAILOR.walkFrames, 1);
    walkMaps[v] = tex;
  }

  const harvestMaps = {} as Partial<Record<View, THREE.Texture>>;
  for (const v of Object.keys(HARVEST_TEX) as View[]) {
    const url = HARVEST_TEX[v];
    if (!url) continue;
    const tex = loadAlbedoTexture(assetUrl(url));
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.repeat.set(1 / SAILOR.walkFrames, 1);
    harvestMaps[v] = tex;
  }

  const geo = new THREE.PlaneGeometry(1, 1);
  geo.translate(0, 0.5, 0);

  const matA = makeMat(maps.back);
  const matB = makeMat(maps.back);
  matB.opacity = 0;
  matB.depthWrite = false;
  matB.alphaTest = 0.08;

  const meshA = new THREE.Mesh(geo, matA);
  const meshB = new THREE.Mesh(geo, matB);
  meshB.visible = false;
  meshB.renderOrder = 1;
  hips.add(meshA);
  hips.add(meshB);

  const hipY = SAILOR.height * SAILOR.harvestHip;
  hips.position.y = hipY;
  meshA.position.y = -hipY;
  meshB.position.y = -hipY;

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
  let walkClock = 0;
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
  ): { tex: THREE.Texture; frames: number; animating: boolean } => {
    const src: View = v === "left" ? "right" : v;
    const harvestMap = v === "back" ? harvestMaps.back : undefined;
    if (harvestAmt > 0.08 && texReady(harvestMap)) {
      return { tex: harvestMap, frames: SAILOR.walkFrames, animating: true };
    }
    const walkMap = walkMaps[src];
    if (moving > 0.18 && harvestAmt < 0.08 && texReady(walkMap)) {
      return { tex: walkMap, frames: SAILOR.walkFrames, animating: true };
    }
    return { tex: maps[v], frames: 1, animating: false };
  };

  const paint = (
    mat: THREE.MeshStandardMaterial,
    mesh: THREE.Mesh,
    v: View,
    moving: number,
    harvestAmt: number,
    facing: number,
    camYaw: number,
    frame: number,
    harvestFrame: number,
  ) => {
    const picked = pickTex(v, moving, harvestAmt);
    const flip = profileFlip(facing, camYaw, v);
    const useFrame = harvestAmt > 0.08 && picked.frames > 1 ? harvestFrame : frame;
    applySheet(picked.tex, picked.frames, picked.animating ? useFrame : 0, flip);
    if (mat.map !== picked.tex) {
      mat.map = picked.tex;
      mat.needsUpdate = true;
    }
    mesh.rotation.y = camYaw - facing;
    mesh.rotation.x = 0;
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
    update(t, dt, moving, _velX = 0, _velZ = 0, camYaw = 0, harvest = 0) {
      const facing = root.rotation.y;
      const next = viewFrom(facing, camYaw, incoming ?? view);
      if (next !== view && next !== incoming) {
        incoming = next;
        fade = 0;
        meshB.visible = true;
        matB.depthWrite = false;
        matA.depthWrite = false;
        matA.alphaTest = 0.08;
        matB.alphaTest = 0.08;
      }

      const liveWalk = moving > 0.18 && harvest < 0.08;
      if (liveWalk) walkClock += dt * SAILOR.walkFps * (0.55 + moving * 0.7);
      const frame = Math.floor(walkClock) % SAILOR.walkFrames;
      const harvestFrame = Math.min(
        SAILOR.walkFrames - 1,
        Math.floor(harvest * (SAILOR.walkFrames - 0.01)),
      );

      paint(matA, meshA, view, moving, harvest, facing, camYaw, frame, harvestFrame);
      if (incoming) {
        paint(matB, meshB, incoming, moving, harvest, facing, camYaw, frame, harvestFrame);
        fade = Math.min(1, fade + dt / SAILOR.viewFade);
        const k = smooth01(fade);
        matA.opacity = 1 - k;
        matB.opacity = k;
        if (fade >= 1) {
          view = incoming;
          incoming = null;
          matA.map = matB.map;
          matA.needsUpdate = true;
          matA.opacity = 1;
          matB.opacity = 0;
          matA.depthWrite = true;
          matA.alphaTest = 0.32;
          matB.alphaTest = 0.08;
          meshB.visible = false;
          paint(matA, meshA, view, moving, harvest, facing, camYaw, frame, harvestFrame);
        }
      } else {
        matA.opacity = 1;
        matA.depthWrite = true;
        matA.alphaTest = 0.32;
      }

      phase += dt * (4.4 + moving * 6.2);
      squash *= Math.exp(-10 * dt);
      stretch *= Math.exp(-8 * dt);
      landSquash *= Math.exp(-12 * dt);

      const gait = liveWalk
        ? (walkClock / SAILOR.walkFrames) * Math.PI * 2
        : phase;
      const stride = Math.sin(gait);
      const plant = 1 - Math.abs(stride);
      const moveAmt = Math.min(1, moving) * (1 - harvest);
      const fakeWalk = liveWalk ? 0 : moveAmt;
      const stepSquash = plant * SAILOR.walkStepSquash * fakeWalk;
      const stepStretch = Math.abs(stride) * SAILOR.walkStepStretch * fakeWalk;
      const breath = 1 + Math.sin(t * 2.05) * 0.012 * (1 - moving) * (1 - harvest);
      // Knees compress first (anticipation), hinge follows — Cursa body-mechanics kit.
      const knee = smooth01(harvest / 0.45);
      const hinge = smooth01((harvest - 0.12) / 0.88);
      const bend = knee * SAILOR.harvestBend;
      const sheetHarvest =
        harvest > 0.08 &&
        texReady(harvestMaps.back) &&
        (view === "back" || incoming === "back");
      const leanMax = sheetHarvest ? SAILOR.harvestSheetLean : SAILOR.harvestLean;
      const lean = hinge * leanMax;

      const sx =
        1 +
        squash * 0.18 +
        landSquash * 0.22 +
        stepSquash -
        stretch * 0.08 -
        stepStretch * 0.4 +
        bend * 0.1;
      const sy =
        (1 -
          squash * 0.22 -
          landSquash * 0.28 -
          stepSquash * 1.15 +
          stretch * 0.14 +
          stepStretch -
          bend) *
        breath;

      // Weight over the stance leg. Never yaw the camera-facing plane.
      hips.position.x = stride * SAILOR.walkHipShift * moveAmt;
      hips.rotation.z = -stride * SAILOR.walkHipRoll * moveAmt;
      hips.rotation.x = -lean;
      body.position.y =
        -SAILOR.height * sy * SAILOR.feetPad -
        squash * 0.04 -
        landSquash * 0.08 -
        hipY * (1 - Math.cos(lean));
      body.position.z = hinge * SAILOR.harvestReach - hipY * Math.sin(lean);

      const h = SAILOR.height;
      meshA.scale.set(h * sx, h * sy, 1);
      meshB.scale.set(h * sx, h * sy, 1);
      shadow.scale.setScalar(sx * (1 - moving * 0.08 + bend * 0.15));
      (shadow.material as THREE.MeshBasicMaterial).opacity = 0.22 + moving * 0.1 + stepSquash;
      bloomMat.opacity = 0.75 + Math.sin(t * 2.4) * 0.15 + squash * 0.25;
    },
  };
}
