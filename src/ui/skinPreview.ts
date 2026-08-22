/**
 * Tiny skin turnaround in the Görünüm modal. Second WebGL context, only
 * while the panel is open — the game canvas keeps the main renderer.
 * Follows the selected appearance (Tunik / Kömbe), not a hardcoded mesh.
 */
import * as THREE from "three";
import { SAILOR } from "../constants";
import { PLAYER_SKINS, type SkinId } from "../skins";
import { createHumanoidActor } from "../world/humanoidRig";

export interface SkinPreview {
  show(id: SkinId): void;
  stop(): void;
}

export function createSkinPreview(canvas: HTMLCanvasElement, caption?: HTMLElement): SkinPreview {
  let renderer: THREE.WebGLRenderer | null = null;
  let raf = 0;
  let running = false;
  let gen = 0;
  let shown: SkinId | null = null;
  let yaw = 0.35;
  let dragging = false;
  let lastX = 0;
  let pivot: THREE.Group | null = null;
  let actor: Awaited<ReturnType<typeof createHumanoidActor>> | null = null;
  let webgl: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;

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

  const labelFor = (id: SkinId) => PLAYER_SKINS[id].label;

  const stop = () => {
    running = false;
    shown = null;
    gen += 1;
    cancelAnimationFrame(raf);
    raf = 0;
    actor = null;
    pivot = null;
    scene = null;
    camera = null;
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onUp);
    canvas.removeEventListener("pointercancel", onUp);
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    webgl = null;
  };

  const boot = () => {
    if (running) return;
    running = true;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf4eee0);

    camera = new THREE.PerspectiveCamera(32, 160 / 220, 0.05, 20);
    camera.position.set(1.15, 1.05, 2.35);
    camera.lookAt(0, 0.88, 0);

    webgl = new THREE.WebGLRenderer({
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

    pivot = new THREE.Group();
    scene.add(pivot);

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);

    const clock = new THREE.Clock();
    const tick = () => {
      if (!running || !webgl || !scene || !camera || !pivot) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      if (!reduced && !dragging) yaw += dt * 0.55;
      pivot.rotation.y = yaw;
      actor?.update(dt);
      webgl.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();
  };

  const load = (id: SkinId) => {
    const skin = PLAYER_SKINS[id];
    const myGen = ++gen;
    shown = id;
    if (caption) caption.textContent = labelFor(id);
    canvas.setAttribute("aria-label", `${labelFor(id)} 3B önizleme`);
    actor = null;
    if (pivot) {
      while (pivot.children.length > 0) pivot.remove(pivot.children[0]);
    }
    void createHumanoidActor(skin.meshRig, {
      heightMeters: SAILOR.height,
      expectedBytes: skin.meshRigBytes,
      clipFade: 0,
      mattePrint: skin.mattePrint,
    })
      .then((a) => {
        if (myGen !== gen || !pivot) return;
        actor = a;
        a.play("idle", 0);
        a.scene.rotation.y = SAILOR.meshFacing;
        pivot.add(a.scene);
      })
      .catch((err) => {
        console.warn("[skin-preview] GLB failed", id, err);
      });
  };

  return {
    show(id: SkinId) {
      if (!running) boot();
      if (shown === id && actor) return;
      load(id);
    },
    stop,
  };
}
