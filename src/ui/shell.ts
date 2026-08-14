import {
  createProfile,
  ISLANDS,
  loadProfile,
  saveProfile,
  type IslandId,
  type SessionChoice,
  type UserProfile,
} from "./profile";
import { isCoarsePointer, mountOrientationGate, requestLandscapeLock } from "./orientation";
import { MenuBackdrop } from "./menuBackdrop";
import {
  islandCaveThumbSvg,
  islandLotusThumbSvg,
  lotusEmblemSvg,
  shipSilhouetteSvg,
  svgDataUrl,
} from "./menuAssets";

export type ShellScreen = "title" | "create" | "islands" | "howto" | "about";

type StartGameFn = (choice: SessionChoice) => void;

let startGameFn: StartGameFn | null = null;
let draftProfile: UserProfile | null = loadProfile();
let backdrop: MenuBackdrop | null = null;

export function bootShell(onStart: StartGameFn): void {
  startGameFn = onStart;
  mountOrientationGate();
  mountShellDom();
  showScreen("title");
}

function mountShellDom(): void {
  const root = document.getElementById("shell");
  if (!root) throw new Error("#shell missing");

  root.innerHTML = `
    <canvas id="menuCanvas" class="menu-canvas" aria-hidden="true"></canvas>
    <div class="menu-vignette" aria-hidden="true"></div>
    <div class="menu-grain" aria-hidden="true"></div>
    <div class="shell-layout">
      <aside class="menu-hero" aria-hidden="true">
        <div class="hero-ship">${shipSilhouetteSvg()}</div>
        <div class="hero-masts">
          ${Array.from({ length: 12 }, (_, i) => `<span class="mast ${i < 4 ? "lit" : ""}"></span>`).join("")}
        </div>
        <p class="hero-caption">On iki direk · on iki çiçek</p>
      </aside>
      <div class="shell-frame">
        <div class="menu-panel">
          ${renderTitle()}
          ${renderCreate()}
          ${renderIslands()}
          ${renderHowto()}
          ${renderAbout()}
        </div>
      </div>
    </div>
  `;

  const canvas = document.getElementById("menuCanvas") as HTMLCanvasElement | null;
  if (canvas) {
    backdrop = new MenuBackdrop(canvas);
    backdrop.start();
  }

  bindTitle();
  bindCreate();
  bindIslands();
  bindSimpleBack("howto");
  bindSimpleBack("about");
  bindButtonRipples();
}

function renderTitle(): string {
  return `
    <section class="screen screen-title on" data-screen="title">
      <div class="title-brand">
        <div class="emblem">${lotusEmblemSvg()}</div>
        <div class="title-copy">
          <p class="eyebrow">Odysseia · Kitap IX</p>
          <h1 class="logo">Lotophagoi</h1>
          <p class="lede">Lotus kokusu yurdunu unutturur.<br/>Yenmemiş çiçek hatırlatır.</p>
        </div>
      </div>
      <nav class="menu-col">
        <button type="button" class="btn btn-primary btn-play" data-action="play">
          <span class="btn-shine"></span>
          Oyna
        </button>
        <button type="button" class="btn btn-ghost" data-action="howto">Nasıl oynanır</button>
        <button type="button" class="btn btn-ghost" data-action="about">Hakkında</button>
      </nav>
      <p class="foot-note" id="titleProfileNote"></p>
    </section>
  `;
}

function renderCreate(): string {
  return `
    <section class="screen screen-create" data-screen="create" hidden>
      <header class="screen-head">
        <button type="button" class="btn-back" data-back="title">← Geri</button>
        <h2>Denizci kaydı</h2>
      </header>
      <form class="form-create panel-card" id="createForm">
        <div class="panel-ornament"></div>
        <label class="field">
          <span>Adın</span>
          <input name="name" maxlength="18" autocomplete="nickname" placeholder="Odysseus" required />
        </label>
        <label class="field">
          <span>Unvan</span>
          <input name="title" maxlength="14" autocomplete="off" placeholder="Kaptan" />
        </label>
        <p class="form-hint">Kayıt yalnızca bu cihazda tutulur — sunucu yok.</p>
        <button type="submit" class="btn btn-primary">Adaları gör</button>
      </form>
    </section>
  `;
}

function islandThumbStyle(id: IslandId): string {
  const svg = id === "lotus" ? islandLotusThumbSvg() : islandCaveThumbSvg();
  return `background-image: ${svgDataUrl(svg)}`;
}

function renderIslands(): string {
  const cards = ISLANDS.map((island) => {
    const thumbStyle = islandThumbStyle(island.id);
    return `
      <button
        type="button"
        class="island-card ${island.available ? "" : "locked"}"
        data-island="${island.id}"
        ${island.available ? "" : "disabled"}
      >
        <div class="island-thumb" style="${thumbStyle}"></div>
        <div class="island-body">
          <span class="island-name">${island.name}</span>
          <span class="island-tag">${island.tagline}</span>
        </div>
        ${island.available ? '<span class="island-cta">Kıyıya çık →</span>' : '<span class="island-badge">Yakında</span>'}
      </button>
    `;
  }).join("");

  return `
    <section class="screen screen-islands" data-screen="islands" hidden>
      <header class="screen-head split">
        <button type="button" class="btn-back" data-back="title">← Geri</button>
        <div class="head-copy">
          <h2>Ada seç</h2>
          <p class="sub" id="islandGreeting"></p>
        </div>
        <button type="button" class="btn-link" id="changeUser">Denizci değiştir</button>
      </header>
      <div class="island-grid">${cards}</div>
    </section>
  `;
}

