import * as THREE from "three";
import { FLEET, PALETTE, SHIP } from "../constants";
import { heightAt } from "./terrain";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture } from "./sprite";

/** Generated ship textures (`docs/art/asset-registry.md` P1 — Gemi), shipped as WebP. */
const PLANK_TEX_URL = "assets/textures/ship_plank_01_albedo_1024.webp";
const SAIL_TEX_URL = "assets/textures/ship_sail_01_albedo_1024.webp";
const ROPE_TEX_URL = "assets/textures/ship_rope_01_albedo_512.webp";

/** Shared deck-plank material — one texture instance, reused across every hull. */
function buildDeckMaterial(): THREE.MeshStandardMaterial {
  const tex = loadAlbedoTexture(assetUrl(PLANK_TEX_URL));
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1.8, 5.4);
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: PALETTE.hullDark,
    roughness: 0.85,
    flatShading: true,
  });
}

/** Shared sail-cloth material. */
function buildSailMaterial(): THREE.MeshStandardMaterial {
  const tex = loadAlbedoTexture(assetUrl(SAIL_TEX_URL));
  return new THREE.MeshStandardMaterial({
    map: tex,
    color: PALETTE.sail,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
}

export interface Ship {
  group: THREE.Group;
  /** World position used for the delivery trigger (Doryseus' ship). */
  anchor: THREE.Vector3;
  update(t: number, departing: number): void;
  /** Light a mast ribbon on the first n ships (visual progress). */
  setDelivered(n: number): void;
  reset(): void;
}

/** Twelve Achaean galleys on the beach — middle one is Doryseus' delivery ship. */
export function buildShip(): Ship {
  const group = new THREE.Group();

  // Shore frame: radial out from island center through the beach point.
  const beachAngle = Math.atan2(SHIP.pos.z, SHIP.pos.x);
  const tangentX = -Math.sin(beachAngle);
  const tangentZ = Math.cos(beachAngle);
  const radialX = Math.cos(beachAngle);
  const radialZ = Math.sin(beachAngle);

  const ribbons: THREE.Mesh[] = [];
  const hulls: THREE.Group[] = [];
  const homePos: THREE.Vector3[] = [];
  const homeRot: number[] = [];
  let sailUpdate: ((t: number, departing: number) => void) | null = null;

  const ribbonMat = new THREE.MeshStandardMaterial({
    color: PALETTE.petalRipeTint,
    emissive: new THREE.Color(PALETTE.lotusHeart),
    emissiveIntensity: 0.35,
    roughness: 0.55,
    flatShading: true,
  });

  for (let i = 0; i < FLEET.count; i++) {
    const slot = i - FLEET.playerIndex;
    const ox = SHIP.pos.x + tangentX * slot * FLEET.spacing + radialX * (Math.abs(slot) * 0.15);
    const oz = SHIP.pos.z + tangentZ * slot * FLEET.spacing + radialZ * (Math.abs(slot) * 0.15);
    const oy = heightAt(ox, oz);
    const isPlayer = i === FLEET.playerIndex;
    const hull = isPlayer ? buildHeroHull() : buildSisterHull(0.55 + (i % 3) * 0.04);
    hull.position.set(ox, oy, oz);
    hull.rotation.y = SHIP.rotY + slot * 0.04;
    if (isPlayer) hull.scale.setScalar(SHIP.scale);
    group.add(hull);
    hulls.push(hull);
    homePos.push(new THREE.Vector3(ox, oy, oz));
    homeRot.push(hull.rotation.y);

    if (isPlayer && hull.userData.sailUpdate) {
      sailUpdate = hull.userData.sailUpdate as (t: number, departing: number) => void;
    }

    // One ribbon per ship — lights when that lotus is stowed.
    const ribbon = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.2), ribbonMat);
    ribbon.position.set(0, isPlayer ? 3.4 : 2.2, 0.15);
    ribbon.visible = false;
    hull.add(ribbon);
    ribbons.push(ribbon);
  }

  const playerHull = hulls[FLEET.playerIndex];
  const anchor = homePos[FLEET.playerIndex].clone();

  return {
    group,
    anchor,
    setDelivered(n: number) {
      for (let i = 0; i < ribbons.length; i++) ribbons[i].visible = i < n;
    },
    reset() {
      for (let i = 0; i < hulls.length; i++) {
        hulls[i].position.copy(homePos[i]);
        hulls[i].rotation.y = homeRot[i];
        hulls[i].rotation.z = 0;
        ribbons[i].visible = false;
      }
    },
    update(t: number, departing: number) {
      sailUpdate?.(t, departing);
      ribbonMat.emissiveIntensity = 0.3 + Math.sin(t * 2.5) * 0.15;

      for (let i = 0; i < hulls.length; i++) {
        const h = hulls[i];
        const home = homePos[i];
        const stagger = i * 0.035;
        const d = Math.max(0, departing - stagger);
        h.position.x = home.x + Math.cos(beachAngle) * d * 22;
        h.position.z = home.z + Math.sin(beachAngle) * d * 22;
        h.position.y = home.y + d * 0.3 + Math.sin(t * 0.9 + i) * 0.05 * d;
        h.rotation.z = Math.sin(t * 0.8 + i * 0.4) * 0.035 * (0.25 + d);
      }

      // Keep delivery trigger on Doryseus' hull while beached / departing.
      anchor.set(playerHull.position.x, playerHull.position.y, playerHull.position.z);
    },
  };
}

