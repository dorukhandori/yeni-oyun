import { must } from "./hud";
import { NET } from "../constants";
import { formatRunTime } from "../format";
import {
  fetchTop,
  isLeaderboardEnabled,
  loadSavedNick,
  nickRejectMessage,
  normalizeNick,
  saveNick,
  type LeaderboardEntry,
  type SubmitResult,
} from "../net/leaderboard";
import { loadSavedSkin, PLAYER_SKINS, saveSkin, type SkinId } from "../skins";
import "./skin.css";

export interface MenuHandlers {
  /** Title's "Oyna" — opens the Hub (island select), does not start play directly. */
  onPlay: () => void;
  /** Hub's Lotus Adası card — the anthology stop. */
  onSelectLotus: () => void;
  /**
   * Hub edge quest on Lotus ("Beş yeter") — same island, named satellite.
   *
   * Fires from the nick modal's "Başla" press, NOT from the map click, because
   * that press is now the guaranteed user gesture (see openNick below).
   */
  onSelectLotusEdge: (nick: string) => void;
  /** Hub's "Ana menü" — back to Title. */
  onHubMenu: () => void;
}

/** What the board shows about the run that was just submitted. */
export type SubmitStatus = { state: "pending" } | { state: "done"; result: SubmitResult };

type StatusTone = "info" | "wait" | "good" | "warn" | "bad";

/**
 * Status is conveyed by ICON + TEXT, never by colour alone (docs/ux/screens.md
 * §3.5 — the project's colour-blindness rule, and the Hub is where it matters
 * most). The colour is a redundant reinforcement, not the signal.
 */
const TONE_ICON: Record<StatusTone, string> = {
  info: "•",
  wait: "…",
  good: "✔",
  warn: "!",
  bad: "✕",
};

function setStatus(el: HTMLElement, tone: StatusTone, text: string): void {
  const icon = el.querySelector(".board-status-icon");
  const label = el.querySelector(".board-status-text");
  if (icon) icon.textContent = TONE_ICON[tone];
  if (label) label.textContent = text;
  el.dataset.tone = tone;
  el.hidden = false;
}

/** Inserts Görünüm buttons + modal. Not in index.html — parallel sessions own that file. */
function mountSkinChrome(): {
  btnTitle: HTMLButtonElement;
  btnHub: HTMLButtonElement;
  panel: HTMLElement;
  grid: HTMLElement;
  back: HTMLButtonElement;
} {
  const existing = document.getElementById("skinPanel");
  if (existing) {
    return {
      btnTitle: must("btnSkinTitle") as HTMLButtonElement,
      btnHub: must("btnSkinHub") as HTMLButtonElement,
      panel: existing,
      grid: must("skinGrid"),
      back: must("btnSkinBack") as HTMLButtonElement,
    };
  }

  const btnTitle = document.createElement("button");
  btnTitle.type = "button";
  btnTitle.className = "menu-btn";
  btnTitle.id = "btnSkinTitle";
  btnTitle.textContent = "Görünüm";
  const titleMenu = document.querySelector(".title-menu");
  const boardTitle = document.getElementById("btnBoardTitle");
  if (titleMenu && boardTitle) titleMenu.insertBefore(btnTitle, boardTitle);
  else titleMenu?.appendChild(btnTitle);

  const btnHub = document.createElement("button");
  btnHub.type = "button";
  btnHub.className = "menu-btn ghost";
  btnHub.id = "btnSkinHub";
  btnHub.textContent = "Görünüm";
  const hubActions = document.querySelector(".hub-actions");
  const boardHub = document.getElementById("btnBoard");
  if (hubActions && boardHub) hubActions.insertBefore(btnHub, boardHub);
  else hubActions?.appendChild(btnHub);

  const panel = document.createElement("div");
  panel.className = "sub-panel board-modal";
  panel.id = "skinPanel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "skinTitle");
  panel.innerHTML = `
    <div class="sub-panel-inner board-inner parchment-panel">
      <h2 id="skinTitle">Görünüm</h2>
      <p class="nick-hint">Koşuya hangi kıyafetle çıkacağını seç. Tercih bu tarayıcıda kalır.</p>
      <div class="skin-grid" id="skinGrid" role="listbox" aria-label="Kıyafetler"></div>
      <div class="nick-actions">
        <button type="button" class="menu-btn ghost" id="btnSkinBack">Geri</button>
      </div>
    </div>
  `;
  const app = document.getElementById("app") ?? document.body;
  const loading = document.getElementById("loading");
  if (loading) app.insertBefore(panel, loading);
  else app.appendChild(panel);

  return {
    btnTitle,
    btnHub,
    panel,
    grid: must("skinGrid"),
    back: must("btnSkinBack") as HTMLButtonElement,
  };
}

