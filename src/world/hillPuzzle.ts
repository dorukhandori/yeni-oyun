import * as THREE from "three";
import { BEAUTY, PALETTE, PUZZLE } from "../constants";
import { heightAt } from "./terrain";
import { glowSprite } from "./sprite";

export interface StoneRitual {
  group: THREE.Group;
  /** Index of nearest stone in range, or null. */
  findCairn(x: number, z: number): number | null;
  /** Try the next stone in the ritual; returns outcome for HUD feedback. */
  interact(index: number): "progress" | "wrong" | "done" | "ignore";
  isOpen(): boolean;
  /** True when near the (still-unsolved) stones — teaching hint, wider than interact range. */
  hintNear(x: number, z: number): boolean;
  reset(): void;
  /** Move the stones (K35 spawn is not the beach spawn). */
  reposition(next: ReadonlyArray<{ x: number; z: number }>): void;
  /** Which stone should pulse this frame (wind hint). */
  hintIndex(time: number): number;
}

/** @deprecated Use StoneRitual — kept so existing call sites type-check unchanged. */
export type HillPuzzle = StoneRitual;

export type StoneRitualOpts = {
  spots: ReadonlyArray<{ x: number; z: number }>;
  order: readonly number[];
  range: number;
  hintRange: number;
};

/**
 * Ordered wind-stone ritual. Hill cairns and the K35 shore stones are two
 * sites of the same pattern (gdd-lotus-island-rebuild.md §5.1 / §10a A0).
 */
export function buildStoneRitual(opts: StoneRitualOpts): StoneRitual {
  const group = new THREE.Group();
  const spots = opts.spots.map((s) => ({ x: s.x, z: s.z }));

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
        solved ? solvedMat : step > 0 && opts.order[step - 1] === i ? glowMat : rockMat;
      for (const r of rocks) r.material = mat;
    }
  };

  return {
    group,
    findCairn(x, z) {
      if (solved) return null;
      let best: number | null = null;
      let bestD: number = opts.range;
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
      const want = opts.order[step];
      if (index !== want) return "wrong";
      step += 1;
      if (step >= opts.order.length) {
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
      return spots.some((s) => Math.hypot(x - s.x, z - s.z) < opts.hintRange);
    },
    reset() {
      step = 0;
      solved = false;
      applyLook();
    },
    reposition(next) {
      for (let i = 0; i < spots.length && i < next.length; i++) {
        spots[i].x = next[i].x;
        spots[i].z = next[i].z;
        const baseY = heightAt(spots[i].x, spots[i].z);
        cairns[i].position.set(spots[i].x, baseY, spots[i].z);
      }
    },
    hintIndex(time) {
      const order = opts.order;
      const slot = Math.floor(time / 1.8) % order.length;
      return order[slot] ?? 0;
    },
  };
}

/**
 * Three wind cairns on the north rise — correct order unlocks cove lotuses (tepe + C2).
 * Wind hint: emissive pulse travels the solve order (see PUZZLE.cairnSolveOrder).
 */
export function buildHillPuzzle(): StoneRitual {
  return buildStoneRitual({
    spots: BEAUTY.cairnSpots,
    order: PUZZLE.cairnSolveOrder,
    range: PUZZLE.cairnRange,
    hintRange: PUZZLE.cairnHintRange,
  });
}

/** K35 opening — same mesh family, different site and order. */
export function buildShoreStones(): StoneRitual {
  return buildStoneRitual({
    spots: PUZZLE.shoreStoneSpots,
    order: PUZZLE.shoreStoneOrder,
    range: PUZZLE.shoreStoneRange,
    hintRange: PUZZLE.shoreStoneHintRange,
  });
}

/** @deprecated Use ritual.hintIndex — kept for any leftover call sites. */
export function hillWindHintIndex(time: number): number {
  const order = PUZZLE.cairnSolveOrder;
  const slot = Math.floor(time / 1.8) % order.length;
  return order[slot] ?? 0;
}

export function updateStoneRitualVisuals(puzzle: StoneRitual, time: number): void {
  if (puzzle.isOpen()) return;
  const hint = puzzle.hintIndex(time);
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

export function updateHillPuzzleVisuals(puzzle: StoneRitual, time: number): void {
  updateStoneRitualVisuals(puzzle, time);
}
