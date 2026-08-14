/** Landscape-first mobile shell — lock when possible, gate portrait with overlay. */

const GATE_ID = "rotateGate";

export function mountOrientationGate(): void {
  if (document.getElementById(GATE_ID)) return;

  const gate = document.createElement("div");
  gate.id = GATE_ID;
  gate.className = "rotate-gate";
  gate.innerHTML = `
    <div class="rotate-gate-inner">
      <div class="rotate-icon" aria-hidden="true">↻</div>
      <p class="rotate-title">Telefonu yatay çevir</p>
      <p class="rotate-sub">Lotophagoi yatay ekran için tasarlandı.</p>
    </div>
  `;
  document.body.prepend(gate);
  syncOrientationGate();
  window.addEventListener("orientationchange", syncOrientationGate);
  window.matchMedia("(orientation: portrait)").addEventListener("change", syncOrientationGate);
}

function syncOrientationGate(): void {
  const gate = document.getElementById(GATE_ID);
  if (!gate) return;
  const coarse =
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches;
  const portrait = window.matchMedia("(orientation: portrait)").matches;
  gate.classList.toggle("on", coarse && portrait);
}

/** Call from a user gesture (button tap) — iOS may still ignore. */
export async function requestLandscapeLock(): Promise<void> {
  try {
    const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    await o.lock?.("landscape");
  } catch {
    /* Safari / embedded browsers often block — CSS gate is the fallback */
  }
}

export function isCoarsePointer(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(hover: none)").matches
  );
}
