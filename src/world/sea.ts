import * as THREE from "three";
import { DAY, FLORA, ISLAND, LAGOON, PALETTE, RENDER, SEA_TEX, SHIP, SUN_DISK } from "../constants";
import { assetUrl } from "../assets/paths";
import { loadKitGeometry } from "./islandKit";
import { WAVE_UNIFORMS } from "./oceanWaves";
import { mulberry32 } from "./rng";
import { loadAlbedoTexture } from "./sprite";

/**
 * Dynamic sea — one Gerstner surface, not tiled wave meshes.
 *
 * Pattern (WebGL2, no extra npm dep):
 *   https://github.com/achrefelouafi/WaterThreeJS  (camera-snapped grid + contact foam)
 *   Sean-Bradley Gerstner fork of three.js Water   (GPU Gems waves + CPU twin)
 *
 * Playtest 17 Aug: Blender tiles and a coarse shader plane both failed because
 * the triangles were bigger than the waves. This patch is ~1.4 m cells under
 * the camera. Lagoon stays a still disc (art-bible.md §6).
 */

const LAGOON_URL = "assets/models/water_lagoon_01_mesh_400.glb";

export interface Sea {
  group: THREE.Group;
  update(
    t: number,
    hull?: THREE.Vector3,
    heading?: number,
    cam?: THREE.Vector3,
    day01?: number,
  ): void;
}

function sunDirection(day01: number): THREE.Vector3 {
  const t = THREE.MathUtils.clamp(day01, 0, 1);
  const elev = THREE.MathUtils.degToRad(
    THREE.MathUtils.lerp(DAY.sunStartDeg, DAY.sunEndDeg, t),
  );
  const az = THREE.MathUtils.lerp(SUN_DISK.azimuthStart, SUN_DISK.azimuthEnd, t);
  return new THREE.Vector3(
    Math.cos(az) * Math.cos(elev),
    Math.sin(elev),
    Math.sin(az) * Math.cos(elev),
  ).normalize();
}

