import * as THREE from "three";
import { CAMERA } from "../constants";
import { cellAt, worldToCell } from "../farm/world";
import type { CaveMap } from "../types";

export class CameraRig {
  yaw = CAMERA.yawStart;
  pitch: number = CAMERA.pitchStart;
  private pos = new THREE.Vector3();
  private target = new THREE.Vector3();
  private shake = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    private map: CaveMap,
  ) {}

  rotate(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy, CAMERA.pitchMin, CAMERA.pitchMax);
  }

  kick(amount: number): void {
    this.shake = Math.min(0.5, this.shake + amount);
  }

  /** Forward vector on the ground plane, used for camera-relative movement. */
  forward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(-1).normalize();
  }

  right(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  snap(focus: THREE.Vector3): void {
    this.pos.copy(this.desired(focus));
    this.camera.position.copy(this.pos);
  }

  private desired(focus: THREE.Vector3): THREE.Vector3 {
    const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    let dist = CAMERA.dist;
    const out = new THREE.Vector3();
    // Pull in only when the ideal position would sit inside the rock shell;
    // floating over water is fine and keeps the corridor framing wide.
    for (let i = 0; i < 8; i++) {
      out.copy(focus).addScaledVector(dir, dist);
      out.y = focus.y + CAMERA.height + this.pitch * 2.6;
      const c = worldToCell(this.map, out.x, out.z);
      const cell = cellAt(this.map, c.cx, c.cz);
      if ((cell && cell.ground !== "rock") || dist <= 2.6) break;
      dist -= 0.55;
    }
    return out;
  }

  update(focus: THREE.Vector3, dt: number): void {
    const want = this.desired(focus);
    const k = 1 - Math.pow(1 - CAMERA.lerp, dt * 60);
    this.pos.lerp(want, k);
    this.camera.position.copy(this.pos);

    this.shake *= 0.86;
    if (this.shake > 0.001) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake;
    }

    this.target.lerp(
      new THREE.Vector3(focus.x, focus.y + CAMERA.lookHeight - this.pitch * 1.1, focus.z),
      k * 1.4,
    );
    this.camera.lookAt(this.target);
  }
}
