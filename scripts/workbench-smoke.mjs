/**
 * Headless workbench smoke — smart load + mixer advance.
 * Run: node scripts/workbench-smoke.mjs
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
await page.goto(BASE, { waitUntil: "networkidle" });

let ok = true;

ok &&= await probe("catalog options show rig badges", async () => {
  const texts = await page.locator("#wb-model-list option").allTextContents();
  if (!texts.some((t) => t.includes("[rig"))) throw new Error(`missing rig badge in ${texts.join(" | ")}`);
});

ok &&= await probe("textured mesh auto-opens rig clips", async () => {
  await page.selectOption("#wb-model-list", "assets/models/char_doryseus_02_textured_8000.glb");
  await page.waitForTimeout(3500);
  await page.click("#wb-tab-anim");
  await page.waitForSelector("#wb-clip-controls:not([hidden])", { timeout: 10000 });
  const clips = await page.locator(".wb-clip-btn").count();
  if (clips < 1) throw new Error(`expected redirected rig clips, got ${clips}`);
  const status = await page.locator("#wb-status").textContent();
  if (!status?.includes("rig")) throw new Error(`expected rig redirect status, got: ${status}`);
});

ok &&= await probe("mixer time advances on walk clip", async () => {
  await page.locator(".wb-clip-btn", { hasText: "walk" }).first().click();
  const t0 = await page.evaluate(() => (window).__WB_DEBUG__?.mixer?.time ?? 0);
  await page.waitForTimeout(700);
  const t1 = await page.evaluate(() => (window).__WB_DEBUG__?.mixer?.time ?? 0);
  if (!(t1 > t0 + 0.05)) throw new Error(`mixer stuck t0=${t0} t1=${t1}`);
});

ok &&= await probe("gestures row loads visible mesh + clips", async () => {
  await page.click("#wb-tab-model");
  await page.selectOption("#wb-model-list", "assets/models/char_doryseus_02_gestures_8000.glb");
  await page.waitForTimeout(3500);
  const skin = await page.evaluate(() => {
    const dds = [...document.querySelectorAll("#wb-info dd")];
    return dds[2]?.textContent?.trim();
  });
  const clips = await page.locator(".wb-clip-btn").count();
  if (skin !== "var") throw new Error(`expected skinned mesh, got skin=${skin}`);
  if (clips < 2) throw new Error(`expected gesture clips, got ${clips}`);
});

await browser.close();
process.exit(ok ? 0 : 1);