function oceanMaterial(): THREE.ShaderMaterial {
  const shallow = new THREE.Color(PALETTE.seaShallow);
  const mid = new THREE.Color(PALETTE.seaMid);
  const deep = new THREE.Color(PALETTE.seaDeep);
  const foam = new THREE.Color(PALETTE.seaFoam);
  const crest = new THREE.Color(PALETTE.seaCrest);
  const sun = new THREE.Color(RENDER.sunColor);
  const sky = new THREE.Color(RENDER.skyHorizon);
  const sandWet = new THREE.Color(PALETTE.sandWet);

  return new THREE.ShaderMaterial({
    fog: true,
    transparent: true,
    depthWrite: false,
    uniforms: THREE.UniformsUtils.merge([
      THREE.UniformsLib.fog,
      {
        uTime: { value: 0 },
        uWave0: { value: new THREE.Vector4(...WAVE_UNIFORMS[0]) },
        uWave1: { value: new THREE.Vector4(...WAVE_UNIFORMS[1]) },
        uWave2: { value: new THREE.Vector4(...WAVE_UNIFORMS[2]) },
        uWave3: { value: new THREE.Vector4(...WAVE_UNIFORMS[3]) },
        uHull: { value: new THREE.Vector3(SHIP.pos.x, 0, SHIP.pos.z) },
        uHeading: { value: SHIP.rotY },
        uHullHalf: { value: new THREE.Vector2(SHIP.deckHalfL + 1.4, SHIP.deckHalfW + 1.1) },
        uIslandR: { value: ISLAND.radius },
        uWobbleA: { value: ISLAND.wobbleA },
        uWobbleB: { value: ISLAND.wobbleB },
        uShoreCalm: { value: SEA_TEX.shoreCalm },
        uShoreMin: { value: SEA_TEX.shoreMin },
        uOverlap: { value: SEA_TEX.overlapMeters },
        uFloorY: { value: SEA_TEX.floorY },
        uEnableWaves: { value: 1 },
        uHullChop: { value: SEA_TEX.hullChop },
        uFoamShore: { value: SEA_TEX.foamShoreMeters },
        uFoamOffset: { value: SEA_TEX.foamOffsetMeters },
        uFoamMix: { value: SEA_TEX.foamMix },
        uShoreAlpha: { value: SEA_TEX.shoreAlpha },
        uDeepAlpha: { value: SEA_TEX.deepAlpha },
        uSpecPower: { value: SEA_TEX.specPower },
        uSpecGain: { value: SEA_TEX.specGain },
        uShallow: { value: shallow },
        uMid: { value: mid },
        uDeep: { value: deep },
        uFoam: { value: foam },
        uCrest: { value: crest },
        uSandWet: { value: sandWet },
        uSunDir: { value: sunDirection(0) },
        uSunColor: { value: sun },
        uSky: { value: sky },
      },
    ]),
    vertexShader: /* glsl */ `
      #include <common>
      #include <fog_pars_vertex>

      uniform float uTime;
      uniform vec4 uWave0;
      uniform vec4 uWave1;
      uniform vec4 uWave2;
      uniform vec4 uWave3;
      uniform vec3 uHull;
      uniform float uHeading;
      uniform vec2 uHullHalf;
      uniform float uIslandR;
      uniform float uWobbleA;
      uniform float uWobbleB;
      uniform float uShoreCalm;
      uniform float uShoreMin;
      uniform float uOverlap;
      uniform float uFloorY;
      uniform float uEnableWaves;
      uniform float uHullChop;

      varying vec3 vWorld;
      varying vec2 vOrig;
      varying vec3 vNormalW;
      varying float vCrest;
      varying float vDeep;
      varying float vHull;

      float coastR(vec2 xz) {
        float ang = atan(xz.y, xz.x);
        return uIslandR * (1.0 + uWobbleA * sin(ang * 2.0 + 0.9) + uWobbleB * sin(ang * 4.0 - 2.2));
      }

      void gerstner(
        vec4 wave,
        vec3 p,
        float ampMul,
        inout vec3 disp,
        inout vec3 tangent,
        inout vec3 binormal
      ) {
        float steepness = wave.z * ampMul;
        float wavelength = wave.w;
        float k = PI2 / wavelength;
        float c = sqrt(9.8 / k);
        vec2 d = normalize(wave.xy);
        float f = k * (dot(d, p.xz) - c * uTime);
        float a = steepness / k;
        disp += vec3(d.x * (a * cos(f)), a * sin(f), d.y * (a * cos(f)));
        tangent += vec3(
          -d.x * d.x * steepness * sin(f),
          d.x * steepness * cos(f),
          -d.x * d.y * steepness * sin(f)
        );
        binormal += vec3(
          -d.x * d.y * steepness * sin(f),
          d.y * steepness * cos(f),
          -d.y * d.y * steepness * sin(f)
        );
      }

      void main() {
        vec3 p = (modelMatrix * vec4(position, 1.0)).xyz;
        vOrig = p.xz;
        float r = length(p.xz);
        float coast = coastR(p.xz);
        float deep = smoothstep(coast - 1.0, coast + uShoreCalm, r);
        float ampMul = mix(uShoreMin, 1.0, deep) * uEnableWaves;
        // Kill horizontal Gerstner near the beach so vertices cannot tear
        // holes that show the sand through (the "kellik" pattern).
        float xzFade = smoothstep(coast + 2.0, coast + 14.0, r);

        vec2 toH = p.xz - uHull.xz;
        float cs = cos(uHeading);
        float sn = sin(uHeading);
        vec2 local = vec2(toH.x * cs + toH.y * sn, -toH.x * sn + toH.y * cs);
        float hullD = length(local / max(uHullHalf, vec2(0.5)));
        float hullProx = 1.0 - smoothstep(1.05, 2.35, hullD);
        ampMul *= 1.0 + hullProx * uHullChop * uEnableWaves;

        vec3 disp = vec3(0.0);
        vec3 tangent = vec3(1.0, 0.0, 0.0);
        vec3 binormal = vec3(0.0, 0.0, 1.0);
        gerstner(uWave0, p, ampMul, disp, tangent, binormal);
        gerstner(uWave1, p, ampMul, disp, tangent, binormal);
        gerstner(uWave2, p, ampMul, disp, tangent, binormal);
        gerstner(uWave3, p, ampMul, disp, tangent, binormal);
        disp.x *= xzFade;
        disp.z *= xzFade;

        vec3 world = p + disp;
        world.y = max(world.y, uFloorY);
        vWorld = world;
        vNormalW = normalize(cross(binormal, tangent));
        vCrest = clamp(disp.y * 0.55 + 0.45, 0.0, 1.0);
        vDeep = deep;
        vHull = hullProx;

        vec4 mvPosition = viewMatrix * vec4(world, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      #include <common>
      #include <fog_pars_fragment>
      #include <tonemapping_pars_fragment>

      uniform vec3 uShallow;
      uniform vec3 uMid;
      uniform vec3 uDeep;
      uniform vec3 uFoam;
      uniform vec3 uCrest;
      uniform vec3 uSandWet;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform vec3 uSky;
      uniform float uSpecPower;
      uniform float uSpecGain;
      uniform float uFoamShore;
      uniform float uFoamOffset;
      uniform float uFoamMix;
      uniform float uShoreAlpha;
      uniform float uDeepAlpha;
      uniform float uOverlap;
      uniform float uTime;
      uniform float uIslandR;
      uniform float uWobbleA;
      uniform float uWobbleB;

      varying vec3 vWorld;
      varying vec2 vOrig;
      varying vec3 vNormalW;
      varying float vCrest;
      varying float vDeep;
      varying float vHull;

      float coastR(vec2 xz) {
        float ang = atan(xz.y, xz.x);
        return uIslandR * (1.0 + uWobbleA * sin(ang * 2.0 + 0.9) + uWobbleB * sin(ang * 4.0 - 2.2));
      }

      void main() {
        float r = length(vOrig);
        float coast = coastR(vOrig);
        if (r < coast - uOverlap) discard;

        vec3 n = normalize(vNormalW);
        vec3 nFace = cross(dFdx(vWorld), dFdy(vWorld));
        if (length(nFace) > 1e-5 && dot(nFace, n) > 0.0) {
          n = normalize(mix(n, normalize(nFace), 0.55));
        }
        n.x += 0.07 * sin(vWorld.x * 2.4 + uTime * 1.35);
        n.z += 0.07 * sin(vWorld.z * 1.9 - uTime * 1.05);
        n = normalize(n);

        vec3 V = normalize(cameraPosition - vWorld);
        vec3 L = normalize(uSunDir);
        float ndv = max(dot(n, V), 0.0);
        float fresnel = mix(0.04, 0.48, pow(1.0 - ndv, 5.0));
        // Grazing sky reflection on the shallows read as a white void between
        // sand and sea. Keep turquoise readable at the beach; open water still
        // picks up the horizon.
        fresnel *= mix(0.1, 1.0, smoothstep(0.05, 0.58, vDeep));

        vec3 water = mix(uShallow, uMid, smoothstep(0.0, 0.28, vDeep));
        water = mix(water, uDeep, smoothstep(0.42, 1.0, vDeep));
        water = mix(water, uCrest, vCrest * (1.0 - vDeep) * 0.18);
        // Fake the seafloor at grazing angles (real alpha would punch sky
        // through the waterline). Looking down still uses real alpha.
        water = mix(uSandWet, water, smoothstep(0.04, 0.42, vDeep));

        vec3 R = reflect(-L, n);
        float spec = pow(max(dot(R, V), 0.0), uSpecPower) * uSpecGain;
        spec *= mix(0.16, 0.85, vDeep);
        spec = min(spec, 0.2);

        vec3 col = mix(water, mix(water, uSky, 0.38), fresnel);
        col += uSunColor * spec;

        float dist = r - coast;
        float swash = 0.5 + 0.5 * sin(uTime * 0.78 + r * 0.09);
        float center = uFoamOffset + (swash - 0.5) * 2.2;
        float halfW = uFoamShore * 0.5;
        float shoreBand = 1.0 - smoothstep(0.0, halfW, abs(dist - center));
        float chop = 0.55 + 0.45 * sin(vOrig.x * 0.58 + vOrig.y * 0.44 + uTime * 0.5);
        shoreBand *= chop;
        float hullFoam = pow(max(vHull, 0.0), 3.4) * 0.5;
        float foam = max(
          shoreBand * (0.72 + 0.28 * vCrest),
          max(hullFoam, vCrest * (1.0 - vDeep) * 0.38)
        );
        foam = clamp(foam, 0.0, 1.0);
        col = mix(col, uFoam, foam * uFoamMix);

        float lookDown = smoothstep(0.14, 0.58, ndv);
        float alpha = mix(uDeepAlpha, mix(uShoreAlpha, uDeepAlpha, vDeep), lookDown);
        alpha = max(alpha, foam * 0.88);

        gl_FragColor = vec4(col, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

function makeGrid(span: number, segs: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(span, span, segs, segs);
  geo.rotateX(-Math.PI / 2);
  return geo;
}

export function buildSea(opts?: { includeLagoon?: boolean }): Sea {
  const includeLagoon = opts?.includeLagoon ?? true;
  const group = new THREE.Group();
  const updaters: Array<(
    t: number,
    hull?: THREE.Vector3,
    heading?: number,
    cam?: THREE.Vector3,
    day01?: number,
  ) => void> = [];

  const mat = oceanMaterial();
  const patch = new THREE.Mesh(makeGrid(SEA_TEX.patchMeters, SEA_TEX.segments), mat);
  patch.frustumCulled = false;
  patch.matrixAutoUpdate = true;
  patch.receiveShadow = false;
  patch.castShadow = false;
  patch.renderOrder = 2;
  mat.polygonOffset = true;
  mat.polygonOffsetFactor = -1;
  mat.polygonOffsetUnits = -1;
  group.add(patch);

  const floodMat = mat.clone();
  floodMat.uniforms.uEnableWaves.value = 0;
  floodMat.polygonOffset = false;
  const flood = new THREE.Mesh(makeGrid(SEA_TEX.floodMeters, SEA_TEX.floodSegments), floodMat);
  flood.frustumCulled = false;
  flood.position.y = SEA_TEX.floorY;
  flood.renderOrder = 1;
  flood.receiveShadow = false;
  flood.castShadow = false;
  group.add(flood);

  updaters.push((t, hull, heading, cam, day01) => {
    const cell = SEA_TEX.patchMeters / SEA_TEX.segments;
    const cx = cam ? Math.round(cam.x / cell) * cell : 0;
    const cz = cam ? Math.round(cam.z / cell) * cell : 0;
    patch.position.set(cx, SEA_TEX.floorY, cz);

    const hx = hull?.x ?? SHIP.pos.x;
    const hz = hull?.z ?? SHIP.pos.z;
    const yaw = heading ?? SHIP.rotY;
    const sun = sunDirection(day01 ?? 0);

    for (const m of [mat, floodMat]) {
      m.uniforms.uTime.value = t;
      (m.uniforms.uHull.value as THREE.Vector3).set(hx, 0, hz);
      m.uniforms.uHeading.value = yaw;
      (m.uniforms.uSunDir.value as THREE.Vector3).copy(sun);
    }
    floodMat.uniforms.uEnableWaves.value = 0;
    mat.uniforms.uEnableWaves.value = 1;
  });

  if (includeLagoon) {
    void loadKitGeometry(LAGOON_URL).then((geo) => {
      const mesh = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          vertexColors: true,
          roughness: 0.55,
          metalness: 0,
          envMapIntensity: 0.25,
        }),
      );
      mesh.position.set(LAGOON.center.x, LAGOON.waterY, LAGOON.center.z);
      mesh.receiveShadow = true;
      group.add(mesh);
      updaters.push((t) => {
        mesh.position.y = LAGOON.waterY + Math.sin(t * 0.45) * 0.02;
      });
    });

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
    updaters.push((t) => {
      padMesh.position.y = Math.sin(t * 0.45) * 0.012;
    });
  }

  return {
    group,
    update(t, hull, heading, cam, day01) {
      for (const fn of updaters) fn(t, hull, heading, cam, day01);
    },
  };
}
