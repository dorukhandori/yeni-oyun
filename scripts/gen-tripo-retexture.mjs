#!/usr/bin/env node
/**
 * Tripo OpenAPI v3 — retexture the Doryseus GLB with the 4-view sprites,
 * using Tripo itself (sahip: "meshy değil, biz tripo kullanıyoruz" —
 * 2026-08-16, LOT-27). Replaces `gen-meshy.mjs` for this character.
 *
 * Tripo's retexture-an-existing-model task is `texture_model`
 * (docs.tripo3d.ai/texture/texture-model-v3-0-20250812.html). It needs an
 * `original_model_task_id` — a task id from a *Tripo* generation task. The
 * shipped `char_doryseus_01_mesh_8000.glb` / `_rig_8000.glb` were generated
 * in an earlier session whose task id was never written down anywhere in
 * this repo (`gen-mesh.mjs` only ever wrote the downloaded GLB, not the
 * task id). So `--regen-and-texture` does both Tripo calls back to back:
 * 1) multiview-to-model (geometry only, same locked ASSET-041..044 stills,
 *    `texture:false` — this is the exact call that already produced the
 *    shipped mesh) to get a *fresh* task id, then
 * 2) texture_model on that fresh task id, with the same 4 stills as the
 *    texture direction.
 *
 * Endpoint: `POST /v3/models/texture` — confirmed 2026-08-16 (a bare GET
 * returned 405, not 404, and a real POST with body succeeded, task
 * `56fb1681-c412-4a57-ad99-8f3e31132876`, 10 credits). Not in Tripo's public
 * prose docs (they describe fields, never a literal URL); found by probing
 * candidate paths and matching the documented sibling `POST /models/convert`.
 *
 * Directional-mapping caveat: unlike the multiview-to-model geometry call
 * (named `front`/`left`/`back`/`right` keys), Tripo's texture_model takes
 * an unordered `images` array for texture direction — there's no confirmed
 * guarantee it keeps per-view placement (front stays front, back stays
 * back) the way Meshy's `multiview_image_urls` does. Inspect the result
 * before trusting it; this may turn out to need the same fix Meshy would
 * have needed.
 *
 * Usage:
 *   node scripts/gen-tripo-retexture.mjs --balance
 *   node scripts/gen-tripo-retexture.mjs --regen-and-texture [--polycount 8000] [-o out.glb]
 *   node scripts/gen-tripo-retexture.mjs --texture-only --task <geometry_task_id> [-o out.glb]
 *
 * Key: TRIPO_API_KEY in .env.local (same wallet as gen-mesh.mjs). Never
 * prints the key — only the last 4 characters, for identification.
 * Agent must not run a generation without sahip G1 (`visual-change-gate.md`)
 * — this spends real Tripo credits (mesh regen + texture, not just texture).
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
const POLL_ATTEMPTS = 150;

const SPRITES = {
  front: "public/assets/sprites/char_doryseus_front_01_albedo_512.png",
  left: "public/assets/sprites/char_doryseus_left_01_albedo_512.png",
  back: "public/assets/sprites/char_doryseus_back_01_albedo_512.png",
  right: "public/assets/sprites/char_doryseus_right_01_albedo_512.png",
};

// Candidate paths for the texture_model task, tried in order until one
// doesn't 404. `/v3/models/texture` confirmed via a bare GET returning 405
// (route exists, wrong method) rather than 404 — mirrors the documented
// `POST /models/convert` sibling endpoint. Kept as a list in case Tripo
// versions this later.
const TEXTURE_MODEL_PATHS = [
  "/v3/models/texture",
  "/v3/texture/texture-model",
  "/v3/generation/texture-model",
];

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

function tag(key) {
  return key.length >= 4 ? `...${key.slice(-4)}` : "????";
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
  if (!mime) throw new Error(`Tripo accepts jpg/jpeg/png/webp only (got ${extname(imagePath)}).`);
  const buf = readFileSync(imagePath);
  const blob = new Blob([buf], { type: mime });
  const form = new FormData();
  form.append("file", blob, basename(imagePath));
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
    if (status === "failed" || status === "cancelled" || status === "canceled" || status === "expired") {
      throw new Error(`Tripo ${status}: ${JSON.stringify(task.error ?? task).slice(0, 800)}`);
    }
    if (i % 5 === 4) console.error(`Tripo ${id} ${task.status ?? "pending"} ${task.progress ?? 0}%`);
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  throw new Error("Timed out waiting for Tripo (5 min).");
}

async function printBalance(apiKey) {
  const data = await tripoFetch(apiKey, "/v3/account/balance");
  const balance = data.balance ?? data.credits ?? data;
  console.log(`Tripo key ${tag(apiKey)} balance=${typeof balance === "object" ? JSON.stringify(balance) : balance}`);
}

/** Step 1: geometry-only multiview-to-model — same call that made the shipped GLB, but this run's task id is retexturable. */
async function regenGeometry(apiKey, polycount) {
  const tokens = await uploadSprites(apiKey);
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

/** Step 2: texture_model on the fresh task id, direction = the same 4 stills. */
async function retexture(apiKey, taskId, tokens) {
  const body = {
    type: "texture_model",
    original_model_task_id: taskId,
    texture: true,
    pbr: true,
    texture_alignment: "original_image",
    texture_quality: "standard",
    texture_prompt: {
      images: Object.values(tokens).map((token) => ({ file_token: token })),
    },
  };
  let lastErr;
  for (const path of TEXTURE_MODEL_PATHS) {
    try {
      console.error(`Tripo texture_model try ${path}`);
      const created = await tripoFetch(apiKey, path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const id = created.task_id ?? created.id;
      if (!id) throw new Error(`No task_id: ${JSON.stringify(created).slice(0, 400)}`);
      console.error(`Tripo texture task ${id} via ${path} — hardcode this path once confirmed.`);
      return pollTask(apiKey, id);
    } catch (err) {
      lastErr = err;
      console.error(`  ${path} failed: ${err.message}`);
    }
  }
  throw lastErr ?? new Error("All texture_model candidate paths failed.");
}

function collectModelUrl(task) {
  return task.output?.model_url ?? task.model_url ?? task.output?.pbr_model_url;
}

async function uploadSprites(apiKey) {
  const tokens = {};
  for (const [view, path] of Object.entries(SPRITES)) {
    const abs = join(REPO_ROOT, path);
    if (!existsSync(abs)) throw new Error(`Sprite missing: ${path}`);
    tokens[view] = await uploadImage(apiKey, abs);
    console.error(`Tripo file ${view}=${tokens[view]}`);
  }
  return tokens;
}

function parseArgs(argv) {
  const opts = { polycount: 8000, balance: false, regenAndTexture: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--balance") opts.balance = true;
    else if (a === "--regen-and-texture") opts.regenAndTexture = true;
    else if (a === "--texture-only") opts.textureOnly = true;
    else if (a === "--task") opts.task = argv[++i];
    else if (a === "--polycount") opts.polycount = Number(argv[++i]);
    else if (a === "-o" || a === "--output") opts.output = argv[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const keys = loadKeys();
  if (keys.length === 0) {
    console.error("No TRIPO_API_KEY. Set it in yeni-oyun/.env.local (see .env.example).");
    process.exit(1);
  }
  const key = keys[0];

  if (opts.balance) {
    await printBalance(key);
    return;
  }

  let taskId;
  let tokens;
  if (opts.textureOnly) {
    if (!opts.task) {
      console.error("--texture-only needs --task <geometry_task_id>.");
      process.exit(1);
    }
    console.error(`Tripo key ${tag(key)} texture-only task=${opts.task}`);
    taskId = opts.task;
    tokens = await uploadSprites(key); // fresh tokens — file tokens don't outlive a run.
  } else if (opts.regenAndTexture) {
    console.error(`Tripo key ${tag(key)} regen-and-texture faces=${opts.polycount}`);
    ({ taskId, tokens } = await regenGeometry(key, opts.polycount));
  } else {
    console.error(
      "Usage:\n  node scripts/gen-tripo-retexture.mjs --balance\n  node scripts/gen-tripo-retexture.mjs --regen-and-texture [--polycount 8000] [-o out.glb]\n  node scripts/gen-tripo-retexture.mjs --texture-only --task <geometry_task_id> [-o out.glb]",
    );
    process.exit(1);
  }

  const task = await retexture(key, taskId, tokens);
  const url = collectModelUrl(task);
  if (!url) throw new Error(`Retexture succeeded but no model url: ${JSON.stringify(task).slice(0, 600)}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GLB download ${res.status} (URL expires ~5 min after success)`);
  const outPath = opts.output
    ? resolve(opts.output)
    : join(OUT_DIR, "char_doryseus_01_tripo_retex.glb");
  mkdirSync(dirname(outPath), { recursive: true });
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);
  console.log(`Wrote ${outPath} (${buf.length} bytes) geomTask=${taskId} credits=${task.credits_consumed ?? "?"}`);
  console.log("Stays in art-source/raw until pipeline.md §8. Then copy to public/assets/models/ and re-check for a real back-of-head before trusting it.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
