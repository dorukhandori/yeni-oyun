import * as THREE from "three";
import { SEA_TEX, SHIP, SAILOR } from "../constants";
import { loadGltfBundle } from "./gltf";
import { buildSea } from "./sea";
import { plantHero, paintHero, seatHullKeel } from "./ship";
import { createHumanoidActor, type HumanoidActor } from "./humanoidRig";
import { hallucinationSprite } from "./sprite";
import {
  SIRENS_ISLE,
  SIRENS_STRAIT_LENGTH,
  generateStrait,
  type Rock,
  type Vec2,
} from "../stops/sirensRules";

/**
 * Sirens Passage scene (docs/design/gdd-sirens-passage.md). Everything is a
 * re-used asset or procedural (sahip, 25 Eyl: "Önce 0 kredi"):
 * - the hero galley (ship_hero_03, same planting as Lotus/Cyclops),
 * - three rowers = the Doryseus rig (the forgotten sailors wear his face),
 * - strait rocks = ASSET-122 coast rock kit,
 * - the Sirens = the Lotus hallucination figure sprite, tinted pale gold —
 *   deliberately a *vision*, not a creature (they are a song).
 *
 * Strait coordinates (x lateral, z along 0..LENGTH) map to world by a fixed
 * −LENGTH/2 z-offset so the whole run stays inside the sea's flood plane.
 */

export const STRAIT_WORLD_Z0 = -SIRENS_STRAIT_LENGTH / 2;
/** Galley shrunk from Lotus's 42 m hero so a 52 m strait reads as narrow. */
const SIRENS_SHIP_SCALE = 0.5;
/** Keel seating above the sea floor plane — same measurement as the Cyclops cove (see cyclopsCave.ts). */
const KEEL_ABOVE_FLOOR = 1.55 * SIRENS_SHIP_SCALE / 0.42;
/** Anything the deck ray hits above this (ship-local) is rigging, not deck. */
const DECK_MAX_Y = 3.2;
/** Tall enough to read over the strait's rock wall (~10 m) from the deck. */
const SIREN_FIGURE_Y = 12;
/** The Lotus sea draws a foam patch under `uHull` — park it far away (same fix as the Cyclops cove). */
const FOAM_PARK = new THREE.Vector3(0, 0, -5000);

export function straitToWorld(p: Vec2): THREE.Vector3 {
  return new THREE.Vector3(p.x, 0, p.z + STRAIT_WORLD_Z0);
}

export interface DeckLayout {
  /** Half extents of the walkable deck in ship-local metres. */
  halfBeam: number;
  halfLength: number;
  honeycomb: Vec2;
  kneadSpot: Vec2;
  mast: Vec2;
  rowers: Vec2[];
}

export interface SirensWorld {
  rocks: Rock[];
  /** Moves with the galley; the player and crew are its children during the run. */
  shipRoot: THREE.Group;
  deck: DeckLayout;
  /** Local deck height at (x,z), from a raycast into the hull; null until the hull loads. */
  deckY(local: Vec2): number | null;
  setRowerPlugged(i: number, on: boolean): void;
  setWaxVisible(onDeck: boolean): void;
  setKneadGlow(amount: number): void;
  hullLoaded(): boolean;
  /** Camera collision geometry: the galley on deck, the strait rocks during the passage. */
  cameraColliders(passage: boolean): THREE.Object3D[];
  /** DEV diagnostics. */
  debugCrew(): { children: number; world: { x: number; y: number; z: number } }[];
  update(t: number, dt: number, song: number, cam: THREE.Vector3): void;
}

const DECK: DeckLayout = {
  halfBeam: 1.9,
  halfLength: 8.2,
  honeycomb: { x: 1.1, z: 6.2 },
  kneadSpot: { x: 0, z: -6.6 },
  mast: { x: 0, z: 0.8 },
  rowers: [
    { x: -1.3, z: 3.4 },
    { x: 1.3, z: -1.4 },
    { x: -1.3, z: -3.8 },
  ],
};

function makeHoneycomb(): THREE.Object3D {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe0a53a, roughness: 0.45, emissive: 0x3a2400 });
  const cell = new THREE.CylinderGeometry(0.09, 0.09, 0.1, 6);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(cell, mat);
    const a = (i / 6) * Math.PI * 2;
    const r = i === 0 ? 0 : 0.16;
    m.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
    g.add(m);
  }
  return g;
}

function makePlug(): THREE.Mesh {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 5),
    new THREE.MeshStandardMaterial({ color: 0xf2c65a, emissive: 0x6a4a00, roughness: 0.4 }),
  );
  m.visible = false;
  return m;
}

