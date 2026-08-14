import * as THREE from "three";
import { LAGOON, LOTUS, LOTUS_FX, LOTUS_PHYSICS, PALETTE, PUZZLE } from "../constants";
import type { LotusStage } from "../types";
import { springStep, type SpringState } from "../systems/spring";
import { assetUrl } from "../assets/paths";
import { heightAt, lagoonDist, lagoonRadiusAt } from "./terrain";
import { mulberry32 } from "./rng";
import { glowSprite, loadAlbedoTexture } from "./sprite";

type BloomStage = "bud" | "half" | "ripe" | "wilt";

export type LotusGate = "stones" | "hill" | null;

export interface LotusGateState {
  stonesOpen: boolean;
  hillOpen: boolean;
}

interface Plant {
  pos: THREE.Vector3;
  stage: LotusStage;
  timer: number;
  duration: number;
  group: THREE.Group;
  /** Billboard sprite carrying the generated lotus still per stage (ASSET-002, `art-bible.md` §8). */
  bloom: THREE.Sprite;
  halo: THREE.Sprite;
  phase: number;
  /** Collect punch scale residual. */
  pop: number;
  zone: string;
  gate: LotusGate;
  /** Vertical spring — pad riding the lagoon swell. */
  bob: SpringState;
  /** Roll spring — whole plant tilting with the same swell. */
  roll: SpringState;
}

export interface LotusField {
  group: THREE.Group;
  /** Advance growth; returns nothing. */
  update(dt: number, t: number): void;
  /** Nearest harvestable ripe plant within range, or null. */
  findRipe(x: number, z: number, gates: LotusGateState): number | null;
  /** Nearest gated ripe plant (blocked) for prompt feedback. */
  findGatedRipe(x: number, z: number, gates: LotusGateState): LotusGate | null;
  positionOf(index: number): THREE.Vector3;
  pick(index: number, gates: LotusGateState): boolean;
  ripeCount(): number;
  setHighlight(index: number | null): void;
  /** Reseed growth stages for a fresh run. */
  reset(): void;
}

const STAGE_ORDER: LotusStage[] = ["bud", "half", "ripe", "wilt", "gone"];

function baseDuration(stage: LotusStage): number {
  switch (stage) {
    case "bud":
      return LOTUS.budTime;
    case "half":
      return LOTUS.halfTime;
    case "ripe":
      return LOTUS.ripeTime;
    case "wilt":
      return LOTUS.wiltTime;
    case "gone":
      return LOTUS.goneTime;
  }
}

/**
 * Generated stage stills (ASSET-002, `docs/art/asset-registry.md`), cropped to
 * flower-only billboards in `art-source/work/` and shipped from
 * `public/assets/textures/` (`docs/art/pipeline.md` §6 naming). Aspect ratios
 * are the cropped pixel dimensions baked in at build time — no async layout
 * shift while the texture streams in.
 */
const STAGE_TEX: Record<BloomStage, { url: string; aspect: number }> = {
  bud: { url: "assets/textures/lotus_bud_01_albedo_512.png", aspect: 502 / 512 },
  half: { url: "assets/textures/lotus_half_02_albedo_512.png", aspect: 512 / 351 },
  ripe: { url: "assets/textures/lotus_bloom_03_albedo_512.png", aspect: 512 / 232 },
  wilt: { url: "assets/textures/lotus_wilt_04_albedo_512.png", aspect: 512 / 353 },
};

/** Lily pad billboard (ASSET-009), alpha-keyed and shipped as WebP. */
const LILYPAD_TEX_URL = "assets/textures/flora_lilypad_01_albedo_512.webp";

/** Per-stage billboard height (world units), anchor height above the pad, and texture. */
const LOOK: Record<LotusStage, { height: number; y: number; tex: BloomStage }> = {
  bud: { height: 0.32, y: 0.34, tex: "bud" },
  half: { height: 0.42, y: 0.48, tex: "half" },
  ripe: { height: 0.52, y: 0.6, tex: "ripe" },
  wilt: { height: 0.4, y: 0.4, tex: "wilt" },
  // Picked flowers pop and sink using the ripe silhouette but the wilt still —
  // mirrors the previous procedural version's material choice during the fade.
  gone: { height: 0.3, y: 0.3, tex: "wilt" },
};

