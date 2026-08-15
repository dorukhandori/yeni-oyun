import * as THREE from "three";
import { ACTIVE_PROFILE, BEAUTY, ISLAND, LANDMARK, LOTOPHAGOS, PALETTE, PLAYER, SHIP, WORLD } from "../constants";
import { heightAt } from "./terrain";

export interface LotophagosNpc {
  group: THREE.Group;
  update(dt: number, t: number, player: THREE.Vector3, ship: THREE.Vector3): void;
  findOffer(x: number, z: number): number | null;
  findLook(x: number, z: number): number | null;
  accept(index: number, room: number): { n: number; woman: boolean };
  isWoman(index: number): boolean;
  reset(): void;
}

interface Figure {
  root: THREE.Group;
  home: { x: number; z: number };
  waypoint: { x: number; z: number };
  woman: boolean;
  spent: boolean;
  setOffering(on: boolean): void;
  updateIdle(t: number): void;
}

function inNorthSpikes(x: number, z: number): boolean {
  if (LANDMARK.northSpikes.height <= 0) return false;
  const r = Math.hypot(x, z);
  const north = Math.max(0, z / Math.max(r, 1));
  return north >= 0.35 && r >= LANDMARK.northSpikes.startR;
}

function walkable(x: number, z: number, ship: THREE.Vector3): boolean {
  const h = heightAt(x, z);
  if (h < PLAYER.wadeFloor) return false;
  if (inNorthSpikes(x, z)) return false;
  if (Math.hypot(x - ship.x, z - ship.z) < SHIP.range) return false;
  if (Math.hypot(x, z) > ISLAND.radius - 8) return false;
  return true;
}

