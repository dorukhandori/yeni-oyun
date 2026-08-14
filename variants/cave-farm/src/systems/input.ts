export class Input {
  private held = new Set<string>();
  private pressed = new Set<string>();
  private mdx = 0;
  private mdy = 0;
  private dragging = false;
  private wheel = 0;
  locked = false;

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
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.wheel = e.deltaY > 0 ? 1 : -1;
      },
      { passive: false },
    );

    // Touch drag: rotate the camera.
    let lastTouch: { x: number; y: number } | null = null;
    canvas.addEventListener("touchstart", (e) => {
      const t = e.touches[0];
      lastTouch = { x: t.clientX, y: t.clientY };
    });
    canvas.addEventListener("touchmove", (e) => {
      const t = e.touches[0];
      if (lastTouch) {
        this.mdx += t.clientX - lastTouch.x;
        this.mdy += t.clientY - lastTouch.y;
      }
      lastTouch = { x: t.clientX, y: t.clientY };
    });
    canvas.addEventListener("touchend", () => (lastTouch = null));
  }

  endFrame(): void {
    this.pressed.clear();
    this.mdx = 0;
    this.mdy = 0;
    this.wheel = 0;
  }

  moveX(): number {
    return (this.held.has("KeyD") ? 1 : 0) - (this.held.has("KeyA") ? 1 : 0);
  }
  moveZ(): number {
    return (this.held.has("KeyW") ? 1 : 0) - (this.held.has("KeyS") ? 1 : 0);
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
    return this.pressed.has("KeyE") || this.pressed.has("Space");
  }
  get buy(): boolean {
    return this.pressed.has("KeyB");
  }
  toolSlot(): number | null {
    for (let i = 0; i < 4; i++) if (this.pressed.has(`Digit${i + 1}`)) return i;
    return null;
  }
  toolCycle(): number {
    if (this.pressed.has("Tab") || this.wheel > 0) return 1;
    if (this.wheel < 0) return -1;
    return 0;
  }
}
