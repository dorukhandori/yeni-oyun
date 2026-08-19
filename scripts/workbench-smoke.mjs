/**
 * Headless workbench smoke — single-screen UI, ship-sea default.
 */
import { chromium } from "playwright";

const BASE = process.env.WB_URL ?? "http://localhost:5173/workbench.html";

async function probe(label, fn) {
  try {
    await fn();
    console.log(`PASS ${label}`);
    return true;
  } catch (err) {
    console.error(`FAIL ${label}:`, err.message);
    return false;
  }
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

let ok = true;

ok &&= await probe("single-screen UI loads (no tabs)", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const tabs = await page.locator(".wb-tab").count();
  const presets = await page.locator(".wb-preset").count();
  const v2 = await page.locator("h1").textContent();
  if (tabs > 0) throw new Error("old tab UI still present");
  if (presets < 3) throw new Error(`expected presets, got ${presets}`);
  if (!v2?.includes("v2")) throw new Error("missing v2 marker — stale cache?");
});

ok &&= await probe("auto-loads ship-sea on boot", async () => {
  await page.waitForSelector("#wb-scene-controls:not([hidden])", { timeout: 15000 });
  const mode = await page.evaluate(() => (window).__WB_DEBUG__?.mode);
  if (mode !== "scene") throw new Error(`expected scene mode, got ${mode}`);
});

ok &&= await probe("dory walk preset inline clips", async () => {
  await page.locator(".wb-preset", { hasText: "Doryseus yürüyüş" }).click();
  await page.waitForTimeout(3500);
  const clips = await page.locator(".wb-clip-btn").count();
  if (clips < 1) throw new Error(`no clip buttons, got ${clips}`);
});

await browser.close();
process.exit(ok ? 0 : 1);
