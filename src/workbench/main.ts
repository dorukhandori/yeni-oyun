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
  type GltfBundle,
} from "../world/gltf";
import {
  findClipDonors,
  findRigForAnimPreview,
  findVisibleMesh,
  formatOptionLabel,
  type AssetCatalogEntry,
} from "./catalog";
import { WORKBENCH_PRESETS, type WorkbenchPreset } from "./presets";
import { buildShipSeaPreview, type ScenePreview } from "./scenePreview";
import { createViewer } from "./viewer";

type Mode = "none" | "scene" | "asset";

const canvas = document.getElementById("wb-canvas") as HTMLCanvasElement;
const statusEl = document.getElementById("wb-status") as HTMLElement;
const presetGrid = document.getElementById("wb-preset-grid") as HTMLElement;
const liveControls = document.getElementById("wb-live-controls") as HTMLElement;
const liveTitle = document.getElementById("wb-live-title") as HTMLElement;
const sceneControls = document.getElementById("wb-scene-controls") as HTMLElement;
const clipControls = document.getElementById("wb-clip-controls") as HTMLElement;
const infoBox = document.getElementById("wb-info") as HTMLElement;

const departSlider = document.getElementById("wb-depart") as HTMLInputElement;
const departVal = document.getElementById("wb-depart-val") as HTMLElement;
const daySlider = document.getElementById("wb-day") as HTMLInputElement;
const dayVal = document.getElementById("wb-day-val") as HTMLElement;
const timeSpeed = document.getElementById("wb-time-speed") as HTMLInputElement;
const timeSpeedVal = document.getElementById("wb-time-speed-val") as HTMLElement;

const clipList = document.getElementById("wb-clip-list") as HTMLElement;
const animToggle = document.getElementById("wb-anim-toggle") as HTMLButtonElement;
const animRestart = document.getElementById("wb-anim-restart") as HTMLButtonElement;
const animLoop = document.getElementById("wb-anim-loop") as HTMLInputElement;
const animScrub = document.getElementById("wb-anim-scrub") as HTMLInputElement;
const animScrubVal = document.getElementById("wb-anim-scrub-val") as HTMLElement;
const animDur = document.getElementById("wb-anim-dur") as HTMLElement;
const pinEnable = document.getElementById("wb-pin-enable") as HTMLInputElement;

const dropZone = document.getElementById("wb-drop") as HTMLElement;
const filePick = document.getElementById("wb-file-pick") as HTMLButtonElement;
const fileInput = document.getElementById("wb-file-input") as HTMLInputElement;
const modelListSelect = document.getElementById("wb-model-list") as HTMLSelectElement;
const pathInput = document.getElementById("wb-path-input") as HTMLInputElement;
const loadBundleBtn = document.getElementById("wb-load-bundle") as HTMLButtonElement;
const loadModelBtn = document.getElementById("wb-load-model") as HTMLButtonElement;
const fitEnable = document.getElementById("wb-fit-enable") as HTMLInputElement;
const fitMeters = document.getElementById("wb-fit-meters") as HTMLInputElement;
const extraClipListSelect = document.getElementById("wb-extra-clip-list") as HTMLSelectElement;
const extraClipAdd = document.getElementById("wb-extra-clip-add") as HTMLButtonElement;
const clearBtn = document.getElementById("wb-clear") as HTMLButtonElement;

const viewer = createViewer(canvas);
const rawLoader = new GLTFLoader();

let catalog: AssetCatalogEntry[] = [];
let mode: Mode = "none";

// Asset mode
let bundle: GltfBundle | null = null;
let animRoot: THREE.Object3D | null = null;
let restMap: Map<string, THREE.Vector3> = new Map();
let mixer: THREE.AnimationMixer | null = null;
let actions: THREE.AnimationAction[] = [];
let activeClipIndex = -1;
let pendingClipName = "";

// Scene mode
let scenePreview: ScenePreview | null = null;
let sceneTime = 0;
let departing = 0;
let day01 = 0.35;

// Shared playback
let playing = true;
let scrubDragging = false;
let timeScale = 1;

function setStatus(msg: string): void {
  statusEl.textContent = msg;
}

function setPresetActive(id: string): void {
  for (const btn of presetGrid.querySelectorAll<HTMLButtonElement>(".wb-preset")) {
    btn.classList.toggle("active", btn.dataset.presetId === id);
  }
}

function showLiveControls(kind: "scene" | "asset" | "none", title: string): void {
  if (kind === "none") {
    liveControls.hidden = true;
    return;
  }
  liveControls.hidden = false;
  liveTitle.textContent = title;
  sceneControls.hidden = kind !== "scene";
  clipControls.hidden = kind !== "asset";
}

