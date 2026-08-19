import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  fitGltfHeight,
  lightGltf,
  loadGltf,
  loadGltfBundle,
  cloneGltfBundle,
  pinClipBonePositions,
  restBonePositions,
  tintGltf,
  type GltfBundle,
} from "../world/gltf";
import {
  findClipDonors,
  findRigForAnimPreview,
  findVisibleMesh,
  formatOptionLabel,
  type AssetCatalogEntry,
} from "./catalog";
import { createViewer } from "./viewer";

/**
 * Asset workbench entry — standalone, no `src/game.ts` import anywhere in
 * this module or its dependencies. `docs/production/asset-pipeline-loop-plan.md`
 * §4: a devtool for looking at a GLB/animation, not a game screen.
 */

// ------------------------------------------------------------------- DOM refs
const canvas = document.getElementById("wb-canvas") as HTMLCanvasElement;
const statusEl = document.getElementById("wb-status") as HTMLElement;

const tabModel = document.getElementById("wb-tab-model") as HTMLButtonElement;
const tabAnim = document.getElementById("wb-tab-anim") as HTMLButtonElement;
const panelModel = document.getElementById("wb-panel-model") as HTMLElement;
const panelAnim = document.getElementById("wb-panel-anim") as HTMLElement;

const dropZone = document.getElementById("wb-drop") as HTMLElement;
const filePick = document.getElementById("wb-file-pick") as HTMLButtonElement;
const fileInput = document.getElementById("wb-file-input") as HTMLInputElement;

const modelListSelect = document.getElementById("wb-model-list") as HTMLSelectElement;
const pathInput = document.getElementById("wb-path-input") as HTMLInputElement;
const loadBundleBtn = document.getElementById("wb-load-bundle") as HTMLButtonElement;
const loadModelBtn = document.getElementById("wb-load-model") as HTMLButtonElement;
const clearBtn = document.getElementById("wb-clear") as HTMLButtonElement;

const fitEnable = document.getElementById("wb-fit-enable") as HTMLInputElement;
const fitMeters = document.getElementById("wb-fit-meters") as HTMLInputElement;
const tintEnable = document.getElementById("wb-tint-enable") as HTMLInputElement;
const tintColor = document.getElementById("wb-tint-color") as HTMLInputElement;

const infoBox = document.getElementById("wb-info") as HTMLElement;

const animEmpty = document.getElementById("wb-anim-empty") as HTMLElement;
const animLoaded = document.getElementById("wb-anim-loaded") as HTMLElement;
const clipsEmpty = document.getElementById("wb-clips-empty") as HTMLElement;
const clipHint = document.getElementById("wb-clip-hint") as HTMLElement;
const clipControls = document.getElementById("wb-clip-controls") as HTMLElement;
const clipList = document.getElementById("wb-clip-list") as HTMLElement;
const animToggle = document.getElementById("wb-anim-toggle") as HTMLButtonElement;
const animRestart = document.getElementById("wb-anim-restart") as HTMLButtonElement;
const animLoop = document.getElementById("wb-anim-loop") as HTMLInputElement;
const animSpeed = document.getElementById("wb-anim-speed") as HTMLInputElement;
const animSpeedVal = document.getElementById("wb-anim-speed-val") as HTMLElement;
const animScrub = document.getElementById("wb-anim-scrub") as HTMLInputElement;
const animScrubVal = document.getElementById("wb-anim-scrub-val") as HTMLElement;
const animDur = document.getElementById("wb-anim-dur") as HTMLElement;
const pinEnable = document.getElementById("wb-pin-enable") as HTMLInputElement;

const extraClipListSelect = document.getElementById("wb-extra-clip-list") as HTMLSelectElement;
const extraClipPath = document.getElementById("wb-extra-clip-path") as HTMLInputElement;
const extraClipAdd = document.getElementById("wb-extra-clip-add") as HTMLButtonElement;

// -------------------------------------------------------------------- state
const viewer = createViewer(canvas);
const rawLoader = new GLTFLoader();

