import * as THREE from "three";
import { buildSea } from "../world/sea";
import { buildShip } from "../world/ship";

/** Live oyun dilimleri — GLB klip değil, runtime update(). */
export interface ScenePreview {
  group: THREE.Group;
  update(t: number, departing: number, camera: THREE.Camera, day01: number): void;
  frameTarget(): THREE.Object3D;
}

export function buildShipSeaPreview(): ScenePreview {
  const group = new THREE.Group();
  const sea = buildSea();
  const ship = buildShip();
  group.add(sea.group);
  group.add(ship.group);

  return {
    group,
    update(t, departing, camera, day01) {
      ship.update(t, departing);
      sea.update(t, ship.anchor, ship.heading(), camera.position, day01);
    },
    frameTarget() {
      return ship.group;
    },
  };
}
