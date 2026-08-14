import * as THREE from "three";
import { glowSprite } from "../world/sprite";

const MAX = 320;

/** Additive spark pool for harvest / dust / splash feedback. */
export class Bursts {
  points: THREE.Points;
  private pos: Float32Array;
  private col: Float32Array;
  private vel = new Float32Array(MAX * 3);
  private life = new Float32Array(MAX);
  private max = new Float32Array(MAX);
  private cursor = 0;

  constructor() {
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(this.col, 3));
    for (let i = 0; i < MAX; i++) this.pos[i * 3 + 1] = -50;
    this.points = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        size: 0.22,
        map: glowSprite(),
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      }),
    );
    this.points.frustumCulled = false;
  }

  spawn(at: THREE.Vector3, color: THREE.ColorRepresentation, count = 16, spread = 2.4): void {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.alloc();
      this.pos[i * 3] = at.x + (Math.random() - 0.5) * 0.3;
      this.pos[i * 3 + 1] = at.y + 0.1 + Math.random() * 0.2;
      this.pos[i * 3 + 2] = at.z + (Math.random() - 0.5) * 0.3;
      const a = Math.random() * Math.PI * 2;
      const s = (0.4 + Math.random()) * spread * 0.5;
      this.vel[i * 3] = Math.cos(a) * s;
      this.vel[i * 3 + 1] = 1.4 + Math.random() * 2.1;
      this.vel[i * 3 + 2] = Math.sin(a) * s;
      this.max[i] = 0.5 + Math.random() * 0.5;
      this.life[i] = this.max[i];
      this.paint(i, c);
    }
  }

  /** Collect pop: tight upward ring + glitter. */
  spawnPop(at: THREE.Vector3, color: THREE.ColorRepresentation, count = 28): void {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.alloc();
      const a = (n / count) * Math.PI * 2 + Math.random() * 0.2;
      const r = 0.15 + Math.random() * 0.25;
      this.pos[i * 3] = at.x + Math.cos(a) * r;
      this.pos[i * 3 + 1] = at.y + 0.2 + Math.random() * 0.15;
      this.pos[i * 3 + 2] = at.z + Math.sin(a) * r;
      this.vel[i * 3] = Math.cos(a) * (2.2 + Math.random() * 2.4);
      this.vel[i * 3 + 1] = 2.8 + Math.random() * 3.2;
      this.vel[i * 3 + 2] = Math.sin(a) * (2.2 + Math.random() * 2.4);
      this.max[i] = 0.35 + Math.random() * 0.35;
      this.life[i] = this.max[i];
      this.paint(i, c);
    }
  }

  /** Ground-plane dust / foam while running or wading. */
  spawnDust(
    at: THREE.Vector3,
    color: THREE.ColorRepresentation,
    count = 6,
    upward = 0.9,
  ): void {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.alloc();
      this.pos[i * 3] = at.x + (Math.random() - 0.5) * 0.45;
      this.pos[i * 3 + 1] = at.y + 0.04 + Math.random() * 0.08;
      this.pos[i * 3 + 2] = at.z + (Math.random() - 0.5) * 0.45;
      this.vel[i * 3] = (Math.random() - 0.5) * 1.4;
      this.vel[i * 3 + 1] = upward * (0.4 + Math.random() * 0.8);
      this.vel[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
      this.max[i] = 0.25 + Math.random() * 0.3;
      this.life[i] = this.max[i];
      this.paint(i, c);
    }
  }

  update(dt: number): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      this.vel[i * 3 + 1] -= 6.5 * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      const fade = 0.94 + 0.05 * Math.min(1, this.life[i] / this.max[i]);
      this.col[i * 3] *= fade;
      this.col[i * 3 + 1] *= fade;
      this.col[i * 3 + 2] *= fade;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -50;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private alloc(): number {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    return i;
  }

  private paint(i: number, c: THREE.Color): void {
    this.col[i * 3] = c.r;
    this.col[i * 3 + 1] = c.g;
    this.col[i * 3 + 2] = c.b;
  }
}
