#!/usr/bin/env node
/**
 * Tripo OpenAPI v3 — Polyphemos BOSS mesh from the locked ASSET-125 T-pose
 * multiview set (sahip onayı, 28 Ağu 2026: "onaylıyorum, tripo ile mesh üret").
 *
 * Same proven call pattern as `gen-tripo-retexture.mjs` (which produced the
 * shipped Doryseus mesh) — that file is left untouched so the Doryseus
 * pipeline keeps working; this is the boss's own entry point with its own
 * input set and defaults.
 *
 * Two Tripo calls, back to back (`--generate`):
 *   1) `POST /v3/generation/multiview-to-model` with `texture:false` —
 *      geometry only, from the four locked stills. Returns a task id that
 *      step 2 can retexture (Tripo can only retexture ITS OWN task ids).
 *   2) `POST /v3/models/texture` (`type: texture_model`) on that fresh task
 *      id, using the same four stills as texture direction.
 *
 * Input set (ASSET-125, docs/art/asset-registry.md):
 *   front = polyphemos2_tpose_front_v1.png
 *   back  = polyphemos2_tpose_back_v1.png
 *   left  = polyphemos2_tpose_LEFT_LOCK.png   (sahip's own pick, left_v2)
 *   right = polyphemos2_tpose_RIGHT_LOCK.png  (deterministic mirror of left)
 *
 * Hands are EMPTY in every view by design — the olive-wood club is a separate
 * prop asset, so auto-rigging stays clean and clubless clips (grabbing lunge,
 * blinded rage) remain possible.
 *
 * Usage:
 *   node scripts/gen-tripo-polyphemos.mjs --balance
 *   node scripts/gen-tripo-polyphemos.mjs --generate [--polycount 10000] [-o out.glb]
 *   node scripts/gen-tripo-polyphemos.mjs --texture-only --task <geometry_task_id> [-o out.glb]
 *
 * Key: TRIPO_API_KEY (env, .env.local, or ../game-project/.env.local). Never
 * printed — only the last 4 characters. SPENDS REAL CREDITS: run only with
 * sahip's explicit go-ahead (`visual-change-gate.md` G1).
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(REPO_ROOT, "art-source", "raw");
const API_HOSTS = ["https://openapi.tripo3d.ai", "https://openapi.tripo3d.com"];
const H_MODEL = "v3.1-20260211";
const POLL_MS = 2000;
const POLL_ATTEMPTS = 200;

/** ASSET-125 locked T-pose multiview (see file header). */
const VIEWS = {
  front: "art-source/raw/polyphemos2_tpose_front_v1.png",
  left: "art-source/raw/polyphemos2_tpose_LEFT_LOCK.png",
  back: "art-source/raw/polyphemos2_tpose_back_v1.png",
  right: "art-source/raw/polyphemos2_tpose_RIGHT_LOCK.png",
};

/** Texture direction — same wording family as the ASSET-123/125 prompts. */
const TEXTURE_PROMPT =
  "One-eyed cyclops shepherd: bald wrinkled terracotta-brown leathery skin, single amber slit-pupil eye, " +
  "cream goat-fleece mantle over the shoulders, dark goat-hide kilt with rope belt and bronze bells, " +
  "dirty mud-caked feet with cracked black claw-nails. Painterly stylized game texture, cool blue-grey " +
  "shadows, warm amber highlights. No text, no logos.";

function readDotenv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const name = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.length >= 2 && value[0] === value.at(-1) && `"'`.includes(value[0])) {
      value = value.slice(1, -1);
    }
    out[name] = value;
  }
  return out;
}

function loadKeys() {
  const localEnv = { ...readDotenv(join(REPO_ROOT, ".env")), ...readDotenv(join(REPO_ROOT, ".env.local")) };
  const sharedEnv = readDotenv(join(REPO_ROOT, "..", "game-project", ".env.local"));
  const seen = new Set();
  const ordered = [];
  for (const raw of [process.env.TRIPO_API_KEY, localEnv.TRIPO_API_KEY, sharedEnv.TRIPO_API_KEY]) {
    const val = (raw ?? "").trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      ordered.push(val);
    }
  }
  return ordered;
}

const tag = (key) => (key.length >= 4 ? `...${key.slice(-4)}` : "????");

function mimeFor(path) {
  const ext = extname(path).toLowerCase();
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return null;
}

function unwrap(json, text, label) {
  if (json && typeof json.code === "number" && json.code !== 0) {
    throw new Error(`${label} code ${json.code}: ${text.slice(0, 800)}`);
  }
  return json?.data ?? json;
}

