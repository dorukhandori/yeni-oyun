import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RENDER } from "../constants";

/**
 * Bare Three.js viewer for the workbench — deliberately generic, no game
 * dependency. Not `src/render/stage.ts`: that owns Lotophagoi's sky/haze/day
 * cycle, which a "look at any GLB" devtool has no use for.
 */
export interface Viewer {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  modelRoot: THREE.Group;
  /** Swap the displayed model. `null` clears the scene. */
  setModel(root: THREE.Object3D | null): void;
  /** Drive an external mixer from the render loop (workbench owns no mixer itself). */
  setMixer(mixer: THREE.AnimationMixer | null): void;
  /** Optional per-frame hook (scrubber UI, dev probes). */
  setFrameHook(fn: ((dt: number) => void) | null): void;
  /** Recenter + redistance the orbit camera around whatever is loaded. */
  frameModel(): void;
  /** Frame an arbitrary object (scene presets). */
  frameObject(target: THREE.Object3D): void;
  setBackdrop(mode: "studio" | "ocean"): void;
}

export function createViewer(canvas: HTMLCanvasElement): Viewer {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  const scene = new THREE.Scene();
  const STUDIO_BG = 0x1b1d22;
  const OCEAN_BG = 0x4a7a9a;
  scene.background = new THREE.Color(STUDIO_BG);

  const camera = new THREE.PerspectiveCamera(45, 1, 0.05, 500);
  camera.position.set(2.4, 1.8, 3.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.update();

  // Plain three-point rig — enough to read shape/material, no art direction.
  const hemi = new THREE.HemisphereLight(0xffffff, 0x33342f, 1.1);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.4);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const grid = new THREE.GridHelper(10, 20, 0x555a66, 0x2c2f38);
  scene.add(grid);

  function frameObject(target: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(target);
    if (box.isEmpty()) return;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const radius = Math.max(size.length() * 0.5, 0.4);
    controls.target.copy(center);
    const dir = new THREE.Vector3().subVectors(camera.position, controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0.6, 0.4, 1);
    dir.normalize();
    camera.position.copy(center).addScaledVector(dir, radius * 2.4);
    camera.near = Math.max(0.01, radius / 100);
    camera.far = Math.max(500, radius * 100);
    camera.updateProjectionMatrix();
    controls.update();
  }

  const modelRoot = new THREE.Group();
  scene.add(modelRoot);

  let mixer: THREE.AnimationMixer | null = null;
  let frameHook: ((dt: number) => void) | null = null;

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  };
  window.addEventListener("resize", resize);
  resize();

  const clock = new THREE.Clock();
  const tick = () => {
    requestAnimationFrame(tick);
    const dt = clock.getDelta();
    if (mixer) mixer.update(dt);
    frameHook?.(dt);
    controls.update();
    renderer.render(scene, camera);
  };
  tick();

  return {
    scene,
    camera,
    modelRoot,
    setModel(root) {
      while (modelRoot.children.length > 0) modelRoot.remove(modelRoot.children[0]);
      if (root) modelRoot.add(root);
    },
    setMixer(m) {
      mixer = m;
    },
    setFrameHook(fn) {
      frameHook = fn;
    },
    frameModel() {
      frameObject(modelRoot);
    },
    frameObject,
    setBackdrop(mode) {
      const bg = scene.background;
      if (bg instanceof THREE.Color) bg.setHex(mode === "ocean" ? OCEAN_BG : STUDIO_BG);
      grid.visible = mode === "studio";
      if (mode === "ocean") {
        // sea.ts fragment shader already #includes <tonemapping_fragment> — pairing
        // that with renderer ACES duplicates GLSL tonemap helpers and breaks WebGL.
        renderer.toneMapping = THREE.NoToneMapping;
        scene.fog = new THREE.FogExp2(RENDER.fogColor, RENDER.fogDensity);
      } else {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        scene.fog = null;
      }
    },
  };
}
