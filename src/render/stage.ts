import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { CAMERA, DAY, PALETTE, RENDER, SKY_TEX, SUN_DISK } from "../constants";
import { HazePass } from "./hazePass";
import { createSunDisk } from "./sunDisk";
import { createClouds } from "./clouds";
import { assetUrl } from "../assets/paths";
import { loadAlbedoTexture } from "../world/sprite";

/** Golden-hour sky photo (ASSET-022) blended over the procedural gradient. */
const SKY_TEX_URL = "assets/skybox/sky_goldenhour_01_albedo_2048.webp";

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  haze: HazePass;
  /** Transient bloom kick on top of the base strength (decays in game loop). */
  bloomBoost: number;
  /**
   * Simulation seconds, fed by the game loop, driving cloud drift. Deliberately
   * not `performance.now()`: the freeze seam used for screenshot regression
   * requires every time-driven uniform to hold when the sim is paused.
   */
  skyTime: number;
  /** Drive sun + sky from day progress 0 (afternoon) → 1 (dusk). */
  setDayProgress(p: number): void;
  render(): void;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const touch =
    typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  const pixelRatio = Math.min(
    window.devicePixelRatio || 1,
    touch ? RENDER.pixelRatioMaxTouch : RENDER.pixelRatioMax,
  );
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: "high-performance",
    stencil: false,
    depth: true,
  });
  renderer.setPixelRatio(pixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = RENDER.exposure;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(RENDER.fogColor, RENDER.fogDensity);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.1, 600);
  camera.position.set(0, 6, 24);

  // art-bible.md §2 "Uzak ve gökyüzü" — every stop below is a bible hex via
  // constants.ts, not an eyeballed value. The horizon walks altın → kehribar
  // → gül across the day; the zenith holds (bible [P] "ışık asla azalmaz").
  const skyTop = new THREE.Color(RENDER.skyTop);
  const skyHorizon = new THREE.Color(RENDER.skyHorizon);
  const duskTop = new THREE.Color(RENDER.skyTopDusk);
  const amberHorizon = new THREE.Color(RENDER.skyHorizonAmber);
  const duskHorizon = new THREE.Color(RENDER.skyHorizonRose);

  // ------------------------------------------------------------------- sky
  const skyGeo = new THREE.SphereGeometry(360, 32, 20);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
    uniforms: {
      top: { value: skyTop.clone() },
      horizon: { value: skyHorizon.clone() },
      sunDir: { value: new THREE.Vector3() },
      haloColor: { value: new THREE.Color(SUN_DISK.haloColor) },
      corePower: { value: SUN_DISK.skyCorePower },
      haloPower: { value: SUN_DISK.skyHaloPower },
      haloGain: { value: SUN_DISK.skyHaloGain },
      coreTint: { value: new THREE.Color(SUN_DISK.skyCoreTint) },
      coreGain: { value: SUN_DISK.skyCoreGain },
    },
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 top;
      uniform vec3 horizon;
      uniform vec3 sunDir;
      uniform vec3 haloColor;
      uniform float corePower;
      uniform float haloPower;
      uniform float haloGain;
      uniform vec3 coreTint;
      uniform float coreGain;
      varying vec3 vPos;
      void main() {
        float h = clamp(normalize(vPos).y * 1.6 + 0.12, 0.0, 1.0);
        vec3 c = mix(horizon, top, pow(h, 0.7));
        // Sky mesh is camera-centered; local position IS the view direction.
        vec3 viewDir = normalize(vPos);
        float sunDot = max(dot(viewDir, sunDir), 0.0);
        c += haloColor * pow(sunDot, haloPower) * haloGain;
        // Near-point highlight only. The opaque disc in sunDisk.ts draws the
        // sun's actual circumference; this just keeps the sky hot right at it.
        float disc = pow(sunDot, corePower);
        c += coreTint * (disc * coreGain);
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
  const skyMesh = new THREE.Mesh(skyGeo, skyMat);
  // Sky stack, back to front: gradient (−3) → photo wash (−2) → cloud deck (−1).
  skyMesh.renderOrder = -3;
  skyMesh.frustumCulled = false;
  scene.add(skyMesh);

  // Generated golden-hour sky (ASSET-022) as a second, slightly smaller
  // sphere blended over the procedural gradient above — real skybox detail
  // (horizon clouds) without losing the dynamic afternoon→dusk grading the
  // gradient already drives (`setDayProgress` below). Invisible at t=0 (no
  // regression from today's look), fades in toward dusk. Standard sphere UVs
  // (equirectangular-ish) fit a sky photo directly; clamped edges (the photo
  // is a single wide shot, not a seamless 360 pan) just stretch its plain
  // gradient edge colour around the back, which reads fine for a sky.
  const cloudTex = loadAlbedoTexture(assetUrl(SKY_TEX_URL));
  cloudTex.wrapS = THREE.ClampToEdgeWrapping;
  cloudTex.wrapT = THREE.ClampToEdgeWrapping;
  const cloudMat = new THREE.MeshBasicMaterial({
    map: cloudTex,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    fog: false,
    // Must match the gradient sphere underneath. The gradient is `toneMapped:
    // false`; leaving the photo on the default `true` meant ACES graded one
    // layer and not the other, so the blend shifted hue as it faded in.
    toneMapped: false,
  });
  const cloudMesh = new THREE.Mesh(new THREE.SphereGeometry(SKY_TEX.cloudRadius, 24, 16), cloudMat);
  cloudMesh.renderOrder = -2;
  cloudMesh.frustumCulled = false;
  scene.add(cloudMesh);

  // The real cloud deck (`clouds.ts`) — procedural, drifting, visible all day.
  // The photo above is now only a faint horizon wash underneath it.
  const clouds = createClouds();
  scene.add(clouds.mesh);

  // ------------------------------------------------------------------ lights
  // art-bible.md §3 trio: high sky hemi, warm key, turquoise water fill.
  // AmbientLight is only a crush-floor so cavities never go black.
  const ambient = new THREE.AmbientLight(RENDER.ambientColor, RENDER.ambientIntensity);
  scene.add(ambient);
  const hemi = new THREE.HemisphereLight(
    RENDER.bounceSky,
    RENDER.bounceGround,
    RENDER.bounceIntensity,
  );
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(RENDER.sunColor, RENDER.sunIntensity);
  const elev0 = THREE.MathUtils.degToRad(DAY.sunStartDeg);
  const az0 = SUN_DISK.azimuthStart;
  const sunDir = new THREE.Vector3(
    Math.cos(az0) * Math.cos(elev0),
    Math.sin(elev0),
    Math.sin(az0) * Math.cos(elev0),
  ).normalize();
  const lightFocus = new THREE.Vector3();
  const placeSunLight = () => {
    lightFocus.set(camera.position.x, 0, camera.position.z);
    sun.target.position.copy(lightFocus);
    sun.position.copy(lightFocus).addScaledVector(sunDir, RENDER.sunShadowDistance);
    sun.target.updateMatrixWorld();
  };
  sun.castShadow = true;
  sun.shadow.mapSize.set(RENDER.shadowMapSize, RENDER.shadowMapSize);
  const half = RENDER.shadowExtent;
  const cam = sun.shadow.camera as THREE.OrthographicCamera;
  cam.left = -half;
  cam.right = half;
  cam.top = half;
  cam.bottom = -half;
  cam.near = 1;
  cam.far = RENDER.shadowFar;
  sun.shadow.bias = RENDER.shadowBias;
  sun.shadow.normalBias = RENDER.shadowNormalBias;
  scene.add(sun);
  scene.add(sun.target);
  placeSunLight();
  (skyMat.uniforms.sunDir.value as THREE.Vector3).copy(sunDir);

  // Art-bible.md §3: turquoise fill from the water, third light of the set.
  const waterFill = new THREE.HemisphereLight(0x000000, PALETTE.seaShallow, RENDER.waterBounceIntensity);
  scene.add(waterFill);

  const sunDisk = createSunDisk();
  scene.add(sunDisk.group);
  sunDisk.setDusk(0);

  const sunColorDay = new THREE.Color(RENDER.sunColor);
  const sunColorDusk = new THREE.Color(0xff8a6a);
  const fogDay = new THREE.Color(RENDER.fogColor);
  const fogDusk = new THREE.Color(RENDER.fogDusk);

  // ------------------------------------------------------------------ passes
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(256, 256),
    RENDER.bloomStrength,
    RENDER.bloomRadius,
    RENDER.bloomThreshold,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const haze = new HazePass();
  haze.renderToScreen = true;
  composer.addPass(haze);

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    const bw = Math.max(1, Math.floor(w * pixelRatio * RENDER.bloomScale));
    const bh = Math.max(1, Math.floor(h * pixelRatio * RENDER.bloomScale));
    bloom.setSize(bw, bh);
    haze.setResolution(w * pixelRatio, h * pixelRatio);
  };
  resize();
  window.addEventListener("resize", resize);

  const tmpA = new THREE.Color();
  const tmpB = new THREE.Color();

  const stage: Stage = {
    renderer,
    scene,
    camera,
    haze,
    bloomBoost: 0,
    skyTime: 0,
    setDayProgress(p: number) {
      const t = Math.min(1, Math.max(0, p));
      const elev = THREE.MathUtils.degToRad(
        THREE.MathUtils.lerp(DAY.sunStartDeg, DAY.sunEndDeg, t),
      );
      const az = THREE.MathUtils.lerp(SUN_DISK.azimuthStart, SUN_DISK.azimuthEnd, t);
      sunDir.set(
        Math.cos(az) * Math.cos(elev),
        Math.sin(elev),
        Math.sin(az) * Math.cos(elev),
      ).normalize();
      (skyMat.uniforms.sunDir.value as THREE.Vector3).copy(sunDir);
      sunDisk.setDusk(t);

      const warn = Math.max(0, (t - 0.78) / 0.22);
      // Zenith holds — art-bible.md §2 [P]. Only a token shift so the sky is
      // not literally frozen; the horizon carries the clock.
      tmpA.copy(skyTop).lerp(duskTop, t * RENDER.skyTopDuskShift);
      // Horizon: altın → kehribar (first half) → gül (second half), the exact
      // sequence art-bible.md §2 names as the time-of-day read.
      if (t <= 0.5) tmpB.copy(skyHorizon).lerp(amberHorizon, t / 0.5);
      else tmpB.copy(amberHorizon).lerp(duskHorizon, (t - 0.5) / 0.5);
      // Warn window (DAY.warnRemaining) pushes further along the same ramp
      // rather than off-palette, so "az kaldı" still reads without a new hue.
      if (warn > 0) tmpB.lerp(duskHorizon, warn * 0.5);
      (skyMat.uniforms.top.value as THREE.Color).copy(tmpA);
      (skyMat.uniforms.horizon.value as THREE.Color).copy(tmpB);
      cloudMat.opacity = t * SKY_TEX.cloudMaxOpacity;
      clouds.setDayProgress(t);

      sun.color.copy(sunColorDay).lerp(sunColorDusk, t * 0.85 + warn * 0.15);
      // art-bible.md §3 / §4: light never drops — dusk is a hue shift, not a dim.
      sun.intensity = RENDER.sunIntensity;
      ambient.intensity = RENDER.ambientIntensity;
      hemi.intensity = RENDER.bounceIntensity;
      waterFill.intensity = RENDER.waterBounceIntensity;
      renderer.toneMappingExposure = RENDER.exposure;
      (skyMat.uniforms.haloColor.value as THREE.Color).copy(sunColorDay).lerp(sunColorDusk, t);

      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(fogDay).lerp(fogDusk, t);
        scene.fog.density = THREE.MathUtils.lerp(RENDER.fogDensity, RENDER.fogDensity * 1.2, t);
      }
    },
    render: () => {
      // Skybox follows the camera so the disc sits at infinity from the south
      // beach, not as a world prop around the origin.
      skyMesh.position.copy(camera.position);
      cloudMesh.position.copy(camera.position);
      clouds.mesh.position.copy(camera.position);
      clouds.update(stage.skyTime, sunDir);
      placeSunLight();
      sunDisk.group.position.set(
        camera.position.x + sunDir.x * SUN_DISK.distance,
        camera.position.y + sunDir.y * SUN_DISK.distance,
        camera.position.z + sunDir.z * SUN_DISK.distance,
      );
      sunDisk.faceCamera(camera);
      (skyMat.uniforms.sunDir.value as THREE.Vector3).copy(sunDir);
      bloom.strength = RENDER.bloomStrength + stage.bloomBoost;
      composer.render();
    },
  };
  return stage;
}
