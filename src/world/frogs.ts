import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FROGS, LAGOON, PALETTE, PONDS } from "../constants";
import { mulberry32 } from "./rng";
import { PONDS_RESOLVED, WATERLINE_RATIO, pondRadiusAt } from "./ponds";

/**
 * Pond-rim frogs (LOT-53) — ambient decor, nothing else.
 *
 * Explicitly NOT hallucination figures (`gdd-lotus-hallucination.md`): no
 * contact test, no memory spike, no walk-drift, no collider, no interaction
 * prompt. If a frog ever gains a gameplay effect it belongs in a design doc
 * first; today it is set dressing at the same tier as reeds and pebbles.
 *
 * Asset provenance: procedural code mesh built here from primitives and the
 * existing `PALETTE` greens — no external generation pipeline (Tripo /
 * Hyper3D / Higgsfield / PolyHaven) was used, so no new files land in
 * `public/assets/` and no generation credits were spent.
 *
 * Motion is a pure function of `t`: the hop index is `floor(t / period)` and
 * the target is a hash of that index, so the animation is deterministic,
 * frame-rate independent and never accumulates drift.
 */

function colorize(geo: THREE.BufferGeometry, hex: number): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (g !== geo) geo.dispose();
  const c = new THREE.Color(hex);
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  g.setAttribute("color", new THREE.BufferAttribute(arr, 3));
  return g;
}

/**
 * ~150 triangles: squat body, snout, two eye domes, folded hind legs. Built
 * around a unit body length so `FROGS.size` scales the whole animal, and
 * modelled facing +Z so the instance yaw is the frog's heading.
 */
function makeFrogGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];

  const body = colorize(new THREE.IcosahedronGeometry(0.5, 1), PALETTE.frogBack);
  body.scale(0.78, 0.5, 1);
  body.translate(0, 0.25, 0);
  parts.push(body);

  const belly = colorize(new THREE.IcosahedronGeometry(0.4, 0), PALETTE.frogBelly);
  belly.scale(0.72, 0.3, 0.9);
  belly.translate(0, 0.12, 0.02);
  parts.push(belly);

  const snout = colorize(new THREE.IcosahedronGeometry(0.3, 1), PALETTE.frogBack);
  snout.scale(0.82, 0.62, 0.95);
  snout.translate(0, 0.26, 0.42);
  parts.push(snout);

  // Eyes ride on top of the skull, the way a real frog's do.
  for (const side of [-1, 1]) {
    const socket = colorize(new THREE.IcosahedronGeometry(0.14, 0), PALETTE.frogBack);
    socket.translate(side * 0.16, 0.44, 0.3);
    parts.push(socket);
    const eye = colorize(new THREE.IcosahedronGeometry(0.085, 0), PALETTE.frogEye);
    eye.translate(side * 0.18, 0.49, 0.34);
    parts.push(eye);
  }

  // Folded hind legs — the silhouette cue that says "frog" at 10 m.
  for (const side of [-1, 1]) {
    const thigh = colorize(new THREE.IcosahedronGeometry(0.2, 0), PALETTE.frogSpot);
    thigh.scale(0.72, 0.62, 1.15);
    thigh.translate(side * 0.3, 0.19, -0.24);
    parts.push(thigh);
    const foot = colorize(new THREE.IcosahedronGeometry(0.11, 0), PALETTE.frogSpot);
    foot.scale(0.8, 0.42, 1.5);
    foot.translate(side * 0.31, 0.07, 0.06);
    parts.push(foot);
  }

  // Front feet, so it is propped up rather than lying flat.
  for (const side of [-1, 1]) {
    const arm = colorize(new THREE.IcosahedronGeometry(0.09, 0), PALETTE.frogBack);
    arm.scale(0.8, 0.9, 1.2);
    arm.translate(side * 0.21, 0.09, 0.3);
    parts.push(arm);
  }

  const merged = mergeGeometries(parts);
  for (const p of parts) p.dispose();
  if (!merged) throw new Error("frog geo merge failed");
  merged.computeVertexNormals();
  return merged;
}

interface Frog {
  /** Anchor the frog hops around. */
  hx: number;
  hz: number;
  /** Water level of the body it belongs to — the frog never sinks below it. */
  waterY: number;
  size: number;
  period: number;
  phase: number;
  seed: number;
}

