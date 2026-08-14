import * as THREE from "three";
import { LAGOON, LOTUS, PALETTE, PUZZLE } from "../constants";
import type { LotusStage } from "../types";
import { heightAt, lagoonDist, lagoonRadiusAt } from "./terrain";
import { mulberry32 } from "./rng";
import { glowSprite } from "./sprite";

export type LotusGate = "stones" | "hill" | null;

export interface LotusGateState {
  stonesOpen: boolean;
  hillOpen: boolean;
}

interface Plant {
  pos: THREE.Vector3;
  stage: LotusStage;
  timer: number;
  duration: number;
  group: THREE.Group;
  flower: THREE.Group;
  petals: THREE.Group[];
  petalMeshes: THREE.Mesh[];
  heart: THREE.Mesh;
  halo: THREE.Sprite;
  phase: number;
  /** Collect punch scale residual. */
  pop: number;
  zone: string;
  gate: LotusGate;
}

export interface LotusField {
  group: THREE.Group;
  /** Advance growth; returns nothing. */
  update(dt: number, t: number): void;
  /** Nearest harvestable ripe plant within range, or null. */
  findRipe(x: number, z: number, gates: LotusGateState): number | null;
  /** Nearest gated ripe plant (blocked) for prompt feedback. */
  findGatedRipe(x: number, z: number, gates: LotusGateState): LotusGate | null;
  positionOf(index: number): THREE.Vector3;
  pick(index: number, gates: LotusGateState): boolean;
  ripeCount(): number;
  setHighlight(index: number | null): void;
  /** Reseed growth stages for a fresh run. */
  reset(): void;
}

const STAGE_ORDER: LotusStage[] = ["bud", "half", "ripe", "wilt", "gone"];

function baseDuration(stage: LotusStage): number {
  switch (stage) {
    case "bud":
      return LOTUS.budTime;
    case "half":
      return LOTUS.halfTime;
    case "ripe":
      return LOTUS.ripeTime;
    case "wilt":
      return LOTUS.wiltTime;
    case "gone":
      return LOTUS.goneTime;
  }
}

/** Per-stage look: petal spread, scale, height and material index. */
const LOOK: Record<LotusStage, { open: number; scale: number; y: number; mat: number }> = {
  bud: { open: 0.06, scale: 0.62, y: 0.34, mat: 0 },
  half: { open: 0.44, scale: 0.86, y: 0.48, mat: 1 },
  ripe: { open: 0.95, scale: 1.14, y: 0.6, mat: 2 },
  wilt: { open: 1.65, scale: 0.92, y: 0.4, mat: 3 },
  gone: { open: 0, scale: 0, y: 0.3, mat: 3 },
};

/** Outer ring opens wide, inner ring stays cupped — reads as a water lily. */
const INNER_RING_FACTOR = 0.42;

