/**
 * Headless workbench smoke — presets + ship scene.
 * Run: npm run test:workbench
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

ok &&= await probe("page loads preset grid", async () => {
  await page.goto(BASE, { waitUntil: "networkidle" });
  const n = await page.locator(".wb-preset").count();
  if (n < 3) throw new Error(`expected presets, got ${n}`);
});

ok &&= await probe("ship-sea preset shows live controls", async () => {
  await page.locator(".wb-preset", { hasText: "Gemi + dalgalar" }).click();
  await page.waitForTimeout(4000);
  await page.waitForSelector("#wb-live-controls:not([hidden])", { timeout: 15000 });
  const scene = await page.locator("#wb-scene-controls").isVisible();
  const mode = await page.evaluate(() => (window).__WB_DEBUG__?.mode);
  if (!scene || mode !== "scene") throw new Error(`scene controls missing mode=${mode}`);
});

ok &&= await probe("departing slider moves ship scene time", async () => {
  await page.locator("#wb-depart").fill("0.6");
  const t0 = await page.evaluate(() => (window).__WB_DEBUG__?.scenePreview ? 1 : 0);
  await page.waitForTimeout(800);
  const status = await page.locator("#wb-status").textContent();
  if (!t0 || !status?.includes("Gemi")) throw new Error(`bad scene state status=${status}`);
});

ok &&= await probe("dory walk preset shows clip buttons", async () => {
  await page.locator(".wb-preset", { hasText: "Doryseus yürüyüş" }).click();
  await page.waitForTimeout(3500);
  const clips = await page.locator(".wb-clip-btn").count();
  const mode = await page.evaluate(() => (window).__WB_DEBUG__?.mode);
  if (clips < 1 || mode !== "asset") throw new Error(`clips=${clips} mode=${mode}`);
});

await browser.close();
process.exit(ok ? 0 : 1);
