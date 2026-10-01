import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => { window.__CYC_HIDE_BACKSTOP__ = true; });
await page.goto('http://localhost:5173/?stop=cyclops', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__CYCLOPS_DEBUG__, null, { timeout: 30000 });
await page.waitForTimeout(9000);
await page.evaluate(() => {
  const D = window.__CYCLOPS_DEBUG__;
  D.teleport(0, -14); D.step(1/60, 90);
  D.rotateCamera(Math.PI, 4 * Math.PI / 180); D.step(1/60, 40); D.render();
});
await page.waitForTimeout(250);
await page.screenshot({ path: '.tmp-shots/probe_nobackstop.png' });
await browser.close();
console.log('done');
