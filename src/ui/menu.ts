import { must } from "./hud";

export interface MenuHandlers {
  /** Title's "Oyna" — opens the Hub (island select), does not start play directly. */
  onPlay: () => void;
  /** Hub's Lotus Adası card — the anthology stop. */
  onSelectLotus: () => void;
  /** Hub edge quest on Lotus ("Beş yeter") — same island, named satellite. */
  onSelectLotusEdge: () => void;
  /** Hub's "Ana menü" — back to Title. */
  onHubMenu: () => void;
}

/**
 * Title (Welcome + menu) and Hub (island select) screens — docs/ux/screens.md
 * §1 and §3. Both are plain DOM overlays, same family as Hud's #card, not a
 * 3D scene (multi-island-concept.md §9.4 explicitly keeps the Hub out of the
 * "fourth playable area" trap). Kiklop Mağarası / Sirenler Geçidi are shown
 * with a "Yakında" badge and are not wired to anything — those stops don't
 * exist yet (out of scope, see CLAUDE.md task notes).
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

  constructor(handlers: MenuHandlers) {
    this.btnPlay.addEventListener("click", () => handlers.onPlay());
    this.btnHow.addEventListener("click", () => this.howPanel.classList.add("on"));
    this.btnHowBack.addEventListener("click", () => this.howPanel.classList.remove("on"));
    this.btnAbout.addEventListener("click", () => this.aboutPanel.classList.add("on"));
    this.btnAboutBack.addEventListener("click", () => this.aboutPanel.classList.remove("on"));
    this.cardLotus.addEventListener("click", () => handlers.onSelectLotus());
    this.questLotusEdge.addEventListener("click", () => handlers.onSelectLotusEdge());
    this.btnHubMenu.addEventListener("click", () => handlers.onHubMenu());
    // Kiklop/Sirenler cards are plain <div>s with no listener wired — inert
    // by construction, not just visually disabled (screens.md §3: "henüz
    // level'ları yok").
  }

  showTitle(): void {
    this.hubScreen.classList.remove("on");
    this.howPanel.classList.remove("on");
    this.aboutPanel.classList.remove("on");
    this.titleScreen.classList.add("on");
    document.body.dataset.uiPhase = "title";
  }

  showHub(): void {
    this.titleScreen.classList.remove("on");
    this.hubScreen.classList.add("on");
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
    document.body.dataset.uiPhase = "world";
  }
}
