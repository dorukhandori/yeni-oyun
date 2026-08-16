/**
 * Zero-dependency image dimension reader for the formats this repo actually
 * ships: PNG and WebP (all three WebP flavours: lossy VP8, lossless VP8L,
 * extended VP8X). Reads only the first ~64 bytes of the file.
 *
 * Deliberately NOT a general image library — if we ever ship JPEG/KTX2 this
 * needs a case, and the caller degrades to "unknown" rather than guessing.
 */

import { openSync, readSync, closeSync } from "node:fs";

/** @returns {Buffer} */
function head(file, bytes = 64) {
  const fd = openSync(file, "r");
  try {
    const buf = Buffer.alloc(bytes);
    const read = readSync(fd, buf, 0, bytes, 0);
    return buf.subarray(0, read);
  } finally {
    closeSync(fd);
  }
}

/**
 * @param {string} file absolute path
 * @returns {{ width: number, height: number, format: string } | null}
 */
export function imageSize(file) {
  let b;
  try {
    b = head(file);
  } catch {
    return null;
  }
  if (b.length < 16) return null;

  // PNG: 8-byte signature, then IHDR chunk (length, "IHDR", w, h)
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    if (b.subarray(12, 16).toString("ascii") !== "IHDR") return null;
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), format: "png" };
  }

  // WebP: "RIFF" .... "WEBP" <fourcc>
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") {
    const fourcc = b.subarray(12, 16).toString("ascii");
    if (fourcc === "VP8X") {
      // 24-bit little-endian canvas width-1 / height-1 at offsets 24 / 27
      const w = (b[24] | (b[25] << 8) | (b[26] << 16)) + 1;
      const h = (b[27] | (b[28] << 8) | (b[29] << 16)) + 1;
      return { width: w, height: h, format: "webp/vp8x" };
    }
    if (fourcc === "VP8L") {
      // 14-bit width-1 then 14-bit height-1, packed LE after the 0x2f signature
      const bits = b.readUInt32LE(21);
      return {
        width: (bits & 0x3fff) + 1,
        height: ((bits >> 14) & 0x3fff) + 1,
        format: "webp/vp8l",
      };
    }
    if (fourcc === "VP8 ") {
      // Lossy: keyframe start code 0x9d 0x01 0x2a at offset 23, then 16-bit w/h
      if (b[23] !== 0x9d || b[24] !== 0x01 || b[25] !== 0x2a) return null;
      return {
        width: b.readUInt16LE(26) & 0x3fff,
        height: b.readUInt16LE(28) & 0x3fff,
        format: "webp/vp8",
      };
    }
    return null;
  }

  return null;
}