let catalog: AssetCatalogEntry[] = [];
let bundle: GltfBundle | null = null;
let animRoot: THREE.Object3D | null = null;
let restMap: Map<string, THREE.Vector3> = new Map();
let mixer: THREE.AnimationMixer | null = null;
let actions: THREE.AnimationAction[] = [];
let activeClipIndex = -1;
let playing = true;
let scrubDragging = false;
let loadedFromLabel = "";

function setStatus(msg: string): void {
  statusEl.textContent = msg;
}

function switchTab(which: "model" | "anim"): void {
  const onModel = which === "model";
  tabModel.classList.toggle("active", onModel);
  tabAnim.classList.toggle("active", !onModel);
  panelModel.hidden = !onModel;
  panelAnim.hidden = onModel;
}
tabModel.addEventListener("click", () => switchTab("model"));
tabAnim.addEventListener("click", () => switchTab("anim"));

function assetPath(entry: AssetCatalogEntry): string {
  return `assets/models/${entry.file}`;
}

// ------------------------------------------------------------------- stats
function computeStats(root: THREE.Object3D): { meshes: number; tris: number; hasSkin: boolean } {
  let meshes = 0;
  let tris = 0;
  let hasSkin = false;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    meshes += 1;
    const geo = mesh.geometry;
    const idx = geo.getIndex();
    const posCount = geo.getAttribute("position")?.count ?? 0;
    tris += idx ? idx.count / 3 : posCount / 3;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) hasSkin = true;
  });
  return { meshes, tris: Math.round(tris), hasSkin };
}

function renderInfo(root: THREE.Object3D, clipCount: number, note?: string): void {
  const { meshes, tris, hasSkin } = computeStats(root);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  infoBox.innerHTML = `
    <dl>
      <dt>Mesh</dt><dd>${meshes}</dd>
      <dt>Üçgen</dt><dd>${tris.toLocaleString("tr-TR")}</dd>
      <dt>Rig (skin)</dt><dd>${hasSkin ? "var" : "yok"}</dd>
      <dt>Animasyon klibi</dt><dd>${clipCount}</dd>
      <dt>Kutu (m)</dt><dd>${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)}</dd>
      ${note ? `<dt>Not</dt><dd style="text-align:left">${note}</dd>` : ""}
    </dl>
  `;
}

function activeAction(): THREE.AnimationAction | null {
  return activeClipIndex >= 0 ? actions[activeClipIndex] ?? null : null;
}

function updateScrubberUi(): void {
  const action = activeAction();
  if (!action) {
    animScrub.disabled = true;
    animScrub.value = "0";
    animScrubVal.textContent = "0.00";
    animDur.textContent = "0.00";
    return;
  }
  const clip = action.getClip();
  const dur = clip.duration > 0 ? clip.duration : 1;
  animScrub.disabled = false;
  animScrub.max = String(dur);
  const t = scrubDragging ? Number(animScrub.value) : action.time;
  animScrub.value = String(Math.min(t, dur));
  animScrubVal.textContent = Number(animScrub.value).toFixed(2);
  animDur.textContent = dur.toFixed(2);
}

viewer.setFrameHook(() => {
  if (!scrubDragging) updateScrubberUi();
});

// -------------------------------------------------------------- animation UI
function stopMixer(): void {
  if (mixer) mixer.stopAllAction();
  mixer = null;
  actions = [];
  activeClipIndex = -1;
  updateScrubberUi();
}

function showClipHint(msg: string): void {
  if (!msg) {
    clipHint.hidden = true;
    clipHint.textContent = "";
    return;
  }
  clipHint.hidden = false;
  clipHint.textContent = msg;
}

