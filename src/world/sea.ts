import * as THREE from "three";
import { FLORA, ISLAND, LAGOON, PALETTE, SEA_TEX } from "../constants";
import { islandRadiusFactor, lagoonRadiusFactor } from "./terrain";
import { assetUrl } from "../assets/paths";
import { mulberry32 } from "./rng";
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

  const seaMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.18,
    metalness: 0.12,
    transparent: true,
    opacity: 0.92,
    flatShading: true,
    normalMap: shallowNormal,
    normalScale: new THREE.Vector2(SEA_TEX.shallowNormalStrength, SEA_TEX.shallowNormalStrength),
  });
  const waveTime = { value: 0 };
  seaMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = waveTime;
    shader.uniforms.uAmpA = { value: SEA_TEX.waveAmpA };
    shader.uniforms.uAmpB = { value: SEA_TEX.waveAmpB };
    shader.uniforms.uAmpC = { value: SEA_TEX.waveAmpC };
    shader.uniforms.uIslandR = { value: ISLAND.radius };
    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uTime;
uniform float uAmpA;
uniform float uAmpB;
uniform float uAmpC;
varying vec2 vSeaXZ;`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
vSeaXZ = position.xz;
transformed.y += sin(position.x * 0.16 + uTime * 1.1) * uAmpA
  + sin(position.z * 0.21 - uTime * 0.85) * uAmpB
  + sin((position.x + position.z) * 0.09 + uTime * 1.7) * uAmpC;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
uniform float uIslandR;
varying vec2 vSeaXZ;`,
      )
      .replace(
        "#include <dithering_fragment>",
        `#include <dithering_fragment>
// Interior is the lagoon basin — don't paint ocean over the still lake.
if (length(vSeaXZ) < uIslandR - 3.5) discard;`,
      );
  };
  const sea = new THREE.Mesh(geo, seaMat);
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
  const lagoonMat = new THREE.MeshStandardMaterial({
    color: PALETTE.lagoon,
    roughness: 0.42,
    metalness: 0.04,
    transparent: true,
    opacity: 0.94,
    normalMap: lakeNormal,
    normalScale: new THREE.Vector2(SEA_TEX.lakeNormalStrength, SEA_TEX.lakeNormalStrength),
  });
  const lagoon = new THREE.Mesh(lagoonGeo, lagoonMat);
  lagoon.position.set(LAGOON.center.x, LAGOON.waterY, LAGOON.center.z);
  group.add(lagoon);

  // Wet-sand rim — not foam. Art-bible.md §6: the lake has no surf.
  const edgeGeo = new THREE.RingGeometry(LAGOON.radius - 0.45, LAGOON.radius + 0.35, 96, 1);
  edgeGeo.rotateX(-Math.PI / 2);
  wobbleRadially(edgeGeo);
  const lagoonEdge = new THREE.Mesh(
    edgeGeo,
    new THREE.MeshBasicMaterial({
      color: PALETTE.sandWet,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  lagoonEdge.position.set(LAGOON.center.x, LAGOON.waterY + 0.015, LAGOON.center.z);
  group.add(lagoonEdge);

  const lakeCausticGeo = new THREE.CircleGeometry(LAGOON.radius * 0.92, 48);
  lakeCausticGeo.rotateX(-Math.PI / 2);
  wobbleRadially(lakeCausticGeo);
  const lakeCausticMat = new THREE.MeshBasicMaterial({
    map: causticTex,
    transparent: true,
    opacity: SEA_TEX.lakeCausticOpacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });
  const lakeCaustic = new THREE.Mesh(lakeCausticGeo, lakeCausticMat);
  lakeCaustic.position.set(LAGOON.center.x, LAGOON.waterY + 0.025, LAGOON.center.z);
  group.add(lakeCaustic);

  const padTex = loadAlbedoTexture(assetUrl("assets/textures/flora_lilypad_01_albedo_512.webp"));
  const padAspect = 547 / 643;
  const padMat = new THREE.MeshStandardMaterial({
    map: padTex,
    color: PALETTE.pad,
    transparent: true,
    alphaTest: 0.35,
    roughness: 0.9,
    side: THREE.DoubleSide,
  });
  const padGeo = new THREE.PlaneGeometry(padAspect, 1);
  padGeo.rotateX(-Math.PI / 2);
  const padRand = mulberry32(20260816);
  const padMesh = new THREE.InstancedMesh(padGeo, padMat, FLORA.lilyPads);
  const padDummy = new THREE.Object3D();
  let padCount = 0;
  for (let i = 0; i < FLORA.lilyPads * 3 && padCount < FLORA.lilyPads; i++) {
    const a = padRand() * Math.PI * 2;
    const r = 2.2 + padRand() * (LAGOON.radius * 0.72);
    const x = LAGOON.center.x + Math.cos(a) * r;
    const z = LAGOON.center.z + Math.sin(a) * r;
    if (Math.hypot(x - LAGOON.center.x, z - LAGOON.center.z) < 1.4) continue;
    const s = 0.85 + padRand() * 0.7;
    padDummy.position.set(x, LAGOON.waterY + 0.03, z);
    padDummy.scale.set(s, 1, s);
    padDummy.rotation.set(0, padRand() * Math.PI * 2, 0);
    padDummy.updateMatrix();
    padMesh.setMatrixAt(padCount, padDummy.matrix);
    padCount++;
  }
  padMesh.count = padCount;
  padMesh.instanceMatrix.needsUpdate = true;
  padMesh.frustumCulled = false;
  group.add(padMesh);

  return {
    group,
    update(t: number) {
      waveTime.value = t;

      foams.forEach((f, i) => {
        const p = (Math.sin(t * 0.9 - i * 0.7) + 1) * 0.5;
        (f.material as THREE.MeshBasicMaterial).opacity = 0.38 + p * 0.5;
        f.scale.setScalar(1 + p * 0.012);
      });

      causticTex.offset.set(t * SEA_TEX.causticScrollSpeed, t * SEA_TEX.causticScrollSpeed * 0.6);
      causticMat.opacity = SEA_TEX.causticOpacity * (0.85 + Math.sin(t * 0.6) * 0.15);
      lakeCausticMat.opacity = SEA_TEX.lakeCausticOpacity * (0.75 + Math.sin(t * 0.35) * 0.25);

      lagoon.position.y = LAGOON.waterY + Math.sin(t * 0.45) * 0.012;
      lakeCaustic.position.y = lagoon.position.y + 0.025;
      padMesh.position.y = Math.sin(t * 0.45) * 0.012;
    },
  };
}
