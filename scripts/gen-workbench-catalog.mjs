/**
 * Bake GLB metadata for the asset workbench dropdown (dev + GitHub Pages).
 * Output: public/workbench-models.json (copied to dist/ by Vite).
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const MODELS_DIR = join("public", "assets", "models");
const OUT = join("public", "workbench-models.json");

function classifyAsset({ meshes, skins, anims }) {
  if (anims > 0 && meshes === 0 && skins === 0) return "clip-only";
  if (skins > 0 || anims > 0) return "rig";
  return "mesh";
}

function readGlbCatalogEntry(file) {
  const buf = readFileSync(join(MODELS_DIR, file));
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));
  const meshes = json.meshes?.length ?? 0;
  const skins = json.skins?.length ?? 0;
  const anims = json.animations?.length ?? 0;
  const animNames = (json.animations ?? []).map((a, i) => a.name ?? `anim_${i}`);
  const kind = classifyAsset({ meshes, skins, anims });
  return { file, meshes, skins, anims, animNames, kind };
}

const catalog = readdirSync(MODELS_DIR)
  .filter((f) => /\.(glb|gltf)$/i.test(f))
  .sort()
  .map(readGlbCatalogEntry);

writeFileSync(OUT, JSON.stringify(catalog));
console.log(`wrote ${OUT} (${catalog.length} models)`);
