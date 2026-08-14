export type GroundKind = "rock" | "water" | "plank" | "moss" | "soil" | "stand";

export type CropStage = "none" | "seed" | "sprout" | "grow" | "ripe";

export type ToolId = "hoe" | "seed" | "water" | "hand";

export interface Cell {
  ground: GroundKind;
  /** Soil plots only. */
  farmable: boolean;
  tilled: boolean;
  wet: boolean;
  crop: CropStage;
  grow: number;
  /** Visual dirty flag so the 3D layer only rebuilds what changed. */
  dirty: boolean;
}

export interface CaveMap {
  cells: Cell[][];
  width: number;
  height: number;
  spawn: { cx: number; cz: number };
  stand: { cx: number; cz: number };
}

export interface Inventory {
  coins: number;
  seeds: number;
  crops: number;
  stamina: number;
  maxStamina: number;
  staminaRegen: number;
}

export interface Toast {
  msg: string;
  life: number;
}
