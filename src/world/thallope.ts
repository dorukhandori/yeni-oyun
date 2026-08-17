import * as THREE from "three";
import { ISLAND, LANDMARK, PALETTE, PLAYER, SHIP, THALLOPE } from "../constants";
import { heightAt, inLagoon, islandRadiusAt, lagoonDist, lagoonRadiusAt, type Collider } from "./terrain";
import { mulberry32 } from "./rng";
import { cloneGltfBundle, fitGltfHeight, loadGltfBundle, pinClipBonePositions, restBonePositions } from "./gltf";
import { glowSprite } from "./sprite";

/**
 * Lotus Adası ambient wildlife — Thallope.
 * `docs/art/asset-registry.md` P3: decoration only. Memory, lotus, and player
 * systems never read this module. Hallucination figures are a different family.
 *
 * Untextured Tripo GLB: cylindrical UVs + sage canvas albedo. Face (eyes /
 * nose / mouth) is extra geometry on the Rigify `head` bone. Paw motes rise
 * and fade (süzülme) so they read as drifting gold dust, not a static halo.
 */

export interface Thallopes {
  group: THREE.Group;
  update(
    dt: number,
    t: number,
    player: THREE.Vector3,
    ship: THREE.Vector3,
    colliders: readonly Collider[],
  ): void;
  reset(): void;
}

interface DriftMote {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  ox: number;
  oz: number;
  spawnY: number;
  size: number;
  phase: number;
}

interface Creature {
  root: THREE.Group;
  meshHold: THREE.Group;
  home: { x: number; z: number };
  waypoint: { x: number; z: number };
  facing: number;
  mode: "idle" | "move";
  gait: "walk" | "hop";
  idleLeft: number;
  stuck: number;
  lastX: number;
  lastZ: number;
  mixer: THREE.AnimationMixer | null;
  walk: THREE.AnimationAction | null;
  hop: THREE.AnimationAction | null;
  motes: DriftMote[];
  dust: THREE.Sprite;
  halo: THREE.Sprite;
  haloCore: THREE.Sprite;
  rand: () => number;
}

function wrapPi(a: number): number {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

function inNorthSpikes(x: number, z: number): boolean {
  if (LANDMARK.northSpikes.height <= 0) return false;
  const r = Math.hypot(x, z);
  const north = Math.max(0, z / Math.max(r, 1));
  return north >= 0.35 && r >= LANDMARK.northSpikes.startR;
}

function clearOfColliders(x: number, z: number, colliders: readonly Collider[]): boolean {
  const r = THALLOPE.radius;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    const min = r + c.radius;
    const dx = x - c.x;
    const dz = z - c.z;
    if (dx * dx + dz * dz < min * min) return false;
  }
  return true;
}

function walkable(
  x: number,
  z: number,
  ship: THREE.Vector3,
  colliders: readonly Collider[],
): boolean {
  if (heightAt(x, z) < PLAYER.wadeFloor) return false;
  if (inLagoon(x, z)) return false;
  if (lagoonDist(x, z) < lagoonRadiusAt(x, z) + THALLOPE.lagoonKeep) return false;
  if (inNorthSpikes(x, z)) return false;
  if (Math.hypot(x - ship.x, z - ship.z) < THALLOPE.berthKeep) return false;
  if (Math.hypot(x, z) > islandRadiusAt(x, z) - THALLOPE.shoreKeep) return false;
  if (Math.hypot(x, z) > ISLAND.radius - THALLOPE.shoreKeep) return false;
  const h = heightAt(x, z);
  if (Math.abs(heightAt(x + 0.45, z) - h) > THALLOPE.maxStep) return false;
  if (Math.abs(heightAt(x, z + 0.45) - h) > THALLOPE.maxStep) return false;
  return clearOfColliders(x, z, colliders);
}

