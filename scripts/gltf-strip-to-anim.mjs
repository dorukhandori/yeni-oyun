#!/usr/bin/env node
/**
 * Strip a GLB down to "just enough to drive an AnimationMixer against
 * another model's skeleton": node hierarchy (bone transforms + names) and
 * animations only. Drops meshes, materials, textures, images and skins —
 * none of that is read at runtime for a clip-only attach (see sailor.ts's
 * `loadGltfExtraClips` / the workbench's `addExtraClip`, same pattern:
 * THREE.AnimationMixer binds tracks by bone *name* string lookup on
 * whatever scene graph you hand it, so the donor file's own mesh/skin is
 * never touched).
 *
 * Tripo's `/v3/animations/retarget` always re-exports full geometry
 * (`export_with_geometry: true` is required by the API), so a 2-clip
 * gesture file still costs ~7 MB shipped — this repairs that back down to
 * a K37-safe size (see docs/production/roadmap.md K37: 8 MB download
 * target, already 10.12 MB over before this file existed).
 *
 * Usage: node scripts/gltf-strip-to-anim.mjs <in.glb> <out.glb>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [, , inPath, outPath] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage: node scripts/gltf-strip-to-anim.mjs <in.glb> <out.glb>");
  process.exit(1);
}

const buf = readFileSync(inPath);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error("not a GLB (bad magic)");
const jsonLen = buf.readUInt32LE(12);
const json = JSON.parse(buf.slice(20, 20 + jsonLen).toString("utf8"));
const binChunkStart = 20 + jsonLen;
const binChunkLen = buf.readUInt32LE(binChunkStart);
const binStart = binChunkStart + 8;
const bin = buf.slice(binStart, binStart + binChunkLen);

// ---- find every accessor actually needed by animation samplers ----------
const keepAccessors = new Set();
for (const anim of json.animations ?? []) {
  for (const s of anim.samplers ?? []) {
    keepAccessors.add(s.input);
    keepAccessors.add(s.output);
  }
}

// ---- repack buffer: copy only the kept accessors' bytes, contiguously ---
const oldAccessors = json.accessors ?? [];
const oldBufferViews = json.bufferViews ?? [];
const newAccessors = [];
const newBufferViews = [];
const accessorRemap = new Map(); // old index -> new index
const chunks = [];
let cursor = 0;

const sortedKeep = [...keepAccessors].sort((a, b) => a - b);
for (const oldIdx of sortedKeep) {
  const acc = oldAccessors[oldIdx];
  const bv = oldBufferViews[acc.bufferView];
  const byteOffset = (bv.byteOffset ?? 0) + (acc.byteOffset ?? 0);
  const compSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[acc.componentType];
  const numComp = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[acc.type];
  // Animation accessors are never interleaved/sparse in Tripo's export —
  // fail loudly rather than silently ship a corrupt clip if that changes.
  if (acc.sparse) throw new Error(`accessor ${oldIdx} is sparse, not handled`);
  const stride = bv.byteStride ?? compSize * numComp;
  // Compact (no byteStride) copy: walk element-by-element so a strided
  // source still packs tightly in the output.
  const elemSize = compSize * numComp;
  const packed = Buffer.alloc(elemSize * acc.count);
  for (let i = 0; i < acc.count; i++) {
    bin.copy(packed, i * elemSize, byteOffset + i * stride, byteOffset + i * stride + elemSize);
  }
  const newBvIndex = newBufferViews.length;
  newBufferViews.push({ buffer: 0, byteOffset: cursor, byteLength: packed.length });
  chunks.push(packed);
  cursor += packed.length;
  // glTF pads each bufferView to a 4-byte boundary in the source; keep our
  // own repacked stream 4-byte aligned too, so consumers relying on that
  // convention don't choke.
  const pad = (4 - (cursor % 4)) % 4;
  if (pad > 0) {
    chunks.push(Buffer.alloc(pad));
    cursor += pad;
  }
  const newAccIndex = newAccessors.length;
  newAccessors.push({
    bufferView: newBvIndex,
    componentType: acc.componentType,
    count: acc.count,
    type: acc.type,
    min: acc.min,
    max: acc.max,
  });
  accessorRemap.set(oldIdx, newAccIndex);
}
const newBin = Buffer.concat(chunks);

const remappedAnimations = (json.animations ?? []).map((anim) => ({
  name: anim.name,
  channels: anim.channels,
  samplers: anim.samplers.map((s) => ({
    input: accessorRemap.get(s.input),
    output: accessorRemap.get(s.output),
    interpolation: s.interpolation,
  })),
}));

const strippedNodes = (json.nodes ?? []).map((n) => {
  const { mesh, skin, weights, ...rest } = n;
  return rest;
});

const newJson = {
  asset: json.asset,
  scene: json.scene,
  scenes: json.scenes,
  nodes: strippedNodes,
  animations: remappedAnimations,
  accessors: newAccessors,
  bufferViews: newBufferViews,
  buffers: [{ byteLength: newBin.length }],
};

// ---- reassemble GLB -------------------------------------------------------
let jsonStr = JSON.stringify(newJson);
while (jsonStr.length % 4 !== 0) jsonStr += " ";
const jsonBuf = Buffer.from(jsonStr, "utf8");
const jsonChunk = Buffer.concat([
  u32(jsonBuf.length),
  Buffer.from("JSON", "ascii"),
  jsonBuf,
]);
let binPadded = newBin;
if (binPadded.length % 4 !== 0) {
  binPadded = Buffer.concat([binPadded, Buffer.alloc(4 - (binPadded.length % 4))]);
}
const binChunk = Buffer.concat([u32(binPadded.length), Buffer.from("BIN\0", "ascii"), binPadded]);
const total = 12 + jsonChunk.length + binChunk.length;
const header = Buffer.concat([Buffer.from("glTF", "ascii"), u32(2), u32(total)]);
const out = Buffer.concat([header, jsonChunk, binChunk]);
writeFileSync(outPath, out);

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32LE(n, 0);
  return b;
}

console.log(
  `${inPath} (${buf.length} bytes) -> ${outPath} (${out.length} bytes), ` +
    `${((1 - out.length / buf.length) * 100).toFixed(1)}% smaller, ` +
    `${newJson.animations.length} clip(s): ${newJson.animations.map((a) => a.name).join(", ")}`,
);