function buildHeroHull(): THREE.Group {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: PALETTE.hull,
    roughness: 0.85,
    flatShading: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: PALETTE.hullDark,
    roughness: 0.9,
    flatShading: true,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: PALETTE.hullTrim,
    roughness: 0.7,
    flatShading: true,
  });
  const deckMat = buildDeckMaterial();
  const sailMat = buildSailMaterial();
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xf7f2e2, roughness: 0.6 });

  const hullGeo = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.scale.set(1.5, 1.5, 5.2);
  hull.position.y = 1.5;
  hull.castShadow = true;
  group.add(hull);

  const rail = new THREE.Mesh(new THREE.TorusGeometry(1, 0.1, 6, 28), darkMat);
  rail.rotation.x = Math.PI / 2;
  rail.scale.set(1.5, 5.2, 1);
  rail.position.y = 1.5;
  group.add(rail);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 9.2), deckMat);
  deck.position.y = 1.42;
  group.add(deck);

  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.06, 0.26, 8.4), trimMat);
  stripe.position.y = 1.05;
  group.add(stripe);

  for (const [z, tilt] of [
    [5.1, -0.5],
    [-5.1, 0.5],
  ] as const) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 2.6, 8), hullMat);
    post.position.set(0, 1.9, z);
    post.rotation.x = tilt;
    group.add(post);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.11, 6, 14, Math.PI * 1.4), hullMat);
    curl.position.set(0, 2.9, z + (z > 0 ? 0.55 : -0.55));
    curl.rotation.set(0, Math.PI / 2, z > 0 ? 0.6 : -0.6);
    group.add(curl);
  }

  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.3, 14), eyeMat);
    eye.position.set(s * 1.3, 1.62, 3.5);
    eye.rotation.y = s * Math.PI * 0.5;
    group.add(eye);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), darkMat);
    pupil.position.set(s * 1.33, 1.62, 3.5);
    pupil.rotation.y = s * Math.PI * 0.5;
    group.add(pupil);
  }

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 7.6, 8), hullMat);
  mast.position.y = 5.1;
  mast.castShadow = true;
  group.add(mast);

  const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5.6, 6), darkMat);
  yard.rotation.z = Math.PI / 2;
  yard.position.y = 7.3;
  group.add(yard);

  const sailGeo = new THREE.PlaneGeometry(5.2, 3.9, 14, 8);
  const sailPos = sailGeo.attributes.position as THREE.BufferAttribute;
  const sailBase = Float32Array.from(sailPos.array);
  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.position.set(0, 5.4, -0.1);
  sail.castShadow = true;
  group.add(sail);

  const band = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 0.55), trimMat);
  band.position.set(0, 5.4, -0.16);
  group.add(band);

  for (const s of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const oar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 3.4), darkMat);
      oar.position.set(s * 1.5, 1.2, -3.2 + i * 1.6);
      oar.rotation.set(0, s * 1.2, s * 0.22);
      group.add(oar);
    }
  }

  const plank = new THREE.Mesh(new THREE.BoxGeometry(1, 0.14, 4.6), deckMat);
  plank.position.set(-1.6, 0.85, -1.2);
  plank.rotation.set(0.28, 0.35, 0.12);
  group.add(plank);

  const jarMat = new THREE.MeshStandardMaterial({
    color: 0xb5763f,
    roughness: 0.8,
    flatShading: true,
  });
  const basket = new THREE.Group();
  basket.position.set(-2.9, 0.1, -2.4);
  for (let i = 0; i < 3; i++) {
    const jar = new THREE.Mesh(new THREE.LatheGeometry(jarProfile(), 10), jarMat);
    jar.position.set((i - 1) * 0.62, 0, (i % 2) * 0.4);
    jar.scale.setScalar(0.9 + i * 0.08);
    jar.castShadow = true;
    basket.add(jar);
  }
  group.add(basket);

  // Coiled fishing net on the deck (ASSET-020) — the source sheet has a rope
  // strand on top and a net square below; crop to just the net square via
  // offset/repeat instead of shipping a second file.
  const ropeTex = loadAlbedoTexture(assetUrl(ROPE_TEX_URL));
  ropeTex.offset.set(0.197, 0.009);
  ropeTex.repeat.set(0.66, 0.542);
  const netMat = new THREE.MeshStandardMaterial({
    map: ropeTex,
    transparent: true,
    alphaTest: 0.4,
    roughness: 0.8,
    side: THREE.DoubleSide,
  });
  const net = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.1), netMat);
  net.rotation.x = -Math.PI / 2;
  net.position.set(0.7, 1.52, -3.6);
  net.rotation.z = 0.3;
  group.add(net);

  group.userData.sailUpdate = (t: number, departing: number) => {
    for (let i = 0; i < sailPos.count; i++) {
      const x = sailBase[i * 3];
      const yv = sailBase[i * 3 + 1];
      sailPos.setZ(
        i,
        Math.sin(x * 1.1 + t * 2.1) * (0.16 + departing * 0.3) +
          Math.sin(yv * 1.4 - t * 1.5) * 0.09,
      );
    }
    sailPos.needsUpdate = true;
    sailGeo.computeVertexNormals();
  };

  return group;
}