function pathClear(
  x0: number,
  z0: number,
  x1: number,
  z1: number,
  ship: THREE.Vector3,
  colliders: readonly Collider[],
): boolean {
  const dist = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(2, Math.ceil(dist / 0.55));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!walkable(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, ship, colliders)) return false;
  }
  return true;
}

function plantHome(
  x: number,
  z: number,
  ship: THREE.Vector3,
  colliders: readonly Collider[],
): { x: number; z: number } {
  if (walkable(x, z, ship, colliders)) return { x, z };
  for (let r = 1; r <= 18; r += 0.7) {
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const nx = x + Math.cos(a) * r;
      const nz = z + Math.sin(a) * r;
      if (walkable(nx, nz, ship, colliders)) return { x: nx, z: nz };
    }
  }
  return { x, z };
}

function pickClip(clips: THREE.AnimationClip[], keys: string[]): THREE.AnimationClip | undefined {
  for (const key of keys) {
    const hit = clips.find((c) => c.name.toLowerCase().includes(key));
    if (hit) return hit;
  }
  return undefined;
}

function hexCss(n: number): string {
  return `#${n.toString(16).padStart(6, "0")}`;
}

function applyCylindricalUvs(geo: THREE.BufferGeometry): void {
  const pos = geo.getAttribute("position");
  if (!pos) return;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const span = Math.max(0.001, maxY - minY);
  const uvs = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    uvs[i * 2] = Math.atan2(pos.getX(i), pos.getZ(i)) / (Math.PI * 2) + 0.5;
    uvs[i * 2 + 1] = (pos.getY(i) - minY) / span;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
}

