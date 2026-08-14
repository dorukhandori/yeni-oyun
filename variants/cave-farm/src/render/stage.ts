import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { CAMERA, PALETTE } from "../constants";

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  composer: EffectComposer;
  resize(): void;
  render(): void;
}

export function createStage(canvas: HTMLCanvasElement): Stage {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(PALETTE.fog);
  scene.fog = new THREE.FogExp2(PALETTE.fog, 0.052);

  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 16 / 9, 0.1, 240);
  camera.position.set(0, 4, 10);

  // Barely-there cool fill so the cave stays dark and the lantern carries the frame.
  const ambient = new THREE.AmbientLight(PALETTE.ambient, 0.45);
  scene.add(ambient);

  const bounce = new THREE.HemisphereLight(0x6a58a8, 0x0a1418, 0.28);
  scene.add(bounce);

  // Cool top key so distant rock silhouettes read violet instead of black.
  const key = new THREE.DirectionalLight(0x8f7bff, 0.32);
  key.position.set(-6, 14, -4);
  scene.add(key);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Low radius keeps the tiny bloom mips from smearing into visible squares.
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.45, 0.4, 0.85);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    bloom.setSize(w, h);
  };
  resize();
  window.addEventListener("resize", resize);

  return {
    renderer,
    scene,
    camera,
    composer,
    resize,
    render: () => composer.render(),
  };
}
