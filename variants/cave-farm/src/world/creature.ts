import * as THREE from "three";
import { PALETTE } from "../constants";
import { glowSprite } from "./sprite";

export interface Creature {
  root: THREE.Group;
  lanternLight: THREE.PointLight;
  lanternWorld: THREE.Vector3;
  /** @param moving 0..1 blend used for the walk cycle. */
  update(t: number, dt: number, moving: number): void;
  pulse(strength: number): void;
}

/** Low-poly Glowsprig: fairy-winged sprite carrying a warm lantern staff. */
export function buildCreature(): Creature {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const cream = new THREE.MeshStandardMaterial({
    color: PALETTE.cream,
    roughness: 0.7,
    flatShading: true,
  });
  const tunic = new THREE.MeshStandardMaterial({
    color: PALETTE.tunic,
    roughness: 0.65,
    flatShading: true,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x2a1d2e, roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xe8b455,
    emissive: new THREE.Color(0x7a4310),
    emissiveIntensity: 0.8,
    roughness: 0.35,
    metalness: 0.6,
    flatShading: true,
  });
  const wingMat = new THREE.MeshStandardMaterial({
    color: 0x8b5cf6,
    emissive: new THREE.Color(0x9b6bff),
    emissiveIntensity: 0.85,
    transparent: true,
    opacity: 0.62,
    roughness: 0.2,
    side: THREE.DoubleSide,
    flatShading: true,
  });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.34, 5, 10), cream);
  torso.position.y = 0.72;
  body.add(torso);

  const cape = new THREE.Mesh(new THREE.CapsuleGeometry(0.29, 0.18, 5, 10), tunic);
  cape.position.set(0, 0.62, -0.03);
  cape.scale.set(1.02, 1, 0.92);
  body.add(cape);

  const skirt = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.36, 8), tunic);
  skirt.position.y = 0.44;
  body.add(skirt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 14, 12), cream);
  head.position.set(0, 1.16, 0.02);
  head.scale.set(1, 0.96, 1.02);
  body.add(head);

  const hood = new THREE.Mesh(new THREE.SphereGeometry(0.29, 14, 12, 0, Math.PI * 2, 0, 1.4), tunic);
  hood.position.set(0, 1.18, -0.03);
  body.add(hood);

  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 5), cream);
    ear.position.set(s * 0.2, 1.34, -0.02);
    ear.rotation.set(-0.25, 0, s * 0.5);
    body.add(ear);
  }

  const legs: THREE.Mesh[] = [];
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.22, 4, 8), dark);
    leg.position.set(s * 0.12, 0.24, 0);
    body.add(leg);
    legs.push(leg);
  }

  // ------------------------------------------------------------------- wings
  const wingPivot = new THREE.Group();
  wingPivot.position.set(0, 0.88, -0.2);
  body.add(wingPivot);
  const wings: THREE.Group[] = [];
  for (const s of [-1, 1]) {
    const side = new THREE.Group();
    const upper = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), wingMat);
    upper.scale.set(0.2, 1, 0.5);
    upper.position.set(s * 0.16, 0.22, -0.14);
    upper.rotation.set(0.3, 0, s * -0.55);
    side.add(upper);
    const lower = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), wingMat);
    lower.scale.set(0.18, 0.85, 0.45);
    lower.position.set(s * 0.22, -0.04, -0.16);
    lower.rotation.set(0.22, 0, s * -1.05);
    side.add(lower);
    wingPivot.add(side);
    wings.push(side);
  }

  // ------------------------------------------------------- lantern staff + light
  const armPivot = new THREE.Group();
  armPivot.position.set(0.24, 0.86, 0.04);
  body.add(armPivot);

  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.24, 4, 8), cream);
  arm.position.set(0.06, -0.08, 0.08);
  arm.rotation.z = -0.5;
  armPivot.add(arm);

  const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 1.5, 7), dark);
  staff.position.set(0.2, 0.12, 0.14);
  staff.rotation.set(-0.32, 0, -0.14);
  armPivot.add(staff);

  // Lantern rides ahead of the sprite so the camera-facing back stays in shade.
  const lanternPivot = new THREE.Group();
  lanternPivot.position.set(0.3, 0.84, 0.42);
  armPivot.add(lanternPivot);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.032, 6, 14), gold);
  ring.rotation.y = Math.PI / 2;
  lanternPivot.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.028, 6, 14), gold);
  lanternPivot.add(ring2);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.13, 14, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffdca8,
      emissive: new THREE.Color(PALETTE.lantern),
      emissiveIntensity: 1.7,
      roughness: 0.4,
    }),
  );
  lanternPivot.add(flame);

  // Soft sprite halo instead of leaning on bloom, which blocks up at low mips.
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowSprite(),
      color: PALETTE.lantern,
      transparent: true,
      opacity: 0.62,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  halo.scale.setScalar(1.5);
  lanternPivot.add(halo);

  // Soft decay: a physical inverse-square falloff blows out anything this close.
  const lanternLight = new THREE.PointLight(PALETTE.lantern, 4.6, 17, 1.35);
  lanternLight.castShadow = true;
  lanternLight.shadow.mapSize.set(1024, 1024);
  lanternLight.shadow.bias = -0.004;
  lanternLight.shadow.camera.near = 0.3;
  lanternLight.shadow.camera.far = 26;
  lanternPivot.add(lanternLight);

  const warmFill = new THREE.PointLight(0xffc490, 1.5, 5, 2);
  warmFill.position.set(0, 0.9, 0.2);
  body.add(warmFill);

  // Cool rim from behind so the silhouette separates from the dark cave.
  const rim = new THREE.PointLight(0x9d8bff, 1.6, 4, 2);
  rim.position.set(0, 1.35, -0.85);
  body.add(rim);

  // Soft contact shadow blob so the sprite is grounded even in the dark.
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 18),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34 }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.035;
  root.add(blob);

  body.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).castShadow = false;
  });

  const lanternWorld = new THREE.Vector3();
  let phase = 0;
  let squash = 0;

  return {
    root,
    lanternLight,
    lanternWorld,
    pulse(strength: number) {
      squash = Math.max(squash, strength);
    },
    update(t: number, dt: number, moving: number) {
      phase += dt * (5.4 + moving * 5.2);
      squash *= 0.88;

      const bob = Math.sin(phase * 2) * 0.045 * moving;
      body.position.y = bob + Math.sin(t * 1.6) * 0.018 - squash * 0.12;
      body.scale.set(1 + squash * 0.12, 1 - squash * 0.18, 1 + squash * 0.12);
      body.rotation.z = Math.sin(phase) * 0.045 * moving;
      body.rotation.x = moving * 0.075;

      legs[0].position.z = Math.sin(phase) * 0.17 * moving;
      legs[1].position.z = -Math.sin(phase) * 0.17 * moving;
      legs[0].position.y = 0.24 + Math.max(0, Math.sin(phase)) * 0.06 * moving;
      legs[1].position.y = 0.24 + Math.max(0, -Math.sin(phase)) * 0.06 * moving;

      const flutter = Math.sin(t * 26) * 0.42;
      wings[0].rotation.y = 0.3 + flutter;
      wings[1].rotation.y = -0.3 - flutter;
      wingPivot.position.y = 0.92 + Math.sin(t * 26) * 0.01;

      armPivot.rotation.x = Math.sin(phase) * 0.1 * moving - 0.06;
      lanternPivot.rotation.z = Math.sin(t * 2.1) * 0.12 * (0.4 + moving);

      // Candle flicker: two detuned sines plus a touch of noise.
      const flick =
        0.86 + Math.sin(t * 11.3) * 0.07 + Math.sin(t * 27.7) * 0.045 + Math.random() * 0.03;
      lanternLight.intensity = 4.6 * flick;
      halo.scale.setScalar(1.4 + flick * 0.18);
      warmFill.intensity = 1.5 * flick;

      lanternPivot.getWorldPosition(lanternWorld);
    },
  };
}