export function buildLotusField(): LotusField {
  const group = new THREE.Group();
  const rand = mulberry32(77002);

  const padMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pad,
    roughness: 0.72,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const padMatLight = new THREE.MeshStandardMaterial({
    color: PALETTE.padLight,
    roughness: 0.72,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: PALETTE.stem,
    roughness: 0.8,
    flatShading: true,
  });
  const heartMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lotusHeart,
    emissive: new THREE.Color(PALETTE.lotusHeart),
    emissiveIntensity: 0.65,
    roughness: 0.5,
    flatShading: true,
  });

  const petalMats = [
    new THREE.MeshStandardMaterial({
      color: PALETTE.petalBud,
      roughness: 0.65,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: PALETTE.petalHalf,
      roughness: 0.6,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: PALETTE.petalRipe,
      emissive: new THREE.Color(PALETTE.petalRipeTint),
      emissiveIntensity: 0.55,
      roughness: 0.45,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
    new THREE.MeshStandardMaterial({
      color: PALETTE.petalWilt,
      roughness: 0.9,
      flatShading: true,
      side: THREE.DoubleSide,
    }),
  ];

  const padGeo = new THREE.CircleGeometry(1, 14, 0.32, Math.PI * 2 - 0.64);
  padGeo.rotateX(-Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.035, 0.05, 1, 6);
  const petalGeo = new THREE.ConeGeometry(0.19, 0.52, 5, 1);
  petalGeo.translate(0, 0.26, 0);
  const heartGeo = new THREE.SphereGeometry(0.11, 10, 8);

  const plants: Plant[] = [];
  const spots: Array<{ x: number; z: number; zone: string; indexInZone: number }> = [];

  // Three harvest pockets: reed shore (near ship), deep lagoon, north cove.
  for (const zone of LOTUS.zones) {
    let placed = 0;
    let guard = 0;
    while (placed < zone.count && guard++ < 2500) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * zone.radius;
      const x = zone.cx + Math.cos(a) * r;
      const z = zone.cz + Math.sin(a) * r;
      if (heightAt(x, z) > LAGOON.waterY - 0.05) continue;
      if (lagoonDist(x, z) > lagoonRadiusAt(x, z) - 0.6) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < zone.spacing)) continue;
      spots.push({ x, z, zone: zone.name, indexInZone: placed });
      placed++;
    }
  }

  // Top up if a zone undershot (terrain rejection).
  let guard = 0;
  while (spots.length < LOTUS.count && guard++ < 4000) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (LAGOON.radius - 1.4);
    const x = LAGOON.center.x + Math.cos(a) * r;
    const z = LAGOON.center.z + Math.sin(a) * r;
    if (heightAt(x, z) > LAGOON.waterY - 0.08) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < LOTUS.minSpacing)) continue;
    spots.push({ x, z, zone: "fallback", indexInZone: spots.length });
  }

  const coveCount = spots.filter((s) => s.zone === "cove").length;
  let coveGatedLeft = Math.ceil(coveCount * PUZZLE.coveGatedRatio);

  for (const s of spots) {
    let gate: LotusGate = null;
    if (s.zone === "deep" && s.indexInZone >= PUZZLE.deepGatedFromIndex) {
      gate = "stones";
    } else if (s.zone === "cove" && coveGatedLeft > 0) {
      gate = "hill";
      coveGatedLeft -= 1;
    }

    const g = new THREE.Group();
    g.position.set(s.x, LAGOON.waterY, s.z);
    g.rotation.y = rand() * Math.PI * 2;

    const padCount = 2 + Math.floor(rand() * 3);
    for (let p = 0; p < padCount; p++) {
      const pad = new THREE.Mesh(padGeo, rand() < 0.4 ? padMatLight : padMat);
      const pr = 0.45 + rand() * 0.45;
      pad.scale.set(pr, 1, pr);
      const pa = rand() * Math.PI * 2;
      const pd = 0.25 + rand() * 0.9;
      pad.position.set(Math.cos(pa) * pd, 0.015 + p * 0.004, Math.sin(pa) * pd);
      pad.rotation.y = rand() * Math.PI * 2;
      g.add(pad);
    }

    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.scale.y = 0.55;
    stem.position.y = 0.27;
    g.add(stem);

    const flower = new THREE.Group();
    flower.position.y = 0.55;
    g.add(flower);

    const petals: THREE.Group[] = [];
    const petalMeshes: THREE.Mesh[] = [];
    const rings = [
      { count: 10, radius: 0.1, scale: 1, inner: false },
      { count: 7, radius: 0.05, scale: 0.68, inner: true },
    ];
    for (const ring of rings) {
      for (let i = 0; i < ring.count; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.y = (i / ring.count) * Math.PI * 2 + (ring.inner ? 0.4 : 0);
        pivot.userData.inner = ring.inner;
        const mesh = new THREE.Mesh(petalGeo, petalMats[0]);
        mesh.scale.set(1.4 * ring.scale, 0.82 * ring.scale, 0.5 * ring.scale);
        mesh.position.set(0, 0, ring.radius);
        pivot.add(mesh);
        flower.add(pivot);
        petals.push(pivot);
        petalMeshes.push(mesh);
      }
    }

    const heart = new THREE.Mesh(heartGeo, heartMat);
    heart.position.y = 0.1;
    heart.visible = false;
    flower.add(heart);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowSprite(),
        color: PALETTE.petalRipeTint,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.scale.setScalar(1.1);
    halo.visible = false;
    flower.add(halo);

    group.add(g);

    const stage: LotusStage = STAGE_ORDER[Math.floor(rand() * 4)];
    const plant: Plant = {
      pos: new THREE.Vector3(s.x, LAGOON.waterY, s.z),
      stage,
      timer: rand() * baseDuration(stage),
      duration: baseDuration(stage) * (1 + (rand() - 0.5) * LOTUS.timeJitter),
      group: g,
      flower,
      petals,
      petalMeshes,
      heart,
      halo,
      phase: rand() * 6.28,
      pop: 0,
      zone: s.zone,
      gate,
    };
    plants.push(plant);
    applyStage(plant);
  }

  function applyStage(p: Plant): void {
    const look = LOOK[p.stage];
    const mat = petalMats[look.mat];
    for (let i = 0; i < p.petals.length; i++) {
      const inner = p.petals[i].userData.inner === true;
      p.petals[i].rotation.x = inner ? look.open * INNER_RING_FACTOR : look.open;
      p.petalMeshes[i].material = mat;
    }
    p.flower.scale.setScalar(look.scale);
    p.flower.position.y = look.y;
    p.flower.visible = p.stage !== "gone";
    p.heart.visible = p.stage === "ripe";
    p.halo.visible = p.stage === "ripe";
  }

  function advance(p: Plant): void {
    const i = STAGE_ORDER.indexOf(p.stage);
    p.stage = STAGE_ORDER[(i + 1) % STAGE_ORDER.length];
    p.timer = 0;
    p.duration = baseDuration(p.stage) * (1 + (Math.random() - 0.5) * LOTUS.timeJitter);
    applyStage(p);
  }

  // -------------------------------------------------------------- highlight
  const highlight = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.055, 6, 26),
    new THREE.MeshBasicMaterial({
      color: 0xfff0b0,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  highlight.rotation.x = -Math.PI / 2;
  highlight.visible = false;
  group.add(highlight);

  function gateOpen(p: Plant, gates: LotusGateState): boolean {
    if (!p.gate) return true;
    if (p.gate === "stones") return gates.stonesOpen;
    if (p.gate === "hill") return gates.hillOpen;
    return true;
  }

  function nearestRipe(
    x: number,
    z: number,
    gates: LotusGateState,
    blockedOnly: boolean,
  ): number | null {
    let best: number | null = null;
    let bestD: number = LOTUS.pickRange;
    for (let i = 0; i < plants.length; i++) {
      if (plants[i].stage !== "ripe") continue;
      const open = gateOpen(plants[i], gates);
      if (blockedOnly !== !open) continue;
      const d = Math.hypot(plants[i].pos.x - x, plants[i].pos.z - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  return {
    group,
    update(dt: number, t: number) {
      for (const p of plants) {
        p.timer += dt;
        if (p.timer >= p.duration) advance(p);
        p.pop = Math.max(0, p.pop - dt * 4.5);
        const popScale = 1 + p.pop * 0.55;
        if (p.stage === "ripe") {
          p.flower.position.y = LOOK.ripe.y + Math.sin(t * 1.6 + p.phase) * 0.035;
          p.flower.rotation.y = Math.sin(t * 0.5 + p.phase) * 0.12;
          p.flower.scale.setScalar(LOOK.ripe.scale * popScale);
          p.halo.scale.setScalar(1.1 + Math.sin(t * 3 + p.phase) * 0.15 + p.pop * 0.8);
          (p.halo.material as THREE.SpriteMaterial).opacity = 0.28 + Math.sin(t * 2.4 + p.phase) * 0.1;
        } else if (p.stage === "half" || p.stage === "bud") {
          p.flower.rotation.y = Math.sin(t * 0.4 + p.phase) * 0.08;
          p.flower.scale.setScalar(LOOK[p.stage].scale * popScale);
        } else if (p.stage === "gone") {
          if (p.pop > 0.01) {
            p.flower.visible = true;
            p.flower.scale.setScalar(LOOK.ripe.scale * (0.4 + p.pop) * popScale);
            p.halo.visible = true;
            (p.halo.material as THREE.SpriteMaterial).opacity = p.pop * 0.6;
          } else {
            p.flower.visible = false;
            p.halo.visible = false;
          }
        }
      }
      petalMats[2].emissiveIntensity = 0.45 + Math.sin(t * 2.2) * 0.22;
      heartMat.emissiveIntensity = 0.55 + Math.sin(t * 3.1) * 0.25;
      (highlight.material as THREE.MeshBasicMaterial).opacity = 0.55 + Math.sin(t * 5) * 0.3;
      highlight.scale.setScalar(1 + Math.sin(t * 5) * 0.05);
    },
    findRipe(x, z, gates) {
      return nearestRipe(x, z, gates, false);
    },
    findGatedRipe(x, z, gates) {
      const i = nearestRipe(x, z, gates, true);
      return i === null ? null : plants[i].gate;
    },
    positionOf(index: number) {
      return plants[index].pos;
    },
    pick(index, gates) {
      const p = plants[index];
      if (p.stage !== "ripe") return false;
      if (!gateOpen(p, gates)) return false;
      p.stage = "gone";
      p.timer = 0;
      p.duration = LOTUS.goneTime * (1 + (Math.random() - 0.5) * LOTUS.timeJitter);
      p.pop = 1;
      applyStage(p);
      // Keep halo for the pop flash; update() fades it out.
      p.halo.visible = true;
      p.flower.visible = true;
      return true;
    },
    ripeCount() {
      return plants.reduce((n, p) => n + (p.stage === "ripe" ? 1 : 0), 0);
    },
    setHighlight(index: number | null) {
      if (index === null) {
        highlight.visible = false;
        return;
      }
      const p = plants[index];
      highlight.visible = true;
      highlight.position.set(p.pos.x, LAGOON.waterY + 0.06, p.pos.z);
    },
    reset() {
      const re = mulberry32(77002);
      for (const p of plants) {
        p.stage = STAGE_ORDER[Math.floor(re() * 4)];
        p.timer = re() * baseDuration(p.stage);
        p.duration = baseDuration(p.stage) * (1 + (re() - 0.5) * LOTUS.timeJitter);
        p.pop = 0;
        applyStage(p);
      }
      highlight.visible = false;
    },
  };
}
