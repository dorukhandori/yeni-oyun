#!/usr/bin/env node
/**
 * Generate a Lotophagoi asset (image or video) via the Google Gemini API.
 *
 * Image path is a direct TS/Node port of the proven, working script at
 * `game-project/grow-sim/tools/generate_concept_image.py` — same endpoint,
 * same request shape, same model ids. That one is already field-tested.
 *
 * Video (Veo) path is a first draft — nothing in either project has called
 * Veo successfully yet. Treat it as unverified: if it errors, the script
 * prints the raw response body so the model/parameter names can be corrected
 * against your actual account's access.
 *
 * Never prints the API key. Only the last 4 characters, for identification.
 *
 * Usage:
 *   node scripts/gen-assets.mjs image "lotus flower, four bloom stages, ..." [--aspect 1:1] [--model gemini-2.5-flash-image] [-o path.png]
 *   node scripts/gen-assets.mjs video "12s trailer shot of ..." [--aspect 16:9] [--seconds 8] [--model veo-3.1-fast-generate-preview] [-o path.mp4]
 *
 * Key lookup order (first non-empty wins):
 *   1. process.env.GEMINI_API_KEY / GOOGLE_API_KEY
 *   2. yeni-oyun/.env.local, yeni-oyun/.env
 *   3. ../game-project/.env.local  (shared key already configured there — see AGENTS.md "Kaynak")
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");
const OUT_DIR = join(REPO_ROOT, "art-source", "raw");

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";
const ALT_IMAGE_MODEL = "gemini-3.1-flash-image-preview";
const DEFAULT_VIDEO_MODEL = "veo-3.1-fast-generate-preview";

function readDotenv(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const raw of readFileSync(path, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const idx = line.indexOf("=");
    const name = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.length >= 2 && value[0] === value.at(-1) && '"\''.includes(value[0])) {
      value = value.slice(1, -1);
    }
    out[name] = value;
  }
  return out;
}

function loadKeys() {
  const localEnv = { ...readDotenv(join(REPO_ROOT, ".env")), ...readDotenv(join(REPO_ROOT, ".env.local")) };
  const sharedEnv = readDotenv(join(REPO_ROOT, "..", "game-project", ".env.local"));
  const candidates = [
    process.env.GEMINI_API_KEY,
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY_FALLBACK,
    localEnv.GEMINI_API_KEY,
    localEnv.GOOGLE_API_KEY,
    localEnv.GEMINI_API_KEY_FALLBACK,
    sharedEnv.GEMINI_API_KEY,
    sharedEnv.GOOGLE_API_KEY,
    sharedEnv.GEMINI_API_KEY_FALLBACK,
  ];
  const seen = new Set();
  const ordered = [];
  for (const raw of candidates) {
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
  const [mode, ...rest] = argv;
  const opts = { aspect: "16:9", seconds: 8 };
  let prompt;
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--aspect") opts.aspect = rest[++i];
    else if (a === "--model") opts.model = rest[++i];
    else if (a === "--seconds") opts.seconds = Number(rest[++i]);
    else if (a === "-o" || a === "--output") opts.output = rest[++i];
    else if (a === "--prompt-file") prompt = readFileSync(resolve(rest[++i]), "utf-8").trim();
    else if (prompt === undefined) prompt = a;
  }
  return { mode, prompt, opts };
}

async function generateImage(prompt, apiKey, model, aspect) {
  const url = `${API_BASE}/models/${model}:generateContent`;
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"], imageConfig: { aspectRatio: aspect } },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 800)}`);
  }
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const b64 = part.inlineData?.data ?? part.inline_data?.data;
    if (b64) return Buffer.from(b64, "base64");
  }
  throw new Error(`No image returned. Try --model ${ALT_IMAGE_MODEL}`);
}

async function generateVideo(prompt, apiKey, model, aspect, seconds) {
  // UNVERIFIED PATH — Veo generation is async (long-running operation).
  // Adjust field names here against the real error body if this fails.
  const startUrl = `${API_BASE}/models/${model}:predictLongRunning`;
  const startBody = {
    instances: [{ prompt }],
    parameters: { aspectRatio: aspect, durationSeconds: seconds },
  };
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(startBody),
  });
  if (!startRes.ok) {
    throw new Error(`Veo start ${startRes.status}: ${(await startRes.text()).slice(0, 800)}`);
  }
  const op = await startRes.json();
  const opName = op.name;
  if (!opName) throw new Error(`No operation name returned: ${JSON.stringify(op).slice(0, 400)}`);

  const pollUrl = `${API_BASE}/${opName}`;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const pollRes = await fetch(pollUrl, { headers: { "x-goog-api-key": apiKey } });
    if (!pollRes.ok) {
      throw new Error(`Veo poll ${pollRes.status}: ${(await pollRes.text()).slice(0, 800)}`);
    }
    const status = await pollRes.json();
    if (status.done) {
      const sample = status.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
      const uri = sample?.uri;
      if (!uri) throw new Error(`Operation done but no video uri: ${JSON.stringify(status).slice(0, 800)}`);
      const videoRes = await fetch(uri, { headers: { "x-goog-api-key": apiKey } });
      if (!videoRes.ok) throw new Error(`Video download ${videoRes.status}`);
      return Buffer.from(await videoRes.arrayBuffer());
    }
  }
  throw new Error("Timed out waiting for Veo generation (5 min).");
}

async function main() {
  const { mode, prompt, opts } = parseArgs(process.argv.slice(2));
  if (!mode || !prompt || !["image", "video"].includes(mode)) {
    console.error(
      'Usage: node scripts/gen-assets.mjs <image|video> "prompt" [--aspect 16:9] [--model id] [--seconds 8] [-o path]\n' +
        "   or: node scripts/gen-assets.mjs <image|video> --prompt-file path.txt [same flags]",
    );
    process.exit(1);
  }

  const keys = loadKeys();
  if (keys.length === 0) {
    console.error(
      "No GEMINI_API_KEY found. Set it in yeni-oyun/.env.local, or it will fall back to " +
        "../game-project/.env.local (already configured there). Never paste the key in chat.",
    );
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const ext = mode === "image" ? "png" : "mp4";
  const outPath = opts.output ? resolve(opts.output) : join(OUT_DIR, `${mode}-${stamp}.${ext}`);

  let lastError;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    try {
      const model = opts.model ?? (mode === "image" ? DEFAULT_IMAGE_MODEL : DEFAULT_VIDEO_MODEL);
      const bytes =
        mode === "image"
          ? await generateImage(prompt, key, model, opts.aspect)
          : await generateVideo(prompt, key, model, opts.aspect, opts.seconds);
      writeFileSync(outPath, bytes);
      if (i > 0) console.error(`Used fallback Gemini key ${tag(key)}`);
      console.log(`Wrote ${outPath} (${bytes.length} bytes) key=${tag(key)} model=${model}`);
      console.log(
        `\nassets.csv row to add (docs/art/pipeline.md §7) once this passes the §8 acceptance gate:\n` +
          `<id>,<final path under public/assets/>,<category>,<class>,<prompt_file>,${model},none,${opts.aspect},<resolution>,${stamp.slice(0, 10)},generated,`,
      );
      return;
    } catch (err) {
      lastError = err;
      console.error(`Gemini key ${tag(key)} failed: ${err.message}`);
    }
  }
  console.error(lastError ?? new Error("All keys failed."));
  process.exit(1);
}

main();
