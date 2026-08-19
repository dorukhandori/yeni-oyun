/**
 * Title/Hub corner mute toggle. Same parchment chrome as `#fsToggle`
 * (`src/ui/fullscreen.ts`). The *control* is entry-screen only; the muted
 * flag itself lives on `GameAudio` and survives into play.
 */

import type { GameAudio } from "../systems/audio";

const BTN_ID = "muteToggle";

function syncToggle(btn: HTMLButtonElement, audio: GameAudio): void {
  const muted = audio.isMuted();
  btn.classList.toggle("is-muted", muted);
  btn.setAttribute("aria-pressed", muted ? "true" : "false");
  const label = muted ? "Sesi aç" : "Sesi kapat";
  btn.setAttribute("aria-label", label);
  btn.title = label;
}

export function mountMuteToggle(audio: GameAudio): void {
  if (document.getElementById(BTN_ID)) return;

  const btn = document.createElement("button");
  btn.id = BTN_ID;
  btn.type = "button";
  btn.className = "mute-toggle";
  btn.innerHTML = `
    <span class="mute-icon mute-icon-on" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 10v4h3l5 4V6L7 10H4z"/>
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9.2a3.6 3.6 0 0 1 0 5.6"/>
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M18.6 7a6.6 6.6 0 0 1 0 10"/>
      </svg>
    </span>
    <span class="mute-icon mute-icon-off" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="18" height="18">
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 10v4h3l5 4V6L7 10H4z"/>
        <path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M16 9l6 6M22 9l-6 6"/>
      </svg>
    </span>
  `;
  let fromPointer = false;
  const apply = (): void => {
    // Flag first so unlock() (idempotent) opens the bus already at 0 if muted.
    audio.toggleMute();
    audio.unlock();
    syncToggle(btn, audio);
  };
  // pointerdown (capture) runs before game.ts's window unlock listener, so a
  // first-gesture mute never opens the bus at masterGain for a frame.
  btn.addEventListener(
    "pointerdown",
    (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      fromPointer = true;
      apply();
    },
    { capture: true },
  );
  btn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    if (fromPointer) {
      fromPointer = false;
      return;
    }
    apply();
  });
  const host = document.getElementById("app") ?? document.body;
  host.appendChild(btn);
  syncToggle(btn, audio);
}

/** Show on Title/Hub only. Mute *state* is independent of this. */
export function syncMuteChrome(visible: boolean): void {
  const btn = document.getElementById(BTN_ID) as HTMLButtonElement | null;
  if (!btn) return;
  btn.hidden = !visible;
}
