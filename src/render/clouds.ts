import * as THREE from "three";
import { CLOUDS } from "../constants";

/**
 * Drifting cloud deck.
 *
 * Why this shape and not the obvious alternatives:
 *
 * - **Not the sky photo.** `stage.ts` already blends `sky_goldenhour_01` over
 *   the gradient, but that is one wide still on a clamped sphere: it cannot
 *   move, it repeats visibly if you tile it, and it only faded in at dusk —
 *   so for most of a run the sky was an empty gradient.
 * - **Not per-pixel FBM.** Evaluating 4–5 noise octaves per fragment across a
 *   full-dome draw is the one thing that would actually cost us on mobile.
 * - **This:** the noise is baked **once at startup** into a small seamless
 *   canvas texture (CPU, a few ms) and the shader does two texture fetches.
 *   Cost per frame is one extra transparent dome with a cheap fragment — the
 *   same order as the photo layer it replaces.
 *
 * The UVs are **not** the sphere's own UVs. A polar UV set pinches at the
 * zenith and scrolling it looks like a whirlpool. Instead the fragment
 * projects its view ray onto a horizontal plane at `planeHeight`, which is
 * how a real cloud deck behaves: puffs spread overhead and compress toward
 * the horizon on their own, with no pole singularity.
 *
 * No external asset — nothing here needs the Higgsfield/Tripo pipeline.
 */

