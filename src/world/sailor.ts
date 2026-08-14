import * as THREE from "three";
import { LOTUS, PALETTE } from "../constants";

export interface Sailor {
  root: THREE.Group;
  update(t: number, dt: number, moving: number): void;
  setCarried(n: number): void;
  pulse(strength: number): void;
  land(strength: number): void;
}

/** Low-poly Achaean sailor: chiton, crimson cloak, woven basket of lotuses. */
export function buildSailor(): Sailor {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const skin = new THREE.MeshStandardMaterial({
    color: 0xd8a074,
    roughness: 0.75,
    flatShading: true,
  });
  const linen = new THREE.MeshStandardMaterial({
    color: 0xf2e6cd,
    roughness: 0.8,
    flatShading: true,
  });
  const cloak = new THREE.MeshStandardMaterial({
    color: 0xb03a2e,
    roughness: 0.75,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: 0x40291c,
    roughness: 0.85,
    flatShading: true,
  });
  const wicker = new THREE.MeshStandardMaterial({
    color: 0xb88a4a,
    roughness: 0.9,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const bronze = new THREE.MeshStandardMaterial({
    color: 0xc9a227,
    roughness: 0.4,
    metalness: 0.6,
    flatShading: true,
  });

  const legs: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.5, 4, 8), skin);
    leg.position.set(s * 0.14, 0.42, 0);
    body.add(leg);
    legs.push(leg);
  }

  const tunic = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.72, 10), linen);
  tunic.position.y = 0.92;
  body.add(tunic);

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.34, 5, 10), linen);
  torso.position.y = 1.24;
  body.add(torso);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.045, 6, 14), bronze);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.06;
  body.add(belt);

  // Cloak: open half-cylinder draped over the back.
  const cape = new THREE.Mesh(
    new THREE.CylinderGeometry(0.36, 0.46, 0.95, 12, 1, true, Math.PI * 0.15, Math.PI * 1.2),
    cloak,
  );
  cape.position.set(0, 1.22, -0.04);
  body.add(cape);

  const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), bronze);
  clasp.position.set(0.2, 1.46, 0.16);
  body.add(clasp);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 14, 12), skin);
  head.position.y = 1.66;
  body.add(head);

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(0.245, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hair,
  );
  cap.position.set(0, 1.67, -0.02);
  body.add(cap);

  const beard = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), hair);
  beard.scale.set(1, 0.85, 0.7);
  beard.position.set(0, 1.55, 0.13);
  body.add(beard);

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.028, 6, 16), cloak);
  band.rotation.x = Math.PI / 2;
  band.position.y = 1.76;
  body.add(band);

  // Arms cradle the basket in front.
  const arms: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.42, 4, 8), skin);
    arm.position.set(s * 0.3, 1.2, 0.16);
    arm.rotation.set(-0.75, 0, s * 0.22);
    body.add(arm);
    arms.push(arm);
  }

  const basket = new THREE.Group();
  basket.position.set(0, 1.02, 0.38);
  body.add(basket);
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.26, 0.19, 0.3, 12, 1, true),
    wicker,
  );
  basket.add(bowl);
  const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.19, 12), wicker);
  bottom.rotation.x = -Math.PI / 2;
  bottom.position.y = -0.15;
  basket.add(bottom);
  const brim = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.028, 6, 16), wicker);
  brim.rotation.x = Math.PI / 2;
  brim.position.y = 0.15;
  basket.add(brim);

  // Visible harvest: one bloom per carried lotus.
  const bloomMat = new THREE.MeshStandardMaterial({
    color: PALETTE.petalRipe,
    emissive: new THREE.Color(PALETTE.petalRipeTint),
    emissiveIntensity: 0.45,
    roughness: 0.5,
    flatShading: true,
  });
  const blooms: THREE.Mesh[] = [];
  const bloomGeo = new THREE.IcosahedronGeometry(0.085, 0);
  for (let i = 0; i < LOTUS.carryCap; i++) {
    const b = new THREE.Mesh(bloomGeo, bloomMat);
    const a = (i / LOTUS.carryCap) * Math.PI * 2;
    const rr = i === 0 ? 0 : 0.11;
    b.position.set(Math.cos(a) * rr, 0.1 + (i % 2) * 0.04, Math.sin(a) * rr);
    b.visible = false;
    basket.add(b);
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
    /** Extra squash when feet hit ground after a height drop / stop. */
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
      legs[0].position.y = 0.42 + Math.max(0, Math.sin(phase)) * 0.08 * moving;
      legs[1].position.y = 0.42 + Math.max(0, -Math.sin(phase)) * 0.08 * moving;

      arms[0].rotation.x = -0.75 + Math.sin(phase) * 0.08 * moving;
      arms[1].rotation.x = -0.75 - Math.sin(phase) * 0.08 * moving;

      cape.rotation.x = -0.06 - moving * 0.14 + Math.sin(t * 2.2) * 0.025;
      bloomMat.emissiveIntensity = 0.35 + Math.sin(t * 2.4) * 0.15 + squash * 0.4;
    },
  };
}
