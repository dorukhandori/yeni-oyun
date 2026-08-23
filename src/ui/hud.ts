import { DAY, FLOW, LOTUS, MEMORY, RUN_CLOCK, STEP, TIDE, WORLD } from "../constants";
import { formatRunTime } from "../format";
import type { GameState } from "../types";

type ToastItem = {
  msg: string;
  frames: number;
  kicker?: string;
  step?: [number, number];
};

export type ToastOpts = Pick<ToastItem, "kicker" | "step">;

const NOTES: Array<[number, string]> = [
  [0.2, "Aklın yerinde"],
  [0.45, "Tatlı bir ağırlık"],
  [0.68, "İthake bulanıyor"],
  [0.88, "Yolunu güç buluyorsun"],
  [1.01, "Her şey lotus kokuyor"],
];

export class Hud {
  private quest = must("quest");
  private questTitle = must("questTitle");
  private questDelivered = must("questDelivered");
  private questCarry = must("questCarry");
  private delivered = must("delivered");
  private target = must("target");
  private carried = must("carried");
  private cap = must("cap");
  private memory = must("memory");
  private memFill = must("memFill");
  private memNote = must("memNote");
  private prompt = must("prompt");
  private toast = must("toast");
  private toastMeta = must("toastMeta");
  private toastKicker = must("toastKicker");
  private toastPips = must("toastPips");
  private toastBody = must("toastBody");
  private toastHold = must("toastHold");
  private hint = must("hint");
  private card = must("card");
  private cardTitle = must("cardTitle");
  private cardBody = must("cardBody");
  private cardStats = must("cardStats");
  private cardVerdict = must("cardVerdict");
  private cardRestart = must("cardRestart") as HTMLButtonElement;
  private cardKey = must("cardKey");
  private pauseToggle = must("pauseToggle") as HTMLButtonElement;
  private pause = must("pause");
  private pauseResume = must("pauseResume") as HTMLButtonElement;
  private pauseRestart = must("pauseRestart") as HTMLButtonElement;
  private pauseHub = must("pauseHub") as HTMLButtonElement;
  private pauseTitle = must("pauseTitle") as HTMLButtonElement;
  private sun = must("sun");
  private sunArcFill = must("sunArcFill") as unknown as SVGGeometryElement;
  private sunDot = must("sunDot") as unknown as SVGCircleElement;
  private sunLabel = must("sunLabel");
  private runClock = must("runClock");
  private runClockValue = must("runClockValue");
  private tide = must("tide");
  private tideFill = must("tideFill");
  private toastTimer = 0;
  private toastHoldFrames = 1;
  private toastGap = 0;
  private toastQueue: ToastItem[] = [];
  private cardShown = false;
  private pauseShown = false;
  private onRestart: (() => void) | null = null;
  private onPauseToggle: (() => void) | null = null;
  private onPauseResume: (() => void) | null = null;
  private onPauseRestart: (() => void) | null = null;
  private onPauseHub: (() => void) | null = null;
  private onPauseTitle: (() => void) | null = null;
  private warnedDusk = false;
  /** Last string written to the clock — guards against a DOM write every frame. */
  private runClockText = "";
  private runClockOn = false;
  private tideOn = false;

  constructor(touch = false) {
    this.target.textContent = String(LOTUS.target);
    this.cap.textContent = String(LOTUS.carryCap);
    // "real" world profile: the forgetting scale is the screen itself
    // (haze/vignette), no numeric bar (gdd-memory-system.md §10, ux/hud.md).
    // Never touched again after this — see the WORLD.showMemoryBar guard
    // in update() below.
    if (!WORLD.showMemoryBar) this.memory.style.display = "none";
    if (touch) {
      this.hint.textContent =
        "Sol çubuk yürü · sağ sürükle kamera · Topla · köşe menü";
    }

    this.cardRestart.addEventListener("click", (e) => {
      e.preventDefault();
      this.onRestart?.();
    });

    const stop = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    this.pauseToggle.addEventListener("click", (e) => {
      stop(e);
      this.onPauseToggle?.();
    });
    this.pauseResume.addEventListener("click", (e) => {
      stop(e);
      this.onPauseResume?.();
    });
    this.pauseRestart.addEventListener("click", (e) => {
      stop(e);
      this.onPauseRestart?.();
    });
    this.pauseHub.addEventListener("click", (e) => {
      stop(e);
      this.onPauseHub?.();
    });
    this.pauseTitle.addEventListener("click", (e) => {
      stop(e);
      this.onPauseTitle?.();
    });
    this.pause.addEventListener("click", (e) => {
      if (e.target === this.pause) this.onPauseResume?.();
    });
  }