export function buildLotophagoi(): LotophagosNpc {
  const group = new THREE.Group();
  const figures: Figure[] = [];

  const homes = [
    ...LOTOPHAGOS.spots.map((s) => ({ x: s.x, z: s.z, faceY: s.faceY, woman: false })),
    ...(ACTIVE_PROFILE === "real"
      ? [{ x: BEAUTY.womanPos.x, z: BEAUTY.womanPos.z, faceY: 0.8, woman: true }]
      : []),
  ];

  for (let i = 0; i < homes.length; i++) {
    const spot = homes[i];
    const fig = makeFigure(i, spot.woman);
    const y = Math.max(heightAt(spot.x, spot.z), 0.02);
    fig.root.position.set(spot.x, y, spot.z);
    fig.root.rotation.y = spot.faceY;
    fig.home = { x: spot.x, z: spot.z };
    fig.waypoint = { x: spot.x, z: spot.z };
    group.add(fig.root);
    if (fig.woman) fig.root.visible = WORLD.k35;
    figures.push(fig);
  }

  return {
    group,
    update(dt, t, player, ship) {
      const speed = PLAYER.speed * BEAUTY.wanderSpeedMul;
      for (const f of figures) {
        f.updateIdle(t);
        const px = f.root.position.x;
        const pz = f.root.position.z;
        const nearPlayer = Math.hypot(px - player.x, pz - player.z) < LOTOPHAGOS.range;
        if (nearPlayer && !f.spent) {
          f.root.rotation.y = Math.atan2(player.x - px, player.z - pz);
          continue;
        }
        if (!WORLD.k35) continue;
        let dx = f.waypoint.x - px;
        let dz = f.waypoint.z - pz;
        let dist = Math.hypot(dx, dz);
        if (dist < 0.6) {
          for (let n = 0; n < 8; n++) {
            const a = Math.random() * Math.PI * 2;
            const r = 4 + Math.random() * (BEAUTY.wanderR - 4);
            const nx = f.home.x + Math.cos(a) * r;
            const nz = f.home.z + Math.sin(a) * r;
            if (walkable(nx, nz, ship)) {
              f.waypoint = { x: nx, z: nz };
              break;
            }
          }
          continue;
        }
        const step = Math.min(speed * dt, dist);
        const nx = px + (dx / dist) * step;
        const nz = pz + (dz / dist) * step;
        if (!walkable(nx, nz, ship)) {
          f.waypoint = { x: f.home.x, z: f.home.z };
          continue;
        }
        f.root.position.x = nx;
        f.root.position.z = nz;
        f.root.position.y = Math.max(heightAt(nx, nz), 0.02);
        f.root.rotation.y = Math.atan2(dx, dz);
      }
    },
    findOffer(x, z) {
      let best: number | null = null;
      let bestD: number = LOTOPHAGOS.range;
      for (let i = 0; i < figures.length; i++) {
        if (!figures[i].root.visible || figures[i].spent) continue;
        const p = figures[i].root.position;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },
    findLook(x, z) {
      let best: number | null = null;
      let bestD: number = LOTOPHAGOS.range;
      for (let i = 0; i < figures.length; i++) {
        if (!figures[i].root.visible || !figures[i].spent) continue;
        const p = figures[i].root.position;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },
    accept(index, room) {
      const f = figures[index];
      if (!f || f.spent || room <= 0) return { n: 0, woman: false };
      const n = Math.min(LOTOPHAGOS.gift, room);
      f.spent = true;
      f.setOffering(false);
      return { n, woman: f.woman };
    },
    isWoman(index) {
      return figures[index]?.woman ?? false;
    },
    reset() {
      for (const f of figures) {
        f.spent = false;
        f.setOffering(true);
        f.root.position.set(f.home.x, Math.max(heightAt(f.home.x, f.home.z), 0.02), f.home.z);
        f.waypoint = { ...f.home };
        if (f.woman) f.root.visible = WORLD.k35;
      }
    },
  };
}

function makeFigure(seed: number, woman: boolean): Figure {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = new THREE.MeshStandardMaterial({
    color: woman ? 0xd4b08a : 0xc9a078,
    roughness: 0.8,
    flatShading: true,
  });
  const linen = new THREE.MeshStandardMaterial({
    color: woman ? 0xf2d6c4 : 0xe8d9b8,
    roughness: 0.85,
    flatShading: true,
  });
  const sash = new THREE.MeshStandardMaterial({
    color: woman ? PALETTE.petalRipeTint : PALETTE.hullTrim,
    roughness: 0.7,
    flatShading: true,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: woman ? 0x4a2c18 : 0x3a2818,
    roughness: 0.9,
    flatShading: true,
  });

  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.48, 4, 7), skin);
    leg.position.set(s * 0.12, 0.4, 0);
    body.add(leg);
  }

  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.95, 10), linen);
  robe.position.y = 0.95;
  body.add(robe);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.28, 4, 8), linen);
  torso.position.y = 1.28;
  body.add(torso);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.04, 5, 12), sash);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.08;
  body.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skin);
  head.position.y = 1.68;
  body.add(head);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair,
  );
  cap.position.set(0, 1.7, -0.02);
  body.add(cap);

  if (woman) {
    const wreath = new THREE.Mesh(
      new THREE.TorusGeometry(0.2, 0.035, 6, 14),
      new THREE.MeshStandardMaterial({
        color: PALETTE.petalRipeTint,
        roughness: 0.5,
        flatShading: true,
      }),
    );
    wreath.rotation.x = Math.PI / 2;
    wreath.position.set(0, 1.86, 0);
    body.add(wreath);
  }

  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 3, 6), skin);
  armL.position.set(-0.32, 1.22, 0.05);
  armL.rotation.set(0.15, 0, 0.35);
  body.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.28, 1.32, 0.08);
  body.add(armR);
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 3, 6), skin);
  upper.rotation.set(-1.05, 0, -0.15);
  upper.position.set(0, -0.05, 0.18);
  armR.add(upper);

  const offer = new THREE.Group();
  offer.position.set(0.05, 0.15, 0.52);
  armR.add(offer);

  const petalMat = new THREE.MeshStandardMaterial({
    color: PALETTE.petalRipe,
    emissive: new THREE.Color(PALETTE.petalRipeTint),
    emissiveIntensity: 0.5,
    roughness: 0.45,
    flatShading: true,
  });
  for (let i = 0; i < 5; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), petalMat);
    const a = (i / 5) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.08, Math.sin(a) * 0.05, 0);
    petal.scale.set(1.1, 0.45, 0.7);
    offer.add(petal);
  }
  const heart = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.06, 0),
    new THREE.MeshStandardMaterial({
      color: PALETTE.lotusHeart,
      emissive: new THREE.Color(PALETTE.lotusHeart),
      emissiveIntensity: 0.6,
      flatShading: true,
    }),
  );
  offer.add(heart);

  const second = offer.clone();
  second.position.set(-0.12, 0.05, 0.48);
  second.scale.setScalar(0.85);
  armR.add(second);
  if (WORLD.k35) second.visible = false;

  body.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });

  const state = { spent: false };
  const phase = seed * 1.7;

  return {
    root,
    home: { x: 0, z: 0 },
    waypoint: { x: 0, z: 0 },
    woman,
    get spent() {
      return state.spent;
    },
    set spent(v: boolean) {
      state.spent = v;
    },
    setOffering(on: boolean) {
      offer.visible = on;
      second.visible = on && !WORLD.k35;
      armR.rotation.x = on ? 0 : 0.4;
      armR.rotation.z = on ? 0 : 0.35;
    },
    updateIdle(t: number) {
      body.position.y = Math.sin(t * 1.1 + phase) * 0.02;
      if (!state.spent) {
        offer.rotation.y = t * 0.6;
        petalMat.emissiveIntensity = 0.4 + Math.sin(t * 2.5 + phase) * 0.2;
      }
    },
  };
}
