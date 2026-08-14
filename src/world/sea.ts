import * as THREE from "three";
import { ISLAND, LAGOON, PALETTE, SEA_TEX } from "../constants";
import { islandRadiusFactor, lagoonRadiusFactor } from "./terrain";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture, loadDataTexture } from "./sprite";

/**
 * Generated water textures (`docs/art/asset-registry.md` P1 — Su ve kıyı),
 * shipped as WebP. Normal/caustic stay in linear space (`loadDataTexture` —
 * `docs/art/pipeline.md` §6, data maps never get `SRGBColorSpace`); foam is
 * an alpha-cutout albedo so it goes through `loadAlbedoTexture`.
 */
const SHALLOW_NORMAL_URL = "assets/textures/water_shallow_01_normal_512.webp";
const LAKE_NORMAL_URL = "assets/textures/water_lake_01_normal_512.webp";
const FOAM_TEX_URL = "assets/textures/water_foam_01_alpha_512.webp";
const CAUSTIC_TEX_URL = "assets/textures/water_caustic_01_caustic_512.webp";

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

  const shallowNormal = loadDataTexture(assetUrl(SHALLOW_NORMAL_URL));
  shallowNormal.wrapS = THREE.RepeatWrapping;
  shallowNormal.wrapT = THREE.RepeatWrapping;
  const shallowReps = size / SEA_TEX.shallowNormalTileMeters;
  shallowNormal.repeat.set(shallowReps, shallowReps);

  const sea = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.12,
      metalness: 0.28,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
      normalMap: shallowNormal,
      normalScale: new THREE.Vector2(SEA_TEX.shallowNormalStrength, SEA_TEX.shallowNormalStrength),
    }),
  );
  group.add(sea);

  // ------------------------------------------------------------------- foam
  // Ring UVs wrap u around the full circle and v across the ring's thin
  // radial width — repeat the foam strip around the coastline, clamp across it.
  const foamTex = loadAlbedoTexture(assetUrl(FOAM_TEX_URL));
  foamTex.wrapS = THREE.RepeatWrapping;
  foamTex.wrapT = THREE.ClampToEdgeWrapping;
  foamTex.repeat.x = SEA_TEX.foamRepeatX;
  const foamMat = new THREE.MeshBasicMaterial({
    map: foamTex,
    color: PALETTE.seaFoam,
    transparent: true,
    alphaTest: 0.08,
    opacity: 0.85,
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

  // -------------------------------------------------------- shallow caustic
  // Additive shimmer over the coastline shallows (ASSET-014) — a wider ring
  // than the foam, sitting just above the sea surface, drifting slowly.
  const causticTex = loadAlbedoTexture(assetUrl(CAUSTIC_TEX_URL));
  causticTex.wrapS = THREE.RepeatWrapping;
  causticTex.wrapT = THREE.RepeatWrapping;
  const causticGeo = new THREE.RingGeometry(ISLAND.radius - 6, ISLAND.radius + 4, 128, 1);
  causticGeo.rotateX(-Math.PI / 2);
  wobbleRadially(causticGeo, islandRadiusFactor);
  const causticReps = ((ISLAND.radius + 4) * Math.PI * 2) / SEA_TEX.causticTileMeters;
  const causticUv = causticGeo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < causticUv.count; i++) {
    causticUv.setX(i, causticUv.getX(i) * causticReps);
  }
  const causticMat = new THREE.MeshBasicMaterial({
    map: causticTex,
    transparent: true,
    opacity: SEA_TEX.causticOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const caustic = new THREE.Mesh(causticGeo, causticMat);
  caustic.position.y = 0.02;
  group.add(caustic);

  // ----------------------------------------------------------- lagoon water
  const lakeNormal = loadDataTexture(assetUrl(LAKE_NORMAL_URL));
  lakeNormal.wrapS = THREE.RepeatWrapping;
  lakeNormal.wrapT = THREE.RepeatWrapping;
  const lakeReps = (LAGOON.radius * 2) / SEA_TEX.lakeNormalTileMeters;
  lakeNormal.repeat.set(lakeReps, lakeReps);

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
      normalMap: lakeNormal,
      normalScale: new THREE.Vector2(SEA_TEX.lakeNormalStrength, SEA_TEX.lakeNormalStrength),
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

      causticTex.offset.set(t * SEA_TEX.causticScrollSpeed, t * SEA_TEX.causticScrollSpeed * 0.6);
      causticMat.opacity = SEA_TEX.causticOpacity * (0.85 + Math.sin(t * 0.6) * 0.15);

      lagoon.position.y = LAGOON.waterY + Math.sin(t * 0.7) * 0.02;
    },
  };
}
