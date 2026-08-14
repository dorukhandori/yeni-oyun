import * as THREE from "three";
import { LOTUS, PALETTE } from "../constants";

export interface Sailor {
  root: THREE.Group;
  update(t: number, dt: number, moving: number): void;
  setCarried(n: number): void;
  pulse(strength: number): void;
  land(strength: number): void;
}

/** ASSET-001 turnaround v04 — ashore Odysseus: linen tunic, ochre bands, hip satchel, no cloak/armour. */
export function buildSailor(): Sailor {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = new THREE.MeshStandardMaterial({
    color: 0xd8a074,
    roughness: 0.78,
    flatShading: true,
  });
  const linen = new THREE.MeshStandardMaterial({
    color: 0xf0e8d8,
    roughness: 0.82,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const ochre = new THREE.MeshStandardMaterial({
    color: 0xc9a04a,
    roughness: 0.8,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const leather = new THREE.MeshStandardMaterial({
    color: 0x8a6b45,
    roughness: 0.88,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: 0x40291c,
    roughness: 0.85,
    flatShading: true,
  });
  const satchelCloth = new THREE.MeshStandardMaterial({
    color: 0xc4a574,
    roughness: 0.9,
    flatShading: true,
    side: THREE.DoubleSide,
  });

  const legs: THREE.Mesh[] = [];
  const sandals: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.46, 4, 8), skin);
    leg.position.set(s * 0.13, 0.44, 0);
    body.add(leg);
    legs.push(leg);

    const sandal = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.28), leather);
    sandal.position.set(s * 0.13, 0.06, 0.04);
    body.add(sandal);
    sandals.push(sandal);
    const strap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), leather);
    strap.position.set(s * 0.13, 0.12, 0.1);
    body.add(strap);
  }

  const tunicSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.62, 10), linen);
  tunicSkirt.position.y = 0.88;
  body.add(tunicSkirt);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.32, 5, 10), linen);
  torso.position.y = 1.2;
  torso.scale.set(1.08, 1, 0.92);
  body.add(torso);

  for (const y of [0.72, 0.88, 1.04]) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 5, 14), ochre);
    band.rotation.x = Math.PI / 2;
    band.position.y = y;
    body.add(band);
  }

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.05, 6, 14), leather);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.02;
  body.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skin);
  head.position.y = 1.58;
  head.scale.set(0.92, 1, 0.95);
  body.add(head);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hair,
  );
  cap.position.set(0, 1.6, -0.02);
  body.add(cap);

  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), hair);
  beard.scale.set(1.05, 0.75, 0.65);
  beard.position.set(0, 1.5, 0.11);
  body.add(beard);

  const arms: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.38, 4, 8), skin);
    arm.position.set(s * 0.34, 1.14, 0.02);
    arm.rotation.set(0.15, 0, s * 0.12);
    body.add(arm);
    arms.push(arm);
  }

  const satchel = new THREE.Group();
  satchel.position.set(0.32, 0.98, 0.06);
  satchel.rotation.y = -0.35;
  body.add(satchel);

  const bag = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.12), satchelCloth);
  bag.position.y = 0.02;
  satchel.add(bag);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.08, 0.14), leather);
  flap.position.set(0, 0.16, 0.02);
  flap.rotation.x = 0.25;
  satchel.add(flap);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.04), leather);
  strap.position.set(-0.08, 0.12, -0.06);
  strap.rotation.z = 0.2;
  satchel.add(strap);

  const bloomMat = new THREE.MeshStandardMaterial({
    color: PALETTE.petalRipe,
    emissive: new THREE.Color(PALETTE.petalRipeTint),
    emissiveIntensity: 0.45,
    roughness: 0.5,
    flatShading: true,
  });
  const blooms: THREE.Mesh[] = [];
  const bloomGeo = new THREE.IcosahedronGeometry(0.07, 0);
  for (let i = 0; i < LOTUS.carryCap; i++) {
    const b = new THREE.Mesh(bloomGeo, bloomMat);
    b.position.set(-0.02 + i * 0.05, 0.2, 0.04);
    b.visible = false;
    satchel.add(b);
    blooms.push(b);
  }

  body.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) m.castShadow = true;
  });

  let phase = 0;
  let squash = 0;
  let stretch = 0;
  let landSquash = 0;

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
    update(t: number, dt: number, moving: number) {
      phase += dt * (4.4 + moving * 6.2);
      squash *= Math.exp(-10 * dt);
      stretch *= Math.exp(-8 * dt);
      landSquash *= Math.exp(-12 * dt);

      const sx = 1 + squash * 0.18 + landSquash * 0.22 - stretch * 0.08;
      const sy = 1 - squash * 0.22 - landSquash * 0.28 + stretch * 0.14;
      const sz = 1 + squash * 0.14 + landSquash * 0.16 - stretch * 0.06;

      body.position.y =
        Math.sin(phase * 2) * 0.055 * moving - squash * 0.16 - landSquash * 0.12;
      body.scale.set(sx, sy, sz);
      body.rotation.z = Math.sin(phase) * 0.06 * moving;
      body.rotation.x = moving * 0.08;

      legs[0].position.z = Math.sin(phase) * 0.24 * moving;
      legs[1].position.z = -Math.sin(phase) * 0.24 * moving;
      legs[0].position.y = 0.44 + Math.max(0, Math.sin(phase)) * 0.08 * moving;
      legs[1].position.y = 0.44 + Math.max(0, -Math.sin(phase)) * 0.08 * moving;

      arms[0].rotation.x = 0.15 + Math.sin(phase) * 0.12 * moving;
      arms[1].rotation.x = 0.15 - Math.sin(phase) * 0.12 * moving;

      satchel.rotation.z = Math.sin(t * 2.5) * 0.04 * (0.3 + moving);
      bloomMat.emissiveIntensity = 0.35 + Math.sin(t * 2.4) * 0.15 + squash * 0.4;
    },
  };
}
