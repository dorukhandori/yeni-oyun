/**
 * Tiny Konfuse turnaround in the Görünüm modal. Second WebGL context, only
 * while the panel is open — the game canvas keeps the main renderer.
 */
import * as THREE from "three";
import { SAILOR } from "../constants";
import { PLAYER_SKINS } from "../skins";
import { createHumanoidActor } from "../world/humanoidRig";

export interface SkinPreview {
  start(): void;
  stop(): void;
}

export function createSkinPreview(canvas: HTMLCanvasElement): SkinPreview {
  let renderer: THREE.WebGLRenderer | null = null;
  let raf = 0;
  let running = false;
  let gen = 0;
  let yaw = 0.35;
  let dragging = false;
  let lastX = 0;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const onDown = (e: PointerEvent) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    yaw -= (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  };
  const onUp = (e: PointerEvent) => {
    dragging = false;
    try {
      canvas.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  };

  const stop = () => {
    running = false;
    gen += 1;
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
  };

  const start = () => {
    if (running) return;
    running = true;
    const myGen = ++gen;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4eee0);

    const camera = new THREE.PerspectiveCamera(32, 160 / 220, 0.05, 20);
    camera.position.set(1.15, 1.05, 2.35);
    camera.lookAt(0, 0.88, 0);

    const webgl = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "low-power",
    });
    webgl.setPixelRatio(1);
    webgl.setSize(160, 220, false);
    webgl.outputColorSpace = THREE.SRGBColorSpace;
    webgl.toneMapping = THREE.ACESFilmicToneMapping;
    webgl.toneMappingExposure = 1.05;
    renderer = webgl;

    scene.add(new THREE.HemisphereLight(0xfff6e8, 0x8a7a62, 1.15));
    const key = new THREE.DirectionalLight(0xfff3d6, 1.45);
    key.position.set(2.2, 3.4, 2.6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xc9d6ee, 0.45);
    fill.position.set(-2.4, 1.4, -1.6);
    scene.add(fill);

    const pivot = new THREE.Group();
    scene.add(pivot);
    let actor: Awaited<ReturnType<typeof createHumanoidActor>> | null = null;

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const clock = new THREE.Clock();
    const tick = () => {
      if (!running || renderer !== webgl) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!reduced && !dragging) yaw += dt * 0.55;
      pivot.rotation.y = yaw;
      actor?.update(dt);
      webgl.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    const skin = PLAYER_SKINS.konfuse;
    void createHumanoidActor(skin.meshRig, {
      heightMeters: SAILOR.height,
      expectedBytes: skin.meshRigBytes,
      clipFade: 0,
      mattePrint: skin.mattePrint,
    })
      .then((a) => {
        if (myGen !== gen) return;
        actor = a;
        a.play("idle", 0);
        a.scene.rotation.y = SAILOR.meshFacing;
        pivot.add(a.scene);
        tick();
      })
      .catch((err) => {
        console.warn("[skin-preview] Konfuse GLB failed", err);
      });
  };

  return { start, stop };
}
