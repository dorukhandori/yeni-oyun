/** One-click workbench presets — asset rows and live scene slices. */

import { SAILOR } from "../constants";

export type PresetKind = "scene" | "asset";

export interface WorkbenchPreset {
  id: string;
  label: string;
  hint: string;
  kind: PresetKind;
  /** GLB path under public/ when kind=asset */
  path?: string;
  /** Auto-play this clip name after load */
  clip?: string;
  /** scene id when kind=scene */
  scene?: "ship-sea";
}

export const WORKBENCH_PRESETS: WorkbenchPreset[] = [
  {
    id: "ship-sea",
    label: "Gemi + dalgalar",
    hint: "Gerstner deniz, geminin dalgalanması, yelken ve ayrılış",
    kind: "scene",
    scene: "ship-sea",
  },
  {
    id: "dory-idle",
    label: "Doryseus idle",
    hint: "LOT-75 Tripo auto-rig + preset:idle — SAILOR.meshRig.",
    kind: "asset",
    path: SAILOR.meshRig,
    clip: "preset:idle",
  },
  {
    id: "dory-walk",
    label: "Doryseus walk",
    hint: "LOT-75 Tripo auto-rig + preset:walk. Gölge plakası kesildi.",
    kind: "asset",
    path: SAILOR.meshRig,
    clip: "preset:walk",
  },
  {
    id: "dory-run",
    label: "Doryseus run",
    hint: "LOT-75 Tripo auto-rig + preset:run.",
    kind: "asset",
    path: SAILOR.meshRig,
    clip: "preset:run",
  },
  {
    id: "thallope",
    label: "Thallope",
    hint: "Yaratık hop/walk",
    kind: "asset",
    path: "assets/models/creature_thallope_01_mesh_4000.glb",
    clip: "walk",
  },
  {
    id: "dory-konfuse",
    label: "Doryseus Konfuse",
    hint: "Konfuse tee+şort — Tripo auto-rig idle/walk/run/dig. Varsayılan SAILOR değil; Title Görünüm.",
    kind: "asset",
    path: "assets/models/char_doryseus_konfuse_rig_5000.glb",
    clip: "preset:idle",
  },
];