/** Integer hash → [0,1). Kept in 32-bit lanes via Math.imul so it stays stable. */
function hash2(x: number, y: number, seed: number): number {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Value noise on a lattice that wraps at `period`, so every octave tiles and
 * the baked texture has no seam when the shader repeats it.
 */
function valueNoise(x: number, y: number, period: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  // Smoothstep weights — cheaper than quintic and plenty for cloud shape.
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const wrap = (n: number) => ((n % period) + period) % period;
  const x0 = wrap(xi);
  const x1 = wrap(xi + 1);
  const y0 = wrap(yi);
  const y1 = wrap(yi + 1);
  const a = hash2(x0, y0, seed);
  const b = hash2(x1, y0, seed);
  const c = hash2(x0, y1, seed);
  const d = hash2(x1, y1, seed);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}

/**
 * Seamless cloud tile.
 * - `r` keeps the raw FBM (thickness proxy: puff cores are high, edges low) so
 *   the shader can shade tops against undersides.
 * - `a` is the same field pushed through a coverage threshold, which is what
 *   makes discrete clouds with real blue gaps instead of grey soup.
 */
function cloudTexture(size: number, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("clouds: 2d context unavailable");
  const img = ctx.createImageData(size, size);
  const data = img.data;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let amp = 1;
      let period = CLOUDS.baseCells;
      let sum = 0;
      let norm = 0;
      for (let o = 0; o < CLOUDS.octaves; o++) {
        sum += amp * valueNoise((px / size) * period, (py / size) * period, period, seed + o * 17);
        norm += amp;
        amp *= CLOUDS.gain;
        period *= 2;
      }
      const fbm = sum / norm;
      // Coverage carves the field into separate clouds; softness keeps the
      // edges wispy rather than cut out with scissors.
      const density = THREE.MathUtils.smoothstep(fbm, CLOUDS.coverage, CLOUDS.coverage + CLOUDS.softness);
      const i = (py * size + px) * 4;
      data[i] = Math.round(255 * THREE.MathUtils.clamp((fbm - CLOUDS.coverage) / Math.max(1e-4, 1 - CLOUDS.coverage), 0, 1));
      data[i + 1] = data[i];
      data[i + 2] = data[i];
      data[i + 3] = Math.round(255 * density);
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  // Data-ish channels (density/thickness), not albedo — no sRGB decode, same
  // rule `docs/art/pipeline.md` §6 sets for mask textures.
  tex.colorSpace = THREE.NoColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export interface CloudLayer {
  mesh: THREE.Mesh;
  /** Advance the drift. `seconds` is wall-clock elapsed, not the fixed step. */
  update(seconds: number, sunDir: THREE.Vector3): void;
  /** Grade the deck from afternoon (0) to dusk (1). */
  setDayProgress(t: number): void;
}

export function createClouds(): CloudLayer {
  const tex = cloudTexture(CLOUDS.textureSize, CLOUDS.seed);

  const litDay = new THREE.Color(CLOUDS.litDay);
  const litDusk = new THREE.Color(CLOUDS.litDusk);
  const shadeDay = new THREE.Color(CLOUDS.shadeDay);
  const shadeDusk = new THREE.Color(CLOUDS.shadeDusk);
  const rimDay = new THREE.Color(CLOUDS.rimDay);
  const rimDusk = new THREE.Color(CLOUDS.rimDusk);

  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
    // Honest depth test. The sungod bug in the previous sky pass was exactly
    // this flag left off — a sky element with `depthTest:false` paints over
    // hulls, masts and HUD. Hills at 310 m correctly occlude this deck.
    depthTest: true,
    fog: false,
    // Must match both sky spheres in `stage.ts`, which are `toneMapped:false`.
    // Mixed tone mapping across stacked sky layers shifts hue as they blend.
    toneMapped: false,
    uniforms: {
      map: { value: tex },
      time: { value: 0 },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      lit: { value: litDay.clone() },
      shade: { value: shadeDay.clone() },
      rim: { value: rimDay.clone() },
      opacity: { value: CLOUDS.opacity },
      planeHeight: { value: CLOUDS.planeHeight },
      scaleA: { value: CLOUDS.scaleA },
      scaleB: { value: CLOUDS.scaleB },
      windA: { value: new THREE.Vector2(CLOUDS.windA[0], CLOUDS.windA[1]) },
      windB: { value: new THREE.Vector2(CLOUDS.windB[0], CLOUDS.windB[1]) },
      horizonFadeLow: { value: CLOUDS.horizonFadeLow },
      horizonFadeHigh: { value: CLOUDS.horizonFadeHigh },
      rimPower: { value: CLOUDS.rimPower },
      rimGain: { value: CLOUDS.rimGain },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D map;
      uniform float time;
      uniform vec3 sunDir;
      uniform vec3 lit;
      uniform vec3 shade;
      uniform vec3 rim;
      uniform float opacity;
      uniform float planeHeight;
      uniform float scaleA;
      uniform float scaleB;
      uniform vec2 windA;
      uniform vec2 windB;
      uniform float horizonFadeLow;
      uniform float horizonFadeHigh;
      uniform float rimPower;
      uniform float rimGain;
      varying vec3 vPos;

      void main() {
        // The dome is camera-centred, so the local position IS the view ray.
        vec3 dir = normalize(vPos);

        // Everything below the deck's horizon line is sky, not cloud.
        float up = dir.y;
        float horizonFade = smoothstep(horizonFadeLow, horizonFadeHigh, up);
        if (horizonFade <= 0.001) discard;

        // Project the ray onto a horizontal plane at planeHeight. Grazing rays
        // travel far, which is what compresses distant clouds toward the
        // horizon without any extra maths.
        float travel = planeHeight / max(up, 1e-3);
        vec2 ground = dir.xz * travel;

        vec4 a = texture2D(map, ground / scaleA + windA * time);
        vec4 b = texture2D(map, ground / scaleB + windB * time + vec2(0.37, 0.61));

        // Two decks at different scales and speeds: the coarse layer sets the
        // silhouette, the finer one breaks up its edge and gives parallax.
        float density = clamp(a.a * (0.70 + 0.60 * b.a), 0.0, 1.0);
        float thickness = clamp(a.r * 0.85 + b.r * 0.55, 0.0, 1.0);

        float alpha = density * horizonFade * opacity;
        if (alpha <= 0.004) discard;

        // Thick cores catch the light; thin edges keep the cool bounce. The
        // ramp is deliberately low and narrow — with a wider one almost every
        // texel landed on the shaded end and the whole deck read as grey haze
        // instead of sunlit cloud.
        vec3 col = mix(shade, lit, smoothstep(0.02, 0.45, thickness));
        // Silver lining: puffs near the sun pick up the warm rim.
        float sunAmt = max(dot(dir, sunDir), 0.0);
        col = mix(col, rim, pow(sunAmt, rimPower) * rimGain);

        gl_FragColor = vec4(col, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(CLOUDS.domeRadius, 32, 20), mat);
  mesh.name = "clouds";
  mesh.frustumCulled = false;
  mesh.renderOrder = CLOUDS.renderOrder;

  const tmp = new THREE.Color();

  return {
    mesh,
    update(seconds, sunDir) {
      mat.uniforms.time.value = seconds;
      (mat.uniforms.sunDir.value as THREE.Vector3).copy(sunDir);
    },
    setDayProgress(t) {
      const k = THREE.MathUtils.clamp(t, 0, 1);
      tmp.copy(litDay).lerp(litDusk, k);
      (mat.uniforms.lit.value as THREE.Color).copy(tmp);
      tmp.copy(shadeDay).lerp(shadeDusk, k);
      (mat.uniforms.shade.value as THREE.Color).copy(tmp);
      tmp.copy(rimDay).lerp(rimDusk, k);
      (mat.uniforms.rim.value as THREE.Color).copy(tmp);
      // Dusk thickens the deck a little — the bible's dusk is a hue shift, so
      // the sky earns its drama from colour and cover, never from dimming.
      mat.uniforms.opacity.value = THREE.MathUtils.lerp(CLOUDS.opacity, CLOUDS.opacityDusk, k);
    },
  };
}
