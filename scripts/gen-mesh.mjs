#!/usr/bin/env node
/**
 * Image-to-3D via Tripo OpenAPI v3 (`docs/art/pipeline.md` §5.1).
 *
 * Gemini/Higgsfield do not produce meshes. This script uploads an isolated
 * still, starts image-to-model, polls, and writes the GLB to art-source/raw/.
 * It never copies into public/assets/ — that is the §8 gate.
 *
 * Default: untextured H3.1 + smart_low_poly. Tripo's albedo repeats the
 * paper-card failure (art-bible.md §8). Geometry only; engine lights it.
 * `pbr` stays false — the API forces texture on if pbr is true.
 *
 * Never prints the API key. Only the last 4 characters, for identification.
 *
 * Usage:
 *   node scripts/gen-mesh.mjs --balance
 *   node scripts/gen-mesh.mjs --image art-source/work/flora_olive_01_alpha_keyed.png
 *   node scripts/gen-mesh.mjs --image path.png --polycount 4000 -o art-source/raw/flora_olive_01_mesh.glb
 *   node scripts/gen-mesh.mjs --image path.png --texture   # opt-in; usually wrong for us
 *   node scripts/gen-mesh.mjs --image path.png --p1        # P1 low-poly instead of H3.1
 *
 * Key lookup (first non-empty wins):
 *   1. process.env.TRIPO_API_KEY
 *   2. yeni-oyun/.env.local, yeni-oyun/.env
 *   3. ../game-project/.env.local
 *
 * Agent must not run a generation without sahip G1 (`visual-change-gate.md`).
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(REPO_ROOT, "art-source", "raw");
const API_HOSTS = ["https://openapi.tripo3d.ai", "https://openapi.tripo3d.com"];
const H_MODEL = "v3.1-20260211";
const P_MODEL = "P1-20260311";
const POLL_MS = 2000;
/** Textured H3.1 jobs often exceed 5 min; 15 min covers image-to-model + albedo. */
const POLL_ATTEMPTS = 450;

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
  for (const raw of [
    process.env.TRIPO_API_KEY,
    localEnv.TRIPO_API_KEY,
    sharedEnv.TRIPO_API_KEY,
  ]) {
    const val = (raw ?? "").trim();
    if (val && !seen.has(val)) {
      seen.add(val);
      ordered.push(val);
    }
  }
  return ordered;
}

function tag(key) {
  return key.length >= 4 ? `...${key.slice(-4)}` : "????";
}

function parseArgs(argv) {
  const opts = {
    polycount: 4000,
    texture: false,
    pbr: false,
    p1: false,
    balance: false,
    animate: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--image") opts.image = resolve(argv[++i]);
    else if (a === "-o" || a === "--output") opts.output = argv[++i];
    else if (a === "--polycount") opts.polycount = Number(argv[++i]);
    else if (a === "--texture") opts.texture = true;
    else if (a === "--texture-quality") opts.textureQuality = argv[++i];
    else if (a === "--pbr") opts.pbr = true;
    else if (a === "--p1") opts.p1 = true;
    else if (a === "--balance") opts.balance = true;
    else if (a === "--front") opts.front = resolve(argv[++i]);
    else if (a === "--left") opts.left = resolve(argv[++i]);
    else if (a === "--back") opts.back = resolve(argv[++i]);
    else if (a === "--right") opts.right = resolve(argv[++i]);
    else if (a === "--animate") opts.animate = true;
    else if (a === "--task") opts.task = argv[++i];
    else if (a === "--glb") opts.glb = resolve(argv[++i]);
    // Comma-separated Tripo preset names, e.g. "preset:idle,preset:biped:dig".
    // Defaults to the idle/walk/run trio already shipped on SAILOR.meshRig.
    else if (a === "--animations") opts.animations = argv[++i].split(",").map((s) => s.trim());
  }
  return opts;
}

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
  if (!mime) {
    throw new Error(`Tripo accepts jpg/jpeg/png/webp only (got ${extname(imagePath)}).`);
  }
  const buf = readFileSync(imagePath);
  const blob = new Blob([buf], { type: mime });
  const form = new FormData();
  form.append("file", blob, basename(imagePath));
  const data = await tripoFetch(apiKey, "/v3/files", { method: "POST", body: form });
  const token = data.file_token ?? data.token;
  if (!token) throw new Error(`Upload returned no file_token: ${JSON.stringify(data).slice(0, 400)}`);
  return token;
}

