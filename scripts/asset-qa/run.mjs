#!/usr/bin/env node
/**
 * Asset QA orchestrator — `npm run test:assets`
 *
 * Runs every check module in scripts/asset-qa/checks/ against a single shared,
 * read-only scan of public/assets/ + assets.csv. Never writes to public/assets/
 * or src/. Never starts a dev server. Safe to run while `npm run dev` is up.
 *
 * Usage:
 *   node scripts/asset-qa/run.mjs
 *   node scripts/asset-qa/run.mjs --only manifest
 *   node scripts/asset-qa/run.mjs --json report.json
 *   node scripts/asset-qa/run.mjs --strict          # warnings also fail
 *   node scripts/asset-qa/run.mjs --update-baseline # accept current findings
 *
 * Exit codes: 0 = gate passed · 1 = new findings · 2 = harness error.
 *
 * Baseline: scripts/asset-qa/baseline.json holds finding keys that are known
 * and consciously accepted. Known findings are reported but do not fail the
 * gate — a permanently-red gate is an ignored gate. New drift always fails.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { buildContext } from "./lib/context.mjs";
import { paint, severityLabel } from "./lib/report.mjs";
import { closeBrowser } from "./lib/browser.mjs";
import { PLANNED } from "./checks/planned.mjs";

import * as manifestCheck from "./checks/manifest.mjs";
import * as namingCheck from "./checks/naming.mjs";
import * as budgetCheck from "./checks/budget.mjs";
import * as contrastCheck from "./checks/contrast.mjs";
import * as paletteCheck from "./checks/palette.mjs";
import * as regressionCheck from "./checks/regression.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const BASELINE = join(HERE, "baseline.json");
const require = createRequire(import.meta.url);

/**
 * Registration order = report order. Add new modules here, one line.
 * Static checks first so a broken manifest is reported before the slow
 * browser checks spend 30 seconds confirming it.
 */
const CHECKS = [manifestCheck, namingCheck, budgetCheck, contrastCheck, paletteCheck, regressionCheck];

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const value = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : fallback;
};

const only = value("--only", null);
const strict = flag("--strict");
const updateBaseline = flag("--update-baseline");
const jsonOut = value("--json", null);

async function main() {
  const ctx = buildContext();

  /** @type {Set<string>} */
  const baseline = new Set(
    existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, "utf8")).accepted ?? [] : [],
  );

  const results = [];
  for (const mod of CHECKS) {
    if (only && mod.id !== only) continue;

    const missing = (mod.requires ?? []).filter((pkg) => {
      try {
        require.resolve(pkg);
        return false;
      } catch {
        return true;
      }
    });
    if (missing.length) {
      results.push({ id: mod.id, title: mod.title, status: "skip", missing, findings: [], notes: [] });
      continue;
    }

    // A check that throws is a harness bug, not a clean verdict — report it as
    // that check's failure instead of aborting the run, so the other five
    // still produce output.
    let findings = [];
    let notes = [];
    try {
      const r = await mod.run(ctx);
      findings = r.findings ?? [];
      notes = r.notes ?? [];
    } catch (err) {
      findings = [{ key: `${mod.id}/crash`, severity: "error", message: `check threw: ${err.message}` }];
      notes = [String(err.stack ?? "").split("\n").slice(1, 4).join("\n      ")];
    }
    const fresh = findings.filter((f) => !baseline.has(f.key));
    const known = findings.filter((f) => baseline.has(f.key));
    const blocking = fresh.filter((f) => f.severity === "error" || (strict && f.severity === "warn"));
    results.push({
      id: mod.id,
      title: mod.title,
      status: blocking.length ? "fail" : "pass",
      findings: fresh,
      known,
      notes,
    });
  }

  // ---- report -------------------------------------------------------------
  console.log(paint("cyan", "\nasset-qa — Lotophagoi\n"));
  let failed = 0;
  for (const r of results) {
    const badge =
      r.status === "fail" ? paint("red", "FAIL") : r.status === "skip" ? paint("grey", "SKIP") : paint("green", "PASS");
    console.log(`${badge}  ${paint("cyan", r.id.padEnd(10))} ${r.title}`);
    if (r.status === "skip") {
      console.log(`      ${paint("grey", `missing dependency: ${r.missing.join(", ")}`)}`);
      continue;
    }
    for (const n of r.notes) console.log(`      ${paint("grey", n)}`);
    for (const f of r.findings) {
      console.log(`      ${severityLabel(f.severity)} ${f.message}`);
      if (f.hint) console.log(`             ${paint("grey", f.hint)}`);
    }
    if (r.known?.length) {
      console.log(`      ${paint("grey", `${r.known.length} known finding(s) suppressed by baseline.json`)}`);
    }
    if (r.status === "fail") failed++;
    console.log("");
  }

  if (PLANNED.length && !only) {
    console.log(paint("grey", "planned (not implemented — see docs/production/asset-testing-platform.md):"));
    for (const p of PLANNED) {
      console.log(`      ${paint("grey", "····")}  ${paint("cyan", p.id.padEnd(10))} ${paint("grey", p.title)}`);
      console.log(`             ${paint("grey", `needs: ${p.requires.join(" · ")}`)}`);
    }
    console.log("");
  }

  if (updateBaseline) {
    const accepted = results.flatMap((r) => [...(r.findings ?? []), ...(r.known ?? [])]).map((f) => f.key).sort();
    writeFileSync(
      BASELINE,
      `${JSON.stringify({ updated: new Date().toISOString().slice(0, 10), accepted }, null, 2)}\n`,
    );
    console.log(paint("yellow", `baseline updated: ${accepted.length} accepted finding(s) -> ${BASELINE}`));
    return 0;
  }

  if (jsonOut) {
    writeFileSync(jsonOut, `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`);
    console.log(paint("grey", `json report -> ${jsonOut}`));
  }

  if (failed) {
    console.log(paint("red", `${failed} check(s) failed.`));
    console.log(paint("grey", "If a finding is known and accepted: node scripts/asset-qa/run.mjs --update-baseline\n"));
    return 1;
  }
  console.log(paint("green", "all checks passed.\n"));
  return 0;
}

main()
  .then(async (code) => {
    await closeBrowser();
    process.exit(code);
  })
  .catch(async (err) => {
    await closeBrowser().catch(() => {});
    console.error(paint("red", `asset-qa harness error: ${err.message}`));
    console.error(err.stack);
    process.exit(2);
  });