/**
 * Title (Welcome + menu) and Hub (island select) screens — docs/ux/screens.md
 * §1 and §3. Both are plain DOM overlays, same family as Hud's #card, not a
 * 3D scene (multi-island-concept.md §9.4 explicitly keeps the Hub out of the
 * "fourth playable area" trap). Kiklop Mağarası / Sirenler Geçidi are shown
 * with a "Yakında" badge and are not wired to anything — those stops don't
 * exist yet (out of scope, see CLAUDE.md task notes).
 *
 * Also owns the two K35 leaderboard overlays (Paca LOT-58): the nick modal in
 * front of the edge quest, and the board itself. Both live here rather than in
 * their own module because they are Hub furniture — they only ever exist while
 * the Hub is on screen, and they share its parchment chrome.
 */
export class Menu {
  private titleScreen = must("titleScreen");
  private hubScreen = must("hubScreen");
  private howPanel = must("howPanel");
  private aboutPanel = must("aboutPanel");
  private btnPlay = must("btnPlay") as HTMLButtonElement;
  private btnHow = must("btnHow") as HTMLButtonElement;
  private btnAbout = must("btnAbout") as HTMLButtonElement;
  private btnHowBack = must("btnHowBack") as HTMLButtonElement;
  private btnAboutBack = must("btnAboutBack") as HTMLButtonElement;
  private cardLotus = must("cardLotus") as HTMLButtonElement;
  private questLotusEdge = must("questLotusEdge") as HTMLButtonElement;
  private cardCyclops = must("cardCyclops");
  private btnHubMenu = must("btnHubMenu") as HTMLButtonElement;

  // ---- skin picker (Title + Hub, same modal; chrome is mounted in JS so
  // this file does not have to share index.html with parallel sessions)
  private btnSkinTitle!: HTMLButtonElement;
  private btnSkinHub!: HTMLButtonElement;
  private skinPanel!: HTMLElement;
  private skinGrid!: HTMLElement;
  private btnSkinBack!: HTMLButtonElement;
  private skinOpener: HTMLElement | null = null;

  // ---- nick modal
  private nickPanel = must("nickPanel");
  private nickInput = must("nickInput") as HTMLInputElement;
  private nickError = must("nickError");
  private btnNickStart = must("btnNickStart") as HTMLButtonElement;
  private btnNickCancel = must("btnNickCancel") as HTMLButtonElement;

  // ---- leaderboard (one modal, three entry points: Title, Hub, end of a run)
  private btnBoard = must("btnBoard") as HTMLButtonElement;
  private btnBoardTitle = must("btnBoardTitle") as HTMLButtonElement;
  private boardPanel = must("boardPanel");
  private boardStatus = must("boardStatus");
  private boardSubmit = must("boardSubmit");
  private boardList = must("boardList");
  private btnBoardBack = must("btnBoardBack") as HTMLButtonElement;
  private btnBoardRetry = must("btnBoardRetry") as HTMLButtonElement;

  /** Guards against a slow fetch from a previous open painting over a newer one. */
  private boardRequest = 0;
  /** Nick to highlight in the list — the one this browser just played as. */
  private ownNickKey = "";
  /** Control that opened the board, so focus returns there on close. */
  private boardOpener: HTMLElement | null = null;

