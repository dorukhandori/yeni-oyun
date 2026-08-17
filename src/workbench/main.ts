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
const clipControls = document.getElementById("wb-clip-controls") as HTMLElement;
const clipList = document.getElementById("wb-clip-list") as HTMLElement;
const animToggle = document.getElementById("wb-anim-toggle") as HTMLButtonElement;
const animLoop = document.getElementById("wb-anim-loop") as HTMLInputElement;
const animSpeed = document.getElementById("wb-anim-speed") as HTMLInputElement;
const animSpeedVal = document.getElementById("wb-anim-speed-val") as HTMLElement;
const pinEnable = document.getElementById("wb-pin-enable") as HTMLInputElement;

const extraClipListSelect = document.getElementById("wb-extra-clip-list") as HTMLSelectElement;
const extraClipPath = document.getElementById("wb-extra-clip-path") as HTMLInputElement;
const extraClipAdd = document.getElementById("wb-extra-clip-add") as HTMLButtonElement;

// -------------------------------------------------------------------- state
const viewer = createViewer(canvas);
const rawLoader = new GLTFLoader();

let bundle: GltfBundle | null = null;
let restMap: Map<string, THREE.Vector3> = new Map();
let mixer: THREE.AnimationMixer | null = null;
let actions: THREE.AnimationAction[] = [];
let activeClipIndex = -1;
let playing = true;

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

function renderInfo(root: THREE.Object3D, clipCount: number): void {
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
    </dl>
  `;
}

// -------------------------------------------------------------- animation UI
function stopMixer(): void {
  if (mixer) mixer.stopAllAction();
  mixer = null;
  actions = [];
  activeClipIndex = -1;
}

function rebuildActions(): void {
  // Tier 1: is *any* model loaded at all? "Dış klip ekle" must stay reachable
  // even when the loaded model ships zero clips of its own — that's the
  // whole point of testing an external clip against a clipless mesh.
  if (!bundle) {
    animEmpty.hidden = false;
    animLoaded.hidden = true;
    stopMixer();
    viewer.setMixer(null);
    return;
  }
  animEmpty.hidden = true;
  animLoaded.hidden = false;

  // Tier 2: does it currently have any clips to actually play?
  if (bundle.animations.length === 0) {
    clipsEmpty.hidden = false;
    clipControls.hidden = true;
    stopMixer();
    viewer.setMixer(null);
    return;
  }
  clipsEmpty.hidden = true;
  clipControls.hidden = false;

  const prevIndex = activeClipIndex;
  const root = viewer.modelRoot;
  stopMixer();
  mixer = new THREE.AnimationMixer(root);
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
}

animToggle.addEventListener("click", () => {
  playing = !playing;
  animToggle.textContent = playing ? "Duraklat" : "Oynat";
  const action = actions[activeClipIndex];
  if (action) action.paused = !playing;
});

animLoop.addEventListener("change", () => {
  const action = actions[activeClipIndex];
  if (!action) return;
  action.setLoop(animLoop.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
  action.clampWhenFinished = !animLoop.checked;
});

animSpeed.addEventListener("input", () => {
  const v = Number(animSpeed.value) || 1;
  animSpeedVal.textContent = v.toFixed(2);
  for (const a of actions) a.timeScale = v;
});

pinEnable.addEventListener("change", () => rebuildActions());

/**
 * Load a second GLB/GLTF purely for its clips (its own mesh/scene is
 * discarded) and append them onto the *currently loaded* model's mixer.
 * Three.js's AnimationMixer binds tracks by bone name, not by object
 * reference, so this "just works" as long as the source clip was authored
 * against the same skeleton naming as the loaded model (true for Doryseus
 * variants — same Tripo rig lineage) — no explicit retargeting step needed.
 * Silent-mismatch note lives in the HTML copy next to the input.
 * Shared by the dropdown (pick + auto-add) and the manual path + button.
 */
async function addExtraClip(path: string): Promise<void> {
  if (!path) {
    setStatus("Önce bir klip dosyası seçin ya da yol girin.");
    return;
  }
  if (!bundle) {
    setStatus("Önce Model sekmesinden bir model yükleyin — klip tek başına oynatılamaz.");
    return;
  }
  setStatus(`Klip yükleniyor: ${path}`);
  try {
    const extra = await loadGltfBundle(path);
    if (extra.animations.length === 0) {
      setStatus(`Yüklendi ama klip yok: ${path}`);
      return;
    }
    bundle.animations = [...bundle.animations, ...extra.animations];
    rebuildActions();
    setStatus(`${extra.animations.length} klip eklendi: ${path}`);
    extraClipPath.value = "";
  } catch (err) {
    setStatus(`Klip yükleme hatası (${path}): ${(err as Error)?.message ?? err}`);
  }
}

extraClipAdd.addEventListener("click", () => void addExtraClip(extraClipPath.value.trim()));

extraClipListSelect.addEventListener("change", () => {
  const path = extraClipListSelect.value;
  if (!path) return;
  void addExtraClip(path);
  extraClipListSelect.value = ""; // same file can be re-picked without a no-op "change"
});

// ------------------------------------------------------------------- loading
function currentTintHex(): number {
  return parseInt(tintColor.value.replace("#", ""), 16);
}

async function loadFromPath(withAnimations: boolean): Promise<void> {
  const path = pathInput.value.trim();
  if (!path) {
    setStatus("Önce bir yol girin (public/ köküne göre, ör. assets/models/foo.glb).");
    return;
  }
  setStatus(`Yükleniyor: ${path}`);
  try {
    if (withAnimations) {
      const b = await loadGltfBundle(path);
      const scene = cloneGltfBundle(b);
      mountModel(scene, b.animations);
    } else {
      const tint = tintEnable.checked ? currentTintHex() : undefined;
      const scene = await loadGltf(path, tint);
      mountModel(scene, []);
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
  setStatus(`Yükleniyor (yerel dosya): ${file.name}`);
  try {
    const { scene, animations } = await loadFromFile(file);
    mountModel(scene, animations);
    setStatus(`Yüklendi (yerel dosya): ${file.name}`);
  } catch (err) {
    setStatus(`Ayrıştırma hatası (${file.name}): ${(err as Error)?.message ?? err}. Draco-sıkıştırılmış ya da harici (.bin/texture) referanslı .gltf desteklenmiyor v1'de.`);
  }
}