function renderHowto(): string {
  return `
    <section class="screen screen-static" data-screen="howto" hidden>
      <header class="screen-head">
        <button type="button" class="btn-back" data-back="title">← Geri</button>
        <h2>Nasıl oynanır</h2>
      </header>
      <ul class="how-list panel-card">
        <li><span class="how-icon how-i-key"></span><span><b>Masaüstü:</b> WASD yürü · fare kamera · <b>E</b> topla / teslim</span></li>
        <li><span class="how-icon how-i-touch"></span><span><b>Telefon (yatay):</b> sol çubuk yürü · sağ sürükle bak · <b>Topla</b></span></li>
        <li><span class="how-icon how-i-lotus"></span><span>Olgun lotusları topla, gemiye teslim et — on iki çiçek, bir gün.</span></li>
        <li><span class="how-icon how-i-wave"></span><span>Unutuş yükselirse yönünü kaybedersin; kıyı ve gemi seni açar.</span></li>
      </ul>
    </section>
  `;
}

function renderAbout(): string {
  return `
    <section class="screen screen-static" data-screen="about" hidden>
      <header class="screen-head">
        <button type="button" class="btn-back" data-back="title">← Geri</button>
        <h2>Hakkında</h2>
      </header>
      <div class="panel-card about-block">
        <p class="about-copy">
          Homeros, <em>Odysseia</em> IX: Lotophagoi düşman değildir — ikram ederler.
          Oyun tek harita, tek gün, iki final.
        </p>
        <p class="about-copy dim">Vite · Three.js · tarayıcı prototipi.</p>
      </div>
    </section>
  `;
}

function bindButtonRipples(): void {
  document.querySelectorAll(".btn, .island-card:not(.locked)").forEach((el) => {
    el.addEventListener("click", (e) => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "ripple";
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = `${size}px`;
      ripple.style.left = `${(e as MouseEvent).clientX - rect.left - size / 2}px`;
      ripple.style.top = `${(e as MouseEvent).clientY - rect.top - size / 2}px`;
      (el as HTMLElement).appendChild(ripple);
      ripple.addEventListener("animationend", () => ripple.remove());
    });
  });
}

function bindTitle(): void {
  const screen = getScreen("title");
  screen.querySelector('[data-action="play"]')?.addEventListener("click", async () => {
    await requestLandscapeLock();
    if (!draftProfile) {
      showScreen("create");
      return;
    }
    updateIslandGreeting();
    showScreen("islands");
  });
  screen.querySelector('[data-action="howto"]')?.addEventListener("click", () => showScreen("howto"));
  screen.querySelector('[data-action="about"]')?.addEventListener("click", () => showScreen("about"));
  refreshTitleNote();
}

function bindCreate(): void {
  const form = document.getElementById("createForm") as HTMLFormElement | null;
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const name = String(fd.get("name") ?? "").trim();
    const title = String(fd.get("title") ?? "").trim();
    if (name.length < 2) return;
    draftProfile = createProfile(name, title);
    refreshTitleNote();
    updateIslandGreeting();
    showScreen("islands");
  });
  getScreen("create").querySelector('[data-back="title"]')?.addEventListener("click", () => showScreen("title"));
}

function bindIslands(): void {
  const screen = getScreen("islands");
  screen.querySelector('[data-back="title"]')?.addEventListener("click", () => showScreen("title"));
  document.getElementById("changeUser")?.addEventListener("click", () => showScreen("create"));
  screen.querySelectorAll("[data-island]").forEach((el) => {
    el.addEventListener("click", async () => {
      const id = (el as HTMLElement).dataset.island as IslandId;
      const island = ISLANDS.find((i) => i.id === id);
      if (!island?.available || !draftProfile) return;
      await requestLandscapeLock();
      launchGame({ profile: draftProfile, island: id });
    });
  });
}

function bindSimpleBack(screenId: ShellScreen): void {
  getScreen(screenId).querySelector(`[data-back="title"]`)?.addEventListener("click", () => showScreen("title"));
}

function refreshTitleNote(): void {
  const note = document.getElementById("titleProfileNote");
  if (!note) return;
  if (!draftProfile) {
    note.textContent = isCoarsePointer() ? "Telefonu yatay tut — dokunmatik kontroller hazır." : "";
    return;
  }
  note.textContent = `${draftProfile.title} ${draftProfile.name} olarak devam edeceksin.`;
}

function updateIslandGreeting(): void {
  const el = document.getElementById("islandGreeting");
  if (!el || !draftProfile) return;
  el.textContent = `${draftProfile.title} ${draftProfile.name}, hangi kıyıya çıkıyorsun?`;
}

function getScreen(id: ShellScreen): HTMLElement {
  const el = document.querySelector(`[data-screen="${id}"]`);
  if (!el) throw new Error(`screen ${id} missing`);
  return el as HTMLElement;
}

export function showScreen(id: ShellScreen): void {
  document.querySelectorAll(".screen").forEach((s) => {
    const on = (s as HTMLElement).dataset.screen === id;
    (s as HTMLElement).hidden = !on;
    s.classList.toggle("on", on);
  });
  if (id === "title") refreshTitleNote();
  if (id === "islands") updateIslandGreeting();
}

function launchGame(choice: SessionChoice): void {
  saveProfile(choice.profile);
  const shell = document.getElementById("shell");
  shell?.classList.add("launching");
  backdrop?.stop();

  window.setTimeout(() => {
    shell?.classList.add("gone");
    document.getElementById("app")?.classList.remove("hidden");
    startGameFn?.(choice);
  }, 520);
}

export function returnToTitle(): void {
  draftProfile = loadProfile();
  document.getElementById("app")?.classList.add("hidden");
  const shell = document.getElementById("shell");
  shell?.classList.remove("gone", "launching");
  backdrop?.start();
  showScreen("title");
}

export function getActiveProfile(): UserProfile | null {
  return draftProfile;
}