  constructor(private handlers: MenuHandlers) {
    const skin = mountSkinChrome();
    this.btnSkinTitle = skin.btnTitle;
    this.btnSkinHub = skin.btnHub;
    this.skinPanel = skin.panel;
    this.skinGrid = skin.grid;
    this.btnSkinBack = skin.back;

    this.btnPlay.addEventListener("click", () => handlers.onPlay());
    this.btnHow.addEventListener("click", () => this.howPanel.classList.add("on"));
    this.btnHowBack.addEventListener("click", () => this.howPanel.classList.remove("on"));
    this.btnAbout.addEventListener("click", () => this.aboutPanel.classList.add("on"));
    this.btnAboutBack.addEventListener("click", () => this.aboutPanel.classList.remove("on"));
    this.cardLotus.addEventListener("click", () => handlers.onSelectLotus());
    this.questLotusEdge.addEventListener("click", () => this.openNick());
    this.btnHubMenu.addEventListener("click", () => handlers.onHubMenu());
    // Kiklop/Sirenler cards are plain <div>s with no listener wired — inert
    // by construction, not just visually disabled (screens.md §3: "henüz
    // level'ları yok").

    this.btnNickStart.addEventListener("click", () => this.confirmNick());
    this.btnNickCancel.addEventListener("click", () => this.closeNick());
    this.nickInput.addEventListener("input", () => {
      this.nickError.hidden = true;
    });
    this.nickInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        // Route through the button rather than calling confirmNick() directly:
        // the fullscreen request downstream needs a click on a real control,
        // and keeping one path means one thing to keep working.
        this.btnNickStart.click();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this.closeNick();
      }
    });
    this.nickPanel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeNick();
    });

    // Same modal, two manual entry points. The board is read-only, so the Title
    // button starts nothing and requests no fullscreen — "Oyna" is still the
    // only guaranteed gesture on that screen (docs/ux/screens.md §1).
    this.btnBoard.addEventListener("click", () => this.showBoard());
    this.btnBoardTitle.addEventListener("click", () => this.showBoard());
    this.btnBoardBack.addEventListener("click", () => this.closeBoard());
    this.btnBoardRetry.addEventListener("click", () => void this.refreshBoard());
    this.boardPanel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeBoard();
    });

    this.btnSkinTitle.addEventListener("click", () => this.openSkin());
    this.btnSkinHub.addEventListener("click", () => this.openSkin());
    this.btnSkinBack.addEventListener("click", () => this.closeSkin());
    this.skinPanel.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeSkin();
    });
    this.renderSkinGrid();
  }

  showTitle(): void {
    this.hubScreen.classList.remove("on");
    this.howPanel.classList.remove("on");
    this.aboutPanel.classList.remove("on");
    this.nickPanel.classList.remove("on");
    this.boardPanel.classList.remove("on");
    this.skinPanel.classList.remove("on");
    this.titleScreen.classList.add("on");
    document.body.dataset.uiPhase = "title";
  }

  showHub(): void {
    this.titleScreen.classList.remove("on");
    this.hubScreen.classList.add("on");
    this.skinPanel.classList.remove("on");
    document.body.dataset.uiPhase = "hub";
  }

  setCyclopsReady(ready: boolean): void {
    const badge = this.cardCyclops.querySelector(".hub-island-badge");
    if (badge) {
      badge.textContent = ready ? "Kilidi açıldı" : "🔒 Yakında";
      badge.classList.toggle("ready", ready);
      badge.classList.toggle("locked-badge", !ready);
    }
    this.cardCyclops.classList.toggle("locked", !ready);
  }

  /** Hides both menu screens — called once actual play starts. */
  hideAll(): void {
    this.titleScreen.classList.remove("on");
    this.hubScreen.classList.remove("on");
    this.nickPanel.classList.remove("on");
    this.boardPanel.classList.remove("on");
    this.skinPanel.classList.remove("on");
    document.body.dataset.uiPhase = "world";
  }

  // ------------------------------------------------------------- nick modal

  /**
   * Opens the nick prompt instead of starting the run immediately.
   *
   * THE RISK THIS CODE EXISTS TO MANAGE: before this card, the map click was
   * the one guaranteed user gesture, and `requestPlayFullscreen()` rode on it.
   * Browsers reject the Fullscreen API outside a gesture, so the request has
   * been MOVED to the modal's "Başla" click (game.ts's onSelectLotusEdge
   * handler) — it is not fired here, and it must not be. If a later change
   * makes the run start from anything other than a real press on that button,
   * mobile fullscreen breaks silently.
   */
  private openNick(): void {
    this.nickError.hidden = true;
    this.nickInput.value = loadSavedNick();
    this.nickPanel.classList.add("on");
    // Focus after the panel is displayable, otherwise iOS Safari ignores it.
    window.setTimeout(() => {
      this.nickInput.focus();
      this.nickInput.select();
    }, 0);
  }

  private closeNick(): void {
    this.nickPanel.classList.remove("on");
    this.questLotusEdge.focus();
  }

  private confirmNick(): void {
    const check = normalizeNick(this.nickInput.value);
    if (!check.ok) {
      setStatus(this.nickError, "bad", nickRejectMessage(check.reason));
      this.nickInput.focus();
      return;
    }
    saveNick(check.nick);
    this.ownNickKey = check.nick.toLowerCase();
    this.nickPanel.classList.remove("on");
    // Still inside the click handler's task, so user activation is intact for
    // whatever the host does next (fullscreen).
    this.handlers.onSelectLotusEdge(check.nick);
  }

  // ------------------------------------------------------------- leaderboard

  /**
   * Opens the board. `submit` describes the run that just ended, if any — it is
   * shown as its own line above the table because "gönderiliyor" / "kaydedildi"
   * / "eski rekorun daha iyiydi" / "gönderilemedi" are four different things
   * the player needs told apart.
   *
   * Callable from ANY screen — Title, Hub, or the return from a finished run.
   * The read path (fetchTop) needs no GameState and no WORLD.k35; it is a plain
   * GET, so the board works before a single run has ever been started.
   */
  showBoard(submit?: SubmitStatus): void {
    // Remember who opened it so focus can go back there on close — the modal is
    // no longer inside a screen, so there is no implicit "parent" to return to.
    const opener = document.activeElement;
    this.boardOpener = opener instanceof HTMLElement ? opener : null;
    // Highlight the row belonging to this browser even on a fresh load, before
    // any run has been played this session.
    if (!this.ownNickKey) this.ownNickKey = loadSavedNick().toLowerCase();
    this.renderSubmit(submit);
    this.boardPanel.classList.add("on");
    window.setTimeout(() => this.btnBoardBack.focus(), 0);
    void this.refreshBoard();
  }

  /**
   * Closes the board back to whatever was underneath. Nothing to restore: the
   * modal is an overlay sibling of the screens, so the Title or Hub behind it
   * never went away.
   */
  private closeBoard(): void {
    this.boardPanel.classList.remove("on");
    this.boardOpener?.focus();
    this.boardOpener = null;
  }

  /** Updates just the submit line on an already-open board (the async result landing). */
  setSubmitStatus(submit: SubmitStatus): void {
    this.renderSubmit(submit);
  }

  private renderSubmit(submit?: SubmitStatus): void {
    if (!submit) {
      this.boardSubmit.hidden = true;
      return;
    }
    if (submit.state === "pending") {
      setStatus(this.boardSubmit, "wait", "Süren gönderiliyor…");
      return;
    }
    const r = submit.result;
    if (r.ok) {
      if (r.outcome === "kept") {
        setStatus(
          this.boardSubmit,
          "info",
          `${formatRunTime(r.timeMs)} — eski rekorun (${formatRunTime(r.bestMs)}) hâlâ daha hızlı, tablo değişmedi.`,
        );
      } else {
        setStatus(this.boardSubmit, "good", `${formatRunTime(r.timeMs)} kaydedildi. Yeni rekorun.`);
      }
      return;
    }
    // Every failure path names itself. A speedrun screen that finishes a run
    // and then says nothing is the worst version of this feature.
    setStatus(this.boardSubmit, r.error.kind === "disabled" ? "info" : "bad", `Gönderilemedi — ${r.error.message}`);
  }

  private async refreshBoard(): Promise<void> {
    const req = ++this.boardRequest;
    this.btnBoardRetry.hidden = true;

    if (!isLeaderboardEnabled()) {
      this.boardList.replaceChildren();
      setStatus(
        this.boardStatus,
        "info",
        "Çevrimiçi tablo bu sürümde kapalı — süren yalnız burada, ekranda kalıyor.",
      );
      return;
    }

    setStatus(this.boardStatus, "wait", "Tablo yükleniyor…");
    const out = await fetchTop(NET.leaderboard.topLimit);
    if (req !== this.boardRequest) return; // a newer open already took over

    if (!out.ok) {
      this.boardList.replaceChildren();
      setStatus(this.boardStatus, "bad", `Tablo alınamadı — ${out.error.message}`);
      this.btnBoardRetry.hidden = false;
      return;
    }
    if (out.entries.length === 0) {
      this.boardList.replaceChildren();
      setStatus(this.boardStatus, "info", "Tablo boş. İlk süre senin olabilir.");
      return;
    }
    setStatus(this.boardStatus, "good", `En hızlı ${out.entries.length} koşu.`);
    this.boardList.replaceChildren(...out.entries.map((e) => this.row(e)));
  }

  private row(entry: LeaderboardEntry): HTMLLIElement {
    const li = document.createElement("li");
    li.className = "board-row";
    if (this.ownNickKey && entry.nick.toLowerCase() === this.ownNickKey) {
      li.classList.add("mine");
    }

    const rank = document.createElement("span");
    rank.className = "board-rank";
    rank.textContent = `${entry.rank}.`;

    const nick = document.createElement("span");
    nick.className = "board-nick";
    // textContent, never innerHTML: nicks are user input from a public endpoint.
    nick.textContent = entry.nick;

    const time = document.createElement("span");
    time.className = "board-time";
    time.textContent = formatRunTime(entry.timeMs);

    li.append(rank, nick, time);
    return li;
  }

  // ------------------------------------------------------------- skin picker

  private openSkin(): void {
    const opener = document.activeElement;
    this.skinOpener = opener instanceof HTMLElement ? opener : null;
    this.renderSkinGrid();
    this.skinPanel.classList.add("on");
    window.setTimeout(() => this.btnSkinBack.focus(), 0);
  }

  private closeSkin(): void {
    this.skinPanel.classList.remove("on");
    this.skinOpener?.focus();
    this.skinOpener = null;
  }

  private renderSkinGrid(): void {
    const selected = loadSavedSkin();
    this.skinGrid.replaceChildren(
      ...Object.values(PLAYER_SKINS).map((skin) => this.skinButton(skin.id, selected)),
    );
  }

  private skinButton(id: SkinId, selected: SkinId): HTMLButtonElement {
    const skin = PLAYER_SKINS[id];
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "skin-option" + (id === selected ? " is-selected" : "");
    btn.setAttribute("role", "option");
    btn.setAttribute("aria-selected", id === selected ? "true" : "false");

    const name = document.createElement("span");
    name.className = "skin-option-name";
    name.textContent = skin.label;

    const hint = document.createElement("span");
    hint.className = "skin-option-hint";
    hint.textContent = skin.hint;

    btn.append(name, hint);
    btn.addEventListener("click", () => {
      saveSkin(id);
      this.renderSkinGrid();
    });
    return btn;
  }
}