/** Mirrors sailor.ts's mountMesh ordering — same known-good sequence. */
function mountModel(scene: THREE.Group, animations: THREE.AnimationClip[]): void {
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

  viewer.setModel(scene);
  viewer.frameModel();
  renderInfo(scene, animations.length);

  bundle = { scene, animations };
  rebuildActions();
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
  stopMixer();
  viewer.setMixer(null);
  viewer.setModel(null);
  infoBox.innerHTML = `<p class="wb-empty">Henüz bir model yüklenmedi.</p>`;
  animEmpty.hidden = false;
  animLoaded.hidden = true;
  clipList.innerHTML = "";
  setStatus("Sahne temizlendi.");
});

// -------------------------------------------------------- existing-asset list
// Dev-only convenience: /__workbench/models comes from vite.config.ts's
// workbenchAssetListPlugin, never exists in a production build. Same file
// list feeds two selects: "load as the model" (Model tab) and "add just its
// clips onto whatever's already loaded" (Animation tab) — there's no
// separate clip-only asset category yet, a GLB is a GLB either way.
function fillOptions(select: HTMLSelectElement, files: string[], emptyMsg: string): void {
  for (const f of files) {
    const opt = document.createElement("option");
    opt.value = `assets/models/${f}`;
    opt.textContent = f;
    select.appendChild(opt);
  }
  if (files.length === 0) {
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
    const files = (await res.json()) as string[];
    fillOptions(modelListSelect, files, "(public/assets/models/ boş)");
    fillOptions(extraClipListSelect, files, "(public/assets/models/ boş)");
  } catch (err) {
    const msg = "(liste alınamadı — dev sunucusu mu kapalı?)";
    fillOptions(modelListSelect, [], msg);
    fillOptions(extraClipListSelect, [], msg);
    console.warn("workbench: model list fetch failed", err);
  }
}
void loadModelList();

modelListSelect.addEventListener("change", () => {
  const path = modelListSelect.value;
  if (!path) return;
  pathInput.value = path;
  void loadFromPath(true);
});

setStatus("Hazır. Bir GLB sürükleyin ya da yol girin.");