function rebuildActions(): void {
  if (!bundle || !animRoot) {
    animEmpty.hidden = false;
    animLoaded.hidden = true;
    stopMixer();
    viewer.setMixer(null);
    showClipHint("");
    return;
  }
  animEmpty.hidden = true;
  animLoaded.hidden = false;

  if (bundle.animations.length === 0) {
    clipsEmpty.hidden = false;
    clipControls.hidden = true;
    stopMixer();
    viewer.setMixer(null);
    const rig = loadedFromLabel ? findRigForAnimPreview(
      catalog.find((e) => e.file === loadedFromLabel) ?? { file: loadedFromLabel, meshes: 1, skins: 0, anims: 0, animNames: [], kind: "mesh" },
      catalog,
    ) : null;
    showClipHint(
      rig
        ? `Bu dosyada iskelet/klip yok. Animasyon için listeden "${rig.file}" seçin.`
        : "",
    );
    return;
  }
  clipsEmpty.hidden = true;
  clipControls.hidden = false;
  showClipHint("");

  const prevIndex = activeClipIndex;
  stopMixer();
  // Mixer root must be the loaded glTF scene (bones live here), not the empty wrapper group.
  mixer = new THREE.AnimationMixer(animRoot);
  viewer.setMixer(mixer);

  const pin = pinEnable.checked;
  actions = bundle.animations.map((clip) => {
    const src = pin ? pinClipBonePositions(clip, restMap) : clip;
    const action = mixer!.clipAction(src);
    action.setLoop(animLoop.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !animLoop.checked;
    action.timeScale = Number(animSpeed.value) || 1;
    return action;
  });

  clipList.innerHTML = "";
  bundle.animations.forEach((clip, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "wb-clip-btn";
    btn.textContent = `${clip.name || `clip_${i}`} (${clip.duration.toFixed(2)}s)`;
    btn.addEventListener("click", () => playClip(i));
    clipList.appendChild(btn);
  });

  const startIndex = prevIndex >= 0 && prevIndex < actions.length ? prevIndex : 0;
  playClip(startIndex);
}

function playClip(index: number): void {
  if (!actions[index]) return;
  actions.forEach((a, i) => {
    if (i === index) return;
    a.stop();
  });
  activeClipIndex = index;
  const action = actions[index];
  action.reset();
  action.paused = !playing;
  action.play();
  [...clipList.children].forEach((el, i) => el.classList.toggle("active", i === index));
  updateScrubberUi();
}

animToggle.addEventListener("click", () => {
  playing = !playing;
  animToggle.textContent = playing ? "Duraklat" : "Oynat";
  const action = activeAction();
  if (action) action.paused = !playing;
});

animRestart.addEventListener("click", () => {
  const action = activeAction();
  if (!action) return;
  action.reset();
  action.paused = !playing;
  action.play();
  updateScrubberUi();
});

animLoop.addEventListener("change", () => {
  const action = activeAction();
  if (!action) return;
  action.setLoop(animLoop.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  action.clampWhenFinished = !animLoop.checked;
});

animSpeed.addEventListener("input", () => {
  const v = Number(animSpeed.value) || 1;
  animSpeedVal.textContent = v.toFixed(2);
  for (const a of actions) a.timeScale = v;
});

animScrub.addEventListener("pointerdown", () => {
  scrubDragging = true;
  playing = false;
  animToggle.textContent = "Oynat";
  const action = activeAction();
  if (action) action.paused = true;
});

animScrub.addEventListener("input", () => {
  const action = activeAction();
  if (!action) return;
  action.time = Number(animScrub.value);
  mixer?.update(0);
  animScrubVal.textContent = Number(animScrub.value).toFixed(2);
});

animScrub.addEventListener("pointerup", () => {
  scrubDragging = false;
});

pinEnable.addEventListener("change", () => rebuildActions());

async function appendClipsFromPath(path: string, quiet = false): Promise<number> {
  if (!path) return 0;
  if (!bundle) {
    if (!quiet) setStatus("Önce Model sekmesinden bir model yükleyin — klip tek başına oynatılamaz.");
    return 0;
  }
  if (!quiet) setStatus(`Klip yükleniyor: ${path}`);
  const extra = await loadGltfBundle(path);
  if (extra.animations.length === 0) {
    if (!quiet) setStatus(`Yüklendi ama klip yok: ${path}`);
    return 0;
  }
  const existing = new Set(bundle.animations.map((c) => c.name));
  const fresh = extra.animations.filter((c) => !existing.has(c.name));
  if (fresh.length === 0) {
    if (!quiet) setStatus(`Klipler zaten yüklü: ${path}`);
    return 0;
  }
  bundle.animations = [...bundle.animations, ...fresh];
  rebuildActions();
  if (!quiet) setStatus(`${fresh.length} klip eklendi: ${path}`);
  return fresh.length;
}

async function addExtraClip(path: string): Promise<void> {
  try {
    extraClipPath.value = "";
    await appendClipsFromPath(path);
  } catch (err) {
    setStatus(`Klip yükleme hatası (${path}): ${(err as Error)?.message ?? err}`);
  }
}

extraClipAdd.addEventListener("click", () => void addExtraClip(extraClipPath.value.trim()));

extraClipListSelect.addEventListener("change", () => {
  const path = extraClipListSelect.value;
  if (!path) return;
  void addExtraClip(path);
  extraClipListSelect.value = "";
});

// ------------------------------------------------------------------- loading
function currentTintHex(): number {
  return parseInt(tintColor.value.replace("#", ""), 16);
}

async function loadFromPath(withAnimations: boolean, label = ""): Promise<void> {
  const path = pathInput.value.trim();
  if (!path) {
    setStatus("Önce bir yol girin (public/ köküne göre, ör. assets/models/foo.glb).");
    return;
  }
  loadedFromLabel = label || path.split("/").pop() || path;
  setStatus(`Yükleniyor: ${path}`);
  try {
    if (withAnimations) {
      const b = await loadGltfBundle(path);
      const scene = cloneGltfBundle(b);
      mountModel(scene, b.animations, label);
    } else {
      const tint = tintEnable.checked ? currentTintHex() : undefined;
      const scene = await loadGltf(path, tint);
      mountModel(scene, [], label);
    }
    setStatus(`Yüklendi: ${path}`);
  } catch (err) {
    setStatus(`Yükleme hatası (${path}): ${(err as Error)?.message ?? err}`);
  }
}

function loadFromFile(file: File): Promise<{ scene: THREE.Group; animations: THREE.AnimationClip[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buf = reader.result as ArrayBuffer;
      rawLoader.parse(
        buf,
        "",
        (gltf) => resolve({ scene: gltf.scene as THREE.Group, animations: gltf.animations.slice() }),
        (err) => reject(err),
      );
    };
    reader.onerror = () => reject(reader.error ?? new Error("dosya okunamadı"));
    reader.readAsArrayBuffer(file);
  });
}