async function createTask(apiKey, body, endpoint) {
  const data = await tripoFetch(apiKey, endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const id = data.task_id ?? data.id;
  if (!id) throw new Error(`No task_id: ${JSON.stringify(data).slice(0, 400)}`);
  return id;
}

async function pollTask(apiKey, id) {
  for (let i = 0; i < POLL_ATTEMPTS; i++) {
    const task = await tripoFetch(apiKey, `/v3/tasks/${id}`);
    const status = (task.status ?? "").toLowerCase();
    if (status === "success" || status === "succeeded") return task;
    if (status === "failed" || status === "cancelled" || status === "canceled" || status === "expired") {
      throw new Error(`Tripo ${status}: ${JSON.stringify(task.error ?? task).slice(0, 800)}`);
    }
    if (i % 5 === 4) {
      console.error(`Tripo ${id} ${task.status ?? "pending"} ${task.progress ?? 0}%`);
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error(`Timed out waiting for Tripo (${Math.round((POLL_MS * POLL_ATTEMPTS) / 60000)} min).`);
}

async function downloadGlb(task, outPath) {
  const url = task.output?.model_url ?? task.model_url;
  if (!url) {
    throw new Error(`success but no output.model_url: ${JSON.stringify(task).slice(0, 600)}`);
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GLB download ${res.status} (URL expires ~5 min after success)`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, buf);
  return buf.length;
}

async function printBalance(apiKey) {
  const data = await tripoFetch(apiKey, "/v3/account/balance");
  const balance = data.balance ?? data.credits ?? data;
  console.log(`Tripo key ${tag(apiKey)} balance=${typeof balance === "object" ? JSON.stringify(balance) : balance}`);
}

function collectModelUrls(output) {
  const found = [];
  const push = (name, raw) => {
    const url = typeof raw === "string" ? raw : raw?.url ?? raw?.model_url;
    if (url) found.push({ name, url });
  };
  if (!output) return found;
  push("model", output.model_url);
  const urls = output.model_urls;
  if (Array.isArray(urls)) {
    urls.forEach((u, i) => push(`clip${i}`, u));
  } else if (urls && typeof urls === "object") {
    for (const [k, v] of Object.entries(urls)) push(k, v);
  }
  return found;
}

async function uploadModel(apiKey, modelPath) {
  const buf = readFileSync(modelPath);
  const blob = new Blob([buf], { type: "model/gltf-binary" });
  const form = new FormData();
  form.append("file", blob, basename(modelPath));
  const data = await tripoFetch(apiKey, "/v3/files", { method: "POST", body: form });
  const token = data.file_token ?? data.token;
  if (!token) throw new Error(`Upload returned no file_token: ${JSON.stringify(data).slice(0, 400)}`);
  return token;
}

async function postOrPoll(apiKey, endpoint, body, label) {
  const data = await tripoFetch(apiKey, endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (data.riggable != null || data.rig_type) return data;
  if (data.output?.riggable != null || data.output?.model_url || data.output?.model_urls) return data;
  const id = data.task_id ?? data.id;
  if (!id) throw new Error(`${label} returned no task: ${JSON.stringify(data).slice(0, 400)}`);
  console.error(`Tripo ${label} ${id}`);
  return pollTask(apiKey, id);
}

async function animateCharacter(apiKey, opts) {
  let source = opts.task;
  if (!source && opts.glb) {
    source = await uploadModel(apiKey, opts.glb);
    console.error(`Tripo file ${source}`);
  }
  if (!source) throw new Error("--animate needs --task <id> or --glb path");

  const check = await postOrPoll(apiKey, "/v3/animations/rig-check", { input: source }, "rig-check");
  const checkOut = check.output ?? check;
  const riggable = checkOut.riggable;
  const rigType = checkOut.rig_type ?? "biped";
  if (riggable === false) {
    throw new Error(`Not riggable: ${JSON.stringify(checkOut).slice(0, 400)}`);
  }
  console.error(`Tripo rig-check riggable=${riggable ?? "?"} type=${rigType}`);

  const rig = await postOrPoll(
    apiKey,
    "/v3/animations/rig",
    {
      input: source,
      rig_type: rigType,
      spec: "tripo",
      out_format: "glb",
      model: "v1.0-20240301",
    },
    "rig",
  );
  const rigId = rig.task_id ?? rig.id ?? source;
  console.error(`Tripo rigged ${rigId}`);

  const anim = await postOrPoll(
    apiKey,
    "/v3/animations/retarget",
    {
      input: rigId,
      animations: opts.animations ?? ["preset:idle", "preset:walk", "preset:run"],
      out_format: "glb",
      bake_animation: true,
      animate_in_place: true,
      export_with_geometry: true,
    },
    "retarget",
  );
  const out = anim.output ?? anim;
  const urls = collectModelUrls(out);
  if (urls.length === 0) {
    throw new Error(`retarget had no model url: ${JSON.stringify(anim).slice(0, 800)}`);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseOut = opts.output
    ? resolve(opts.output)
    : join(OUT_DIR, `char-anim-${stamp}.glb`);
  mkdirSync(dirname(baseOut), { recursive: true });
  let bytes = 0;
  for (let i = 0; i < urls.length; i++) {
    const { name, url } = urls[i];
    const dest =
      urls.length === 1 ? baseOut : baseOut.replace(/\.glb$/i, `_${name.replace(/[^a-z0-9_-]/gi, "_")}.glb`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GLB download ${res.status} for ${name}`);
    const buf = Buffer.from(await res.arrayBuffer());
    writeFileSync(dest, buf);
    bytes += buf.length;
    console.log(`Wrote ${dest} (${buf.length} bytes) clip=${name}`);
  }
  const credits = anim.credits_consumed ?? out.credits_consumed;
  console.log(`Animate done credits=${credits ?? "?"} files=${urls.length} key=${tag(apiKey)}`);
  return bytes;
}

function usage() {
  return (
    "Usage:\n" +
    "  node scripts/gen-mesh.mjs --balance\n" +
    "  node scripts/gen-mesh.mjs --image still.png [-o art-source/raw/name.glb] [--polycount 4000]\n" +
    "  node scripts/gen-mesh.mjs --front f.png --left l.png --back b.png --right r.png --p1 --pbr\n" +
    "  Default: untextured H3.1 + smart_low_poly + auto_size. Pass --texture/--pbr only if you accept baked albedo.\n" +
    "  Pass --texture-quality detailed|extreme with --texture to spend extra credits on HD albedo.\n" +
    "  Pass --p1 for P1-20260311 (strict face_limit, no smart_low_poly).\n" +
    "  node scripts/gen-mesh.mjs --task <id> -o art-source/raw/name.glb   # resume poll + download\n" +
    "  node scripts/gen-mesh.mjs --animate --task <generation_task_id> [-o art-source/raw/name.glb]\n" +
    "  node scripts/gen-mesh.mjs --animate --glb art-source/raw/char.glb [-o …]\n" +
    "  Add --animations preset:idle,preset:walk,preset:run,preset:biped:dig to override the default trio.\n" +
    "  Agent does not generate without sahip G1."
  );
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const views = ["front", "left", "back", "right"].filter((k) => opts[k]);
  if (!opts.balance && !opts.animate && !opts.task && !opts.image && views.length === 0) {
    console.error(usage());
    process.exit(1);
  }
  if (opts.image && !existsSync(opts.image)) {
    console.error(`Image not found: ${opts.image}`);
    process.exit(1);
  }
  if (views.length && !opts.front) {
    console.error("Multiview requires --front (plus at least one other view).");
    process.exit(1);
  }
  if (views.length === 1) {
    console.error("Multiview needs at least 2 views.");
    process.exit(1);
  }
  for (const k of views) {
    if (!existsSync(opts[k])) {
      console.error(`Image not found: ${opts[k]}`);
      process.exit(1);
    }
  }

  const keys = loadKeys();
  if (keys.length === 0) {
    console.error(
      "No TRIPO_API_KEY. Set it in yeni-oyun/.env.local (see .env.example). Never paste the key in chat.",
    );
    process.exit(1);
  }

  if (opts.balance) {
    let lastError;
    for (const key of keys) {
      try {
        await printBalance(key);
        return;
      } catch (err) {
        lastError = err;
        console.error(`Tripo key ${tag(key)} balance failed: ${err.message}`);
      }
    }
    console.error(lastError ?? new Error("All keys failed."));
    process.exit(1);
  }

  if (opts.animate) {
    let lastError;
    for (const key of keys) {
      try {
        await animateCharacter(key, opts);
        return;
      } catch (err) {
        lastError = err;
        console.error(`Tripo key ${tag(key)} animate failed: ${err.message}`);
      }
    }
    console.error(lastError ?? new Error("All keys failed."));
    process.exit(1);
  }

  if (opts.task && !opts.animate) {
    const outPath = opts.output
      ? resolve(opts.output)
      : join(OUT_DIR, `mesh-${opts.task.slice(0, 8)}.glb`);
    let lastError;
    for (const key of keys) {
      try {
        const task = await pollTask(key, opts.task);
        const bytes = await downloadGlb(task, outPath);
        const credits = task.credits_consumed ?? task.output?.credits_consumed;
        console.log(
          `Wrote ${outPath} (${bytes} bytes) task=${opts.task} key=${tag(key)}` +
            (credits != null ? ` credits=${credits}` : ""),
        );
        return;
      } catch (err) {
        lastError = err;
        console.error(`Tripo key ${tag(key)} fetch failed: ${err.message}`);
      }
    }
    console.error(lastError ?? new Error("All keys failed."));
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outPath = opts.output ? resolve(opts.output) : join(OUT_DIR, `mesh-${stamp}.glb`);
  const model = opts.p1 ? P_MODEL : H_MODEL;

  const wantTexture = opts.texture || opts.pbr;
  const body = {
    input: null,
    model,
    texture: wantTexture,
    pbr: opts.pbr,
    auto_size: true,
    export_uv: wantTexture,
    face_limit: opts.polycount,
  };
  if (opts.textureQuality) body.texture_quality = opts.textureQuality;
  if (!opts.p1) body.smart_low_poly = true;

  let lastError;
  for (const key of keys) {
    try {
      console.error(
        `Tripo key ${tag(key)} model=${model} texture=${wantTexture} pbr=${opts.pbr} faces=${opts.polycount}` +
          (opts.textureQuality ? ` texture_quality=${opts.textureQuality}` : "") +
          (opts.p1 ? " p1" : " smart_low_poly") +
          (views.length ? ` views=${views.join(",")}` : ""),
      );
      const endpoint = views.length
        ? "/v3/generation/multiview-to-model"
        : "/v3/generation/image-to-model";
      if (views.length) {
        const inputs = [];
        for (const k of views) {
          const token = await uploadImage(key, opts[k]);
          console.error(`Tripo file ${k}=${token}`);
          inputs.push({ [k]: token });
        }
        body.inputs = inputs;
        delete body.input;
      } else {
        const fileToken = await uploadImage(key, opts.image);
        console.error(`Tripo file ${fileToken}`);
        body.input = fileToken;
      }
      const id = await createTask(key, body, endpoint);
      console.error(`Tripo task ${id}`);
      const task = await pollTask(key, id);
      const bytes = await downloadGlb(task, outPath);
      const credits = task.credits_consumed ?? task.output?.credits_consumed;
      console.log(
        `Wrote ${outPath} (${bytes} bytes) task=${id} key=${tag(key)}` +
          (credits != null ? ` credits=${credits}` : ""),
      );
      console.log(
        `\nStays in art-source/raw until pipeline.md §8. Then:\n` +
          `  public/assets/models/<kategori>_<ad>_01_mesh_${opts.polycount}.glb\n` +
          `  assets.csv row: model=${model} seed=none status=generated`,
      );
      return;
    } catch (err) {
      lastError = err;
      console.error(`Tripo key ${tag(key)} failed: ${err.message}`);
    }
  }
  console.error(lastError ?? new Error("All keys failed."));
  process.exit(1);
}

main();
