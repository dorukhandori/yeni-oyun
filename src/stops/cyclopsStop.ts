import * as THREE from "three";
import type { TestHooks } from "../game";

/**
 * Cyclops Cave (2nd Odyssey stop) — entry seam.
 *
 * docs/production/implementation-spec-sprint1.md K3/K4, revised: the spec's
 * original plan ("wrap Lotus's 11 boot-time builder calls in a Stop
 * interface") undersold how entangled startGame() actually is — every local
 * (field, hill, ship, ...) is closure-captured and read throughout the
 * ~1500-line step() function, not just at boot. Safely extracting that is
 * real, multi-session work (K5+ territory: caveStage.ts, cyclopsCave.ts,
 * the door-cycle state machine), not something to rush under this session's
 * remaining budget — doing so carelessly risks breaking Lotus, which A3's
 * whole point was to avoid.
 *
 * So this file is deliberately the SMALLEST possible seam: a self-contained
 * renderer/scene/camera, not a reuse of render/stage.ts's createStage()
 * (which bakes in the sky sphere, sun disk, and cloud system — explicitly
 * documented as Lotus-only weight the cave shouldn't carry, per
 * cyclops-cave-production-plan.md's "mağara gökyüzü/bulut/güneş/deniz
 * yüklemediği için Lotus'tan daha hafif koşmalı"). No world content yet —
 * K6 (cave shell mesh) and later steps fill this in incrementally, always
 * behind this same, already-safe branch point.
 *
 * game.ts's startGame() calls this instead of the Lotus boot path when
 * ACTIVE_STOP === "cyclops" (src/constants.ts, K1) — zero Lotus code moved
 * or touched to make that branch exist.
 */
export function startCyclopsStop(canvas: HTMLCanvasElement): TestHooks | null {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  // Cool, dark placeholder — not a design decision, just "not a blank crash
  // screen" until K5's real caveStage.ts lighting lands.
  scene.background = new THREE.Color(0x1a222c);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 1.6, 4);
  camera.lookAt(0, 1.4, 0);

  const ambient = new THREE.AmbientLight(0x8899aa, 0.6);
  scene.add(ambient);

  function onResize(): void {
    const w = window.innerWidth;
    const h = window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  function tick(): void {
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // Same dismissal the Lotus boot path uses (game.ts) — without it #loading
  // (index.html) sits over the canvas forever.
  document.getElementById("loading")?.classList.add("gone");

  // No DEV test-hook surface yet — nothing here is deterministic/scriptable
  // enough for scripts/asset-qa/ to drive. Added when K7+ gives it real state.
  return null;
}
