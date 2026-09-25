import * as THREE from "three";
import { loadGltfBundle } from "./gltf";
import { groundHeightAt, makeItemMesh } from "./cyclopsCave";
import { FINALE_SHEEP_SPEED, type Vec2 } from "../stops/cyclopsFinale";

/**
 * Scene props for the Homeric finale (docs/design/gdd-cyclops-finale.md):
 * Maron's wine skin, the olive stake, the escaping flock, and the boulder
 * the blind giant hurls. All procedural or re-used (0 credits — sahip,
 * 25 Eyl: "Önce 0 kredi"); the flock re-uses the cove sheep GLB (ASSET-093).
 */

/** Where the wine skin appears once the delivery target is met — on the beach by the ship. */
export const FINALE_WINE_HOME: Vec2 = { x: 2.2, z: -38 };
/** The olive stake leans against the pens' east wall (Homeros: "by the pens"). */
export const FINALE_STAKE_HOME: Vec2 = { x: 5.4, z: 30 };
/** The blind giant sits in the cave mouth, west of the flock's lane. */
export const FINALE_GUARD_POS: Vec2 = { x: -1.8, z: 3.0 };

const FLOCK_SIZE = 6;
const FLOCK_START_Z = 38;
const FLOCK_END_Z = -12;
const FLOCK_SPACING = 4.5;
/** Lane stays inside gorge A (halfWidth 2) and east of the seated giant. */
const FLOCK_LANE_MIN_X = 0.5;
const FLOCK_LANE_MAX_X = 1.6;

export interface FinaleProps {
  group: THREE.Group;
  /** World positions of the flock this frame (empty until the escape starts). */
  sheepPositions(): readonly Vec2[];
  showWine(at: Vec2 | null): void;
  showStake(at: Vec2 | null): void;
  /** Stake carried in the player's hands; `hot` lights its tip. */
  holdStake(player: THREE.Object3D | null, hot: boolean): void;
  holdWine(player: THREE.Object3D | null): void;
  startFlock(): void;
  stopFlock(): void;
  /** A boulder falling onto (x,z); progress 0..1 over its telegraph. */
  boulder(at: Vec2 | null, progress: number): void;
  update(dt: number): void;
}

function makeStake(): { root: THREE.Group; tip: THREE.MeshStandardMaterial } {
  const root = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b5332, roughness: 0.85 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 2.4, 7), wood);
  shaft.position.y = 1.2;
  root.add(shaft);
  const tip = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.6, emissive: 0x000000 });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.35, 7), tip);
  cone.position.y = 2.57;
  root.add(cone);
  return { root, tip };
}

export function buildFinaleProps(scene: THREE.Scene): FinaleProps {
  const group = new THREE.Group();
  group.name = "cyclopsFinale";
  scene.add(group);

  const wine = makeItemMesh("wine");
  wine.scale.setScalar(1.35);
  wine.visible = false;
  group.add(wine);

  const stake = makeStake();
  stake.root.visible = false;
  group.add(stake.root);
  const tipGlow = new THREE.PointLight(0xff7a2a, 0, 4, 1.5);
  tipGlow.position.y = 2.6;
  stake.root.add(tipGlow);

  const boulder = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.9, 0),
    new THREE.MeshStandardMaterial({ color: 0x8a8378, roughness: 0.95 }),
  );
  boulder.visible = false;
  group.add(boulder);

  interface Walker {
    obj: THREE.Object3D;
    x: number;
    z: number;
  }
  const flock: Walker[] = [];
  let flockActive = false;
  let sheepTemplate: THREE.Object3D | null = null;
  loadGltfBundle("assets/models/creature_sheep_01_stand_3100.glb")
    .then((b) => {
      sheepTemplate = b.scene;
      if (flockActive) spawnFlock();
    })
    .catch((err) => console.error("[cyclopsFinaleProps] sheep GLB failed — flock falls back to boxes", err));

  function makeSheep(): THREE.Object3D {
    if (sheepTemplate) return sheepTemplate.clone(true);
    // Load failed or still pending: a visible stand-in, never an invisible
    // flock the player cannot find (the escape would be unwinnable).
    return new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.7, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xe9e4d6, roughness: 1 }),
    );
  }

  function laneX(i: number): number {
    const t = (i * 0.618) % 1;
    return FLOCK_LANE_MIN_X + t * (FLOCK_LANE_MAX_X - FLOCK_LANE_MIN_X);
  }

  function spawnFlock(): void {
    for (const w of flock) group.remove(w.obj);
    flock.length = 0;
    for (let i = 0; i < FLOCK_SIZE; i++) {
      const obj = makeSheep();
      obj.rotation.y = Math.PI; // facing the door (−z)
      group.add(obj);
      flock.push({ obj, x: laneX(i), z: FLOCK_START_Z - i * FLOCK_SPACING });
    }
  }

  return {
    group,
    sheepPositions: () => flock.map((w) => ({ x: w.x, z: w.z })),
    showWine(at) {
      wine.visible = at !== null;
      if (at) {
        if (wine.parent !== group) group.add(wine);
        wine.position.set(at.x, groundHeightAt(at.x, at.z), at.z);
        wine.rotation.set(0, 0, 0);
      }
    },
    showStake(at) {
      stake.root.visible = at !== null;
      if (at) {
        if (stake.root.parent !== group) group.add(stake.root);
        stake.root.position.set(at.x, 0, at.z);
        stake.root.rotation.set(0, 0, -0.25); // leaning on the wall
      }
    },
    holdStake(player, hot) {
      if (!player) {
        if (stake.root.parent !== group) group.add(stake.root);
        return;
      }
      if (stake.root.parent !== player) player.add(stake.root);
      stake.root.visible = true;
      // Carried low and forward, tip ahead of the player.
      stake.root.position.set(0.35, 0.9, -0.2);
      stake.root.rotation.set(Math.PI / 2 - 0.15, 0, 0);
      stake.tip.emissive.setHex(hot ? 0xff5a14 : 0x000000);
      stake.tip.emissiveIntensity = hot ? 2.2 : 0;
      tipGlow.intensity = hot ? 2.5 : 0;
    },
    holdWine(player) {
      if (!player) return;
      if (wine.parent !== player) player.add(wine);
      wine.visible = true;
      wine.position.set(0.3, 0.8, 0.25);
    },
    startFlock() {
      flockActive = true;
      spawnFlock();
    },
    stopFlock() {
      flockActive = false;
      for (const w of flock) group.remove(w.obj);
      flock.length = 0;
    },
    boulder(at, progress) {
      boulder.visible = at !== null;
      if (!at) return;
      const y = groundHeightAt(at.x, at.z) + 0.9 + (1 - progress) * 14;
      boulder.position.set(at.x, y, at.z);
      boulder.rotation.x += 0.05;
    },
    update(dt) {
      if (!flockActive) return;
      for (const w of flock) {
        w.z -= FINALE_SHEEP_SPEED * dt;
        if (w.z < FLOCK_END_Z) w.z = FLOCK_START_Z;
        w.obj.position.set(w.x, groundHeightAt(w.x, w.z), w.z);
      }
    },
  };
}