function clearAll(): void {
  mode = "none";
  setPresetActive("");
  bundle = null;
  animRoot = null;
  scenePreview = null;
  sceneTime = 0;
  if (mixer) mixer.stopAllAction();
  mixer = null;
  actions = [];
  activeClipIndex = -1;
  viewer.setMixer(null);
  viewer.setModel(null);
  viewer.setBackdrop("studio");
  showLiveControls("none", "");
  clipList.innerHTML = "";
  infoBox.innerHTML = `<p class="wb-empty">Henüz bir önizleme seçilmedi.</p>`;
}

function activeAction(): THREE.AnimationAction | null {
  return activeClipIndex >= 0 ? actions[activeClipIndex] ?? null : null;
}

function updateScrubberUi(): void {
  const action = activeAction();
  if (!action) {
    animScrub.disabled = true;
    animScrubVal.textContent = "0.00";
    animDur.textContent = "0.00";
    return;
  }
  const dur = action.getClip().duration > 0 ? action.getClip().duration : 1;
  animScrub.disabled = false;
  animScrub.max = String(dur);
  const t = scrubDragging ? Number(animScrub.value) : action.time;
  animScrub.value = String(Math.min(t, dur));
  animScrubVal.textContent = Number(animScrub.value).toFixed(2);
  animDur.textContent = dur.toFixed(2);
}

viewer.setFrameHook((dt) => {
  if (!playing || timeScale <= 0) return;
  const step = dt * timeScale;

  if (mode === "scene" && scenePreview) {
    sceneTime += step;
    scenePreview.update(sceneTime, departing, viewer.camera, day01);
    return;
  }

  if (!scrubDragging) updateScrubberUi();
});

function rebuildActions(): void {
  if (mode !== "asset" || !bundle || !animRoot) {
    viewer.setMixer(null);
    return;
  }

  const prevIndex = activeClipIndex;
  const prevName = bundle.animations[prevIndex]?.name ?? pendingClipName;
  if (mixer) mixer.stopAllAction();
  mixer = new THREE.AnimationMixer(animRoot);
  viewer.setMixer(mixer);

  const pin = pinEnable.checked;
  actions = bundle.animations.map((clip) => {
    const src = pin ? pinClipBonePositions(clip, restMap) : clip;
    const action = mixer!.clipAction(src);
    action.setLoop(animLoop.checked ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
    action.clampWhenFinished = !animLoop.checked;
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

  let start = 0;
  if (prevName) {
    const idx = bundle.animations.findIndex((c) => c.name === prevName);
    if (idx >= 0) start = idx;
  } else if (prevIndex >= 0 && prevIndex < actions.length) {
    start = prevIndex;
  }
  playClip(start);
  pendingClipName = "";
}

function playClip(index: number): void {
  if (!actions[index]) return;
  actions.forEach((a, i) => {
    if (i !== index) a.stop();
  });
  activeClipIndex = index;
  const action = actions[index];
  action.reset();
  action.paused = !playing;
  action.play();
  [...clipList.children].forEach((el, i) => el.classList.toggle("active", i === index));
  updateScrubberUi();
}

function renderInfo(html: string): void {
  infoBox.innerHTML = html;
}

function mountAsset(scene: THREE.Group, animations: THREE.AnimationClip[], label: string): void {
  lightGltf(scene);
  scene.traverse((obj) => {
    const skinned = obj as THREE.SkinnedMesh;
    if (skinned.isSkinnedMesh) skinned.frustumCulled = false;
  });
  restMap = restBonePositions(scene);
  if (fitEnable.checked) fitGltfHeight(scene, Number(fitMeters.value) || 1.8);

  animRoot = scene;
  viewer.setBackdrop("studio");
  viewer.setModel(scene);
  viewer.frameModel();

  let skin = false;
  let tris = 0;
  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry;
    const idx = geo.getIndex();
    const pos = geo.getAttribute("position")?.count ?? 0;
    tris += idx ? idx.count / 3 : pos / 3;
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh) skin = true;
  });

  renderInfo(`
    <dl>
      <dt>Kaynak</dt><dd>${label}</dd>
      <dt>Rig</dt><dd>${skin ? "var" : "yok"}</dd>
      <dt>Klip</dt><dd>${animations.length}</dd>
      <dt>Üçgen</dt><dd>${Math.round(tris).toLocaleString("tr-TR")}</dd>
    </dl>
  `);

  bundle = { scene, animations };
  rebuildActions();
  showLiveControls("asset", "Karakter klipleri");
}

async function appendClipsFromPath(path: string): Promise<number> {
  if (!bundle) return 0;
  const extra = await loadGltfBundle(path);
  const existing = new Set(bundle.animations.map((c) => c.name));
  const fresh = extra.animations.filter((c) => !existing.has(c.name));
  if (fresh.length === 0) return 0;
  bundle.animations = [...bundle.animations, ...fresh];
  rebuildActions();
  return fresh.length;
}

