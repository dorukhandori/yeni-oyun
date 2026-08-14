import * as THREE from "three";
import { LOTOPHAGOS, PALETTE } from "../constants";
import { heightAt } from "./terrain";

export interface LotophagosNpc {
  group: THREE.Group;
  update(t: number): void;
  /** Nearest NPC still offering within range, or null. */
  findOffer(x: number, z: number): number | null;
  /** Accept gift; returns flowers granted (0 if refused / spent). */
  accept(index: number, room: number): number;
  reset(): void;
}

/** Three silent lotus-eaters — offer ripe blooms once, then only watch. */
export function buildLotophagoi(): LotophagosNpc {
  const group = new THREE.Group();
  const figures: Figure[] = [];

  for (let i = 0; i < LOTOPHAGOS.spots.length; i++) {
    const spot = LOTOPHAGOS.spots[i];
    const fig = makeFigure(i);
    const y = Math.max(heightAt(spot.x, spot.z), 0.02);
    fig.root.position.set(spot.x, y, spot.z);
    fig.root.rotation.y = spot.faceY;
    group.add(fig.root);
    figures.push(fig);
  }

  return {
    group,
    update(t: number) {
      for (const f of figures) f.update(t);
    },
    findOffer(x: number, z: number) {
      let best: number | null = null;
      let bestD: number = LOTOPHAGOS.range;
      for (let i = 0; i < figures.length; i++) {
        if (figures[i].spent) continue;
        const p = figures[i].root.position;
        const d = Math.hypot(p.x - x, p.z - z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },
    accept(index: number, room: number) {
      const f = figures[index];
      if (!f || f.spent || room <= 0) return 0;
      const n = Math.min(LOTOPHAGOS.gift, room);
      f.spent = true;
      f.setOffering(false);
      return n;
    },
    reset() {
      for (const f of figures) {
        f.spent = false;
        f.setOffering(true);
      }
    },
  };
}

interface Figure {
  root: THREE.Group;
  spent: boolean;
  setOffering(on: boolean): void;
  update(t: number): void;
}

function makeFigure(seed: number): Figure {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = new THREE.MeshStandardMaterial({
    color: 0xc9a078,
    roughness: 0.8,
    flatShading: true,
  });
  const linen = new THREE.MeshStandardMaterial({
    color: 0xe8d9b8,
    roughness: 0.85,
    flatShading: true,
  });
  const sash = new THREE.MeshStandardMaterial({
    color: PALETTE.hullTrim,
    roughness: 0.7,
    flatShading: true,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: 0x3a2818,
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

  // Idle arm (left) at side.
  const armL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.38, 3, 6), skin);
  armL.position.set(-0.32, 1.22, 0.05);
  armL.rotation.set(0.15, 0, 0.35);
  body.add(armL);

  // Offering arm (right) — reaches forward with lotus.
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

  body.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });

  const state = { spent: false };
  const phase = seed * 1.7;

  return {
    root,
    get spent() {
      return state.spent;
    },
    set spent(v: boolean) {
      state.spent = v;
    },
    setOffering(on: boolean) {
      offer.visible = on;
      second.visible = on;
      armR.rotation.x = on ? 0 : 0.4;
      armR.rotation.z = on ? 0 : 0.35;
    },
    update(t: number) {
      body.position.y = Math.sin(t * 1.1 + phase) * 0.02;
      if (!state.spent) {
        offer.rotation.y = t * 0.6;
        petalMat.emissiveIntensity = 0.4 + Math.sin(t * 2.5 + phase) * 0.2;
      }
    },
  };
}