function buildSisterHull(scale: number): THREE.Group {
  const group = new THREE.Group();
  group.scale.setScalar(scale);

  const hullMat = new THREE.MeshStandardMaterial({
    color: PALETTE.hull,
    roughness: 0.88,
    flatShading: true,
  });
  const deckMat = buildDeckMaterial();
  const sailMat = buildSailMaterial();

  const hull = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5),
    hullMat,
  );
  hull.scale.set(1.2, 1.15, 4.2);
  hull.position.y = 1.2;
  hull.castShadow = true;
  group.add(hull);

  const deck = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 7.2), deckMat);
  deck.position.y = 1.15;
  group.add(deck);

  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 5.4, 6), hullMat);
  mast.position.y = 3.7;
  mast.castShadow = true;
  group.add(mast);

  const sail = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 2.6), sailMat);
  sail.position.set(0, 3.9, -0.08);
  group.add(sail);

  const prow = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.18, 1.8, 6), hullMat);
  prow.position.set(0, 1.6, 4.1);
  prow.rotation.x = -0.45;
  group.add(prow);

  return group;
}

function jarProfile(): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const r = 0.12 + Math.sin(t * Math.PI) * 0.34;
    pts.push(new THREE.Vector2(Math.max(0.05, r), t * 1.25));
  }
  return pts;
}
