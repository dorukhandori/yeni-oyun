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

export type ShellScreen = "title" | "create" | "islands" | "howto" | "about";

type StartGameFn = (choice: SessionChoice) => void;

let startGameFn: StartGameFn | null = null;
let draftProfile: UserProfile | null = loadProfile();

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
    <div class="shell-bg" aria-hidden="true"></div>
    <div class="shell-frame">
      ${renderTitle()}
      ${renderCreate()}
      ${renderIslands()}
      ${renderHowto()}
      ${renderAbout()}
    </div>
  `;

  bindTitle();
  bindCreate();
  bindIslands();
  bindSimpleBack("howto");
  bindSimpleBack("about");
}

function renderTitle(): string {
  return `
    <section class="screen screen-title on" data-screen="title">
      <p class="eyebrow">Odysseia · Kitap IX</p>
      <h1 class="logo">Lotophagoi</h1>
      <p class="lede">Lotus kokusu yurdunu unutturur. Yenmemiş çiçek hatırlatır.</p>
      <nav class="menu-col">
        <button type="button" class="btn btn-primary" data-action="play">Oyna</button>
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
      <form class="form-create" id="createForm">
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

function renderIslands(): string {
  const cards = ISLANDS.map(
    (island) => `
      <button
        type="button"
        class="island-card ${island.available ? "" : "locked"}"
        data-island="${island.id}"
        ${island.available ? "" : "disabled"}
      >
        <span class="island-name">${island.name}</span>
        <span class="island-tag">${island.tagline}</span>
        ${island.available ? "" : '<span class="island-badge">Yakında</span>'}
      </button>
    `,
  ).join("");

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
      <ul class="how-list">
        <li><b>Masaüstü:</b> WASD yürü · fare kamera · <b>E</b> topla / teslim</li>
        <li><b>Telefon (yatay):</b> sol çubuk yürü · sağ sürükle bak · <b>Topla</b></li>
        <li>Olgun lotusları topla, gemiye teslim et — on iki çiçek, bir gün.</li>
        <li>Unutuş yükselirse yönünü kaybedersin; kıyı ve gemi seni açar.</li>
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
      <p class="about-copy">
        Homeros, <em>Odysseia</em> IX: Lotophagoi düşman değildir — ikram ederler.
        Oyun tek harita, tek gün, iki final.
      </p>
      <p class="about-copy dim">Vite · Three.js · tarayıcı prototipi.</p>
    </section>
  `;
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
  const app = document.getElementById("app");
  shell?.classList.add("gone");
  app?.classList.remove("hidden");
  startGameFn?.(choice);
}

/** Return to title from in-game (future pause / final). */
export function returnToTitle(): void {
  draftProfile = loadProfile();
  document.getElementById("app")?.classList.add("hidden");
  document.getElementById("shell")?.classList.remove("gone");
  showScreen("title");
}

export function getActiveProfile(): UserProfile | null {
  return draftProfile;
}
