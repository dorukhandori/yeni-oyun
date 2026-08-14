import * as THREE from "three";
import { CAMERA } from "../constants";

export class CameraRig {
  yaw: number = CAMERA.yawStart;
  pitch: number = CAMERA.pitchStart;
  private pos = new THREE.Vector3();
  private target = new THREE.Vector3();
  private shake = 0;
  private shakePhase = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    /** Ground/sea height sampler used to keep the camera above the surface. */
    private groundAt: (x: number, z: number) => number,
  ) {}

  rotate(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy, CAMERA.pitchMin, CAMERA.pitchMax);
  }

  kick(amount: number): void {
    this.shake = Math.min(0.85, this.shake + amount);
  }

  /** Ground-plane forward vector, for camera-relative movement. */
  forward(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.sin(this.yaw), 0, Math.cos(this.yaw)).multiplyScalar(-1).normalize();
  }

  right(out = new THREE.Vector3()): THREE.Vector3 {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
  }

  snap(focus: THREE.Vector3): void {
    this.pos.copy(this.desired(focus));
    this.camera.position.copy(this.pos);
    this.target.copy(focus);
  }

  private desired(focus: THREE.Vector3, out = new THREE.Vector3()): THREE.Vector3 {
    const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    out.copy(focus).addScaledVector(dir, CAMERA.dist);
    out.y = focus.y + CAMERA.height + this.pitch * 3.2;
    const floor = Math.max(0, this.groundAt(out.x, out.z)) + CAMERA.minClearance;
    if (out.y < floor) out.y = floor;
    return out;
  }

  update(focus: THREE.Vector3, dt: number): void {
    const want = this.desired(focus);
    const k = 1 - Math.pow(1 - CAMERA.lerp, dt * 60);
    this.pos.lerp(want, k);
    this.camera.position.copy(this.pos);

    // Decaying sinusoidal kick — reads as impact, not TV static.
    this.shake = Math.max(0, this.shake - CAMERA.shakeDecay * dt * this.shake);
    if (this.shake > 0.002) {
      this.shakePhase += dt * CAMERA.shakeHz * Math.PI * 2;
      const a = this.shake;
      this.camera.position.x += Math.sin(this.shakePhase) * a * 0.55;
      this.camera.position.y += Math.cos(this.shakePhase * 1.37) * a * 0.35;
      this.camera.position.z += Math.sin(this.shakePhase * 0.71 + 1.1) * a * 0.25;
    }

    this.target.lerp(
      new THREE.Vector3(focus.x, focus.y + CAMERA.lookHeight - this.pitch * 1.4, focus.z),
      Math.min(1, k * 1.4),
    );
    this.camera.lookAt(this.target);
  }
}
