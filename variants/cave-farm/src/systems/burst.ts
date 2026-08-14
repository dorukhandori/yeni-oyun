import * as THREE from "three";
import { glowSprite } from "../world/sprite";

const MAX = 220;

/** Additive spark pool for dig / water / harvest feedback. */
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
        size: 0.2,
        map: glowSprite(),
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    this.points.frustumCulled = false;
  }

  spawn(at: THREE.Vector3, color: THREE.ColorRepresentation, count = 16, spread = 2.4): void {
    const c = new THREE.Color(color);
    for (let n = 0; n < count; n++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % MAX;
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
      this.col[i * 3] = c.r;
      this.col[i * 3 + 1] = c.g;
      this.col[i * 3 + 2] = c.b;
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
      // Fade by dimming the vertex colour as the spark dies.
      const fade = 0.94 + 0.05 * Math.min(1, this.life[i] / this.max[i]);
      this.col[i * 3] *= fade;
      this.col[i * 3 + 1] *= fade;
      this.col[i * 3 + 2] *= fade;
      if (this.life[i] <= 0) this.pos[i * 3 + 1] = -50;
    }
    (this.points.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.points.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}