/** ASSET-060 still, shifted to warm white + blush spots + peach ears. */
function makeThallopeAlbedo(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = hexCss(PALETTE.thallope);
  ctx.fillRect(0, 0, size, size);

  const ear = ctx.createLinearGradient(0, 0, 0, size * 0.3);
  ear.addColorStop(0, hexCss(PALETTE.thallopeEar));
  ear.addColorStop(0.7, hexCss(PALETTE.thallope));
  ctx.fillStyle = ear;
  ctx.fillRect(0, 0, size, size * 0.3);

  ctx.fillStyle = hexCss(PALETTE.thallopeBelly);
  ctx.globalAlpha = 0.88;
  ctx.fillRect(size * 0.62, size * 0.38, size * 0.28, size * 0.44);
  ctx.globalAlpha = 1;

  ctx.fillStyle = hexCss(PALETTE.thallopeSpot);
  const spots: Array<[number, number, number]> = [
    [0.18, 0.44, 0.06],
    [0.28, 0.52, 0.05],
    [0.22, 0.36, 0.045],
    [0.12, 0.56, 0.04],
    [0.32, 0.4, 0.035],
  ];
  for (const [u, v, r] of spots) {
    ctx.beginPath();
    ctx.ellipse(u * size, (1 - v) * size, r * size, r * size * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Black body, glowing inner ears, faint spot warmth — mockup attention layer. */
function makeThallopeEmissive(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(0, 0, size, size);

  const ear = ctx.createLinearGradient(0, 0, 0, size * 0.3);
  ear.addColorStop(0, "#ffe8c8");
  ear.addColorStop(0.4, "#ffd4a0");
  ear.addColorStop(1, "#3a3a3a");
  ctx.fillStyle = ear;
  ctx.fillRect(0, 0, size, size * 0.3);

  ctx.fillStyle = "#6a2838";
  const spots: Array<[number, number, number]> = [
    [0.18, 0.44, 0.045],
    [0.28, 0.52, 0.04],
    [0.22, 0.36, 0.035],
  ];
  for (const [u, v, r] of spots) {
    ctx.beginPath();
    ctx.ellipse(u * size, (1 - v) * size, r * size, r * size * 0.78, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

const thallopeAlbedo = makeThallopeAlbedo();
const thallopeEmissive = makeThallopeEmissive();

function paintThallopeMesh(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const mesh = obj as THREE.SkinnedMesh;
    if (!mesh.isMesh) return;
    applyCylindricalUvs(mesh.geometry);
    mesh.material = new THREE.MeshStandardMaterial({
      map: thallopeAlbedo,
      color: 0xffffff,
      roughness: 0.62,
      metalness: 0,
      envMapIntensity: 0.28,
      emissive: 0xffffff,
      emissiveMap: thallopeEmissive,
      emissiveIntensity: THALLOPE.bodyGlow,
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (mesh.isSkinnedMesh) mesh.frustumCulled = false;
  });
}

const eyeGeo = new THREE.SphereGeometry(1, 12, 10);
const noseGeo = new THREE.SphereGeometry(1, 10, 8);
const mouthGeo = new THREE.SphereGeometry(1, 8, 6);
const shineGeo = new THREE.SphereGeometry(1, 8, 6);

const eyeMat = new THREE.MeshStandardMaterial({
  color: PALETTE.thallopeEye,
  roughness: 0.92,
  metalness: 0,
  envMapIntensity: 0.08,
});
const shineMat = new THREE.MeshBasicMaterial({
  color: PALETTE.thallopeEyeShine,
  toneMapped: false,
});
const noseMat = new THREE.MeshStandardMaterial({
  color: PALETTE.thallopeNose,
  roughness: 0.55,
  metalness: 0,
  emissive: PALETTE.thallopeNose,
  emissiveIntensity: 0.18,
});
const mouthMat = new THREE.MeshStandardMaterial({
  color: PALETTE.thallopeMouth,
  roughness: 0.9,
  metalness: 0,
});

function findHeadBone(root: THREE.Object3D): THREE.Bone | null {
  let head: THREE.Bone | null = null;
  root.traverse((obj) => {
    const bone = obj as THREE.Bone;
    if (head || !bone.isBone) return;
    if (bone.name === "head") head = bone;
  });
  return head;
}

/** Recessed eyes, pink nose, mouth slit — parented to the Rigify head bone. */
function attachFace(scene: THREE.Object3D): void {
  const head = findHeadBone(scene);
  if (!head) return;
  scene.updateMatrixWorld(true);
  const hw = head.getWorldPosition(new THREE.Vector3());
  const toLocal = (wx: number, wy: number, wz: number) =>
    head.worldToLocal(new THREE.Vector3(hw.x + wx, hw.y + wy, hw.z + wz));

  const put = (mesh: THREE.Mesh, local: THREE.Vector3, sx: number, sy: number, sz: number) => {
    mesh.position.copy(local);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    head.add(mesh);
  };

  const eyeL = new THREE.Mesh(eyeGeo, eyeMat);
  const eyeR = new THREE.Mesh(eyeGeo, eyeMat);
  put(eyeL, toLocal(THALLOPE.faceEyeFwd, THALLOPE.faceEyeUp, -THALLOPE.faceEyeSide), THALLOPE.faceEyeR, THALLOPE.faceEyeR * 1.05, THALLOPE.faceEyeR);
  put(eyeR, toLocal(THALLOPE.faceEyeFwd, THALLOPE.faceEyeUp, THALLOPE.faceEyeSide), THALLOPE.faceEyeR, THALLOPE.faceEyeR * 1.05, THALLOPE.faceEyeR);

  const shine = (side: number) => {
    const s = new THREE.Mesh(shineGeo, shineMat);
    put(
      s,
      toLocal(THALLOPE.faceEyeFwd + 0.012, THALLOPE.faceEyeUp + 0.006, side * THALLOPE.faceEyeSide),
      THALLOPE.faceEyeR * 0.28,
      THALLOPE.faceEyeR * 0.28,
      THALLOPE.faceEyeR * 0.28,
    );
  };
  shine(-1);
  shine(1);

  const nose = new THREE.Mesh(noseGeo, noseMat);
  put(
    nose,
    toLocal(THALLOPE.faceNoseFwd, THALLOPE.faceNoseUp, 0),
    THALLOPE.faceNoseR * 1.15,
    THALLOPE.faceNoseR,
    THALLOPE.faceNoseR * 0.9,
  );

  const mouth = new THREE.Mesh(mouthGeo, mouthMat);
  put(
    mouth,
    toLocal(THALLOPE.faceMouthFwd, THALLOPE.faceMouthUp, 0),
    THALLOPE.faceMouthW,
    THALLOPE.faceMouthW * 0.22,
    THALLOPE.faceMouthW * 0.55,
  );
}

function makeMote(tex: THREE.Texture, additive: boolean): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color: PALETTE.thallopeGlow,
    transparent: true,
    opacity: additive ? THALLOPE.moteOpacity : THALLOPE.moteOpacity * 0.85,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(THALLOPE.moteScale);
  return sprite;
}

function makeHalo(tex: THREE.Texture, color: number, opacity: number, scale: number): THREE.Sprite {
  const mat = new THREE.SpriteMaterial({
    map: tex,
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(scale);
  sprite.position.y = THALLOPE.haloY;
  sprite.renderOrder = -1;
  return sprite;
}

function seedDrift(mote: DriftMote, rand: () => number, stagger = 0): void {
  mote.age = stagger;
  mote.life = THALLOPE.moteLifeMin + rand() * (THALLOPE.moteLifeMax - THALLOPE.moteLifeMin);
  const a = rand() * Math.PI * 2;
  const r = 0.08 + rand() * THALLOPE.moteSpawnR;
  mote.ox = Math.sin(a) * r;
  mote.oz = Math.cos(a) * r * 0.7 + 0.1;
  mote.spawnY = THALLOPE.moteSpawnY + rand() * 0.22;
  mote.size = THALLOPE.moteScaleMin + rand() * (THALLOPE.moteScaleMax - THALLOPE.moteScaleMin);
  mote.phase = rand() * Math.PI * 2;
}

export function buildThallopes(): Thallopes {
  const group = new THREE.Group();
  const creatures: Creature[] = [];
  const moteTex = glowSprite();
  const emptyColliders: Collider[] = [];
  const berth = new THREE.Vector3(SHIP.pos.x, 0, SHIP.pos.z);

  const restWalk = (c: Creature) => {
    if (!c.walk) return;
    c.walk.enabled = true;
    c.walk.setEffectiveWeight(0.25);
    c.walk.timeScale = 0.2;
    c.walk.play();
  };

  const startMove = (c: Creature, hop: boolean) => {
    c.mode = "move";
    c.stuck = 0;
    if (hop && c.hop && c.walk) {
      c.gait = "hop";
      c.walk.fadeOut(0.08);
      c.hop.reset().setEffectiveWeight(1).fadeIn(0.08).play();
      const dust = c.dust;
      dust.position.set(0, 0.04, 0.04);
      dust.scale.setScalar(THALLOPE.dustScale);
      const dmat = dust.material as THREE.SpriteMaterial;
      dmat.opacity = THALLOPE.dustOpacity;
    } else if (c.walk) {
      c.gait = "walk";
      c.hop?.fadeOut(0.08);
      c.walk.reset().setEffectiveWeight(1).fadeIn(0.08);
      c.walk.timeScale = 1.15;
      c.walk.play();
    }
  };

  const startIdle = (c: Creature) => {
    c.mode = "idle";
    c.gait = "walk";
    c.idleLeft = THALLOPE.idleMin + c.rand() * (THALLOPE.idleMax - THALLOPE.idleMin);
    c.waypoint = { x: c.root.position.x, z: c.root.position.z };
    c.hop?.fadeOut(0.1);
    restWalk(c);
  };

  const pickWaypoint = (
    c: Creature,
    ship: THREE.Vector3,
    colliders: readonly Collider[],
    fromX: number,
    fromZ: number,
    preferAngle?: number,
  ): boolean => {
    const tryPoint = (nx: number, nz: number): boolean => {
      if (Math.hypot(nx - fromX, nz - fromZ) < 1.4) return false;
      if (!walkable(nx, nz, ship, colliders)) return false;
      if (Math.hypot(nx - c.home.x, nz - c.home.z) > THALLOPE.wanderR + 1.5) return false;
      if (!pathClear(fromX, fromZ, nx, nz, ship, colliders)) return false;
      c.waypoint = { x: nx, z: nz };
      return true;
    };

    for (let n = 0; n < 18; n++) {
      const jitter = (c.rand() - 0.5) * 1.1;
      const a =
        preferAngle !== undefined && n < 8 ? preferAngle + jitter : c.rand() * Math.PI * 2;
      const r = 2.4 + c.rand() * (THALLOPE.wanderR - 2.4);
      const ox = preferAngle !== undefined ? fromX : c.home.x;
      const oz = preferAngle !== undefined ? fromZ : c.home.z;
      if (tryPoint(ox + Math.sin(a) * r, oz + Math.cos(a) * r)) return true;
    }

    for (let r = 2; r <= THALLOPE.wanderR; r += 0.85) {
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2 + c.rand() * 0.2;
        if (tryPoint(fromX + Math.sin(a) * r, fromZ + Math.cos(a) * r)) return true;
      }
    }
    return false;
  };

  const mount = (
    scene: THREE.Group,
    clips: THREE.AnimationClip[],
    rawHome: { x: number; z: number },
    index: number,
  ) => {
    const home = plantHome(rawHome.x, rawHome.z, berth, emptyColliders);
    scene.traverse((obj) => {
      const skinned = obj as THREE.SkinnedMesh;
      if (skinned.isSkinnedMesh) skinned.frustumCulled = false;
    });
    fitGltfHeight(scene, THALLOPE.height);
    attachFace(scene);

    const root = new THREE.Group();
    const meshHold = new THREE.Group();
    meshHold.position.y = THALLOPE.meshYLift;
    meshHold.rotation.y = THALLOPE.meshFacing;
    meshHold.add(scene);
    root.add(meshHold);

    const motes: DriftMote[] = [];
    for (let m = 0; m < THALLOPE.moteCount; m++) {
      const sprite = makeMote(moteTex, true);
      root.add(sprite);
      const mote: DriftMote = {
        sprite,
        age: 0,
        life: 1,
        ox: 0,
        oz: 0,
        spawnY: 0,
        size: THALLOPE.moteScale,
        phase: 0,
      };
      motes.push(mote);
    }

    const dust = makeMote(moteTex, true);
    dust.scale.setScalar(0.001);
    (dust.material as THREE.SpriteMaterial).opacity = 0;
    root.add(dust);

    const halo = makeHalo(moteTex, PALETTE.thallopeHalo, THALLOPE.haloOpacity, THALLOPE.haloScale);
    const haloCore = makeHalo(moteTex, PALETTE.thallopeGlow, THALLOPE.haloCoreOpacity, THALLOPE.haloCoreScale);
    root.add(halo);
    root.add(haloCore);

    const y = Math.max(heightAt(home.x, home.z), 0.02);
    root.position.set(home.x, y, home.z);
    group.add(root);

    const rand = mulberry32(THALLOPE.seed + index * 997);
    for (let m = 0; m < motes.length; m++) {
      seedDrift(motes[m], rand, rand() * THALLOPE.moteLifeMax);
    }
    const slot: Creature = {
      root,
      meshHold,
      home: { x: home.x, z: home.z },
      waypoint: { x: home.x, z: home.z },
      facing: 0,
      mode: "idle",
      gait: "walk",
      idleLeft: rand() * THALLOPE.idleMax,
      stuck: 0,
      lastX: home.x,
      lastZ: home.z,
      mixer: null,
      walk: null,
      hop: null,
      motes,
      dust,
      halo,
      haloCore,
      rand,
    };

    if (clips.length > 0) {
      const rest = restBonePositions(scene);
      scene.traverse((obj) => {
        if (obj.name === "torso") rest.set("torso", obj.position.clone());
      });
      const mixer = new THREE.AnimationMixer(scene);
      const walkSrc = pickClip(clips, ["walk"]) ?? clips[0];
      const hopSrc = pickClip(clips, ["hop", "jump"]) ?? walkSrc;
      const walk = mixer.clipAction(pinClipBonePositions(walkSrc, rest));
      const hop = mixer.clipAction(pinClipBonePositions(hopSrc, rest));
      walk.setLoop(THREE.LoopRepeat, Infinity);
      hop.setLoop(THREE.LoopOnce, 1);
      hop.clampWhenFinished = true;
      slot.mixer = mixer;
      slot.walk = walk;
      slot.hop = hop;
      restWalk(slot);
      mixer.update(0);
      mixer.addEventListener("finished", (ev) => {
        if (ev.action !== slot.hop || !slot.walk) return;
        slot.gait = "walk";
        slot.walk.reset().setEffectiveWeight(1).fadeIn(0.08);
        slot.walk.timeScale = 1.1;
        slot.walk.play();
      });
    }
    creatures.push(slot);
  };

  const homes = THALLOPE.homes;
  loadGltfBundle(THALLOPE.mesh)
    .then((bundle) => {
      paintThallopeMesh(bundle.scene);
      for (let i = 0; i < homes.length; i++) {
        mount(cloneGltfBundle(bundle), bundle.animations, homes[i], i);
      }
    })
    .catch(() => {
      /* Ambient prop — missing mesh must not break the run. */
    });

  return {
    group,
    update(dt, t, player, ship, colliders) {
      for (const c of creatures) {
        c.meshHold.rotation.y = THALLOPE.meshFacing;
        c.mixer?.update(dt);

        const breath = 0.5 + 0.5 * Math.sin(t * 1.35 + c.home.x);
        const haloMat = c.halo.material as THREE.SpriteMaterial;
        const coreMat = c.haloCore.material as THREE.SpriteMaterial;
        haloMat.opacity = THALLOPE.haloOpacity * (0.72 + 0.28 * breath);
        coreMat.opacity = THALLOPE.haloCoreOpacity * (0.78 + 0.22 * breath);
        c.halo.scale.setScalar(THALLOPE.haloScale * (0.94 + 0.08 * breath));
        c.haloCore.scale.setScalar(THALLOPE.haloCoreScale * (0.9 + 0.12 * breath));

        const dustMat = c.dust.material as THREE.SpriteMaterial;
        if (dustMat.opacity > 0.01) {
          dustMat.opacity = Math.max(0, dustMat.opacity - dt * 2.4);
          const s = c.dust.scale.x + dt * 0.35;
          c.dust.scale.setScalar(s);
        }

        for (let m = 0; m < c.motes.length; m++) {
          const mote = c.motes[m];
          mote.age += dt;
          if (mote.age >= mote.life) seedDrift(mote, c.rand);
          const u = Math.min(1, mote.age / mote.life);
          const drift = THALLOPE.moteDrift * Math.sin(t * 0.85 + mote.phase);
          const driftZ = THALLOPE.moteDrift * 0.55 * Math.cos(t * 0.62 + mote.phase * 1.3);
          mote.sprite.position.set(
            mote.ox + drift,
            mote.spawnY + u * THALLOPE.moteRise * mote.life,
            mote.oz + driftZ,
          );
          const fade = Math.sin(u * Math.PI);
          const mat = mote.sprite.material as THREE.SpriteMaterial;
          mat.opacity = THALLOPE.moteOpacity * fade;
          const pulse = c.gait === "hop" ? 1.15 : 1;
          mote.sprite.scale.setScalar(mote.size * pulse * (0.75 + 0.25 * fade));
        }

        const px = c.root.position.x;
        const pz = c.root.position.z;
        const awayX = px - player.x;
        const awayZ = pz - player.z;
        const away = Math.hypot(awayX, awayZ);

        if (!walkable(px, pz, ship, colliders)) {
          const planted = plantHome(px, pz, ship, colliders);
          c.root.position.x = planted.x;
          c.root.position.z = planted.z;
          c.root.position.y = Math.max(heightAt(planted.x, planted.z), 0.02);
          c.home = planted;
          c.lastX = planted.x;
          c.lastZ = planted.z;
          startIdle(c);
          continue;
        }

        if (away < THALLOPE.avoidPlayer && away > 0.05) {
          const wpAway = Math.hypot(c.waypoint.x - player.x, c.waypoint.z - player.z);
          if (c.mode === "idle" || wpAway + 0.8 < away) {
            const fleeA = Math.atan2(awayX, awayZ);
            if (pickWaypoint(c, ship, colliders, px, pz, fleeA)) startMove(c, true);
          }
        }

        if (c.mode === "idle") {
          c.idleLeft -= dt;
          if (c.idleLeft <= 0) {
            if (pickWaypoint(c, ship, colliders, px, pz)) {
              startMove(c, c.rand() < THALLOPE.hopChance);
            } else {
              c.idleLeft = 0.5 + c.rand() * 0.8;
            }
          }
          c.root.position.y = Math.max(heightAt(px, pz), 0.02);
          continue;
        }

        let dx = c.waypoint.x - px;
        let dz = c.waypoint.z - pz;
        let dist = Math.hypot(dx, dz);

        if (dist < THALLOPE.arriveDist) {
          if (pickWaypoint(c, ship, colliders, px, pz)) {
            startMove(c, c.rand() < THALLOPE.hopChance);
          } else {
            startIdle(c);
          }
          continue;
        }

        const speed = c.gait === "hop" ? THALLOPE.hopSpeed : THALLOPE.walkSpeed;
        const step = Math.min(speed * dt, dist);
        const ux = dx / dist;
        const uz = dz / dist;
        let nx = px + ux * step;
        let nz = pz + uz * step;

        if (!walkable(nx, nz, ship, colliders)) {
          const slideX = px + ux * step;
          const slideZ = pz;
          const alongX = walkable(slideX, slideZ, ship, colliders);
          const alongZ = walkable(px, pz + uz * step, ship, colliders);
          if (alongX && !alongZ) {
            nx = slideX;
            nz = pz;
          } else if (alongZ && !alongX) {
            nx = px;
            nz = pz + uz * step;
          } else if (alongX) {
            nx = slideX;
            nz = pz;
          } else {
            c.stuck += dt;
            if (c.stuck > THALLOPE.stuckTime) {
              const back = Math.atan2(-ux, -uz);
              if (!pickWaypoint(c, ship, colliders, px, pz, back)) startIdle(c);
              else startMove(c, false);
            }
            c.root.position.y = Math.max(heightAt(px, pz), 0.02);
            continue;
          }
        }

        const moved = Math.hypot(nx - c.lastX, nz - c.lastZ);
        c.stuck = moved < 0.004 ? c.stuck + dt : 0;
        if (c.stuck > THALLOPE.stuckTime) {
          startIdle(c);
          continue;
        }

        c.lastX = nx;
        c.lastZ = nz;
        c.root.position.x = nx;
        c.root.position.z = nz;
        c.root.position.y = Math.max(heightAt(nx, nz), 0.02);

        const want = Math.atan2(dx, dz);
        c.facing += wrapPi(want - c.facing) * Math.min(1, dt / THALLOPE.turnSmooth);
        c.root.rotation.y = c.facing;
      }
    },
    reset() {
      for (const c of creatures) {
        const y = Math.max(heightAt(c.home.x, c.home.z), 0.02);
        c.root.position.set(c.home.x, y, c.home.z);
        c.waypoint = { x: c.home.x, z: c.home.z };
        c.lastX = c.home.x;
        c.lastZ = c.home.z;
        c.stuck = 0;
        c.facing = 0;
        c.root.rotation.y = 0;
        c.hop?.stop();
        startIdle(c);
      }
    },
  };
}