export function buildSirensWorld(scene: THREE.Scene): SirensWorld {
  const rocks = generateStrait();

  // ------------------------------------------------------------------ sea
  const sea = buildSea({ includeLagoon: false, islandRadius: 0, shoreBlend: false });
  scene.add(sea.group);

  // ---------------------------------------------------------------- rocks
  const rockGroup = new THREE.Group();
  rockGroup.name = "sirensRocks";
  scene.add(rockGroup);
  loadGltfBundle("assets/models/rock_coast_kit_01_mesh_12pcs.glb")
    .then((bundle) => {
      const pieces: THREE.Mesh[] = [];
      bundle.scene.traverse((o) => {
        if (o instanceof THREE.Mesh) pieces.push(o);
      });
      if (pieces.length === 0) throw new Error("coast rock kit has no meshes");
      // Big pieces only for the strait walls — the kit is sorted small → large.
      const big = pieces.slice(Math.floor(pieces.length / 2));
      let n = 0;
      for (const r of rocks) {
        const template = big[n++ % big.length];
        template.geometry.computeBoundingBox();
        const bb = template.geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);
        const footprint = Math.max(size.x * template.scale.x, size.z * template.scale.z) * 0.5 || 1;
        const k = r.r / footprint;
        const piece = template.clone();
        piece.material = template.material;
        piece.scale.multiplyScalar(k);
        piece.scale.y *= 1.3; // sheer, not domed — a strait, not a beach
        const w = straitToWorld(r);
        piece.position.set(w.x, SEA_TEX.floorY - 1.2 - bb.min.y * template.scale.y * k * 1.3, w.z);
        piece.rotation.y = (n * 2.399) % (Math.PI * 2);
        piece.castShadow = true;
        piece.receiveShadow = true;
        rockGroup.add(piece);
      }
    })
    .catch((err) => console.error("[sirensStrait] rock kit failed — the strait walls are invisible", err));

  // ------------------------------------------------------- Sirens' meadow
  const isle = new THREE.Group();
  isle.name = "sirensIsle";
  const isleW = straitToWorld(SIRENS_ISLE);
  isle.position.copy(isleW);
  const meadow = new THREE.Mesh(
    new THREE.CylinderGeometry(26, 34, 5, 24, 1),
    new THREE.MeshStandardMaterial({ color: 0x6f8f4a, roughness: 0.95, flatShading: true }),
  );
  meadow.position.y = 1.2;
  isle.add(meadow);
  const cliff = new THREE.Mesh(
    new THREE.CylinderGeometry(34, 38, 4, 24, 1),
    new THREE.MeshStandardMaterial({ color: 0xb9ad92, roughness: 1, flatShading: true }),
  );
  cliff.position.y = -2.2;
  isle.add(cliff);
  // Odysseia XII.45: "etrafında çürüyen adamların kemik yığınları" — pale shards.
  const boneMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d0, roughness: 0.8 });
  for (let i = 0; i < 26; i++) {
    const a = i * 2.39996;
    const rr = 12 + (i % 7) * 2.3;
    const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.9, 2, 5), boneMat);
    b.position.set(Math.cos(a) * rr, 3.8, Math.sin(a) * rr);
    b.rotation.set(Math.PI / 2, 0, a);
    isle.add(b);
  }
  const sirenTex = hallucinationSprite();
  const sirens: THREE.Sprite[] = [];
  for (let i = 0; i < 3; i++) {
    const sp = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: sirenTex, color: 0xffe2a8, transparent: true, depthWrite: false, opacity: 0.9 }),
    );
    sp.scale.set(5.4, 9, 1);
    sp.position.set(-18 + i * 5, SIREN_FIGURE_Y, -6 + i * 5);
    isle.add(sp);
    sirens.push(sp);
  }
  scene.add(isle);

  // ----------------------------------------------------------------- ship
  const shipRoot = new THREE.Group();
  shipRoot.name = "sirensShip";
  scene.add(shipRoot);
  const hullMeshes: THREE.Mesh[] = [];
  let hullReady = false;
  loadGltfBundle(SHIP.mesh)
    .then((bundle) => {
      const hull = bundle.scene;
      plantHero(hull);
      paintHero(hull);
      hull.scale.multiplyScalar(SIRENS_SHIP_SCALE);
      // Long axis along +z (the strait), whatever the GLB's own facing.
      hull.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(hull);
      const size = new THREE.Vector3();
      box.getSize(size);
      if (size.x > size.z) hull.rotation.y += Math.PI / 2;
      seatHullKeel(hull, SEA_TEX.floorY + KEEL_ABOVE_FLOOR);
      shipRoot.add(hull);
      hull.traverse((o) => {
        if (o instanceof THREE.Mesh) hullMeshes.push(o);
      });
      hullReady = true;
    })
    .catch((err) => console.error("[sirensStrait] hero ship failed to load", err));

  const ray = new THREE.Raycaster();
  const down = new THREE.Vector3(0, -1, 0);
  const tmp = new THREE.Vector3();
  function deckY(local: Vec2): number | null {
    if (!hullReady) return null;
    tmp.set(local.x, 30, local.z);
    shipRoot.localToWorld(tmp);
    ray.set(tmp, down);
    ray.far = 60;
    // The first hit from above is often the sail or mast top — take the
    // highest surface that is still low enough to be the deck.
    let best: number | null = null;
    for (const hit of ray.intersectObjects(hullMeshes, false)) {
      const y = shipRoot.worldToLocal(hit.point.clone()).y;
      if (y <= DECK_MAX_Y && (best === null || y > best)) best = y;
    }
    return best;
  }

  // ------------------------------------------------------------ deck props
  const honey = makeHoneycomb();
  honey.scale.setScalar(2.2);
  honey.position.set(DECK.honeycomb.x, 0, DECK.honeycomb.z);
  shipRoot.add(honey);
  const kneadGlow = new THREE.Mesh(
    new THREE.RingGeometry(0.7, 0.9, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  kneadGlow.rotation.x = -Math.PI / 2;
  kneadGlow.position.set(DECK.kneadSpot.x, 0, DECK.kneadSpot.z);
  shipRoot.add(kneadGlow);
  const rope = new THREE.Mesh(
    new THREE.TorusGeometry(0.32, 0.07, 6, 14),
    new THREE.MeshStandardMaterial({ color: 0x9c7a4a, roughness: 1 }),
  );
  rope.rotation.x = Math.PI / 2;
  rope.position.set(DECK.mast.x + 0.5, 0, DECK.mast.z);
  shipRoot.add(rope);

  // ------------------------------------------------------------------ crew
  const plugs: THREE.Mesh[] = [];
  const crewSlots: THREE.Group[] = DECK.rowers.map((r, i) => {
    const slot = new THREE.Group();
    slot.position.set(r.x, 0, r.z);
    slot.rotation.y = Math.PI; // facing aft, like rowers
    const plug = makePlug();
    plug.position.set(0.12 * (i % 2 === 0 ? 1 : -1), SAILOR.height * 0.93, 0);
    slot.add(plug);
    plugs.push(plug);
    shipRoot.add(slot);
    return slot;
  });
  const crewActors: HumanoidActor[] = [];
  for (const slot of crewSlots) {
    createHumanoidActor(SAILOR.meshRig, {
      heightMeters: SAILOR.height * 0.97,
      expectedBytes: SAILOR.meshRigBytes,
      clipFade: SAILOR.meshClipFade,
    })
      .then((a) => {
        a.scene.rotation.y = SAILOR.meshFacing;
        slot.add(a.scene);
        a.play("idle");
        crewActors.push(a);
      })
      .catch((err) => console.warn("[sirensStrait] rower rig failed to load", err));
  }

  // Deck props follow the deck height once the hull is in.
  // Retried every frame until every prop found the deck — right after the
  // hull is added its world matrices are stale and the ray can miss.
  let propsSeated = false;
  function seatProps(): void {
    if (propsSeated || !hullReady) return;
    shipRoot.updateMatrixWorld(true);
    let all = true;
    const seat = (o: THREE.Object3D, p: Vec2, lift = 0) => {
      const y = deckY(p);
      if (y === null) all = false;
      else o.position.y = y + lift;
    };
    seat(honey, DECK.honeycomb, 0.02);
    seat(kneadGlow, DECK.kneadSpot, 0.04);
    seat(rope, DECK.mast, 0.05);
    DECK.rowers.forEach((r, i) => seat(crewSlots[i], r));
    propsSeated = all;
  }

  return {
    rocks,
    shipRoot,
    deck: DECK,
    deckY,
    setRowerPlugged(i, on) {
      if (plugs[i]) plugs[i].visible = on;
    },
    setWaxVisible(onDeck) {
      honey.visible = onDeck;
    },
    setKneadGlow(amount) {
      (kneadGlow.material as THREE.MeshBasicMaterial).opacity = 0.25 + 0.6 * Math.max(0, Math.min(1, amount));
    },
    hullLoaded: () => hullReady,
    cameraColliders: (passage) => (passage ? rockGroup.children : hullMeshes),
    debugCrew: () =>
      crewSlots.map((slot) => {
        const w = slot.getWorldPosition(new THREE.Vector3());
        return { children: slot.children.length, world: { x: +w.x.toFixed(2), y: +w.y.toFixed(2), z: +w.z.toFixed(2) } };
      }),
    update(t, dt, song, cam) {
      seatProps();
      for (const a of crewActors) a.update(dt);
      sirens.forEach((sp, i) => {
        sp.position.y = SIREN_FIGURE_Y + Math.sin(t * 1.3 + i * 2) * 0.35;
        (sp.material as THREE.SpriteMaterial).opacity = 0.35 + 0.6 * song;
      });
      sea.update(t, FOAM_PARK, 0, cam, 0.35);
    },
  };
}
