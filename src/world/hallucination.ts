import * as THREE from "three";
import { HALLUCINATION, PALETTE } from "../constants";
import { heightAt, islandRadiusAt } from "./terrain";
import { mulberry32 } from "./rng";
import { glowSprite, hallucinationSprite } from "./sprite";

/**
 * Lotus Adası — sanrı figürleri (hallucination creatures).
 * `docs/design/gdd-lotus-hallucination.md`, sabitler `constants.ts`'te
 * `HALLUCINATION` (tuning.md §13'ten taşındı). Yalnızca Lotus Adası'nda
 * kullanılır; Kiklop/Sirenler bu modülü hiç import etmez.
 *
 * "Düşman değil, unutuşun bir belirtisi" ilkesi (gdd §1): temas yalnızca
 * (a) tek seferlik unutuş sıçraması ve (b) geçici yürüyüş-sapması şiddetini
 * tetikler — ikisi de `game.ts`'te, bu modül yalnızca *ne zaman* bir temas
 * olduğunu bildirir. Envanter/hız burada asla değişmez.
 */

type FigurePhase = "gone" | "fadeIn" | "linger" | "fadeOut";

interface FigureSlot {
  root: THREE.Group;
  sprite: THREE.Sprite;
  halo: THREE.Sprite;
  spriteMat: THREE.SpriteMaterial;
  haloMat: THREE.SpriteMaterial;
  phase: FigurePhase;
  /** Elapsed seconds within the current phase. */
  timer: number;
  /** Spawn anchor — the figure gently wanders around this while lingering. */
  basePos: THREE.Vector3;
  wanderPhase: number;
  /** Seconds left in "gone" before it may spawn again (only while system active). */
  respawnTimer: number;
}

export interface Hallucinations {
  group: THREE.Group;
  /**
   * Advances the spawn/fade/wander lifecycle for one tick and checks player
   * contact. `memory` is the engine's internal 0-1 float. Returns the world
   * position of a contact this frame, or `null`.
   */
  update(
    dt: number,
    t: number,
    memory: number,
    playerPos: THREE.Vector3,
    shipAnchor: THREE.Vector3,
  ): THREE.Vector3 | null;
  reset(): void;
}

function opacityFor(phase: FigurePhase, timer: number): number {
  switch (phase) {
    case "gone":
      return 0;
    case "fadeIn":
      return Math.min(1, timer / HALLUCINATION.fadeTime);
    case "linger":
      return 1;
    case "fadeOut":
      return Math.max(0, 1 - timer / HALLUCINATION.fadeTime);
  }
}