export function buildLotusField(): LotusField {
  const group = new THREE.Group();
  const rand = mulberry32(77002);

  // Lily pad billboard (ASSET-009, alpha-keyed) laid flat on the water — the
  // texture's own silhouette (round leaf + notch) replaces the old wedge-cut
  // CircleGeometry, so the base geometry is now a plain flat quad.
  const padTex = loadAlbedoTexture(assetUrl(LILYPAD_TEX_URL));
  const padAspect = 547 / 643;
  const padMat = new THREE.MeshStandardMaterial({
    map: padTex,
    color: PALETTE.pad,
    roughness: 0.72,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
  });
  const padMatLight = new THREE.MeshStandardMaterial({
    map: padTex,
    color: PALETTE.padLight,
    roughness: 0.72,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
  });
  const stemMat = new THREE.MeshStandardMaterial({
    color: PALETTE.stem,
    roughness: 0.8,
    flatShading: true,
  });

  // One shared cutout material per stage texture; each plant clones its
  // current stage's material so sway/pulse animation can vary per-instance
  // without fighting over shared state (`LOTUS.count` is small — cloning is cheap).
  const stageMatTemplates: Record<BloomStage, THREE.SpriteMaterial> = {} as Record<
    BloomStage,
    THREE.SpriteMaterial
  >;
  for (const key of Object.keys(STAGE_TEX) as BloomStage[]) {
    stageMatTemplates[key] = new THREE.SpriteMaterial({
      map: loadAlbedoTexture(assetUrl(STAGE_TEX[key].url)),
      transparent: true,
      alphaTest: 0.35,
      depthWrite: true,
    });
  }

  const padGeo = new THREE.PlaneGeometry(padAspect, 1);
  padGeo.rotateX(-Math.PI / 2);
  const stemGeo = new THREE.CylinderGeometry(0.035, 0.05, 1, 6);

  const plants: Plant[] = [];
  const spots: Array<{ x: number; z: number; zone: string; indexInZone: number }> = [];

  // Three harvest pockets: reed shore (near ship), deep lagoon, north cove.
  for (const zone of LOTUS.zones) {
    let placed = 0;
    let guard = 0;
    while (placed < zone.count && guard++ < 2500) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * zone.radius;
      const x = zone.cx + Math.cos(a) * r;
      const z = zone.cz + Math.sin(a) * r;
      if (heightAt(x, z) > LAGOON.waterY - 0.05) continue;
      if (lagoonDist(x, z) > lagoonRadiusAt(x, z) - 0.6) continue;
      if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < zone.spacing)) continue;
      spots.push({ x, z, zone: zone.name, indexInZone: placed });
      placed++;
    }
  }

  // Zone counts are fixed data (test-profile scale); a world profile with a
  // smaller LOTUS.count (see constants.ts "real" profile) trims the surplus
  // rather than redesigning zone placement, which is out of scope here.
  if (spots.length > LOTUS.count) spots.length = LOTUS.count;

  // Top up if a zone undershot (terrain rejection).
  let guard = 0;
  while (spots.length < LOTUS.count && guard++ < 4000) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * (LAGOON.radius - 1.4);
    const x = LAGOON.center.x + Math.cos(a) * r;
    const z = LAGOON.center.z + Math.sin(a) * r;
    if (heightAt(x, z) > LAGOON.waterY - 0.08) continue;
    if (spots.some((s) => Math.hypot(s.x - x, s.z - z) < LOTUS.minSpacing)) continue;
    spots.push({ x, z, zone: "fallback", indexInZone: spots.length });
  }

  const coveCount = spots.filter((s) => s.zone === "cove").length;
  let coveGatedLeft = Math.ceil(coveCount * PUZZLE.coveGatedRatio);

  for (const s of spots) {
    let gate: LotusGate = null;
    if (s.zone === "deep" && s.indexInZone >= PUZZLE.deepGatedFromIndex) {
      gate = "stones";
    } else if (s.zone === "cove" && coveGatedLeft > 0) {
      gate = "hill";
      coveGatedLeft -= 1;
    }

    const g = new THREE.Group();
    g.position.set(s.x, LAGOON.waterY, s.z);
    g.rotation.y = rand() * Math.PI * 2;

    const padCount = 2 + Math.floor(rand() * 3);
    for (let p = 0; p < padCount; p++) {
      const pad = new THREE.Mesh(padGeo, rand() < 0.4 ? padMatLight : padMat);
      const pr = 0.45 + rand() * 0.45;
      pad.scale.set(pr, 1, pr);
      const pa = rand() * Math.PI * 2;
      const pd = 0.25 + rand() * 0.9;
      pad.position.set(Math.cos(pa) * pd, 0.015 + p * 0.004, Math.sin(pa) * pd);
      pad.rotation.y = rand() * Math.PI * 2;
      g.add(pad);
    }

    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.scale.y = 0.55;
    stem.position.y = 0.27;
    g.add(stem);

    const bloom = new THREE.Sprite(stageMatTemplates.bud.clone());
    bloom.center.set(0.5, 0.06); // near-bottom anchor: sprite grows up from the stem
    g.add(bloom);

    const halo = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowSprite(),
        color: PALETTE.petalRipeTint,
        transparent: true,
        opacity: 0.32,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    halo.scale.setScalar(1.1);
    halo.visible = false;
    g.add(halo);

    group.add(g);

    const stage: LotusStage = STAGE_ORDER[Math.floor(rand() * 4)];
    const plant: Plant = {
      pos: new THREE.Vector3(s.x, LAGOON.waterY, s.z),
      stage,
      timer: rand() * baseDuration(stage),
      duration: baseDuration(stage) * (1 + (rand() - 0.5) * LOTUS.timeJitter),
      group: g,
      bloom,
      halo,
      phase: rand() * 6.28,
      pop: 0,
      zone: s.zone,
      gate,
      bob: { value: 0, velocity: 0 },
      roll: { value: 0, velocity: 0 },
    };
    plants.push(plant);
    applyStage(plant);
  }

  function applyStage(p: Plant): void {
    const look = LOOK[p.stage];
    const tmpl = stageMatTemplates[look.tex];
    const current = p.bloom.material as THREE.SpriteMaterial;
    if (current.map !== tmpl.map) {
      current.dispose();
      p.bloom.material = tmpl.clone();
    }
    const aspect = STAGE_TEX[look.tex].aspect;
    p.bloom.scale.set(look.height * aspect, look.height, 1);
    p.bloom.position.y = look.y;
    p.bloom.visible = p.stage !== "gone";
    p.halo.visible = p.stage === "ripe";
  }

  function advance(p: Plant): void {
    const i = STAGE_ORDER.indexOf(p.stage);
    p.stage = STAGE_ORDER[(i + 1) % STAGE_ORDER.length];
    p.timer = 0;
    p.duration = baseDuration(p.stage) * (1 + (Math.random() - 0.5) * LOTUS.timeJitter);
    applyStage(p);
  }

  // -------------------------------------------------------------- highlight
  const highlight = new THREE.Mesh(
    new THREE.TorusGeometry(0.72, 0.055, 6, 26),
    new THREE.MeshBasicMaterial({
      color: 0xfff0b0,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    }),
  );
  highlight.rotation.x = -Math.PI / 2;
  highlight.visible = false;
  group.add(highlight);

  function gateOpen(p: Plant, gates: LotusGateState): boolean {
    if (!p.gate) return true;
    if (p.gate === "stones") return gates.stonesOpen;
    if (p.gate === "hill") return gates.hillOpen;
    return true;
  }

  function nearestRipe(
    x: number,
    z: number,
    gates: LotusGateState,
    blockedOnly: boolean,
  ): number | null {
    let best: number | null = null;
    let bestD: number = LOTUS.pickRange;
    for (let i = 0; i < plants.length; i++) {
      if (plants[i].stage !== "ripe") continue;
      const open = gateOpen(plants[i], gates);
      if (blockedOnly !== !open) continue;
      const d = Math.hypot(plants[i].pos.x - x, plants[i].pos.z - z);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  return {
    group,
    update(dt: number, t: number) {
      const ripeAspect = STAGE_TEX.ripe.aspect;
      for (const p of plants) {
        p.timer += dt;
        if (p.timer >= p.duration) advance(p);
        p.pop = Math.max(0, p.pop - dt * 4.5);
        const popScale = 1 + p.pop * 0.55;

        // Lagoon swell. A two-sine wave is the *target*; springs chase it so
        // each pad lags the water slightly instead of riding the sine exactly
        // — that lag is what makes a field of them read as floating.
        const wave =
          Math.sin(t * 1.15 + p.phase) * LOTUS_PHYSICS.bobWaveAmp +
          Math.sin(t * 2.35 + p.phase * 1.6) * LOTUS_PHYSICS.bobWaveAmp * 0.45;
        springStep(p.bob, wave, LOTUS_PHYSICS.bobStiffness, LOTUS_PHYSICS.bobDamping, dt);

        const rollTarget = Math.sin(t * 0.85 + p.phase * 1.2) * LOTUS_PHYSICS.rollWaveAmp;
        springStep(p.roll, rollTarget, LOTUS_PHYSICS.rollStiffness, LOTUS_PHYSICS.rollDamping, dt);
        // Roll tilts the whole plant (pads + stem). The bloom is a billboard
        // sprite, so it only translates with the tilt — it never shears.
        p.group.rotation.z = p.roll.value;

        const look = LOOK[p.stage];
        const baseY = look.y + p.bob.value;
        const bloomMat = p.bloom.material as THREE.SpriteMaterial;
        p.bloom.position.y = baseY;
        p.halo.position.y = baseY;

        if (p.stage === "ripe") {
          p.bloom.position.y = baseY + Math.sin(t * 1.6 + p.phase) * 0.035;
          bloomMat.rotation = Math.sin(t * 0.5 + p.phase) * LOTUS_PHYSICS.swayAmp;
          const h = LOOK.ripe.height * popScale;
          p.bloom.scale.set(h * ripeAspect, h, 1);
          // Ripe is the only harvestable stage — deliberately the brightest,
          // most animated one so it reads at a glance against bud/half/wilt
          // (playtest bug: "lotus aşaması okunmuyor").
          bloomMat.color.setScalar(
            1 + Math.sin(t * 2.4 + p.phase) * LOTUS_FX.ripeBloomBrightPulse + 0.05,
          );
          p.halo.scale.setScalar(
            LOTUS_FX.ripeHaloBaseScale +
              Math.sin(t * 3 + p.phase) * LOTUS_FX.ripeHaloPulseScale +
              p.pop * 0.8,
          );
          (p.halo.material as THREE.SpriteMaterial).opacity =
            LOTUS_FX.ripeHaloBaseOpacity + Math.sin(t * 2.4 + p.phase) * LOTUS_FX.ripeHaloPulseOpacity;
        } else if (p.stage === "half" || p.stage === "bud") {
          bloomMat.rotation = Math.sin(t * 0.4 + p.phase) * LOTUS_PHYSICS.swayAmp * 0.8;
          const h = look.height * popScale;
          p.bloom.scale.set(h * STAGE_TEX[look.tex].aspect, h, 1);
        } else if (p.stage === "gone") {
          if (p.pop > 0.01) {
            p.bloom.visible = true;
            const h = LOOK.ripe.height * (0.4 + p.pop) * popScale;
            p.bloom.scale.set(h * ripeAspect, h, 1);
            p.halo.visible = true;
            (p.halo.material as THREE.SpriteMaterial).opacity = p.pop * 0.6;
          } else {
            p.bloom.visible = false;
            p.halo.visible = false;
          }
        }
      }
      // Never dips too low — the ring is the player's only cue for "this is
      // the flower you can reach right now" (playtest bug: highlight felt
      // unreliable).
      (highlight.material as THREE.MeshBasicMaterial).opacity =
        LOTUS_FX.highlightBaseOpacity + Math.sin(t * 5) * LOTUS_FX.highlightPulseOpacity;
      highlight.scale.setScalar(
        LOTUS_FX.highlightBaseScale + Math.sin(t * 5) * LOTUS_FX.highlightPulseScale,
      );
    },
    findRipe(x, z, gates) {
      return nearestRipe(x, z, gates, false);
    },
    findGatedRipe(x, z, gates) {
      const i = nearestRipe(x, z, gates, true);
      return i === null ? null : plants[i].gate;
    },
    positionOf(index: number) {
      return plants[index].pos;
    },
    pick(index, gates) {
      const p = plants[index];
      if (p.stage !== "ripe") return false;
      if (!gateOpen(p, gates)) return false;
      p.stage = "gone";
      p.timer = 0;
      p.duration = LOTUS.goneTime * (1 + (Math.random() - 0.5) * LOTUS.timeJitter);
      p.pop = 1;
      applyStage(p);
      // Keep halo for the pop flash; update() fades it out.
      p.halo.visible = true;
      p.bloom.visible = true;
      return true;
    },
    ripeCount() {
      return plants.reduce((n, p) => n + (p.stage === "ripe" ? 1 : 0), 0);
    },
    setHighlight(index: number | null) {
      if (index === null) {
        highlight.visible = false;
        return;
      }
      const p = plants[index];
      highlight.visible = true;
      highlight.position.set(p.pos.x, LAGOON.waterY + 0.06, p.pos.z);
    },
    reset() {
      const re = mulberry32(77002);
      for (const p of plants) {
        p.stage = STAGE_ORDER[Math.floor(re() * 4)];
        p.timer = re() * baseDuration(p.stage);
        p.duration = baseDuration(p.stage) * (1 + (re() - 0.5) * LOTUS.timeJitter);
        p.pop = 0;
        p.bob.value = 0;
        p.bob.velocity = 0;
        p.roll.value = 0;
        p.roll.velocity = 0;
        p.group.rotation.z = 0;
        applyStage(p);
      }
      highlight.visible = false;
    },
  };
}
