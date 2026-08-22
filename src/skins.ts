/**
 * Playable Doryseus appearance. Title/Hub modal writes the id; sailor loads
 * the matching rig. Live default is classic (LOT-75 tunic) until the player
 * picks another. Not a gameplay unlock — cosmetic only.
 */
import { SAILOR } from "./constants";

export const SKIN_STORAGE_KEY = "lotophagoi-skin";
export const SKIN_CHANGE_EVENT = "lotophagoi-skin-change";

export type SkinId = "classic" | "konfuse";

export interface PlayerSkin {
  id: SkinId;
  label: string;
  hint: string;
  meshRig: string;
  meshRigBytes: number;
  /** Matte Lambert + albedo flatten so island sun/bloom don't smear prints. */
  mattePrint?: boolean;
}

export const PLAYER_SKINS: Record<SkinId, PlayerSkin> = {
  classic: {
    id: "classic",
    label: "Tunik",
    hint: "Ada kıyafeti — keten tunic, kemer, sandalet.",
    meshRig: SAILOR.meshRig,
    meshRigBytes: SAILOR.meshRigBytes,
  },
  konfuse: {
    id: "konfuse",
    label: "Kömbe",
    hint: "Siyah oversized tişört ve şort.",
    meshRig: "assets/models/char_doryseus_konfuse_rig_5000.glb",
    meshRigBytes: 3032100,
    mattePrint: true,
  },
};

export function isSkinId(raw: string | null | undefined): raw is SkinId {
  return raw === "classic" || raw === "konfuse";
}

export function loadSavedSkin(): SkinId {
  try {
    const raw = window.localStorage.getItem(SKIN_STORAGE_KEY);
    return isSkinId(raw) ? raw : "classic";
  } catch {
    return "classic";
  }
}

export function saveSkin(id: SkinId): void {
  try {
    window.localStorage.setItem(SKIN_STORAGE_KEY, id);
  } catch {
    /* private mode — selection still applies this session via the event */
  }
  window.dispatchEvent(new CustomEvent(SKIN_CHANGE_EVENT, { detail: id }));
}

export function skinById(id: SkinId): PlayerSkin {
  return PLAYER_SKINS[id];
}
