/**
 * Shared headless-browser harness for the checks that need a live page
 * (contrast, palette, regression).
 *
 * One Vite dev server + one Chromium, started lazily and reused across all
 * three checks in a single `npm run test:assets` run. Starting three servers
 * would be three ports, three cold starts and three chances to leak a process.
 *
 * IMPORTANT: this starts its OWN Vite server on a free port (`--port 0`), it
 * never attaches to the developer's `npm run dev` on 5173. Running the gate
 * while dev is up is safe.
 */

import { spawn } from "node:child_process";
import { ROOT } from "./context.mjs";

/** Viewport is fixed: screenshot regression is meaningless at a floating size. */
export const VIEWPORT = { width: 1280, height: 720 };
/** deviceScaleFactor 1 keeps baselines portable between a retina Mac and CI. */
export const DEVICE_SCALE = 1;

let shared = null;

async function startServer() {
  // No --strictPort: vite auto-increments past the developer's own `npm run
  // dev` on 5173. `--clearScreen false` keeps the banner in the pipe so the
  // URL regex below can find it.
  const proc = spawn("npx", ["vite", "--clearScreen", "false"], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, BROWSER: "none" },
  });

  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("vite did not report a URL within 60s")), 60_000);
    let buf = "";
    const onData = (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/Local:\s+(http:\/\/[^\s]+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1].replace(/\/$/, ""));
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", onData);
    proc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`vite exited early with code ${code}: ${buf.slice(-400)}`));
    });
  });

  // Vite prints "Local:" before it is reliably answering requests. Poll until
  // it actually serves, otherwise the first page.goto races the server and
  // fails with an opaque navigation timeout.
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      const res = await fetch(`${url}/`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`vite reported ${url} but never served a 200`);
    await new Promise((r) => setTimeout(r, 250));
  }

  return { proc, url };
}

/**
 * @returns {Promise<{ url: string, browser: import("playwright").Browser }>}
 */
export async function getBrowser() {
  if (shared) return shared;
  const { chromium } = await import("playwright");
  const server = await startServer();
  const browser = await chromium.launch({
    args: [
      // Headless Chromium falls back to SwiftShader for WebGL. That is exactly
      // what we want for regression baselines: a software rasteriser is
      // deterministic across machines, a real GPU driver is not.
      "--use-gl=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-lcd-text",
      "--force-color-profile=srgb",
      "--font-render-hinting=none",
    ],
  });
  shared = { url: server.url, browser, _server: server };
  return shared;
}

export async function closeBrowser() {
  if (!shared) return;
  await shared.browser.close().catch(() => {});
  shared._server.proc.kill("SIGTERM");
  shared = null;
}

/**
 * Opens a page, waits for the game loop to exist, drives it into `phase`
 * through the DEV test hooks, then freezes the simulation.
 *
 * @param {object} opts
 * @param {"title"|"hub"|"play"} opts.phase
 * @param {"test"|"real"} [opts.profile]
 * @param {number} [opts.memory] 0..1 forgetting amount
 * @param {number} [opts.seed] fixed lotus-field seed
 * @param {number} [opts.settleMs] simulated warm-up before freezing
 */
export async function openScene(opts) {
  const { url, browser } = await getBrowser();
  const profile = opts.profile ?? "test";
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: DEVICE_SCALE });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // `domcontentloaded` rather than `load`: the hook wait below is the real
  // readiness signal, and waiting for every texture to finish makes a cold
  // Vite transform of three.js look like a navigation failure.
  await page.goto(`${url}/?profile=${profile}`, { waitUntil: "domcontentloaded", timeout: 60_000 });

  // Deliberately a poll built on page.evaluate rather than page.waitForFunction:
  // waitForFunction is evaluated in an isolated world, which shares the DOM but
  // NOT properties that page scripts hang off `window` — so it never sees
  // __LOTOPHAGOI_TEST_HOOKS__ and just times out. page.evaluate runs in the
  // main world and does.
  const hookDeadline = Date.now() + 60_000;
  for (;;) {
    if (await page.evaluate(() => "__LOTOPHAGOI_TEST_HOOKS__" in window)) break;
    if (Date.now() > hookDeadline) {
      throw new Error(
        "__LOTOPHAGOI_TEST_HOOKS__ never appeared — is main.ts still attaching it under import.meta.env.DEV?",
      );
    }
    await page.waitForTimeout(200);
  }

  const seed = opts.seed ?? 12345;

  // Phase 1 — wall-clock, nondeterministic on purpose: just let the async
  // texture loads land. Whatever the simulation does during this window is
  // thrown away by the reset in phase 2.
  await page.evaluate(
    ({ phase, seed }) => {
      const h = window.__LOTOPHAGOI_TEST_HOOKS__;
      h.seedRandom(seed);
      h.setPhase(phase, { seed });
    },
    { phase: opts.phase, seed },
  );
  await page.waitForTimeout(opts.loadMs ?? 2500);

  // Phase 2 — deterministic. Freeze wall-clock time, re-seed the PRNG, rebuild
  // the world from the same seed (textures are resident now), then advance an
  // EXACT number of fixed steps. Nothing here depends on machine speed.
  await page.evaluate(
    ({ phase, seed, warmupSteps, memory }) => {
      const h = window.__LOTOPHAGOI_TEST_HOOKS__;
      h.freeze();
      h.seedRandom(seed);
      h.setPhase(phase, { seed });
      h.resetClock();
      h.runSteps(warmupSteps);
      if (typeof memory === "number") {
        // Set last, then a single step so the haze/forgetting uniform picks it
        // up; the per-step memory drift over one frame is negligible and, more
        // importantly, identical every run.
        h.setMemory(memory);
        h.runSteps(1);
      }
    },
    { phase: opts.phase, seed, warmupSteps: opts.warmupSteps ?? 120, memory: opts.memory },
  );

  // One rAF tick so the frozen frame is actually presented before capture.
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

  return { page, errors };
}