async function tripoFetch(apiKey, path, init = {}) {
  let lastErr;
  for (const host of API_HOSTS) {
    const headers = { Authorization: `Bearer ${apiKey}`, ...(init.headers ?? {}) };
    const res = await fetch(`${host}${path}`, { ...init, headers });
    const text = await res.text();
    if (!res.ok) {
      lastErr = new Error(`Tripo ${path} ${res.status} @ ${host}: ${text.slice(0, 800)}`);
      if (res.status === 404 || res.status === 502) continue;
      throw lastErr;
    }
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Tripo ${path} non-JSON @ ${host}: ${text.slice(0, 400)}`);
    }
    return unwrap(json, text, `Tripo ${path}`);
  }
  throw lastErr ?? new Error(`Tripo ${path}: all hosts failed`);
}

async function uploadImage(apiKey, imagePath) {
  const mime = mimeFor(imagePath);
  if (!mime) throw new Error(`Tripo accepts jpg/jpeg/png/webp only (got ${extname(imagePath)}).`);
  const buf = readFileSync(imagePath);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: mime }), basename(imagePath));
  const data = await tripoFetch(apiKey, "/v3/files", { method: "POST", body: form });
  const token = data.file_token ?? data.token;
  if (!token) throw new Error(`Upload returned no file_token: ${JSON.stringify(data).slice(0, 400)}`);
  return token;
}

async function pollTask(apiKey, id) {
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    const task = await tripoFetch(apiKey, `/v3/tasks/${id}`);
    const status = (task.status ?? "").toLowerCase();
    if (status === "success" || status === "succeeded") return task;
    if (["failed", "cancelled", "canceled", "expired"].includes(status)) {
      throw new Error(`Tripo ${status}: ${JSON.stringify(task.error ?? task).slice(0, 800)}`);
    }
    if (i % 5 === 4) console.error(`Tripo ${id} ${task.status ?? "pending"} ${task.progress ?? 0}%`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error("Timed out waiting for Tripo.");
}

async function printBalance(apiKey) {
  const data = await tripoFetch(apiKey, "/v3/account/balance");
  const balance = data.balance ?? data.credits ?? data;
  console.log(`Tripo key ${tag(apiKey)} balance=${typeof balance === "object" ? JSON.stringify(balance) : balance}`);
}

async function uploadViews(apiKey) {
  const tokens = {};
  for (const [view, path] of Object.entries(VIEWS)) {
    const abs = join(REPO_ROOT, path);
    if (!existsSync(abs)) throw new Error(`View missing: ${path}`);
    tokens[view] = await uploadImage(apiKey, abs);
    console.error(`Tripo file ${view}=${tokens[view]}`);
  }
  return tokens;
}

/** Step 1 — geometry only, from the four locked stills. */
async function generateGeometry(apiKey, polycount) {
  const tokens = await uploadViews(apiKey);
  const body = {
    model: H_MODEL,
    texture: false,
    pbr: false,
    auto_size: true,
    smart_low_poly: true,
    face_limit: polycount,
    inputs: Object.entries(tokens).map(([view, token]) => ({ [view]: token })),
  };
  console.error(`Tripo multiview-to-model (geometry only) faces=${polycount}`);
  const created = await tripoFetch(apiKey, "/v3/generation/multiview-to-model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const id = created.task_id ?? created.id;
  if (!id) throw new Error(`No task_id: ${JSON.stringify(created).slice(0, 400)}`);
  console.error(`Tripo geometry task ${id}`);
  await pollTask(apiKey, id);
  return { taskId: id, tokens };
}

/** Step 2 — texture the fresh geometry task with the same stills. */
async function retexture(apiKey, taskId, tokens) {
  const body = {
    type: "texture_model",
    original_model_task_id: taskId,
    texture: true,
    pbr: true,
    texture_alignment: "original_image",
    texture_quality: "standard",
    texture_prompt: TEXTURE_PROMPT,
    images: Object.values(tokens).map((token) => ({ file_token: token })),
  };
  console.error(`Tripo texture_model on ${taskId}`);
  const created = await tripoFetch(apiKey, "/v3/models/texture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const id = created.task_id ?? created.id;
  if (!id) throw new Error(`No texture task_id: ${JSON.stringify(created).slice(0, 400)}`);
  console.error(`Tripo texture task ${id}`);
  return await pollTask(apiKey, id);
}

const collectModelUrl = (task) => task.output?.pbr_model_url ?? task.output?.model_url ?? task.model_url;

async function uploadModel(apiKey, modelPath) {
  const buf = readFileSync(modelPath);
  const form = new FormData();
  form.append("file", new Blob([buf], { type: "model/gltf-binary" }), basename(modelPath));
  const data = await tripoFetch(apiKey, "/v3/files", { method: "POST", body: form });
  const token = data.file_token ?? data.token;
  if (!token) throw new Error(`Upload returned no file_token: ${JSON.stringify(data).slice(0, 400)}`);
  return token;
}

/** POST then poll, unless the response already carries the answer inline. */
async function postOrPoll(apiKey, endpoint, body, label) {
  const data = await tripoFetch(apiKey, endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (data.riggable != null || data.rig_type) return data;
  if (data.output?.riggable != null || data.output?.model_url) return data;
  const id = data.task_id ?? data.id;
  if (!id) throw new Error(`${label} returned no task: ${JSON.stringify(data).slice(0, 400)}`);
  console.error(`Tripo ${label} ${id}`);
  return pollTask(apiKey, id);
}

/**
 * Rig only — no clips (sahip, 28 Ağu: "rig kur, sonra klipleri üretiriz").
 * `gen-mesh.mjs --animate` chains rig-check → rig → retarget in one shot; the
 * boss needs its own moveset (overhead slam, sweep, ground slam, grab, blinded
 * rage), so we stop at the skeleton and choose clips deliberately afterwards.
 * Prints the rig task id — that id is the input for the later retarget call.
 */
async function rigOnly(apiKey, glbPath, outPath) {
  const source = await uploadModel(apiKey, glbPath);
  console.error(`Tripo file ${source}`);

  const check = await postOrPoll(apiKey, "/v3/animations/rig-check", { input: source }, "rig-check");
  const checkOut = check.output ?? check;
  if (checkOut.riggable === false) {
    throw new Error(`Not riggable: ${JSON.stringify(checkOut).slice(0, 400)}`);
  }
  const rigType = checkOut.rig_type ?? "biped";
  console.error(`Tripo rig-check riggable=${checkOut.riggable ?? "?"} type=${rigType}`);

  const rig = await postOrPoll(
    apiKey,
    "/v3/animations/rig",
    { input: source, rig_type: rigType, spec: "tripo", out_format: "glb", model: "v1.0-20240301" },
    "rig",
  );
  const rigId = rig.task_id ?? rig.id;
  const url = collectModelUrl(rig);
  if (!url) throw new Error(`Rig produced no model url: ${JSON.stringify(rig).slice(0, 600)}`);
  const bytes = await download(url, outPath);
  console.log(`rig_task=${rigId}`);
  console.log(`wrote ${outPath} (${bytes} bytes)`);
  return rigId;
}

async function download(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buf);
  return buf.length;
}

function parseArgs(argv) {
  const opts = { polycount: 10000, balance: false, generate: false, textureOnly: false, rigOnly: false, glb: null, task: null, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--balance") opts.balance = true;
    else if (a === "--generate") opts.generate = true;
    else if (a === "--rig-only") opts.rigOnly = true;
    else if (a === "--glb") opts.glb = argv[++i];
    else if (a === "--texture-only") opts.textureOnly = true;
    else if (a === "--task") opts.task = argv[++i];
    else if (a === "--polycount") opts.polycount = Number(argv[++i]);
    else if (a === "-o") opts.out = argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const keys = loadKeys();
  if (keys.length === 0) throw new Error("TRIPO_API_KEY not found (env / .env.local / ../game-project/.env.local).");
  const key = keys[0];

  if (opts.balance) {
    for (const k of keys) await printBalance(k);
    return;
  }

  if (opts.rigOnly) {
    if (!opts.glb) throw new Error("--rig-only needs --glb <path>");
    const out = opts.out ? resolve(REPO_ROOT, opts.out) : join(OUT_DIR, "char_polyphemos_boss_01_rig.glb");
    console.error(`Tripo key ${tag(key)} rig-only`);
    await rigOnly(key, resolve(REPO_ROOT, opts.glb), out);
    return;
  }

  let taskId = opts.task;
  let tokens;
  if (opts.generate) {
    console.error(`Tripo key ${tag(key)} generate faces=${opts.polycount}`);
    ({ taskId, tokens } = await generateGeometry(key, opts.polycount));
  } else if (opts.textureOnly) {
    if (!taskId) throw new Error("--texture-only needs --task <geometry_task_id>");
    tokens = await uploadViews(key);
  } else {
    console.error(
      "Usage:\n  node scripts/gen-tripo-polyphemos.mjs --balance\n" +
        "  node scripts/gen-tripo-polyphemos.mjs --generate [--polycount 10000] [-o out.glb]\n" +
        "  node scripts/gen-tripo-polyphemos.mjs --rig-only --glb <mesh.glb> [-o rig.glb]\n" +
        "  node scripts/gen-tripo-polyphemos.mjs --texture-only --task <geometry_task_id> [-o out.glb]",
    );
    process.exitCode = 1;
    return;
  }

  const task = await retexture(key, taskId, tokens);
  const url = collectModelUrl(task);
  if (!url) throw new Error(`No model url: ${JSON.stringify(task).slice(0, 600)}`);
  const out = opts.out ? resolve(REPO_ROOT, opts.out) : join(OUT_DIR, `char_polyphemos_boss_${opts.polycount}.glb`);
  const bytes = await download(url, out);
  console.log(`geometry_task=${taskId}`);
  console.log(`wrote ${out} (${bytes} bytes)`);
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exitCode = 1;
});
