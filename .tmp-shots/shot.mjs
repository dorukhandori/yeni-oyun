// Cyclops cove multi-angle screenshotter.
// usage: node shot.mjs <outDir> [tag]
import { chromium } from 'playwright';
import fs from 'node:fs';

const outDir = process.argv[2] || '/tmp/shots';
const tag = process.argv[3] || 'a';
fs.mkdirSync(outDir, { recursive: true });

// name, x, z, yawDeg (absolute-ish: applied as delta from 0 each fresh load), pitchDeg
// yaw 0 = looking toward the sea (-Z). yaw 180 = looking toward the cave (+Z).
const VIEWS = [
  ['A_gate_front',     0,  -14,  180,   4],
  ['B_gate_close',     0,   -6,  180,  10],
  ['C_cove_mid',       0,  -30,  180,   2],
  ['D_ship_look_in',  14,  -46,  180,   2],
  ['E_from_east',     45,  -26,  225,   4],
  ['F_from_west',    -45,  -26,  135,   4],
  ['G_far_east',      85,  -20,  215,   4],
  ['H_far_west',     -85,  -20,  145,   4],
  ['I_gate_lookup',    0,  -20,  180,  20],
  ['J_seaward',        0,  -20,    0,   4],
  ['K_along_east',    60,  -40,  200,   3],
  ['L_along_west',   -60,  -40,  160,   3],
];

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
await page.goto('http://localhost:5173/?stop=cyclops', { waitUntil: 'load' });
await page.waitForFunction(() => !!window.__CYCLOPS_DEBUG__, null, { timeout: 30000 });
// let all async GLB loads settle
await page.waitForTimeout(9000);

for (const [name, x, z, yawDeg, pitchDeg] of VIEWS) {
  await page.evaluate(([x, z, yaw, pitch]) => {
    const D = window.__CYCLOPS_DEBUG__;
    D.teleport(x, z);
    D.step(1 / 60, 90);      // settle camera spring on the new spot
    D.rotateCamera(yaw * Math.PI / 180, pitch * Math.PI / 180);
    D.step(1 / 60, 40);
    D.render();
  }, [x, z, yawDeg, pitchDeg]);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${outDir}/${tag}_${name}.png` });
  // undo rotation so next view starts from neutral
  await page.evaluate(([yaw, pitch]) => {
    window.__CYCLOPS_DEBUG__.rotateCamera(-yaw * Math.PI / 180, -pitch * Math.PI / 180);
  }, [yawDeg, pitchDeg]);
}
await browser.close();
console.log('done ->', outDir);
