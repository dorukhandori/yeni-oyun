import { DAY, LOTUS, MEMORY, WORLD } from "../constants";
import type { GameState } from "../types";

const NOTES: Array<[number, string]> = [
  [0.2, "Aklın yerinde"],
  [0.45, "Tatlı bir ağırlık"],
  [0.68, "İthake bulanıyor"],
  [0.88, "Yolunu güç buluyorsun"],
  [1.01, "Her şey lotus kokuyor"],
];

export class Hud {
  private quest = must("quest");
  private delivered = must("delivered");
  private target = must("target");
  private carried = must("carried");
  private cap = must("cap");
  private memory = must("memory");
  private memFill = must("memFill");
  private memNote = must("memNote");
  private prompt = must("prompt");
  private toast = must("toast");
  private hint = must("hint");
  private card = must("card");
  private cardTitle = must("cardTitle");
  private cardBody = must("cardBody");
  private cardRestart = must("cardRestart") as HTMLButtonElement;
  private cardKey = must("cardKey");
  private sun = must("sun");
  private sunArcFill = must("sunArcFill") as unknown as SVGGeometryElement;
  private sunDot = must("sunDot") as unknown as SVGCircleElement;
  private sunLabel = must("sunLabel");
  private toastTimer = 0;
  private cardShown = false;
  private onRestart: (() => void) | null = null;
  private warnedDusk = false;

  constructor(touch = false) {
    this.target.textContent = WORLD.k35 ? "5" : String(LOTUS.target);
    this.cap.textContent = String(LOTUS.carryCap);
    // "real" world profile: the forgetting scale is the screen itself
    // (haze/vignette), no numeric bar (gdd-memory-system.md §10, ux/hud.md).
    // Never touched again after this — see the WORLD.showMemoryBar guard
    // in update() below.
    if (!WORLD.showMemoryBar) this.memory.style.display = "none";
    if (touch) {
      this.hint.textContent =
        "Sol çubuk yürü · sağ sürükle kamera · Topla düğmesi / çift dokunuş";
    }

    this.cardRestart.addEventListener("click", (e) => {
      e.preventDefault();
      this.onRestart?.();
    });
  }

  setRestartHandler(fn: () => void): void {
    this.onRestart = fn;
  }

  /**
   * Shows the control hint and fades it after 12s. Called when a stage
   * actually starts (not at boot) — with Title/Hub now sitting in front of
   * gameplay, a fixed from-boot timer would burn its 12s while the player is
   * still on the menus and hide the hint before they ever see the world.
   */
  startHintTimer(): void {
    this.hint.style.opacity = "1";
    window.setTimeout(() => (this.hint.style.opacity = "0"), 12000);
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
    this.toastTimer = 130;
  }

  showCard(
    kind: "won" | "lost" | "dusk" | "gameover",
    title: string,
    body: string,
    opts?: { restart?: boolean },
  ): void {
    const allowRestart = opts?.restart ?? (kind === "won" || kind === "dusk");
    if (this.cardShown) {
      this.cardRestart.classList.toggle("hidden", !allowRestart);
      this.cardKey.classList.toggle("hidden", !allowRestart);
      return;
    }
    this.cardShown = true;
    this.card.classList.toggle("lost", kind === "lost" || kind === "dusk" || kind === "gameover");
    this.cardTitle.textContent = title;
    this.cardBody.textContent = body;
    this.cardRestart.classList.toggle("hidden", !allowRestart);
    this.cardKey.classList.toggle("hidden", !allowRestart);
    this.card.classList.add("on");
  }

  hideCard(): void {
    this.cardShown = false;
    this.card.classList.remove("on");
  }

  update(st: GameState, haze: number): void {
    if (WORLD.k35) {
      this.delivered.textContent =
        st.delivered <= 0 ? "—" : st.delivered <= 2 ? "birkaç" : st.delivered <= 4 ? "yarısından çok" : "yeter";
    } else {
      this.delivered.textContent = String(st.delivered);
    }
    this.carried.textContent = String(st.carried);

    if (WORLD.showMemoryBar) {
      this.memFill.style.width = `${Math.round(st.memory * 100)}%`;
      for (const [limit, note] of NOTES) {
        if (st.memory < limit) {
          if (this.memNote.textContent !== note) this.memNote.textContent = note;
          break;
        }
      }
    }

    const fade = 1 - Math.min(1, st.memory / MEMORY.blindThreshold);
    this.quest.style.opacity = String(0.18 + fade * 0.82);
    this.quest.style.filter = `blur(${Math.pow(1 - fade, 1.8) * 3.2}px)`;
    this.prompt.style.opacity = this.prompt.classList.contains("on")
      ? String(0.25 + fade * 0.75)
      : "0";
    this.hint.style.filter = `blur(${haze * 2}px)`;

    const dayP = Math.min(1, st.dayTime / DAY.length);
    const remain = DAY.length - st.dayTime;
    // Arc pathLength=100: offset 0 = full day left visual at start… we drain the arc.
    this.sunArcFill.style.strokeDashoffset = String(dayP * 100);
    // Dot travels along the semicircle (approximate with parametric).
    const ang = Math.PI * (1 - dayP);
    const cx = 60 + Math.cos(ang) * 50;
    const cy = 48 - Math.sin(ang) * 50;
    this.sunDot.setAttribute("cx", cx.toFixed(1));
    this.sunDot.setAttribute("cy", cy.toFixed(1));

    const warn = remain <= DAY.warnRemaining && st.phase === "play";
    this.sun.classList.toggle("warn", warn);
    if (warn && !this.warnedDusk) {
      this.warnedDusk = true;
      this.say(WORLD.k35 ? "Işık gül rengine döndü." : "Güneş alçalıyor — son tur");
    }
    if (st.dayTime < 1) this.warnedDusk = false;

    let label = "Öğleden sonra";
    if (dayP > 0.85) label = "Alacakaranlık";
    else if (dayP > 0.55) label = "İkindi";
    else if (dayP > 0.25) label = "Öğle sonrası";
    if (this.sunLabel.textContent !== label) this.sunLabel.textContent = label;

    // Sun clock softens with memory too.
    this.sun.style.opacity = String(0.35 + fade * 0.65);

    if (this.toastTimer > 0 && --this.toastTimer === 0) {
      this.toast.classList.remove("on");
    }
  }
}

export function must(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`HUD element #${id} missing`);
  return el;
}
