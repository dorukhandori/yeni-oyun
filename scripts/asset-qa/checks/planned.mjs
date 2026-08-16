/**
 * Declared-but-not-implemented checks.
 *
 * Listed here (rather than in a doc only) so `npm run test:assets` always
 * prints the full intended gate and what each missing piece would cost.
 * Nothing here installs or requires anything — they render as PLANNED.
 *
 * When one is implemented it becomes a real module in this folder with the
 * standard `{ id, title, requires, run(ctx) }` contract and is removed here.
 *
 * (palette / contrast / regression graduated out of this list on 2026-08-16.)
 */

export const PLANNED = [
  {
    id: "depth",
    title: "depth separation — Laplacian variance ratio foreground/background",
    requires: ["nothing new — reuses the regression check's screenshot"],
    weight: "~30 lines",
    note:
      "benchmark §5 criterion 4. Only meaningful once DOF (V3/BokehPass) actually exists — today the ratio is ~1.0 " +
      "by construction, which is the evidence for the gap, not a regression to guard.",
  },
  {
    id: "drawcalls",
    title: "draw-call / triangle budget from renderer.info",
    requires: ["nothing new — reuses the browser harness"],
    weight: "~40 lines",
    note:
      "The hardware-independent half of benchmark §5 criterion 5. FPS itself stays out of this gate on purpose: " +
      "a threshold that passes on sahip's machine and fails elsewhere teaches people to ignore the gate.",
  },
];
