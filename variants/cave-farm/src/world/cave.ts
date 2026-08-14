import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { CAVE_H, CELL, PALETTE } from "../constants";
import { cellToWorld } from "../farm/world";
import type { CaveMap } from "../types";
import { displace, placed } from "./geo";
import { mulberry32 } from "./rng";
import { glowSprite } from "./sprite";

export interface Cave {
  group: THREE.Group;
  update(t: number): void;
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export function buildCave(map: CaveMap): Cave {
  const group = new THREE.Group();
  const rand = mulberry32(1337);

  const isRock = (cx: number, cz: number) =>
    cx < 0 || cz < 0 || cx >= map.width || cz >= map.height || map.cells[cz][cx].ground === "rock";

  const openNear = (cx: number, cz: number, r: number) => {
    for (let dz = -r; dz <= r; dz++) {
      for (let dx = -r; dx <= r; dx++) {
        if (!isRock(cx + dx, cz + dz)) return true;
      }
    }
    return false;
  };

  // ---------------------------------------------------------------- rock shell
  const chunkGeo = displace(new THREE.IcosahedronGeometry(1, 1), 0.42, rand);
  const coolChunks: THREE.BufferGeometry[] = [];
  const warmChunks: THREE.BufferGeometry[] = [];

  for (let cz = 0; cz < map.height; cz++) {
    for (let cx = 0; cx < map.width; cx++) {
      if (!isRock(cx, cz)) continue;
      const border = !openNear(cx, cz, 1);
      if (border && !openNear(cx, cz, 3)) continue;
      const { x, z } = cellToWorld(map, cx, cz);
      const stacks = border ? 2 : 4;
      // Warm rust-coloured rock shows up where the lantern will sweep past.
      const warm = rand() < 0.26;
      const bucket = warm ? warmChunks : coolChunks;
      for (let i = 0; i < stacks; i++) {
        const s = CELL * (0.78 + rand() * 0.5);
        bucket.push(
          placed(
            chunkGeo,
            V(
              x + (rand() - 0.5) * CELL * 0.7,
              i * (CAVE_H / 3.2) - 0.7 + rand() * 0.5,
              z + (rand() - 0.5) * CELL * 0.7,
            ),
            V(s, s * (0.9 + rand() * 0.7), s),
            V(rand() * 6.28, rand() * 6.28, rand() * 6.28),
          ),
        );
      }
    }
  }

  // ------------------------------------------------------------------- ceiling
  // Every open cell gets a boulder overhead so the cave is fully enclosed.
  for (let cz = 0; cz < map.height; cz++) {
    for (let cx = 0; cx < map.width; cx++) {
      if (isRock(cx, cz)) continue;
      const { x, z } = cellToWorld(map, cx, cz);
      const s = CELL * (1.05 + rand() * 0.5);
      coolChunks.push(
        placed(
          chunkGeo,
          V(
            x + (rand() - 0.5) * CELL * 0.4,
            CAVE_H + 0.5 + rand() * 0.7,
            z + (rand() - 0.5) * CELL * 0.4,
          ),
          V(s, s * 0.7, s),
          V(rand() * 6.28, rand() * 6.28, rand() * 6.28),
        ),
      );
    }
  }

  // Sealing slab above the boulders kills any remaining sky gaps.
  const lid = new THREE.Mesh(
    new THREE.PlaneGeometry(map.width * CELL + 8, map.height * CELL + 8),
    new THREE.MeshStandardMaterial({ color: PALETTE.rockDeep, roughness: 1, side: THREE.BackSide }),
  );
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = CAVE_H + 1.9;
  group.add(lid);

  const rockMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rock,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  });
  const warmRockMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rockWarm,
    roughness: 0.9,
    metalness: 0.02,
    flatShading: true,
  });

  const addBatch = (geos: THREE.BufferGeometry[], mat: THREE.Material, shadow = true) => {
    if (!geos.length) return;
    const merged = mergeGeometries(geos, false);
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, mat);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    group.add(mesh);
    for (const g of geos) g.dispose();
  };

  addBatch(coolChunks, rockMat);
  addBatch(warmChunks, warmRockMat);

  // ---------------------------------------------------------- stalactite spikes
  const spikeGeo = displace(new THREE.ConeGeometry(0.42, 2.6, 6, 1), 0.14, rand);
  const spikes: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 60; i++) {
    const cx = Math.floor(rand() * map.width);
    const cz = Math.floor(rand() * map.height);
    if (isRock(cx, cz)) continue;
    const { x, z } = cellToWorld(map, cx, cz);
    const len = 0.5 + rand() * 0.9;
    spikes.push(
      placed(
        spikeGeo,
        V(x + (rand() - 0.5) * CELL, CAVE_H - len * 0.7 + rand() * 0.5, z + (rand() - 0.5) * CELL),
        V(0.5 + rand() * 0.4, len, 0.5 + rand() * 0.4),
        V(Math.PI + (rand() - 0.5) * 0.25, rand() * 6.28, (rand() - 0.5) * 0.25),
      ),
    );
  }
  addBatch(spikes, rockMat, false);
  spikeGeo.dispose();

  // ----------------------------------------------------------------- moss floor
  const floorGeos: THREE.BufferGeometry[] = [];
  const slabGeo = new THREE.BoxGeometry(CELL, 0.7, CELL);
  for (let cz = 0; cz < map.height; cz++) {
    for (let cx = 0; cx < map.width; cx++) {
      const g = map.cells[cz][cx].ground;
      if (g !== "moss" && g !== "stand") continue;
      const { x, z } = cellToWorld(map, cx, cz);
      floorGeos.push(
        placed(slabGeo, V(x, -0.35 - rand() * 0.05, z), V(1.02, 1, 1.02), V(0, 0, 0)),
      );
    }
  }
  addBatch(
    floorGeos,
    new THREE.MeshStandardMaterial({ color: PALETTE.moss, roughness: 0.98, flatShading: true }),
    false,
  );

  // --------------------------------------------------------- plank walkway + posts
  const plankGeos: THREE.BufferGeometry[] = [];
  const postGeos: THREE.BufferGeometry[] = [];
  const boardGeo = new THREE.BoxGeometry(CELL * 0.98, 0.2, CELL / 5 * 0.82);
  const beamGeo = new THREE.BoxGeometry(CELL * 0.2, 0.22, CELL);
  const postGeo = new THREE.BoxGeometry(0.26, 1.5, 0.26);

  for (let cz = 0; cz < map.height; cz++) {
    for (let cx = 0; cx < map.width; cx++) {
      if (map.cells[cz][cx].ground !== "plank") continue;
      const { x, z } = cellToWorld(map, cx, cz);
      for (let b = 0; b < 5; b++) {
        const bz = z - CELL / 2 + CELL / 10 + (b * CELL) / 5;
        plankGeos.push(
          placed(boardGeo, V(x, -0.1 + (rand() - 0.5) * 0.03, bz), V(1, 1, 1), V(0, 0, (rand() - 0.5) * 0.02)),
        );
      }
      plankGeos.push(placed(beamGeo, V(x - CELL * 0.38, -0.28, z), V(1, 1, 1), V(0, 0, 0)));
      plankGeos.push(placed(beamGeo, V(x + CELL * 0.38, -0.28, z), V(1, 1, 1), V(0, 0, 0)));

      for (const s of [-1, 1]) {
        const nb = map.cells[cz][cx + s];
        if (nb && nb.ground === "plank") continue;
        if (cz % 2 !== 0) continue;
        postGeos.push(
          placed(
            postGeo,
            V(x + s * (CELL * 0.44), 0.42, z + (rand() - 0.5) * 0.3),
            V(1, 1 + rand() * 0.3, 1),
            V((rand() - 0.5) * 0.06, rand() * 0.4, (rand() - 0.5) * 0.06),
          ),
        );
      }
    }
  }
  addBatch(
    plankGeos,
    new THREE.MeshStandardMaterial({ color: PALETTE.plank, roughness: 0.85, flatShading: true }),
  );
  addBatch(
    postGeos,
    new THREE.MeshStandardMaterial({ color: PALETTE.plankDark, roughness: 0.9, flatShading: true }),
  );

  // ------------------------------------------------------------- hanging crystals
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x4c1d95,
    emissive: new THREE.Color(PALETTE.crystal),
    emissiveIntensity: 0.78,
    roughness: 0.2,
    metalness: 0.15,
    flatShading: true,
    transparent: true,
    opacity: 0.88,
  });
  const shardGeo = new THREE.OctahedronGeometry(0.5, 0);
  const crystalPivots: THREE.Object3D[] = [];
  const crystalLights: THREE.PointLight[] = [];

  // The first two sit straight down the corridor so they frame the opening shot.
  const crystalSpots: Array<[number, number, number]> = [
    [12, 11, 1.15],
    [12, 8, 1],
    [10, 13, 0.8],
    [8, 5, 1.1],
    [16, 6, 1],
    [6, 9, 0.9],
    [13, 3, 1],
    [15, 13, 0.85],
    [18, 10, 0.9],
  ];
  crystalSpots.forEach(([cx, cz, size], i) => {
    if (isRock(cx, cz)) return;
    const { x, z } = cellToWorld(map, cx, cz);
    const pivot = new THREE.Group();
    pivot.position.set(
      x + (rand() - 0.5) * CELL * 0.6,
      CAVE_H - 0.5 + rand() * 0.7,
      z + (rand() - 0.5) * CELL * 0.6,
    );
    const shards = 3 + Math.floor(rand() * 3);
    for (let s = 0; s < shards; s++) {
      const m = new THREE.Mesh(shardGeo, crystalMat);
      const len = (0.8 + rand() * 1.3) * size;
      m.scale.set((0.4 + rand() * 0.3) * size, len, (0.4 + rand() * 0.3) * size);
      m.position.set((rand() - 0.5) * 0.5 * size, -len * 0.45, (rand() - 0.5) * 0.5 * size);
      m.rotation.set((rand() - 0.5) * 0.5, rand() * 6.28, (rand() - 0.5) * 0.5);
      pivot.add(m);
    }
    group.add(pivot);
    crystalPivots.push(pivot);

    if (i < 5) {
      const light = new THREE.PointLight(PALETTE.crystal, 5.5, 11, 2);
      light.position.copy(pivot.position).add(V(0, -1, 0));
      group.add(light);
      crystalLights.push(light);
    }
  });

  // ------------------------------------------------------------------ sell stand
  const stand = new THREE.Group();
  const sw = cellToWorld(map, map.stand.cx, map.stand.cz);
  stand.position.set(sw.x, 0, sw.z);
  const woodMat = new THREE.MeshStandardMaterial({
    color: PALETTE.plank,
    roughness: 0.8,
    flatShading: true,
  });
  const counter = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.95, 0.22, CELL * 0.55), woodMat);
  counter.position.y = 0.95;
  counter.castShadow = true;
  stand.add(counter);
  for (const sx of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.95, 0.18), woodMat);
    leg.position.set(sx * CELL * 0.38, 0.47, 0);
    stand.add(leg);
  }
  const standPost = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.9, 0.16), woodMat);
  standPost.position.set(CELL * 0.34, 0.95, -CELL * 0.2);
  stand.add(standPost);
  const standLamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshStandardMaterial({
      color: PALETTE.lanternCore,
      emissive: new THREE.Color(PALETTE.lantern),
      emissiveIntensity: 1.4,
    }),
  );
  standLamp.position.set(CELL * 0.34, 1.95, -CELL * 0.2);
  stand.add(standLamp);
  const standLight = new THREE.PointLight(PALETTE.lantern, 2.6, 8, 1.4);
  standLight.position.copy(standLamp.position);
  stand.add(standLight);
  group.add(stand);

  // -------------------------------------------------------------- spirit motes
  const moteCount = 150;
  const motePos = new Float32Array(moteCount * 3);
  const moteSeed = new Float32Array(moteCount);
  for (let i = 0; i < moteCount; i++) {
    let cx = 0;
    let cz = 0;
    for (let tries = 0; tries < 24; tries++) {
      cx = Math.floor(rand() * map.width);
      cz = Math.floor(rand() * map.height);
      if (!isRock(cx, cz)) break;
    }
    const { x, z } = cellToWorld(map, cx, cz);
    motePos[i * 3] = x + (rand() - 0.5) * CELL;
    motePos[i * 3 + 1] = 0.3 + rand() * (CAVE_H - 1.2);
    motePos[i * 3 + 2] = z + (rand() - 0.5) * CELL;
    moteSeed[i] = rand() * 6.28;
  }
  const moteGeo = new THREE.BufferGeometry();
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(
    moteGeo,
    new THREE.PointsMaterial({
      color: 0x9fe8ff,
      map: glowSprite(),
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  group.add(motes);
  const moteBaseY = Float32Array.from(motePos.filter((_, i) => i % 3 === 1));

  return {
    group,
    update(t: number) {
      for (let i = 0; i < crystalPivots.length; i++) {
        const p = crystalPivots[i];
        p.rotation.y = Math.sin(t * 0.16 + i) * 0.09;
        p.position.y += Math.sin(t * 0.7 + i * 1.7) * 0.0012;
      }
      for (let i = 0; i < crystalLights.length; i++) {
        crystalLights[i].intensity = 5.2 + Math.sin(t * 1.3 + i * 2.1) * 1.4;
      }
      const attr = moteGeo.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < moteCount; i++) {
        const s = moteSeed[i];
        attr.setY(i, moteBaseY[i] + Math.sin(t * 0.5 + s) * 0.45);
        attr.setX(i, attr.getX(i) + Math.sin(t * 0.24 + s) * 0.0018);
      }
      attr.needsUpdate = true;
      standLight.intensity = 2.5 + Math.sin(t * 6.3) * 0.3;
    },
  };
}
