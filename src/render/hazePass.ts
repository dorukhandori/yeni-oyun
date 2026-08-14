import * as THREE from "three";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FX } from "../constants";

/**
 * Forgetting veil. `amount` 0 = clear sight, 1 = lotus-drunk: radial smear,
 * colour drained, milky white bloom over everything. Runs after OutputPass so
 * it works in display space.
 *
 * Adds the "bayılma" presentation layer on top of the original four effects
 * (blur/desaturate/vignette/fog already folded into this single `amount`
 * curve) — `gdd-memory-system.md` §9.1, `art-bible.md` §4.1: edge ghosting
 * (`FX_GHOST_OFFSET`) and a slow vignette "breath" (`FX_BREATH_PERIOD`/
 * `FX_BREATH_AMPLITUDE`). Neither darkens the screen and both change over
 * multi-second periods (photosensitivity: no strobe, transitions ≥1.5s) —
 * the existing four layers are untouched, this is purely additive.
 */
export const HazeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    amount: { value: 0 },
    time: { value: 0 },
    veil: { value: new THREE.Color(0xfdf6ec) },
    resolution: { value: new THREE.Vector2(1280, 720) },
    ghostOffsetPx: { value: FX.ghostOffsetPx },
    breathPeriod: { value: FX.breathPeriod },
    breathAmplitude: { value: FX.breathAmplitude },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float amount;
    uniform float time;
    uniform vec3 veil;
    uniform vec2 resolution;
    uniform float ghostOffsetPx;
    uniform float breathPeriod;
    uniform float breathAmplitude;
    varying vec2 vUv;

    void main() {
      vec2 c = vUv - 0.5;
      float rad = length(c);

      // Radial smear: stronger toward the edges, so the centre stays readable.
      float blur = amount * (0.007 + rad * 0.042);
      vec3 col = texture2D(tDiffuse, vUv).rgb;
      if (amount > 0.001) {
        vec3 acc = col;
        float w = 1.0;
        for (int i = 1; i <= 5; i++) {
          float f = float(i) / 5.0;
          float ang = float(i) * 1.2566 + time * 0.35;
          vec2 off = vec2(cos(ang), sin(ang)) * blur * f;
          acc += texture2D(tDiffuse, clamp(vUv + off, 0.001, 0.999)).rgb;
          acc += texture2D(tDiffuse, clamp(vUv - c * blur * f * 2.0, 0.001, 0.999)).rgb;
          w += 2.0;
        }
        col = acc / w;
      }

      // Drain the colour, then wash toward the milky veil.
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(col, vec3(luma), amount * 0.7);
      float bloomEdge = smoothstep(0.15, 0.8, rad) * amount;

      // Bayılma katmanı 1/2 — nefes ritmi: vinyetin opaklığı sabit değil,
      // FX_BREATH_PERIOD'la çok yavaş dalgalanır (gdd-memory-system.md §9.1).
      // amount==0 iken etkisiz; genlik FX_BREATH_AMPLITUDE ile küçük tutulur.
      float breath = sin(time * 6.2831853 / breathPeriod) * breathAmplitude * amount;
      float veilMix = clamp(amount * 0.32 + bloomEdge * 0.3 + breath, 0.0, 1.0);
      col = mix(col, veil, veilMix);

      // Slow breathing pulse so it feels narcotic rather than static.
      col += veil * amount * (0.03 + 0.025 * sin(time * 0.9));

      // Bayılma katmanı 2/2 — kenar ghosting: yalnızca kenar bölgesinde ve
      // yalnızca yüksek unutuşta, FX_GHOST_OFFSET piksel kadar kaymış ikinci
      // bir örnekleme ekleniyor. FX_BLUR'un altında kalacak kadar küçük,
      // merkez netliği hiç bozulmuyor (art-bible.md §4.1).
      float edgeMask = smoothstep(0.32, 0.62, rad);
      float ghostStrength = smoothstep(0.55, 0.92, amount) * edgeMask;
      if (ghostStrength > 0.001) {
        vec2 dir = rad > 0.0001 ? c / rad : vec2(1.0, 0.0);
        vec2 ghostUv = clamp(vUv + dir * (ghostOffsetPx / resolution), 0.001, 0.999);
        vec3 ghostCol = texture2D(tDiffuse, ghostUv).rgb;
        col = mix(col, (col + ghostCol) * 0.5, ghostStrength * 0.55);
      }

      // Warm base grade plus a gentle vignette even when clear headed.
      col *= vec3(1.03, 1.005, 0.965);
      col *= 1.0 - smoothstep(0.42, 0.95, rad) * (0.3 - amount * 0.28);

      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class HazePass extends ShaderPass {
  constructor() {
    super(HazeShader);
  }

  set amount(v: number) {
    this.uniforms.amount.value = v;
  }

  set time(v: number) {
    this.uniforms.time.value = v;
  }

  setResolution(w: number, h: number): void {
    (this.uniforms.resolution.value as THREE.Vector2).set(w, h);
  }
}