async function handleFile(file: File): Promise<void> {
  loadedFromLabel = file.name;
  setStatus(`Yükleniyor (yerel dosya): ${file.name}`);
  try {
    const { scene, animations } = await loadFromFile(file);
    mountModel(scene, animations, file.name);
    setStatus(`Yüklendi (yerel dosya): ${file.name}`);
    if (animations.length > 0) switchTab("anim");
  } catch (err) {
    setStatus(`Ayrıştırma hatası (${file.name}): ${(err as Error)?.message ?? err}. Draco-sıkıştırılmış ya da harici (.bin/texture) referanslı .gltf desteklenmiyor v1'de.`);
  }
}

/** Mirrors sailor.ts's mountMesh ordering — same known-good sequence. */
function mountModel(scene: THREE.Group, animations: THREE.AnimationClip[], label = ""): void {
  lightGltf(scene);
  if (tintEnable.checked) tintGltf(scene, currentTintHex());
  scene.traverse((obj) => {
    const skinned = obj as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh) skinned.frustumCulled = false;
  });
  restMap = restBonePositions(scene);
  scene.rotation.set(0, 0, 0);
  if (fitEnable.checked) {
    const meters = Number(fitMeters.value) || 1.8;
    fitGltfHeight(scene, meters);
  }

  animRoot = scene;
  viewer.setModel(scene);
  viewer.frameModel();
  renderInfo(scene, animations.length, label ? `Kaynak: ${label}` : undefined);

  bundle = { scene, animations };
  rebuildActions();
  if (animations.length > 0) switchTab("anim");
}

/**
 * Dropdown smart-load: clip-only rows attach to a visible rig; mesh-only
 * character rows redirect to the rig variant so walk/run can actually play.
 */
