import * as THREE from "three";
import { LAGOON, PALETTE, PUZZLE } from "../constants";
import { heightAt, lagoonDist, lagoonRadiusAt } from "./terrain";

export interface SteppingStones {
  group: THREE.Group;
  /** Advance chain progress when the sailor stands on a pad. */
  touch(pos: THREE.Vector3): void;
  /** True once the far pad in the chain has been reached. */
  isOpen(): boolean;
  /** True when near the (still-locked) chain — teaching hint, not the tight step radius. */
  hintNear(x: number, z: number): boolean;
  reset(): void;
}

/** Lily-pad chain into the deep lagoon — gates the northern cluster (B3). */
export function buildSteppingStones(): SteppingStones {
  const group = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({
    color: PALETTE.pad,
    emissive: new THREE.Color(PALETTE.padLight),
    emissiveIntensity: 0.12,
    roughness: 0.72,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const padLitMat = padMat.clone();
  padLitMat.emissiveIntensity = 0.38;

  const padGeo = new THREE.CircleGeometry(0.72, 12);
  padGeo.rotateX(-Math.PI / 2);

  // Shore → deep pocket (curved hop path).
  const nodes: Array<{ x: number; z: number; mesh: THREE.Mesh }> = [
    { x: -2.2, z: 4.8 },
    { x: -0.4, z: 2.6 },
    { x: 1.6, z: 0.4 },
    { x: 2.8, z: -2.2 },
    { x: 3.4, z: -4.8 },
    { x: 2.0, z: -6.6 },
  ].map((n) => {
    const mesh = new THREE.Mesh(padGeo, padMat);
    mesh.position.set(n.x, LAGOON.waterY + 0.04, n.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return { ...n, mesh };
  });

  let progress = -1;

  const refreshPads = () => {
    for (let i = 0; i < nodes.length; i++) {
      const lit = i <= progress;
      nodes[i].mesh.material = lit ? padLitMat : padMat;
      nodes[i].mesh.position.y = LAGOON.waterY + (lit ? 0.06 : 0.04);
    }
  };

  return {
    group,
    touch(pos) {
      for (let i = progress + 1; i < nodes.length; i++) {
        const d = Math.hypot(pos.x - nodes[i].x, pos.z - nodes[i].z);
        if (d > PUZZLE.stoneStepRadius) continue;
        if (i === progress + 1) {
          progress = i;
          refreshPads();
        }
        break;
      }
    },
    isOpen() {
      return progress >= PUZZLE.stonePickGateIndex;
    },
    hintNear(x, z) {
      if (progress >= PUZZLE.stonePickGateIndex) return false;
      return nodes.some((n) => Math.hypot(x - n.x, z - n.z) < PUZZLE.stoneHintRange);
    },
    reset() {
      progress = -1;
      refreshPads();
    },
  };
}

/** True when a world point is over walkable lagoon floor (not deep open water). */
export function onLagoonFloor(x: number, z: number): boolean {
  if (lagoonDist(x, z) > lagoonRadiusAt(x, z) - 0.5) return false;
  return heightAt(x, z) <= LAGOON.waterY + 0.12;
}