/** Cheap deterministic hash — same hop index always yields the same target. */
function hash01(n: number, salt: number): number {
  const s = Math.sin(n * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/** Where the frog sits after hop `index`. */
function hopTarget(frog: Frog, index: number): { x: number; z: number } {
  const a = hash01(index, frog.seed) * Math.PI * 2;
  const d = (0.25 + hash01(index, frog.seed + 17) * 0.75) * FROGS.leash;
  return { x: frog.hx + Math.cos(a) * d, z: frog.hz + Math.sin(a) * d };
}

export interface FrogColony {
  group: THREE.Group;
  update(t: number): void;
}

/**
 * Scatter frogs on every pond rim plus the lagoon rim, then drive them from a
 * single `InstancedMesh`. `sampleHeight` is injected rather than imported so
 * this module does not create a cycle with `terrain.ts`.
 */
export function buildFrogs(sampleHeight: (x: number, z: number) => number): FrogColony {
  const group = new THREE.Group();
  const rand = mulberry32(20260819);
  const frogs: Frog[] = [];

  const seat = (
    cx: number,
    cz: number,
    rimRadius: (angle: number) => number,
    waterY: number,
    count: number,
  ) => {
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const band = FROGS.rimInner + rand() * (FROGS.rimOuter - FROGS.rimInner);
      const d = rimRadius(a) * band;
      frogs.push({
        hx: cx + Math.cos(a) * d,
        hz: cz + Math.sin(a) * d,
        waterY,
        size: FROGS.size * (0.82 + rand() * 0.46),
        period: FROGS.hopPeriodMin + rand() * (FROGS.hopPeriodMax - FROGS.hopPeriodMin),
        phase: rand() * 40,
        seed: rand() * 1000,
      });
    }
  };

  // Ponds: band the frogs around the solved waterline, not the carved rim —
  // the rim is several metres up the dry bank on a shallow dish.
  for (const pond of PONDS_RESOLVED) {
    seat(
      pond.x,
      pond.z,
      (a) => pondRadiusAt(pond, pond.x + Math.cos(a), pond.z + Math.sin(a)) * WATERLINE_RATIO,
      PONDS.waterY,
      FROGS.perPond,
    );
  }

  seat(
    LAGOON.center.x,
    LAGOON.center.z,
    (a) =>
      LAGOON.radius *
      (1 + LAGOON.wobbleA * Math.sin(a * 3 + 0.7) + LAGOON.wobbleB * Math.sin(a * 5 - 1.2)),
    LAGOON.waterY,
    FROGS.onLagoon,
  );

  if (frogs.length === 0) return { group, update: () => {} };

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.62,
    metalness: 0,
  });
  const mesh = new THREE.InstancedMesh(makeFrogGeo(), mat, frogs.length);
  mesh.castShadow = true;
  mesh.receiveShadow = false;
  // The colony spans the whole island; per-instance culling is not a thing and
  // the bounding sphere of the base geometry would cull the lot at range.
  mesh.frustumCulled = false;
  group.add(mesh);

  const dummy = new THREE.Object3D();

  const place = (t: number) => {
    for (let i = 0; i < frogs.length; i++) {
      const f = frogs[i];
      const local = t + f.phase;
      const index = Math.floor(local / f.period);
      const into = local - index * f.period;

      const from = hopTarget(f, index);
      const to = hopTarget(f, index + 1);

      let x = from.x;
      let z = from.z;
      let lift = 0;
      let stretch = 0;
      let heading = hash01(index, f.seed + 5) * Math.PI * 2;

      if (into < FROGS.hopTime) {
        const k = into / FROGS.hopTime;
        x = from.x + (to.x - from.x) * k;
        z = from.z + (to.z - from.z) * k;
        lift = Math.sin(k * Math.PI) * FROGS.hopArc * (f.size / FROGS.size);
        // Stretch on the way up, squash on landing.
        stretch = Math.sin(k * Math.PI * 2) * 0.18;
        heading = Math.atan2(to.x - from.x, to.z - from.z);
      } else {
        heading = Math.atan2(to.x - from.x, to.z - from.z);
      }

      const ground = sampleHeight(x, z);
      // Half-in-the-water is fine and looks right; fully sunk is not.
      const y = Math.max(ground, f.waterY - f.size * 0.25) + lift;

      const breath =
        Math.sin(t * FROGS.breathHz + f.phase) * FROGS.breathAmp * (into < FROGS.hopTime ? 0.2 : 1);

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, heading, 0);
      dummy.scale.set(
        f.size * (1 - stretch * 0.5),
        f.size * (1 + stretch + breath),
        f.size * (1 - stretch * 0.5),
      );
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  place(0);

  return {
    group,
    update(t) {
      place(t);
    },
  };
}
