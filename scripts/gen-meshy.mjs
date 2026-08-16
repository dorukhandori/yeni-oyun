#!/usr/bin/env node
/**
 * Meshy OpenAPI — retexture the existing Doryseus GLB with the 4-view sprites
 * so the nape is ASSET-044, not another face. Optional --rig after success.
 *
 *   node scripts/gen-meshy.mjs --balance
 *   node scripts/gen-meshy.mjs --retexture --glb public/assets/models/char_doryseus_01_mesh_8000.glb
 *
 * Key: MESHY_API_KEY in .env.local (https://www.meshy.ai → API). Never print it.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const API = "https://api.meshy.ai/openapi/v1";
const SPRITES = {
  front: "public/assets/sprites/char_doryseus_front_01_albedo_512.png",
  left: "public/assets/sprites/char_doryseus_left_01_albedo_512.png",
  back: "public/assets/sprites/char_doryseus_back_01_albedo_512.png",
  right: "public/assets/sprites/char_doryseus_right_01_albedo_512.png",
};

function readDotenv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    let value = line.slice(idx + 1).trim();
    if (value.length >= 2 && value[0] === value.at(-1) && `"'`.includes(value[0])) {
      value = value.slice(1, -1);
    }
    out[line.slice(0, idx).trim()] = value;
  }
  return out;
}

function loadKey() {
  const env = { ...readDotenv(join(REPO_ROOT, ".env")), ...readDotenv(join(REPO_ROOT, ".env.local")) };
  return (process.env.MESHY_API_KEY ?? env.MESHY_API_KEY ?? "").trim();
}

function tag(key) {
  return key.length >= 4 ? `...${key.slice(-4)}` : "????";
}

function dataUri(filePath, mime) {
  const buf = readFileSync(filePath);
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function parseArgs(argv) {
  const opts = { balance: false, retexture: false, rig: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--balance") opts.balance = true;
    else if (a === "--retexture") opts.retexture = true;
    else if (a === "--rig") opts.rig = true;
    else if (a === "--glb") opts.glb = resolve(argv[++i]);
    else if (a === "-o" || a === "--output") opts.output = argv[++i];
  }
  return opts;
}

async function meshy(key, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Meshy ${path} ${res.status}: ${text.slice(0, 400)}`);
  }
  if (!res.ok) {
    throw new Error(`Meshy ${path} ${res.status}: ${JSON.stringify(json).slice(0, 800)}`);
  }
  return json;
}

async function poll(key, path, id) {
  for (let i = 0; i < 90; i++) {
    const task = await meshy(key, `${path}/${id}`);
    const status = (task.status ?? "").toUpperCase();
    if (status === "SUCCEEDED") return task;
    if (status === "FAILED" || status === "CANCELED") {
      throw new Error(`Meshy ${status}: ${JSON.stringify(task.task_error ?? task).slice(0, 800)}`);
    }
    if (i % 4 === 3) console.error(`Meshy ${id} ${status} ${task.progress ?? 0}%`);
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error("Meshy poll timed out");
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const key = loadKey();
  if (!key) {
    console.error("No MESHY_API_KEY. Put it in yeni-oyun/.env.local (see .env.example).");
    process.exit(1);
  }

  if (opts.balance) {
    const data = await meshy(key, "/balance");
    console.log(`Meshy key ${tag(key)} ${JSON.stringify(data)}`);
    return;
  }

  if (!opts.retexture) {
    console.error("Usage:\n  node scripts/gen-meshy.mjs --balance\n  node scripts/gen-meshy.mjs --retexture --glb path.glb [-o out.glb] [--rig]");
    process.exit(1);
  }

  const glbPath = opts.glb ?? join(REPO_ROOT, "public/assets/models/char_doryseus_01_mesh_8000.glb");
  if (!existsSync(glbPath)) {
    console.error(`GLB not found: ${glbPath}`);
    process.exit(1);
  }
  for (const p of Object.values(SPRITES)) {
    if (!existsSync(join(REPO_ROOT, p))) {
      console.error(`Sprite missing: ${p}`);
      process.exit(1);
    }
  }

  console.error(`Meshy key ${tag(key)} retexture meshy-7 4-view`);
  const created = await meshy(key, "/retexture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_url: dataUri(glbPath, "application/octet-stream"),
      ai_model: "meshy-7",
      enable_pbr: false,
      enable_original_uv: false,
      multiview_image_urls: [
        dataUri(join(REPO_ROOT, SPRITES.front), "image/png"),
        dataUri(join(REPO_ROOT, SPRITES.left), "image/png"),
        dataUri(join(REPO_ROOT, SPRITES.back), "image/png"),
        dataUri(join(REPO_ROOT, SPRITES.right), "image/png"),
      ],
    }),
  });
  const id = created.result ?? created.id;
  if (!id) throw new Error(`No task id: ${JSON.stringify(created).slice(0, 400)}`);
  console.error(`Meshy retexture ${id}`);
  const task = await poll(key, "/retexture", id);
  const url = task.model_urls?.glb ?? task.result?.model_urls?.glb;
  if (!url) throw new Error(`No glb url: ${JSON.stringify(task).slice(0, 600)}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GLB download ${res.status}`);
  const outPath = opts.output
    ? resolve(opts.output)
    : join(REPO_ROOT, "art-source/raw/char_doryseus_01_meshy_retex.glb");
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  console.log(`Wrote ${outPath} task=${id} credits=${task.consumed_credits ?? "?"}`);
  console.log("Stays in art-source until pipeline.md §8. Then copy to public/assets/models/.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
