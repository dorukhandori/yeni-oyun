/**
 * Shared finding/report shape for every asset-qa check.
 *
 * Cross-module contract (mirrors the `{ group, update(t) }` discipline that
 * every src/world/ builder follows). A check module exports:
 *
 *   export const id       = "manifest";              // stable, used by --only
 *   export const title    = "assets.csv <-> disk";   // human label
 *   export const requires = [];                      // npm packages it needs
 *   export async function run(ctx) -> { findings: Finding[], notes?: string[] }
 *
 * A check NEVER writes to public/assets/ or src/. It reads and reports.
 * If `requires` lists a package that is not installed, the orchestrator marks
 * the check SKIP (never FAIL) — an uninstalled optional dep must not turn the
 * gate red, otherwise nobody will run the gate.
 */

/**
 * @typedef {"error" | "warn" | "info"} Severity
 * @typedef {{ key: string, severity: Severity, message: string, hint?: string }} Finding
 */

/**
 * Build a finding. `key` must be stable across runs for the same problem —
 * it is what baseline.json stores, so it must not contain timestamps, byte
 * counts that drift, or absolute paths.
 *
 * @param {Severity} severity
 * @param {string} key
 * @param {string} message
 * @param {string} [hint]
 * @returns {Finding}
 */
export function finding(severity, key, message, hint) {
  return { key, severity, message, hint };
}

const ESC = "\u001b";
export const COLORS = {
  reset: `${ESC}[0m`,
  dim: `${ESC}[2m`,
  red: `${ESC}[31m`,
  yellow: `${ESC}[33m`,
  green: `${ESC}[32m`,
  cyan: `${ESC}[36m`,
  grey: `${ESC}[90m`,
};

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;

/** @param {keyof typeof COLORS} c @param {string} s */
export function paint(c, s) {
  return useColor ? `${COLORS[c]}${s}${COLORS.reset}` : s;
}

/** @param {Severity} sev */
export function severityLabel(sev) {
  if (sev === "error") return paint("red", "FAIL");
  if (sev === "warn") return paint("yellow", "WARN");
  return paint("grey", "INFO");
}
