import { MENU_PALETTE } from "./menuAssets";

interface Petal {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  alpha: number;
}

/** Animated Ege morning backdrop for menu screens. */
export class MenuBackdrop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private petals: Petal[] = [];
  private t = 0;
  private raf = 0;
  private running = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("menu canvas 2d unavailable");
    this.ctx = ctx;
    this.seedPetals(28);
    window.addEventListener("resize", this.resize);
    this.resize();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.t += 0.016;
      this.draw();
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener("resize", this.resize);
  }

  private resize = (): void => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * dpr);
    this.canvas.height = Math.floor(h * dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  private seedPetals(n: number): void {
    this.petals = [];
    for (let i = 0; i < n; i++) {
      this.petals.push({
        x: Math.random(),
        y: Math.random(),
        vx: 0.008 + Math.random() * 0.012,
        vy: 0.004 + Math.random() * 0.01,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.02,
        size: 4 + Math.random() * 8,
        alpha: 0.15 + Math.random() * 0.35,
      });
    }
  }

  private draw(): void {
    const { ctx } = this;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const t = this.t;

    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, MENU_PALETTE.sky);
    sky.addColorStop(0.45, "#c5dfe8");
    sky.addColorStop(1, MENU_PALETTE.seaDeep);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Sun haze
    const sunX = w * 0.78;
    const sunY = h * 0.22 + Math.sin(t * 0.4) * 6;
    const sunG = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, w * 0.35);
    sunG.addColorStop(0, "rgba(255, 244, 226, 0.55)");
    sunG.addColorStop(0.35, "rgba(255, 200, 160, 0.18)");
    sunG.addColorStop(1, "rgba(255, 200, 160, 0)");
    ctx.fillStyle = sunG;
    ctx.fillRect(0, 0, w, h);

    // Distant island
    ctx.fillStyle = "rgba(106, 127, 74, 0.35)";
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h * 0.52);
    ctx.quadraticCurveTo(w * 0.35, h * 0.38, w * 0.55, h * 0.5);
    ctx.quadraticCurveTo(w * 0.72, h * 0.58, w * 0.88, h * 0.48);
    ctx.lineTo(w * 0.88, h * 0.58);
    ctx.lineTo(w * 0.15, h * 0.58);
    ctx.closePath();
    ctx.fill();

    // Waves
    const baseY = h * 0.68;
    for (let layer = 0; layer < 3; layer++) {
      ctx.beginPath();
      const amp = 8 - layer * 2;
      const freq = 0.008 + layer * 0.002;
      const phase = t * (0.6 + layer * 0.15);
      ctx.moveTo(0, baseY + layer * 18);
      for (let x = 0; x <= w; x += 6) {
        const y = baseY + layer * 18 + Math.sin(x * freq + phase) * amp;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fillStyle =
        layer === 0
          ? "rgba(63, 200, 192, 0.45)"
          : layer === 1
            ? "rgba(31, 111, 168, 0.55)"
            : "rgba(20, 80, 127, 0.65)";
      ctx.fill();
    }

    // Foam line
    ctx.strokeStyle = "rgba(251, 247, 239, 0.45)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 8) {
      const y = baseY + Math.sin(x * 0.012 + t * 0.8) * 4;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Lotus petals drift
    for (const p of this.petals) {
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.rot += p.vr;
      if (p.x > 1.05) p.x = -0.05;
      if (p.y > 1.05) p.y = -0.05;
      this.drawPetal(p.x * w, p.y * h, p.size, p.rot, p.alpha);
    }
  }

  private drawPetal(x: number, y: number, size: number, rot: number, alpha: number): void {
    const { ctx } = this;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = MENU_PALETTE.lotusRipe;
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.55, size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