async function loadCatalogEntry(entry: AssetCatalogEntry): Promise<void> {
  pathInput.value = assetPath(entry);
  loadedFromLabel = entry.file;

  if (entry.kind === "clip-only") {
    const meshEntry = findVisibleMesh(entry, catalog);
    const rigEntry = meshEntry?.skins ? meshEntry : findRigForAnimPreview(
      { ...entry, meshes: 0, skins: 0 },
      catalog,
    );
    if (!rigEntry) {
      setStatus(`"${entry.file}" yalnızca klip — önce rig'li bir model yükleyin.`);
      return;
    }
    setStatus(`"${entry.file}" klip dosyası — görünür model: ${rigEntry.file}`);
    pathInput.value = assetPath(rigEntry);
    await loadFromPath(true, rigEntry.file);
    await appendClipsFromPath(assetPath(entry), true);
    switchTab("anim");
    return;
  }

  const rigRedirect = findRigForAnimPreview(entry, catalog);
  if (rigRedirect) {
    setStatus(
      `"${entry.file}" iskeletsiz (animasyon oynatılamaz) — rig sürümü yükleniyor: ${rigRedirect.file}`,
    );
    pathInput.value = assetPath(rigRedirect);
    await loadFromPath(true, rigRedirect.file);
    const donors = findClipDonors(entry, catalog);
    for (const donor of donors) {
      await appendClipsFromPath(assetPath(donor), true);
    }
    return;
  }

  await loadFromPath(entry.anims > 0, entry.file);
}

// -------------------------------------------------------------------- events
loadBundleBtn.addEventListener("click", () => void loadFromPath(true));
loadModelBtn.addEventListener("click", () => void loadFromPath(false));

filePick.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (f) void handleFile(f);
  fileInput.value = "";
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  const f = e.dataTransfer?.files?.[0];
  if (f) void handleFile(f);
});

clearBtn.addEventListener("click", () => {
  bundle = null;
  animRoot = null;
  loadedFromLabel = "";
  stopMixer();
  viewer.setMixer(null);
  viewer.setModel(null);
  infoBox.innerHTML = `<p class="wb-empty">Henüz bir model yüklenmedi.</p>`;
  animEmpty.hidden = false;
  animLoaded.hidden = true;
  clipList.innerHTML = "";
  showClipHint("");
  setStatus("Sahne temizlendi.");
});

function fillCatalogOptions(select: HTMLSelectElement, entries: AssetCatalogEntry[], emptyMsg: string): void {
  for (const entry of entries) {
    const opt = document.createElement("option");
    opt.value = assetPath(entry);
    opt.textContent = formatOptionLabel(entry);
    opt.dataset.kind = entry.kind;
    select.appendChild(opt);
  }
  if (entries.length === 0) {
    const opt = document.createElement("option");
    opt.disabled = true;
    opt.textContent = emptyMsg;
    select.appendChild(opt);
  }
}

async function loadModelList(): Promise<void> {
  try {
    const res = await fetch("/__workbench/models");
    if (!res.ok) throw new Error(`${res.status}`);
    catalog = (await res.json()) as AssetCatalogEntry[];
    fillCatalogOptions(modelListSelect, catalog, "(public/assets/models/ boş)");
    fillCatalogOptions(extraClipListSelect, catalog.filter((e) => e.anims > 0), "(klipsiz klasör)");
  } catch (err) {
    const msg = "(liste alınamadı — dev sunucusu mu kapalı?)";
    fillCatalogOptions(modelListSelect, [], msg);
    fillCatalogOptions(extraClipListSelect, [], msg);
    console.warn("workbench: model list fetch failed", err);
  }
}
void loadModelList();

modelListSelect.addEventListener("change", () => {
  const path = modelListSelect.value;
  if (!path) return;
  const file = path.split("/").pop() ?? path;
  const entry = catalog.find((e) => e.file === file);
  if (entry) void loadCatalogEntry(entry);
  else void loadFromPath(true, file);
});

if (import.meta.env.DEV) {
  (window as unknown as { __WB_DEBUG__: object }).__WB_DEBUG__ = {
    get mixer() {
      return mixer;
    },
    get bundle() {
      return bundle;
    },
    get animRoot() {
      return animRoot;
    },
  };
}

setStatus("Hazır. Bir GLB sürükleyin ya da listeden seçin — [rig] satırları animasyon içerir.");
