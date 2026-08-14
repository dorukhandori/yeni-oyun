import * as THREE from "three";
import { CELL, PALETTE } from "../constants";
import type { CaveMap } from "../types";

export interface Water {
  group: THREE.Group;
  update(t: number): void;
}

/** Stylised jade water/ice sheet with faceted rolling waves. */
export function buildWater(map: CaveMap): Water {
  const group = new THREE.Group();
  const w = map.width * CELL;
  const d = map.height * CELL;

  const geo = new THREE.PlaneGeometry(w, d, Math.round(map.width * 2), Math.round(map.height * 2));
  geo.rotateX(-Math.PI / 2);
  const base = Float32Array.from(geo.attributes.position.array);

  const surface = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: 0x0c454c,
      emissive: new THREE.Color(PALETTE.waterGlow),
      emissiveIntensity: 0.4,
      roughness: 0.14,
      metalness: 0.55,
      transparent: true,
      opacity: 0.88,
      flatShading: true,
    }),
  );
  surface.position.y = -0.42;
  surface.receiveShadow = true;
  group.add(surface);

  const deep = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ color: 0x03090d }),
  );
  deep.rotation.x = -Math.PI / 2;
  deep.position.y = -1.6;
  group.add(deep);

  const attr = geo.attributes.position as THREE.BufferAttribute;

  return {
    group,
    update(t: number) {
      for (let i = 0; i < attr.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        const h =
          Math.sin(x * 0.28 + t * 0.9) * 0.075 +
          Math.sin(z * 0.36 - t * 0.6) * 0.06 +
          Math.sin((x + z) * 0.17 + t * 1.4) * 0.04;
        attr.setY(i, h);
      }
      attr.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}
