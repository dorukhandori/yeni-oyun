/** Dev-only asset catalog types + pairing heuristics (workbench §4). */

export type AssetKind = "rig" | "mesh" | "clip-only" | "animated";

export interface AssetCatalogEntry {
  file: string;
  meshes: number;
  skins: number;
  anims: number;
  animNames: string[];
  kind: AssetKind;
}

export function classifyAsset(meta: Pick<AssetCatalogEntry, "meshes" | "skins" | "anims">): AssetKind {
  if (meta.meshes === 0 && meta.anims > 0) return "clip-only";
  if (meta.skins > 0 && meta.anims > 0) return "rig";
  if (meta.anims > 0) return "animated";
  return "mesh";
}

/** Shared prefix for Tripo variants: char_doryseus_02_{rig|mesh|textured|gestures}_8000.glb */
export function familyPrefix(file: string): string {
  const m = file.match(/^(.*)_(mesh|rig|textured|gestures)_(\d+)\.glb$/i);
  if (m) return m[1]!;
  return file.replace(/\.glb$/i, "");
}

export function kindBadge(kind: AssetKind, anims: number): string {
  switch (kind) {
    case "rig":
      return `[rig · ${anims} klip]`;
    case "clip-only":
      return `[klip · ${anims}]`;
    case "animated":
      return `[anim · ${anims}]`;
    default:
      return "[mesh · klipsiz]";
  }
}

export function formatOptionLabel(entry: AssetCatalogEntry): string {
  return `${entry.file} ${kindBadge(entry.kind, entry.anims)}`;
}

export function isCharacterAsset(file: string): boolean {
  return /^(char|creature)_/i.test(file);
}

/** Rig/clip donors in the same character family, best first. */
export function findClipDonors(entry: AssetCatalogEntry, catalog: AssetCatalogEntry[]): AssetCatalogEntry[] {
  const family = familyPrefix(entry.file);
  return catalog
    .filter((e) => e.anims > 0 && familyPrefix(e.file) === family && e.file !== entry.file)
    .sort((a, b) => donorScore(b) - donorScore(a) || b.anims - a.anims);
}

function donorScore(e: AssetCatalogEntry): number {
  if (e.kind === "rig") return 4;
  if (e.file.includes("gestures")) return 3;
  if (e.kind === "animated") return 2;
  return 1;
}

/** Visible mesh donor when the picked row is clip-only. */
export function findVisibleMesh(entry: AssetCatalogEntry, catalog: AssetCatalogEntry[]): AssetCatalogEntry | null {
  if (entry.meshes > 0) return entry;
  const family = familyPrefix(entry.file);
  const candidates = catalog.filter((e) => e.meshes > 0 && familyPrefix(e.file) === family);
  candidates.sort((a, b) => visibleScore(b) - visibleScore(a));
  return candidates[0] ?? null;
}

function visibleScore(e: AssetCatalogEntry): number {
  if (e.file.includes("textured")) return 5;
  if (e.kind === "rig") return 4;
  if (e.file.includes("mesh")) return 3;
  return 1;
}

/** Mesh-only character rows that should auto-open the rig for animation QA. */
export function findRigForAnimPreview(entry: AssetCatalogEntry, catalog: AssetCatalogEntry[]): AssetCatalogEntry | null {
  if (entry.skins > 0 || entry.anims > 0) return null;
  if (!isCharacterAsset(entry.file)) return null;
  const family = familyPrefix(entry.file);
  return (
    catalog.find((e) => familyPrefix(e.file) === family && e.skins > 0 && e.anims > 0 && e.kind === "rig") ??
    catalog.find((e) => familyPrefix(e.file) === family && e.skins > 0 && e.anims > 0) ??
    null
  );
}
