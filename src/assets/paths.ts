/** Resolved URLs for shipping reference assets (public/assets/ref/). */

export function assetUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL;
  const clean = relativePath.replace(/^\//, "");
  return `${base}${clean}`;
}

export const REF_ASSETS = {
  odysseusTurnaround: "assets/ref/char_odysseus_turnaround_01_ref_2048.png",
  lotusStages: "assets/ref/lotus_stages_01_ref_2048.png",
} as const;