export function buildHallucinations(): Hallucinations {
  const group = new THREE.Group();

  let rand = mulberry32(HALLUCINATION.seed);
  let systemActive = false;
  let contactCooldown = 0;

  const figureTex = hallucinationSprite();
  const figureAspect = 96 / 160;

  const slots: FigureSlot[] = [];
  for (let i = 0; i < HALLUCINATION.creatureCount; i++) {
    const root = new THREE.Group();
    root.visible = false;

    const haloMat = new THREE.SpriteMaterial({
      map: glowSprite(),
      color: PALETTE.hallucination,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(1.6);
    halo.position.y = 1.0;
    root.add(halo);

    const spriteMat = new THREE.SpriteMaterial({
      map: figureTex,
      color: PALETTE.hallucination,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.center.set(0.5, 0.0);
    sprite.scale.set(1.6 * figureAspect, 2.0, 1);
    root.add(sprite);

    group.add(root);
    slots.push({
      root,
      sprite,
      halo,
      spriteMat,
      haloMat,
      phase: "gone",
      timer: 0,
      basePos: new THREE.Vector3(),
      wanderPhase: rand() * Math.PI * 2,
      respawnTimer: rand() * HALLUCINATION.respawnGap,
    });
  }

  /** Deterministic route-biased spawn point (gdd §3.3), clamped to the island. */
  function pickSpawnPos(playerPos: THREE.Vector3, shipAnchor: THREE.Vector3): THREE.Vector3 {
    const segX = shipAnchor.x - playerPos.x;
    const segZ = shipAnchor.z - playerPos.z;
    for (let attempt = 0; attempt < 6; attempt++) {
      const u = 0.15 + rand() * 0.55;
      let px = playerPos.x + segX * u;
      let pz = playerPos.z + segZ * u;
      const angle = rand() * Math.PI * 2;
      const r = rand() * HALLUCINATION.routeBiasRadius;
      px += Math.cos(angle) * r;
      pz += Math.sin(angle) * r;

      const fromCenter = Math.hypot(px, pz);
      const coast = islandRadiusAt(px, pz) - 3;
      if (fromCenter > coast && coast > 0) {
        const s = coast / fromCenter;
        px *= s;
        pz *= s;
      }

      const okPlayer = Math.hypot(px - playerPos.x, pz - playerPos.z) >= HALLUCINATION.minSpawnDistFromPlayer;
      const okShip = Math.hypot(px - shipAnchor.x, pz - shipAnchor.z) >= HALLUCINATION.minSpawnDistFromShip;
      if (okPlayer && okShip) return new THREE.Vector3(px, heightAt(px, pz), pz);
    }
    // Fallback: last attempt's position anyway (rare — keeps spawn deterministic-ish, never throws).
    const px = playerPos.x + segX * 0.4;
    const pz = playerPos.z + segZ * 0.4;
    return new THREE.Vector3(px, heightAt(px, pz), pz);
  }

  return {
    group,
    update(dt, t, memory, playerPos, shipAnchor) {
      // Hysteresis reuses MEM_THRESHOLD_HYSTERESIS's role (gdd §4.1) — no
      // separate hallucination-specific hysteresis constant.
      if (systemActive) {
        if (memory < HALLUCINATION.threshold - HALLUCINATION.hysteresis) systemActive = false;
      } else if (memory >= HALLUCINATION.threshold) {
        systemActive = true;
      }

      if (contactCooldown > 0) contactCooldown = Math.max(0, contactCooldown - dt);
      let contactAt: THREE.Vector3 | null = null;

      for (const f of slots) {
        if (f.phase === "gone") {
          f.root.visible = false;
          if (systemActive) {
            f.respawnTimer -= dt;
            if (f.respawnTimer <= 0) {
              f.basePos.copy(pickSpawnPos(playerPos, shipAnchor));
              f.phase = "fadeIn";
              f.timer = 0;
            }
          }
          continue;
        }

        // System deactivated mid-lifecycle: fade out from wherever it is now,
        // don't wait for the natural linger timer (gdd §3.1 rule 1).
        if (!systemActive && f.phase !== "fadeOut") {
          const cur = opacityFor(f.phase, f.timer);
          f.phase = "fadeOut";
          f.timer = (1 - cur) * HALLUCINATION.fadeTime;
        }

        f.timer += dt;
        if (f.phase === "fadeIn" && f.timer >= HALLUCINATION.fadeTime) {
          f.phase = "linger";
          f.timer = 0;
        } else if (f.phase === "linger" && f.timer >= HALLUCINATION.linger) {
          f.phase = "fadeOut";
          f.timer = 0;
        } else if (f.phase === "fadeOut" && f.timer >= HALLUCINATION.fadeTime) {
          f.phase = "gone";
          f.timer = 0;
          f.respawnTimer = HALLUCINATION.respawnGap;
          f.root.visible = false;
          continue;
        }

        // Slow ghostly wander around the spawn anchor — visual only.
        f.wanderPhase += dt * HALLUCINATION.wanderSpeed;
        const wx = f.basePos.x + Math.cos(f.wanderPhase) * HALLUCINATION.wanderRadius;
        const wz = f.basePos.z + Math.sin(f.wanderPhase * 0.8) * HALLUCINATION.wanderRadius;
        const wy = heightAt(wx, wz);
        f.root.position.set(wx, wy, wz);
        f.root.visible = true;

        const op = opacityFor(f.phase, f.timer);
        f.spriteMat.opacity = op * 0.55;
        f.haloMat.opacity = op * 0.3 + Math.sin(t * 1.6 + f.wanderPhase) * 0.04 * op;

        if (contactAt === null && contactCooldown <= 0 && op > 0.15) {
          const d = Math.hypot(playerPos.x - wx, playerPos.z - wz);
          if (d < HALLUCINATION.contactRadius) {
            contactAt = new THREE.Vector3(wx, wy + 1.2, wz);
            contactCooldown = HALLUCINATION.contactCooldown;
            if (HALLUCINATION.vanishOnContact) {
              f.phase = "fadeOut";
              f.timer = (1 - op) * HALLUCINATION.fadeTime;
            }
          }
        }
      }

      return contactAt;
    },
    reset() {
      rand = mulberry32(HALLUCINATION.seed);
      systemActive = false;
      contactCooldown = 0;
      for (const f of slots) {
        f.phase = "gone";
        f.timer = 0;
        f.respawnTimer = rand() * HALLUCINATION.respawnGap;
        f.wanderPhase = rand() * Math.PI * 2;
        f.root.visible = false;
        f.spriteMat.opacity = 0;
        f.haloMat.opacity = 0;
      }
    },
  };
}
