import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 800, height: 450 } });
await p.goto('http://localhost:5173/?stop=cyclops', { waitUntil: 'load' });
await p.waitForFunction(() => !!window.__CYCLOPS_DEBUG__, null, { timeout: 30000 });
await p.waitForTimeout(9000);
const r = await p.evaluate(() => {
  const s = window.__CYCLOPS_DEBUG__.state();
  return { cliffWorldBox: s.cliffWorldBox, cliffLoaded: s.cliffLoaded };
});
console.log(JSON.stringify(r, null, 2));
await b.close();