async function loadCatalogEntry(entry: AssetCatalogEntry, clipName?: string): Promise<void> {
  pendingClipName = clipName ?? "";
  if (entry.kind === "clip-only") {
    const rig =
      findVisibleMesh(entry, catalog)?.skins
        ? findVisibleMesh(entry, catalog)
        : findRigForAnimPreview({ ...entry, meshes: 0, skins: 0 }, catalog);
    if (!rig) {
      setStatus(`"${entry.file}" için rig bulunamadı.`);
      return;
    }
    const b = await loadGltfBundle(`assets/models/${rig.file}`);
    mountAsset(cloneGltfBundle(b), b.animations, rig.file);
    await appendClipsFromPath(`assets/models/${entry.file}`);
    setStatus(`Yüklendi: ${entry.file} (+ rig ${rig.file})`);
    return;
  }

  const rigRedirect = findRigForAnimPreview(entry, catalog);
  if (rigRedirect) {
    const b = await loadGltfBundle(`assets/models/${rigRedirect.file}`);
    mountAsset(cloneGltfBundle(b), b.animations, rigRedirect.file);
    setStatus(`"${entry.file}" iskeletsiz — rig yüklendi: ${rigRedirect.file}`);
    for (const donor of findClipDonors(entry, catalog)) {
      await appendClipsFromPath(`assets/models/${donor.file}`);
    }
    return;
  }

  const path = `assets/models/${entry.file}`;
  if (entry.anims > 0) {
    const b = await loadGltfBundle(path);
    mountAsset(cloneGltfBundle(b), b.animations, entry.file);
  } else {
    const scene = await loadGltf(path);
    mountAsset(scene, [], entry.file);
  }
  setStatus(`Yüklendi: ${entry.file}`);
  if (clipName) {
    const idx = bundle?.animations.findIndex((c) => c.name === clipName) ?? -1;
    if (idx >= 0) playClip(idx);
  }
}

async function loadAssetPreset(preset: WorkbenchPreset): Promise<void> {
  clearAll();
  mode = "asset";
  setPresetActive(preset.id);
  setStatus(`Yükleniyor: ${preset.label}…`);
  const file = preset.path?.split("/").pop() ?? "";
  const entry = catalog.find((e) => e.file === file);
  if (entry) {
    await loadCatalogEntry(entry, preset.clip);
  } else if (preset.path) {
    pathInput.value = preset.path;
    const b = await loadGltfBundle(preset.path);
    mountAsset(cloneGltfBundle(b), b.animations, preset.path);
    if (preset.clip) {
      const idx = bundle?.animations.findIndex((c) => c.name === preset.clip) ?? -1;
      if (idx >= 0) playClip(idx);
    }
    setStatus(`Yüklendi: ${preset.path}`);
  }
}

function loadScenePreset(preset: WorkbenchPreset): void {
  clearAll();
  mode = "scene";
  setPresetActive(preset.id);
  scenePreview = buildShipSeaPreview();
  viewer.setBackdrop("ocean");
  viewer.setModel(scenePreview.group);
  viewer.frameObject(scenePreview.frameTarget());
  cameraPullBackForSea();

  renderInfo(`
    <dl>
      <dt>Sahne</dt><dd>Gemi + Gerstner deniz</dd>
      <dt>Gemi GLB</dt><dd>statik mesh — hareket kodda</dd>
      <dt>Dalgalar</dt><dd>shader + sampleOceanHull</dd>
      <dt>İpucu</dt><dd style="text-align:left">"Ayrılış" kaydırıcısını artır — gemi uzaklaşır, yelken şişer.</dd>
    </dl>
  `);

  showLiveControls("scene", "Gemi + dalgalar");
  setStatus(`${preset.label} — canlı önizleme. Ayrılış kaydırıcısını dene.`);
}

/** Ship is large (~42 m); default orbit is too tight on the hull. */
function cameraPullBackForSea(): void {
  const cam = viewer.camera;
  cam.position.multiplyScalar(1.55);
  cam.position.y += 8;
  cam.updateProjectionMatrix();
}

async function runPreset(preset: WorkbenchPreset): Promise<void> {
  if (preset.kind === "scene") {
    loadScenePreset(preset);
    return;
  }
  await loadAssetPreset(preset);
}

// Preset grid
for (const preset of WORKBENCH_PRESETS) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "wb-preset";
  btn.dataset.presetId = preset.id;
  btn.innerHTML = `<strong>${preset.label}</strong><span>${preset.hint}</span>`;
  btn.addEventListener("click", () => void runPreset(preset));
  presetGrid.appendChild(btn);
}

