import * as THREE from "three";
import { PALETTE, PUZZLE } from "../constants";
import { heightAt } from "./terrain";
import { glowSprite } from "./sprite";

export interface HillPuzzle {
  group: THREE.Group;
  /** Index of nearest cairn in range, or null. */
  findCairn(x: number, z: number): number | null;
  /** Try the next cairn in the ritual; returns outcome for HUD feedback. */
  interact(index: number): "progress" | "wrong" | "done" | "ignore";
  isOpen(): boolean;
  /** True when near the (still-unsolved) cairns — teaching hint, wider than `cairnRange`. */
  hintNear(x: number, z: number): boolean;
  reset(): void;
}

/**
 * Three wind cairns on the north rise — correct order unlocks cove lotuses (tepe + C2).
 * Wind hint: emissive pulse travels cairn 0 → 2 → 1 (see PUZZLE.cairnSolveOrder).
 */
export function buildHillPuzzle(): HillPuzzle {
  const group = new THREE.Group();
  const spots = [
    { x: 4.2, z: -3.4 },
    { x: 8.6, z: -7.8 },
    { x: 6.1, z: -9.6 },
  ];

  const rockMat = new THREE.MeshStandardMaterial({
    color: PALETTE.marble,
    roughness: 0.65,
    flatShading: true,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: PALETTE.petalRipeTint,
    emissive: new THREE.Color(PALETTE.petalRipeTint),
    emissiveIntensity: 0.15,
    roughness: 0.5,
    flatShading: true,
  });
  const solvedMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lotusHeart,
    emissive: new THREE.Color(PALETTE.lotusHeart),
    emissiveIntensity: 0.55,
    roughness: 0.45,
    flatShading: true,
  });

  const cairns: THREE.Group[] = [];
  for (let i = 0; i < spots.length; i++) {
    const s = spots[i];
    const g = new THREE.Group();
    const baseY = heightAt(s.x, s.z);
    g.position.set(s.x, baseY, s.z);

    const stack = 2 + (i % 2);
    for (let k = 0; k < stack; k++) {
      const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32 - k * 0.04, 0), rockMat);
      rock.position.y = 0.22 + k * 0.28;
      rock.rotation.y = k * 1.1;
      g.add(rock);
    }

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowSprite(),
        color: PALETTE.petalRipeTint,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    glow.position.y = 0.95 + stack * 0.12;
    glow.scale.setScalar(0.55);
    g.add(glow);

    group.add(g);
    cairns.push(g);
  }

  let step = 0;
  let solved = false;

  const applyLook = () => {
    for (let i = 0; i < cairns.length; i++) {
      const rocks = cairns[i].children.filter((c) => c instanceof THREE.Mesh) as THREE.Mesh[];
      const mat =
        solved ? solvedMat : step > 0 && PUZZLE.cairnSolveOrder[step - 1] === i ? glowMat : rockMat;
      for (const r of rocks) r.material = mat;
    }
  };

  return {
    group,
    findCairn(x, z) {
      if (solved) return null;
      let best: number | null = null;
      let bestD: number = PUZZLE.cairnRange;
      for (let i = 0; i < spots.length; i++) {
        const d = Math.hypot(x - spots[i].x, z - spots[i].z);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      return best;
    },
    interact(index) {
      if (solved) return "ignore";
      const want = PUZZLE.cairnSolveOrder[step];
      if (index !== want) return "wrong";
      step += 1;
      if (step >= PUZZLE.cairnSolveOrder.length) {
        solved = true;
        applyLook();
        return "done";
      }
      applyLook();
      return "progress";
    },
    isOpen() {
      return solved;
    },
    hintNear(x, z) {
      if (solved) return false;
      return spots.some((s) => Math.hypot(x - s.x, z - s.z) < PUZZLE.cairnHintRange);
    },
    reset() {
      step = 0;
      solved = false;
      applyLook();
    },
  };
}

/** Which cairn should pulse this frame (wind hint). */
export function hillWindHintIndex(time: number): number {
  const order = PUZZLE.cairnSolveOrder;
  const slot = Math.floor(time / 1.8) % order.length;
  return order[slot] ?? 0;
}

export function updateHillPuzzleVisuals(puzzle: HillPuzzle, time: number): void {
  if (puzzle.isOpen()) return;
  const hint = hillWindHintIndex(time);
  const root = puzzle.group;
  for (let i = 0; i < root.children.length; i++) {
    const cairn = root.children[i] as THREE.Group;
    const sprite = cairn.children.find((c) => c instanceof THREE.Sprite) as THREE.Sprite | undefined;
    if (!sprite) continue;
    const mat = sprite.material as THREE.SpriteMaterial;
    const pulse = i === hint ? 0.35 + Math.sin(time * 4.2) * 0.18 : 0.12;
    mat.opacity = pulse;
  }
}
