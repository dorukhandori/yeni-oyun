import { TOOL_GLYPHS, TOOL_LABELS, TOOLS } from "../farm/crops";
import type { Inventory, ToolId } from "../types";

const HEART_SVG = `
<svg viewBox="0 0 24 24">
  <defs>
    <radialGradient id="hg" cx="34%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#ff8a97"/>
      <stop offset="45%" stop-color="#f0384a"/>
      <stop offset="100%" stop-color="#8e0f22"/>
    </radialGradient>
  </defs>
  <path fill="url(#hg)" stroke="#4a0a14" stroke-width="1.1"
    d="M12 21.2c-1-.7-8.4-5.2-9.8-10C1 7.4 3.4 4 7 4c2.1 0 3.8 1.1 5 2.8C13.2 5.1 14.9 4 17 4c3.6 0 6 3.4 4.8 7.2-1.4 4.8-8.8 9.3-9.8 10z"/>
  <ellipse cx="8.6" cy="8.6" rx="2.1" ry="1.5" fill="rgba(255,255,255,0.55)" transform="rotate(-25 8.6 8.6)"/>
</svg>`;

export class Hud {
  private hearts: HTMLElement;
  private tools: HTMLElement;
  private prompt: HTMLElement;
  private toast: HTMLElement;
  private hint: HTMLElement;
  private seedCount: HTMLElement;
  private cropCount: HTMLElement;
  private coinCount: HTMLElement;
  private slots: HTMLElement[] = [];
  private lastStamina = -1;
  private lastTool: ToolId | null = null;
  private toastTimer = 0;

  constructor() {
    this.hearts = must("hearts");
    this.tools = must("tools");
    this.prompt = must("prompt");
    this.toast = must("toast");
    this.hint = must("hint");
    this.seedCount = must("seedCount");
    this.cropCount = must("cropCount");
    this.coinCount = must("coinCount");

    for (let i = 0; i < 4; i++) {
      const wrap = document.createElement("div");
      wrap.innerHTML = HEART_SVG;
      this.hearts.appendChild(wrap.firstElementChild!);
    }

    TOOLS.forEach((tool, i) => {
      const el = document.createElement("div");
      el.className = "slot";
      el.innerHTML = `<span class="g">${TOOL_GLYPHS[tool]}</span><span class="n">${i + 1} ${TOOL_LABELS[tool]}</span>`;
      this.tools.appendChild(el);
      this.slots.push(el);
    });

    setTimeout(() => (this.hint.style.opacity = "0"), 9000);
  }

  setPrompt(text: string | null): void {
    if (text) {
      this.prompt.innerHTML = text;
      this.prompt.classList.add("on");
    } else {
      this.prompt.classList.remove("on");
    }
  }

  say(msg: string): void {
    this.toast.textContent = msg;
    this.toast.classList.add("on");
    this.toastTimer = 90;
  }

  update(inv: Inventory, tool: ToolId): void {
    if (inv.stamina !== this.lastStamina) {
      const kids = this.hearts.children;
      for (let i = 0; i < kids.length; i++) {
        kids[i].classList.toggle("empty", i >= inv.stamina);
      }
      this.lastStamina = inv.stamina;
    }
    if (tool !== this.lastTool) {
      const idx = TOOLS.indexOf(tool);
      this.slots.forEach((s, i) => s.classList.toggle("on", i === idx));
      this.lastTool = tool;
    }
    this.seedCount.textContent = String(inv.seeds);
    this.cropCount.textContent = String(inv.crops);
    this.coinCount.textContent = String(inv.coins);

    if (this.toastTimer > 0 && --this.toastTimer === 0) {
      this.toast.classList.remove("on");
    }
  }
}

function must(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`HUD element #${id} missing`);
  return el;
}
