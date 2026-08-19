/** One-click workbench presets — asset rows and live scene slices. */

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
    id: "dory-walk",
    label: "Doryseus yürüyüş",
    hint: "Rig + walk klip",
    kind: "asset",
    path: "assets/models/char_doryseus_02_rig_8000.glb",
    clip: "preset:walk",
  },
  {
    id: "dory-idle",
    label: "Doryseus idle",
    hint: "Rig + idle klip",
    kind: "asset",
    path: "assets/models/char_doryseus_02_rig_8000.glb",
    clip: "preset:idle",
  },
  {
    id: "dory-gestures",
    label: "Doryseus jestler",
    hint: "Rig + wave/bow klipleri",
    kind: "asset",
    path: "assets/models/char_doryseus_02_gestures_8000.glb",
  },
  {
    id: "thallope",
    label: "Thallope",
    hint: "Yaratık hop/walk",
    kind: "asset",
    path: "assets/models/creature_thallope_01_mesh_4000.glb",
    clip: "walk",
  },
];