// Scene sliders
departSlider.addEventListener("input", () => {
  departing = Number(departSlider.value);
  departVal.textContent = departing.toFixed(2);
});
daySlider.addEventListener("input", () => {
  day01 = Number(daySlider.value);
  dayVal.textContent = day01.toFixed(2);
});

timeSpeed.addEventListener("input", () => {
  timeScale = Number(timeSpeed.value);
  timeSpeedVal.textContent = timeScale.toFixed(2);
});

animToggle.addEventListener("click", () => {
  playing = !playing;
  animToggle.textContent = playing ? "Duraklat" : "Oynat";
  const action = activeAction();
  if (action) action.paused = !playing;
});

animRestart.addEventListener("click", () => {
  if (mode === "scene") {
    sceneTime = 0;
    return;
  }
  const action = activeAction();
  if (!action) return;
  action.reset();
  action.paused = !playing;
  action.play();
  updateScrubberUi();
});

animLoop.addEventListener("change", () => rebuildActions());
pinEnable.addEventListener("change", () => rebuildActions());

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

// Advanced GLB loaders
async function loadFromPath(withAnimations: boolean): Promise<void> {
  const path = pathInput.value.trim();
  if (!path) return;
  clearAll();
  mode = "asset";
  setStatus(`Yükleniyor: ${path}`);
  if (withAnimations) {
    const b = await loadGltfBundle(path);
    mountAsset(cloneGltfBundle(b), b.animations, path);
  } else {
    mountAsset(await loadGltf(path), [], path);
  }
  setStatus(`Yüklendi: ${path}`);
}

loadBundleBtn.addEventListener("click", () => void loadFromPath(true));
loadModelBtn.addEventListener("click", () => void loadFromPath(false));

filePick.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  if (!f) return;
  fileInput.value = "";
  void (async () => {
    clearAll();
    mode = "asset";
    const buf = await f.arrayBuffer();
    await new Promise<void>((resolve, reject) => {
      rawLoader.parse(buf, "", (gltf) => {
        mountAsset(gltf.scene as THREE.Group, gltf.animations.slice(), f.name);
        resolve();
      }, reject);
    });
    setStatus(`Yüklendi: ${f.name}`);
  })();
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
  if (!f) return;
  void (async () => {
    clearAll();
    mode = "asset";
    const buf = await f.arrayBuffer();
    await new Promise<void>((resolve, reject) => {
      rawLoader.parse(buf, "", (gltf) => {
        mountAsset(gltf.scene as THREE.Group, gltf.animations.slice(), f.name);
        resolve();
      }, reject);
    });
    setStatus(`Yüklendi: ${f.name}`);
  })();
});

extraClipAdd.addEventListener("click", () => {
  const path = extraClipListSelect.value;
  if (path) void appendClipsFromPath(path).then((n) => setStatus(n ? `${n} klip eklendi` : "Klip zaten yüklü"));
});
extraClipListSelect.addEventListener("change", () => {
  const path = extraClipListSelect.value;
  if (!path) return;
  void appendClipsFromPath(path);
  extraClipListSelect.value = "";
});

clearBtn.addEventListener("click", () => {
  clearAll();
  setStatus("Temizlendi.");
});

async function loadModelList(): Promise<void> {
  try {
    const res = await fetch("/__workbench/models");
    if (!res.ok) throw new Error(`${res.status}`);
    catalog = (await res.json()) as AssetCatalogEntry[];
    for (const entry of catalog) {
      const opt = document.createElement("option");
      opt.value = `assets/models/${entry.file}`;
      opt.textContent = formatOptionLabel(entry);
      modelListSelect.appendChild(opt);
    }
    for (const entry of catalog.filter((e) => e.anims > 0)) {
      const opt = document.createElement("option");
      opt.value = `assets/models/${entry.file}`;
      opt.textContent = formatOptionLabel(entry);
      extraClipListSelect.appendChild(opt);
    }
  } catch {
    setStatus("Model listesi alınamadı — dev sunucusu açık mı?");
  }
}
void loadModelList();

modelListSelect.addEventListener("change", () => {
  const path = modelListSelect.value;
  if (!path) return;
  pathInput.value = path;
  const file = path.split("/").pop() ?? "";
  const entry = catalog.find((e) => e.file === file);
  void (entry ? loadCatalogEntry(entry) : loadFromPath(true));
});

if (import.meta.env.DEV) {
  (window as unknown as { __WB_DEBUG__: object }).__WB_DEBUG__ = {
    get mode() {
      return mode;
    },
    get mixer() {
      return mixer;
    },
    get scenePreview() {
      return scenePreview;
    },
  };
}

// Deep-link: ?preset=ship-sea
const presetParam = new URLSearchParams(location.search).get("preset");
const linked = WORKBENCH_PRESETS.find((p) => p.id === presetParam);
if (linked) void runPreset(linked);