  setRestartHandler(fn: () => void): void {
    this.onRestart = fn;
  }

  setPauseHandlers(handlers: {
    onToggle: () => void;
    onResume: () => void;
    onRestart: () => void;
    onHub: () => void;
    onTitle: () => void;
  }): void {
    this.onPauseToggle = handlers.onToggle;
    this.onPauseResume = handlers.onResume;
    this.onPauseRestart = handlers.onRestart;
    this.onPauseHub = handlers.onHub;
    this.onPauseTitle = handlers.onTitle;
  }

  setMenuButton(on: boolean): void {
    this.pauseToggle.hidden = !on;
  }

  get pauseOpen(): boolean {
    return this.pauseShown;
  }

  openPause(): void {
    this.pauseShown = true;
    this.pause.hidden = false;
    this.pauseToggle.setAttribute("aria-expanded", "true");
    this.pauseToggle.setAttribute("aria-label", "Devam");
  }

  closePause(): void {
    this.pauseShown = false;
    this.pause.hidden = true;
    this.pauseToggle.setAttribute("aria-expanded", "false");
    this.pauseToggle.setAttribute("aria-label", "Menü");
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

  say(msg: string, seconds?: number, opts?: ToastOpts): void {
    const frames = Math.max(1, Math.round((seconds ?? FLOW.toastSeconds) * 60));
    const item: ToastItem = { msg, frames, kicker: opts?.kicker, step: opts?.step };
    if (this.toastTimer > 0 || this.toastGap > 0 || this.toastQueue.length > 0) {
      this.toastQueue.push(item);
      return;
    }
    this.showToast(item);
  }

  /** Drop queued opening/status lines when leaving the island. */
  clearToasts(): void {
    this.toastQueue.length = 0;
    this.toastTimer = 0;
    this.toastGap = 0;
    this.toastHoldFrames = 1;
    this.toast.classList.remove("on", "story");
    this.toast.style.opacity = "";
    this.toastBody.textContent = "";
    this.toastKicker.textContent = "";
    this.toastMeta.hidden = true;
    this.toastPips.hidden = true;
    this.toastPips.replaceChildren();
    this.toastHold.style.transform = "scaleX(0)";
  }

  private showToast(item: ToastItem): void {
    const story = Boolean(item.kicker) || item.frames >= Math.round(FLOW.storyToastSeconds * 60);
    this.toastBody.textContent = item.msg;
    this.toastKicker.textContent = item.kicker ?? "";
    const hasStep = Boolean(item.step);
    this.toastMeta.hidden = !item.kicker && !hasStep;
    this.toastPips.hidden = !hasStep;
    this.toastPips.replaceChildren();
    if (item.step) {
      const [cur, total] = item.step;
      for (let i = 1; i <= total; i++) {
        const pip = document.createElement("span");
        pip.className = i === cur ? "toast-pip is-current" : "toast-pip";
        this.toastPips.append(pip);
      }
    }
    this.toast.classList.toggle("story", story);
    this.toastHoldFrames = item.frames;
    this.toastHold.style.transform = "scaleX(1)";
    this.toast.style.opacity = "";
    this.toast.classList.add("on");
    this.toastTimer = item.frames;
  }

  showCard(
    kind: "won" | "lost" | "dusk" | "gameover",
    title: string,
    body: string,
    opts?: { restart?: boolean; key?: string; stats?: string[]; verdict?: string },
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
    this.fillAccount(opts?.stats ?? [], opts?.verdict ?? "");
    this.cardRestart.classList.toggle("hidden", !allowRestart);
    this.cardKey.classList.toggle("hidden", !allowRestart);
    this.cardKey.textContent = opts?.key ?? "R · hub'a dön";
    this.card.classList.add("on");
  }

  hideCard(): void {
    this.cardShown = false;
    this.card.classList.remove("on", "lost");
    this.fillAccount([], "");
  }

  /** K35 win-card ledger. Empty on classic / lose so the extra rows take no layout. */
  private fillAccount(stats: string[], verdict: string): void {
    this.cardStats.replaceChildren();
    if (stats.length > 0) {
      for (const line of stats) {
        const li = document.createElement("li");
        li.textContent = line;
        this.cardStats.append(li);
      }
      this.cardStats.hidden = false;
    } else {
      this.cardStats.hidden = true;
    }
    this.cardVerdict.textContent = verdict;
    this.cardVerdict.hidden = verdict.length === 0;
  }

  /**
   * Explicit clear for the leaving-the-world paths (goHub / goTitle). update()
   * hides the clock on its own for every in-world phase change, but Title and
   * Hub freeze the world — step() early-returns there, so update() never runs
   * and the last value would stay frozen on screen behind the menus.
   */
  hideRunClock(): void {
    this.runClockOn = false;
    this.runClockText = "";
    this.runClock.hidden = true;
  }

  hideTide(): void {
    this.tideOn = false;
    this.tide.hidden = true;
    this.tide.classList.remove("is-caution", "is-risk");
    this.tideFill.style.transform = "scaleX(0)";
  }

  /**
   * K35 tide stave. `on` is false until the shore stones resolve, and always
   * false on the classic 12-lotus run. Fill maps ship distance; colour is
   * the three day-clock bands from art-bible.md §2 (gold / rose).
   */
  setTide(on: boolean, dist: number): void {
    if (on !== this.tideOn) {
      this.tideOn = on;
      this.tide.hidden = !on;
    }
    if (!on) {
      this.tide.classList.remove("is-caution", "is-risk");
      return;
    }
    const span = TIDE.maxRadius - TIDE.safeRadius;
    const fill =
      dist <= TIDE.safeRadius
        ? 0
        : Math.max(0, Math.min(1, (dist - TIDE.safeRadius) / span));
    this.tideFill.style.transform = `scaleX(${fill.toFixed(3)})`;
    this.tideFill.style.animationDuration = `${TIDE.pulsePeriod}s`;
    const risk = dist >= TIDE.cautionRadius;
    const caution = !risk && dist >= TIDE.safeRadius;
    this.tide.classList.toggle("is-caution", caution);
    this.tide.classList.toggle("is-risk", risk);
  }

  update(st: GameState, haze: number): void {
    this.target.textContent = String(LOTUS.target);
    this.delivered.textContent = String(st.delivered);
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

    // ------------------------------------------------------------- run clock
    // K35 only, and only while the clock is actually counting — the same two
    // phases game.ts ticks st.runSteps in (gdd-lotus-island-run.md §10.2), so
    // the number on screen can never disagree with the number submitted.
    // The classic 12-lotus run has no timer and never sees this element.
    const clockOn = WORLD.k35 && (st.phase === "play" || st.phase === "departing");
    if (clockOn !== this.runClockOn) {
      this.runClockOn = clockOn;
      this.runClock.hidden = !clockOn;
    }
    if (clockOn) {
      // formatRunTime truncates to centiseconds, so at 60 Hz this string only
      // actually changes every other frame or so — comparing before writing
      // keeps that from being a layout invalidation 60 times a second.
      const text = formatRunTime(st.runSteps * STEP);
      if (text !== this.runClockText) {
        this.runClockText = text;
        this.runClockValue.textContent = text;
      }
      this.runClock.style.opacity = String(Math.max(RUN_CLOCK.minOpacity, 0.18 + fade * 0.82));
    }

    // Delivered line stays as readable as the run clock (K-1 / A4). Basket
    // and title still sink with memory — only the banked count is exempt.
    const fog = 0.18 + fade * 0.82;
    const blur = Math.pow(1 - fade, 1.8) * 3.2;
    this.quest.style.opacity = "1";
    this.quest.style.filter = "none";
    this.questTitle.style.opacity = String(fog);
    this.questTitle.style.filter = "none";
    this.questCarry.style.opacity = String(fog);
    this.questCarry.style.filter = `blur(${blur}px)`;
    this.questDelivered.style.opacity = String(Math.max(RUN_CLOCK.minOpacity, fog));
    this.questDelivered.style.filter = "none";
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

    if (this.toast.classList.contains("on")) {
      this.toastHold.style.transform = `scaleX(${this.toastTimer / this.toastHoldFrames})`;
    }

    if (this.toastTimer > 0 && --this.toastTimer === 0) {
      this.toast.classList.remove("on", "story");
      this.toastHold.style.transform = "scaleX(0)";
      this.toastGap = Math.max(1, Math.round(FLOW.toastGapSeconds * 60));
    } else if (this.toastTimer <= 0 && this.toastGap > 0 && --this.toastGap === 0) {
      const next = this.toastQueue.shift();
      if (next) this.showToast(next);
    }
  }
}

export function must(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`HUD element #${id} missing`);
  return el;
}
