import * as THREE from "three";
import { RENDER, SHORE_MIST } from "../constants";
import { islandRadiusAt } from "./terrain";

/**
 * Static morning mist along the whole beach. No per-frame uniforms — the
 * previous hull ellipsoid scrolled its noise every tick and filled the
 * screen with overdraw (stutter + "the frame never sits still").
 *
 * One ribbon, two stacked bands, baked noise. Enabled only while the K35
 * hull is absent from the world.
 */

function bakeMistNoise(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("shoreMist: 2d context unavailable");
  const img = ctx.createImageData(size, size);
  const data = img.data;
  const hash = (x: number, y: number) => {
    let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + 2048;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const wrap = (n: number) => ((n % size) + size) % size;
  const value = (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = x - xi;
    const yf = y - yi;
    const u = xf * xf * (3 - 2 * xf);
    const v = yf * yf * (3 - 2 * yf);
    const a = hash(wrap(xi), wrap(yi));
    const b = hash(wrap(xi + 1), wrap(yi));
    const c = hash(wrap(xi), wrap(yi + 1));
    const d = hash(wrap(xi + 1), wrap(yi + 1));
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const t = value((px / size) * 5, (py / size) * 5) * 0.65 + value((px / size) * 11, (py / size) * 11) * 0.35;
      const i = (py * size + px) * 4;
      const g = Math.floor(t * 255);
      data[i] = g;
      data[i + 1] = g;
      data[i + 2] = g;
      data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

function coastBandGeometry(y: number, inland: number, seaward: number): THREE.BufferGeometry {
  const n = SHORE_MIST.segments;
  const positions = new Float32Array((n + 1) * 2 * 3);
  const uvs = new Float32Array((n + 1) * 2 * 2);
  const indices: number[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.sin(a);
    const dz = Math.cos(a);
    const r = islandRadiusAt(dx, dz);
    const ri = Math.max(2, r - inland);
    const ro = r + seaward;
    const yOff = Math.sin(a * 4.7) * 0.55 + Math.sin(a * 2.1 + 0.8) * 0.85;
    const p = i * 2;
    positions[p * 3] = dx * ri;
    positions[p * 3 + 1] = y + yOff * 0.4;
    positions[p * 3 + 2] = dz * ri;
    positions[(p + 1) * 3] = dx * ro;
    positions[(p + 1) * 3 + 1] = y + yOff;
    positions[(p + 1) * 3 + 2] = dz * ro;
    uvs[p * 2] = i / n;
    uvs[p * 2 + 1] = 0;
    uvs[(p + 1) * 2] = i / n;
    uvs[(p + 1) * 2 + 1] = 1;
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

const mistVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const mistFrag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uEnabled;
  uniform float uAlpha;
  uniform float uNoiseScale;
  uniform sampler2D uNoise;
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    if (uEnabled < 0.01) discard;
    float across = vUv.y;
    float band = smoothstep(0.0, 0.18, across) * (1.0 - smoothstep(0.52, 1.0, across));
    float n = texture2D(uNoise, vWorld.xz * uNoiseScale).r;
    float alpha = band * mix(0.45, 1.0, n) * uAlpha * uEnabled;
    if (alpha < 0.03) discard;
    gl_FragColor = vec4(uColor, alpha);
  }
`;

export interface ShoreMist {
  group: THREE.Group;
  setEnabled(on: boolean): void;
}

export function buildShoreMist(): ShoreMist {
  const group = new THREE.Group();
  group.name = "shoreMist";
  group.visible = false;
  const noise = bakeMistNoise();
  const color = new THREE.Color(RENDER.fogColor).lerp(new THREE.Color(0xf3eadc), 0.5);
  const uniforms = {
    uColor: { value: color },
    uEnabled: { value: 0 },
    uAlpha: { value: SHORE_MIST.maxAlpha },
    uNoiseScale: { value: SHORE_MIST.noiseScale },
    uNoise: { value: noise },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: mistVert,
    fragmentShader: mistFrag,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
    fog: false,
  });
  const low = new THREE.Mesh(
    coastBandGeometry(SHORE_MIST.heightLow, SHORE_MIST.inland, SHORE_MIST.seaward),
    mat,
  );
  low.renderOrder = 2;
  group.add(low);

  return {
    group,
    setEnabled(on) {
      uniforms.uEnabled.value = on ? 1 : 0;
      group.visible = on;
    },
  };
}
