import * as THREE from "three";
import { ISLAND, LAGOON, PALETTE } from "../constants";
import { islandRadiusFactor, lagoonRadiusFactor } from "./terrain";

/** Push a flat (XZ) disc/ring outward by an angular radius factor. */
function wobbleRadially(
  geo: THREE.BufferGeometry,
  factor: (angle: number) => number = lagoonRadiusFactor,
): void {
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    if (Math.abs(x) < 1e-4 && Math.abs(z) < 1e-4) continue;
    const f = factor(Math.atan2(z, x));
    p.setX(i, x * f);
    p.setZ(i, z * f);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}

export interface Sea {
  group: THREE.Group;
  update(t: number): void;
}

/** Turquoise shallows fading to lazuli depth, plus a foam line at the shore. */
export function buildSea(): Sea {
  const group = new THREE.Group();

  const size = ISLAND.planeSize * 3.2;
  const seg = 90;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const base = Float32Array.from(pos.array);

  const shallow = new THREE.Color(PALETTE.seaShallow);
  const deep = new THREE.Color(PALETTE.seaDeep);
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const r = Math.hypot(base[i * 3], base[i * 3 + 2]);
    const t = Math.min(1, Math.max(0, (r - ISLAND.radius) / 22));
    tmp.copy(shallow).lerp(deep, t * t);
    colors[i * 3] = tmp.r;
    colors[i * 3 + 1] = tmp.g;
    colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const sea = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.12,
      metalness: 0.28,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
    }),
  );
  group.add(sea);

  // ------------------------------------------------------------------- foam
  const foamMat = new THREE.MeshBasicMaterial({
    color: PALETTE.seaFoam,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const foams: THREE.Mesh[] = [];
  for (let i = 0; i < 2; i++) {
    const r0 = ISLAND.radius - 1.3 + i * 1.15;
    const geoF = new THREE.RingGeometry(r0, r0 + (i === 0 ? 0.8 : 0.5), 128, 1);
    geoF.rotateX(-Math.PI / 2);
    wobbleRadially(geoF, islandRadiusFactor);
    const ring = new THREE.Mesh(geoF, foamMat.clone());
    ring.position.y = 0.035 + i * 0.012;
    group.add(ring);
    foams.push(ring);
  }

  // ----------------------------------------------------------- lagoon water
  const lagoonGeo = new THREE.CircleGeometry(LAGOON.radius, 96, 0, Math.PI * 2);
  lagoonGeo.rotateX(-Math.PI / 2);
  wobbleRadially(lagoonGeo);
  const lagoon = new THREE.Mesh(
    lagoonGeo,
    new THREE.MeshStandardMaterial({
      color: PALETTE.lagoon,
      roughness: 0.1,
      metalness: 0.3,
      transparent: true,
      opacity: 0.68,
    }),
  );
  lagoon.position.set(LAGOON.center.x, LAGOON.waterY, LAGOON.center.z);
  group.add(lagoon);

  const edgeGeo = new THREE.RingGeometry(LAGOON.radius - 0.5, LAGOON.radius + 0.1, 96, 1);
  edgeGeo.rotateX(-Math.PI / 2);
  wobbleRadially(edgeGeo);
  edgeGeo.rotateX(Math.PI / 2);
  const lagoonEdge = new THREE.Mesh(
    edgeGeo,
    new THREE.MeshBasicMaterial({
      color: PALETTE.seaFoam,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  lagoonEdge.rotation.x = -Math.PI / 2;
  lagoonEdge.position.set(LAGOON.center.x, LAGOON.waterY + 0.02, LAGOON.center.z);
  group.add(lagoonEdge);

  return {
    group,
    update(t: number) {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        pos.setY(
          i,
          Math.sin(x * 0.16 + t * 1.1) * 0.14 +
            Math.sin(z * 0.21 - t * 0.85) * 0.11 +
            Math.sin((x + z) * 0.09 + t * 1.7) * 0.07,
        );
      }
      pos.needsUpdate = true;
      geo.computeVertexNormals();

      foams.forEach((f, i) => {
        const p = (Math.sin(t * 0.9 - i * 0.7) + 1) * 0.5;
        (f.material as THREE.MeshBasicMaterial).opacity = 0.22 + p * 0.45;
        f.scale.setScalar(1 + p * 0.012);
      });

      lagoon.position.y = LAGOON.waterY + Math.sin(t * 0.7) * 0.02;
    },
  };
}
