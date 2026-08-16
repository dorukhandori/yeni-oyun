/**
 * C5 — HUD / menu text contrast (docs/ux/screens.md §3.5, WCAG AA >= 4.5:1).
 *
 * Why this needs a browser and not a CSS parse: the failure this repo actually
 * shipped (ASSET-052 storybook hub background, patched by hand afterwards) was
 * text over a busy IMAGE. The colour that matters only exists after CSS, the
 * webfont and the asset have composited. So we screenshot and read pixels.
 *
 * The WCAG ratio is implemented here rather than pulled from `wcag-contrast`:
 * it is relative luminance plus one division, and it is worth 12 lines to keep
 * a supply-chain entry out of the tree.
 *
 * Honest limitation: `text-shadow` is NOT credited. WCAG has no model for it,
 * and this repo leans on a cream text-shadow for exactly these labels. The
 * number below is therefore the pessimistic, spec-faithful one — read a
 * borderline result as "fragile", not necessarily "broken".
 */

import { finding } from "../lib/report.mjs";
import { openScene } from "../lib/browser.mjs";

export const id = "contrast";
export const title = "HUD/menu text contrast >= 4.5:1 (ux/screens.md §3.5)";
export const requires = ["playwright", "pngjs"];

const MIN_RATIO = 4.5;
/** Below this the label is large-scale text; WCAG AA allows 3:1 there. */
const LARGE_PX = 24;
const LARGE_RATIO = 3.0;

/** Screens and the text elements that sit on top of artwork. */
const TARGETS = [
  { phase: "title", selectors: [".title-name", ".title-sub", ".menu-btn.primary", ".menu-btn"] },
  {
    phase: "hub",
    selectors: [
      ".hub-title",
      ".hub-island-name",
      ".hub-quest-name",
      ".hub-island-badge.ready",
      ".hub-island-badge.locked-badge",
    ],
  },
];

/** sRGB channel -> linear */
function lin(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}
export function relativeLuminance(r, g, b) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
export function contrastRatio(a, b) {
  const l1 = relativeLuminance(...a);
  const l2 = relativeLuminance(...b);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Stable, ASCII-safe fragment of a label for use in a baseline key. */
function slug(text) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || "unnamed"
  );
}

/** "rgb(240, 232, 210)" / "rgba(...)" -> [r,g,b] */
function parseRgb(str) {
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(",").map((s) => parseFloat(s));
  return [p[0], p[1], p[2]];
}

/** @param {import("../lib/context.mjs").QaContext} _ctx */
export async function run(_ctx) {
  const { PNG } = await import("pngjs");
  const findings = [];
  const notes = [];

  for (const target of TARGETS) {
    const { page, errors } = await openScene({ phase: target.phase, profile: "test" });
    try {
      for (const e of errors) {
        findings.push(finding("error", `contrast/pageerror/${target.phase}`, `${target.phase}: page error — ${e}`));
      }

      const boxes = await page.evaluate((selectors) => {
        const out = [];
        // One element can match several selectors (.menu-btn.primary is also
        // .menu-btn) — measure each element once, under the first selector
        // that claimed it, so the report has no phantom duplicates.
        const seen = new Set();
        for (const sel of selectors) {
          for (const el of Array.from(document.querySelectorAll(sel))) {
            if (seen.has(el)) continue;
            const r = el.getBoundingClientRect();
            const cs = getComputedStyle(el);
            if (!r.width || !r.height || cs.visibility === "hidden" || cs.display === "none") continue;
            if (!(el.textContent ?? "").trim()) continue;
            seen.add(el);
            out.push({
              sel,
              text: (el.textContent ?? "").trim().slice(0, 24),
              x: Math.round(r.x),
              y: Math.round(r.y),
              w: Math.round(r.width),
              h: Math.round(r.height),
              color: cs.color,
              fontSize: parseFloat(cs.fontSize),
              fontWeight: cs.fontWeight,
            });
          }
        }
        return out;
      }, target.selectors);

      if (!boxes.length) {
        findings.push(
          finding("warn", `contrast/no-targets/${target.phase}`, `${target.phase}: none of the tracked selectors were visible`),
        );
        continue;
      }

      const png = PNG.sync.read(await page.screenshot({ type: "png", animations: "disabled" }));

      for (const b of boxes) {
        const fg = parseRgb(b.color);
        if (!fg) continue;
        const fgLum = relativeLuminance(...fg);

        // Collect candidate background pixels: everything inside the box that
        // is not part of a glyph. Glyph pixels are the ones close to the text
        // colour; antialiased edges sit between, so we drop a generous band.
        const lums = [];
        for (let y = b.y; y < Math.min(b.y + b.h, png.height); y++) {
          for (let x = b.x; x < Math.min(b.x + b.w, png.width); x++) {
            const i = (png.width * y + x) << 2;
            const r = png.data[i];
            const g = png.data[i + 1];
            const bl = png.data[i + 2];
            const dist = Math.abs(r - fg[0]) + Math.abs(g - fg[1]) + Math.abs(bl - fg[2]);
            if (dist < 150) continue; // glyph or its antialiasing
            lums.push(relativeLuminance(r, g, bl));
          }
        }
        if (lums.length < 20) {
          notes.push(`${target.phase} ${b.sel}: too few background pixels to sample (box is mostly glyph)`);
          continue;
        }

        // Worst realistic background = the sampled luminance closest to the
        // text luminance. The 5th percentile guards against a lone stray pixel
        // deciding the verdict.
        lums.sort((p, q) => Math.abs(p - fgLum) - Math.abs(q - fgLum));
        const worst = lums[Math.floor(lums.length * 0.05)];
        const ratio = (Math.max(fgLum, worst) + 0.05) / (Math.min(fgLum, worst) + 0.05);

        const isLarge = b.fontSize >= LARGE_PX || (b.fontSize >= 18.66 && Number(b.fontWeight) >= 700);
        const min = isLarge ? LARGE_RATIO : MIN_RATIO;

        if (ratio < min) {
          findings.push(
            finding(
              "error",
              // The label text is part of the key: three .hub-island-name
              // elements are three distinct findings, and baseline.json has to
              // be able to accept one without silencing the others.
              `contrast/${target.phase}/${b.sel}/${slug(b.text)}`,
              `${target.phase} ${b.sel} ("${b.text}"): ${ratio.toFixed(2)}:1, below ${min}:1`,
              "text-shadow is not credited by WCAG — raise the text colour or put an opaque plate behind it",
            ),
          );
        } else {
          notes.push(`${target.phase} ${b.sel.padEnd(28)} ${ratio.toFixed(2)}:1 (min ${min})`);
        }
      }
    } finally {
      await page.close();
    }
  }

  return { findings, notes };
}
