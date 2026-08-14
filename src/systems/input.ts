/** Keyboard + mouse + touch (virtual stick / look drag / action). */
export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private mdx = 0;
  private mdy = 0;
  private dragging = false;
  private stickX = 0;
  private stickZ = 0;
  private tapInteract = false;
  locked = false;
  touchActive = false;

  attach(canvas: HTMLCanvasElement): void {
    const blocked = ["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Tab"];

    window.addEventListener("keydown", (e) => {
      if (!this.held.has(e.code)) this.pressed.add(e.code);
      this.held.add(e.code);
      if (blocked.includes(e.code)) e.preventDefault();
    });
    window.addEventListener("keyup", (e) => this.held.delete(e.code));
    window.addEventListener("blur", () => this.held.clear());

    canvas.addEventListener("mousedown", () => {
      this.dragging = true;
      if (!this.locked) canvas.requestPointerLock?.();
    });
    window.addEventListener("mouseup", () => (this.dragging = false));
    window.addEventListener("mousemove", (e) => {
      if (!this.locked && !this.dragging) return;
      this.mdx += e.movementX || 0;
      this.mdy += e.movementY || 0;
    });
    document.addEventListener("pointerlockchange", () => {
      this.locked = document.pointerLockElement === canvas;
    });

    this.bindTouchUi(canvas);
  }

  private bindTouchUi(canvas: HTMLCanvasElement): void {
    const touchRoot = document.getElementById("touch");
    const stick = document.getElementById("stick");
    const knob = document.getElementById("knob");
    const btnAct = document.getElementById("btnAct");
    const lookPad = document.getElementById("lookPad");

    const coarse =
      typeof window.matchMedia === "function" &&
      (window.matchMedia("(pointer: coarse)").matches ||
        window.matchMedia("(hover: none)").matches);
    if (coarse) {
      this.touchActive = true;
      touchRoot?.classList.add("on");
    }

    const setKnob = (nx: number, ny: number) => {
      if (!knob || !stick) return;
      const r = stick.clientWidth * 0.5;
      knob.style.transform = `translate(${nx * r * 0.55}px, ${ny * r * 0.55}px)`;
    };

    // Virtual stick — left pad.
    if (stick) {
      let stickId: number | null = null;
      const readStick = (clientX: number, clientY: number) => {
        const rect = stick.getBoundingClientRect();
        const cx = rect.left + rect.width * 0.5;
        const cy = rect.top + rect.height * 0.5;
        let dx = (clientX - cx) / (rect.width * 0.5);
        let dy = (clientY - cy) / (rect.height * 0.5);
        const len = Math.hypot(dx, dy);
        if (len > 1) {
          dx /= len;
          dy /= len;
        }
        this.stickX = dx;
        this.stickZ = -dy;
        setKnob(dx, dy);
      };
      const clearStick = () => {
        this.stickX = 0;
        this.stickZ = 0;
        stickId = null;
        setKnob(0, 0);
      };

      stick.addEventListener(
        "pointerdown",
        (e) => {
          e.preventDefault();
          stick.setPointerCapture(e.pointerId);
          stickId = e.pointerId;
          readStick(e.clientX, e.clientY);
        },
        { passive: false },
      );
      stick.addEventListener(
        "pointermove",
        (e) => {
          if (stickId !== e.pointerId) return;
          e.preventDefault();
          readStick(e.clientX, e.clientY);
        },
        { passive: false },
      );
      const endStick = (e: PointerEvent) => {
        if (stickId !== e.pointerId) return;
        clearStick();
      };
      stick.addEventListener("pointerup", endStick);
      stick.addEventListener("pointercancel", endStick);
    }

    // Action button — tap to pick / deliver.
    btnAct?.addEventListener(
      "pointerdown",
      (e) => {
        e.preventDefault();
        this.tapInteract = true;
        btnAct.classList.add("lit");
      },
      { passive: false },
    );
    btnAct?.addEventListener("pointerup", () => btnAct.classList.remove("lit"));
    btnAct?.addEventListener("pointercancel", () => btnAct.classList.remove("lit"));

    // Look pad (right) + canvas fallback drag.
    const lookTarget = lookPad ?? canvas;
    let lookId: number | null = null;
    let lastX = 0;
    let lastY = 0;

    lookTarget.addEventListener(
      "pointerdown",
      (e) => {
        if (e.pointerType === "mouse") return;
        // Ignore if this started on a control.
        const t = e.target as HTMLElement;
        if (t.closest?.("#stick, #btnAct")) return;
        lookId = e.pointerId;
        lastX = e.clientX;
        lastY = e.clientY;
        lookTarget.setPointerCapture?.(e.pointerId);
      },
      { passive: true },
    );
    lookTarget.addEventListener(
      "pointermove",
      (e) => {
        if (lookId !== e.pointerId) return;
        this.mdx += e.clientX - lastX;
        this.mdy += e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
      },
      { passive: true },
    );
    const endLook = (e: PointerEvent) => {
      if (lookId !== e.pointerId) return;
      lookId = null;
    };
    lookTarget.addEventListener("pointerup", endLook);
    lookTarget.addEventListener("pointercancel", endLook);

    // Double-tap canvas = interact (when no dedicated button hit).
    let lastTap = 0;
    canvas.addEventListener(
      "touchend",
      (e) => {
        if (e.changedTouches.length !== 1) return;
        const now = performance.now();
        if (now - lastTap < 280) this.tapInteract = true;
        lastTap = now;
      },
      { passive: true },
    );
  }

  endFrame(): void {
    this.pressed.clear();
    this.mdx = 0;
    this.mdy = 0;
    this.tapInteract = false;
  }

  moveX(): number {
    const k = (this.held.has("KeyD") ? 1 : 0) - (this.held.has("KeyA") ? 1 : 0);
    return clamp(k + this.stickX, -1, 1);
  }
  moveZ(): number {
    const k = (this.held.has("KeyW") ? 1 : 0) - (this.held.has("KeyS") ? 1 : 0);
    return clamp(k + this.stickZ, -1, 1);
  }
  mouseDelta(): { x: number; y: number } {
    return { x: this.mdx, y: this.mdy };
  }
  yawKeys(): number {
    return (this.held.has("ArrowLeft") ? -1 : 0) + (this.held.has("ArrowRight") ? 1 : 0);
  }
  pitchKeys(): number {
    return (this.held.has("ArrowUp") ? -1 : 0) + (this.held.has("ArrowDown") ? 1 : 0);
  }
  get interact(): boolean {
    return this.pressed.has("KeyE") || this.pressed.has("Space") || this.tapInteract;
  }
  get wantsRestart(): boolean {
    return this.pressed.has("KeyR");
  }
}

function clamp(v: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, v));
}
