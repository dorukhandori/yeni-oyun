import * as THREE from "three";
import { CELL, PALETTE } from "../constants";
import { cellToWorld } from "../farm/world";
import type { CaveMap, Cell, CropStage } from "../types";
import { glowSprite } from "./sprite";

interface PlotView {
  cell: Cell;
  cx: number;
  cz: number;
  slab: THREE.Mesh;
  ridges: THREE.Group;
  cropHolder: THREE.Group;
  rim: THREE.Sprite;
  stage: CropStage | null;
  wasTilled: boolean | null;
  wasWet: boolean | null;
}

export interface Plots {
  group: THREE.Group;
  sync(): void;
  setHighlight(cx: number, cz: number, on: boolean): void;
  update(t: number): void;
}

export function buildPlots(map: CaveMap): Plots {
  const group = new THREE.Group();

  const soilMat = new THREE.MeshStandardMaterial({
    color: PALETTE.soil,
    roughness: 0.98,
    flatShading: true,
  });
  const tilledMat = new THREE.MeshStandardMaterial({
    color: PALETTE.soilTilled,
    roughness: 0.95,
    flatShading: true,
  });
  const wetMat = new THREE.MeshStandardMaterial({
    color: PALETTE.soilWet,
    roughness: 0.42,
    metalness: 0.15,
    flatShading: true,
  });
  const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x664d33, roughness: 0.95 });
  // Soft glow dot marks an unworked plot; a wireframe ring read too UI-ish.
  const rimMat = new THREE.SpriteMaterial({
    map: glowSprite(),
    color: 0x4fe0c8,
    transparent: true,
    opacity: 0.3,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const slabGeo = new THREE.BoxGeometry(CELL * 0.94, 0.6, CELL * 0.94);
  const ridgeGeo = new THREE.BoxGeometry(CELL * 0.84, 0.09, CELL * 0.12);

  const views: PlotView[] = [];

  for (let cz = 0; cz < map.height; cz++) {
    for (let cx = 0; cx < map.width; cx++) {
      const cell = map.cells[cz][cx];
      if (!cell.farmable) continue;
      const { x, z } = cellToWorld(map, cx, cz);

      const slab = new THREE.Mesh(slabGeo, soilMat);
      slab.position.set(x, -0.3, z);
      slab.receiveShadow = true;
      group.add(slab);

      const ridges = new THREE.Group();
      ridges.position.set(x, 0.02, z);
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(ridgeGeo, ridgeMat);
        r.position.z = -CELL * 0.24 + i * CELL * 0.24;
        ridges.add(r);
      }
      ridges.visible = false;
      group.add(ridges);

      const rim = new THREE.Sprite(rimMat);
      rim.scale.setScalar(0.34);
      rim.position.set(x, 0.14, z);
      group.add(rim);

      const cropHolder = new THREE.Group();
      cropHolder.position.set(x, 0, z);
      group.add(cropHolder);

      views.push({
        cell,
        cx,
        cz,
        slab,
        ridges,
        cropHolder,
        rim,
        stage: null,
        wasTilled: null,
        wasWet: null,
      });
    }
  }

  // ------------------------------------------------------------- crop visuals
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4e7a4a, roughness: 0.8, flatShading: true });
  const leafMat = new THREE.MeshStandardMaterial({
    color: PALETTE.sprout,
    emissive: new THREE.Color(0x1f5a3a),
    emissiveIntensity: 0.5,
    roughness: 0.6,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xe8fff4,
    emissive: new THREE.Color(PALETTE.ripe),
    emissiveIntensity: 3.4,
    roughness: 0.35,
    flatShading: true,
  });
  const moundMat = new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 0.95, flatShading: true });

  function buildCropMesh(stage: CropStage): THREE.Object3D | null {
    if (stage === "none") return null;
    const g = new THREE.Group();

    if (stage === "seed") {
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 6), moundMat);
      mound.scale.set(1, 0.4, 1);
      mound.position.y = 0.04;
      g.add(mound);
      return g;
    }

    const height = stage === "sprout" ? 0.28 : stage === "grow" ? 0.62 : 0.72;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, height, 6), stemMat);
    stem.position.y = height / 2;
    g.add(stem);

    const leaves = stage === "sprout" ? 2 : 4;
    for (let i = 0; i < leaves; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 4), leafMat);
      const a = (i / leaves) * Math.PI * 2 + 0.4;
      leaf.position.set(Math.cos(a) * 0.13, height * (0.45 + (i % 2) * 0.2), Math.sin(a) * 0.13);
      leaf.rotation.set(Math.PI / 2.3, a, 0.4);
      leaf.scale.setScalar(stage === "sprout" ? 0.75 : 1.1);
      g.add(leaf);
    }

    if (stage === "ripe") {
      const bulb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), bulbMat);
      bulb.position.y = height + 0.1;
      bulb.name = "bulb";
      g.add(bulb);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.36, 10, 8),
        new THREE.MeshBasicMaterial({
          color: PALETTE.ripe,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      halo.position.y = height + 0.1;
      halo.name = "halo";
      g.add(halo);
    }
    return g;
  }

  // --------------------------------------------------------------- highlight
  const highlight = new THREE.Mesh(
    new THREE.RingGeometry(CELL * 0.36, CELL * 0.5, 4, 1),
    new THREE.MeshBasicMaterial({
      color: 0xffc46b,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  highlight.rotation.set(-Math.PI / 2, 0, Math.PI / 4);
  highlight.visible = false;
  group.add(highlight);

  const ripeBulbs: THREE.Object3D[] = [];

  function syncView(v: PlotView): void {
    const { cell } = v;
    const mat = cell.wet ? wetMat : cell.tilled ? tilledMat : soilMat;
    v.slab.material = mat;
    v.ridges.visible = cell.tilled;
    v.rim.visible = !cell.tilled && cell.crop === "none";

    if (v.stage !== cell.crop) {
      v.cropHolder.clear();
      const mesh = buildCropMesh(cell.crop);
      if (mesh) v.cropHolder.add(mesh);
      v.stage = cell.crop;
    }
    v.wasTilled = cell.tilled;
    v.wasWet = cell.wet;
  }

  for (const v of views) {
    syncView(v);
    v.cell.dirty = false;
  }

  return {
    group,
    sync() {
      ripeBulbs.length = 0;
      for (const v of views) {
        if (v.cell.dirty) {
          syncView(v);
          v.cell.dirty = false;
        }
        if (v.cell.crop === "ripe") {
          const b = v.cropHolder.getObjectByName("bulb");
          if (b) ripeBulbs.push(b);
        }
      }
    },
    setHighlight(cx: number, cz: number, on: boolean) {
      highlight.visible = on;
      if (!on) return;
      const { x, z } = cellToWorld(map, cx, cz);
      highlight.position.set(x, 0.09, z);
    },
    update(t: number) {
      const pulse = 0.55 + Math.sin(t * 4.2) * 0.3;
      (highlight.material as THREE.MeshBasicMaterial).opacity = pulse;
      highlight.scale.setScalar(1 + Math.sin(t * 4.2) * 0.04);
      rimMat.opacity = 0.2 + Math.sin(t * 1.7) * 0.07;
      for (let i = 0; i < ripeBulbs.length; i++) {
        const b = ripeBulbs[i];
        b.rotation.y = t * 0.8 + i;
        b.scale.setScalar(1 + Math.sin(t * 3 + i) * 0.08);
      }
    },
  };
}
