import { GROW_TICKS, PRICES } from "../constants";
import type { Cell, CropStage, Inventory, ToolId } from "../types";

export const TOOLS: ToolId[] = ["hoe", "seed", "water", "hand"];

export const TOOL_LABELS: Record<ToolId, string> = {
  hoe: "Çapa",
  seed: "Tohum",
  water: "Su",
  hand: "Hasat",
};

export const TOOL_GLYPHS: Record<ToolId, string> = {
  hoe: "⛏",
  seed: "❃",
  water: "◈",
  hand: "✦",
};

const NEXT: Record<Exclude<CropStage, "none" | "ripe">, CropStage> = {
  seed: "sprout",
  sprout: "grow",
  grow: "ripe",
};

const NEED: Record<Exclude<CropStage, "none" | "ripe">, number> = {
  seed: GROW_TICKS.seed,
  sprout: GROW_TICKS.sprout,
  grow: GROW_TICKS.grow,
};

export function tickCrop(cell: Cell): void {
  if (cell.crop === "none" || cell.crop === "ripe") return;
  if (!cell.wet) return;
  cell.grow += 1;
  if (cell.grow >= NEED[cell.crop]) {
    cell.crop = NEXT[cell.crop];
    cell.grow = 0;
    cell.wet = false;
    cell.dirty = true;
  }
}

export type Fx = "dirt" | "plant" | "water" | "harvest" | "sell" | "buy";

export type ActResult =
  | { ok: true; msg: string; fx?: Fx }
  | { ok: false; msg: string };

export function useTool(cell: Cell, tool: ToolId, inv: Inventory): ActResult {
  if (inv.stamina <= 0 && tool !== "hand") {
    return { ok: false, msg: "Yorgun — biraz bekle" };
  }
  if (!cell.farmable) {
    return { ok: false, msg: "Burada tarla yok" };
  }

  switch (tool) {
    case "hoe": {
      if (cell.crop !== "none") return { ok: false, msg: "Önce hasat et" };
      if (cell.tilled) return { ok: false, msg: "Zaten sürülmüş" };
      cell.tilled = true;
      cell.dirty = true;
      spendStamina(inv, 1);
      return { ok: true, msg: "Toprak sürüldü", fx: "dirt" };
    }
    case "seed": {
      if (!cell.tilled) return { ok: false, msg: "Önce çapala" };
      if (cell.crop !== "none") return { ok: false, msg: "Dolu tarla" };
      if (inv.seeds <= 0) return { ok: false, msg: "Tohum yok — tezgâhtan al (B)" };
      inv.seeds -= 1;
      cell.crop = "seed";
      cell.grow = 0;
      cell.wet = false;
      cell.dirty = true;
      spendStamina(inv, 1);
      return { ok: true, msg: "Tohum ekildi", fx: "plant" };
    }
    case "water": {
      if (cell.crop === "none" && !cell.tilled) return { ok: false, msg: "Sulacak bir şey yok" };
      if (cell.crop === "ripe") return { ok: false, msg: "Hasat zamanı" };
      if (cell.wet) return { ok: false, msg: "Zaten ıslak" };
      cell.wet = true;
      cell.dirty = true;
      spendStamina(inv, 1);
      return { ok: true, msg: "Sulandı", fx: "water" };
    }
    case "hand": {
      if (cell.crop !== "ripe") return { ok: false, msg: "Henüz olgun değil" };
      cell.crop = "none";
      cell.tilled = true;
      cell.wet = false;
      cell.grow = 0;
      cell.dirty = true;
      inv.crops += 1;
      return { ok: true, msg: "Hasat! Spirit-mote +1", fx: "harvest" };
    }
  }
}

export function trySell(inv: Inventory): ActResult {
  if (inv.crops <= 0) return { ok: false, msg: "Satacak mahsul yok" };
  const gain = inv.crops * PRICES.cropSell;
  inv.coins += gain;
  inv.crops = 0;
  return { ok: true, msg: `+${gain} altın`, fx: "sell" };
}

export function tryBuySeed(inv: Inventory): ActResult {
  if (inv.coins < PRICES.seedBuy) return { ok: false, msg: "Altın yetmez" };
  inv.coins -= PRICES.seedBuy;
  inv.seeds += 1;
  return { ok: true, msg: `Tohum +1 (−${PRICES.seedBuy})`, fx: "buy" };
}

function spendStamina(inv: Inventory, n: number): void {
  inv.stamina = Math.max(0, inv.stamina - n);
  inv.staminaRegen = 0;
}

export function regenStamina(inv: Inventory): void {
  if (inv.stamina >= inv.maxStamina) return;
  inv.staminaRegen += 1;
  if (inv.staminaRegen >= 150) {
    inv.staminaRegen = 0;
    inv.stamina = Math.min(inv.maxStamina, inv.stamina + 1);
  }
}
