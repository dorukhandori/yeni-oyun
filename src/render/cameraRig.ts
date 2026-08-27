import * as THREE from "three";
import { CAMERA } from "../constants";

export class CameraRig {
  yaw: number = CAMERA.yawStart;
  pitch: number = CAMERA.pitchStart;
  /** Current boom length; wheel writes this, `desired()` reads it. */
  private zoomDist: number;
  private pos = new THREE.Vector3();
  private target = new THREE.Vector3();
  private shake = 0;
  private shakePhase = 0;

  constructor(
    private camera: THREE.PerspectiveCamera,
    /** Ground/sea height sampler used to keep the camera above the surface. */
    private groundAt: (x: number, z: number) => number,
    /** Rest boom. Phones pass `CAMERA.distTouch`; desktop uses `CAMERA.dist`. */
    private startDist: number = CAMERA.dist,
    /**
     * Optional lateral/vertical/depth collision clamp — mutates the desired
     * camera position in place to pull it back inside valid world bounds
     * (e.g. a cave's room envelope). Applied inside `desired()`, so it
     * covers both `update()` and `snap()`. Omitted by Lotus (open world,
     * no such constraint); Cyclops passes one to stop the boom camera from
     * swinging past a room's walls into unmodeled open air outside the cave.
     */
    private clampPos?: (pos: THREE.Vector3) => void,
  ) {
    this.zoomDist = startDist;
  }

  rotate(dx: number, dy: number): void {
    this.yaw -= dx;
    this.pitch = THREE.MathUtils.clamp(this.pitch + dy, CAMERA.pitchMin, CAMERA.pitchMax);
  }

  /** Mouse wheel / trackpad: scroll up zooms in (negative deltaY). */
  zoomBy(deltaY: number): void {
    if (deltaY === 0) return;
    this.zoomDist = THREE.MathUtils.clamp(
      this.zoomDist * Math.exp(deltaY * CAMERA.zoomSens),
      CAMERA.distMin,
      CAMERA.distMax,
    );
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

  /** Current boom length (rest or wheel-zoom). */
  currentDist(): number {
    return this.zoomDist;
  }

  snap(focus: THREE.Vector3): void {
    this.zoomDist = this.startDist;
    this.pos.copy(this.desired(focus));
    this.camera.position.copy(this.pos);
    this.target.copy(focus);
  }

  /**
   * `extraHeight`/`extraDist` bias the camera above and back from its usual
   * spot without moving the look target — used to keep a nearby harvest
   * target visible past the character's body (playtest bug: "toplarken
   * karakter çiçeği kapatıyor").
   */
  private desired(
    focus: THREE.Vector3,
    out = new THREE.Vector3(),
    extraHeight = 0,
    extraDist = 0,
  ): THREE.Vector3 {
    const dir = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const boom = this.zoomDist;
    const height = CAMERA.height * (boom / CAMERA.dist);
    out.copy(focus).addScaledVector(dir, boom + extraDist);
    out.y = focus.y + height + extraHeight + this.pitch * 3.2;
    const floor = Math.max(0, this.groundAt(out.x, out.z)) + CAMERA.minClearance;
    if (out.y < floor) out.y = floor;
    this.clampPos?.(out);
    return out;
  }

  update(focus: THREE.Vector3, dt: number, extraHeight = 0, extraDist = 0): void {
    const want = this.desired(focus, undefined, extraHeight, extraDist);
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
