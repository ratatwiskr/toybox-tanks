// Usage: node tools/shots.mjs   (Playwright is already a repo dev dependency; opens the mock via file://)
// Writes screenshots to prototypes/ui-mock/shots and report.json (no-scroll checks, row/tank/HUD pixel sizes).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve('prototypes/ui-mock'),
  out = resolve(root, 'shots');
mkdirSync(out, { recursive: true });
const viewports = [
  [1920, 1080],
  [1280, 720],
  [1024, 768],
  [844, 390],
  [667, 375],
  [932, 430],
  [390, 844],
];
const screens = [
  'title',
  'levels',
  'options',
  'pause',
  'cleared',
  'defeat',
  'completed',
  'error',
  'play',
];
const report = [];
const browser = await chromium.launch();
for (const [w, h] of viewports) {
  const touch = Math.min(w, h) < 500;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: touch,
    isMobile: touch,
  });
  const page = await ctx.newPage();
  for (const screen of screens)
    for (const v of screen === 'play' && touch ? ['a', 'b'] : ['b']) {
      await page.goto(
        'file://' +
          resolve(root, 'index.html') +
          `?bare=1&screen=${screen}&v=${v}${touch ? '&touch=1' : ''}`,
      );
      await page.waitForFunction(() => window.__metrics);
      await page.waitForTimeout(150);
      report.push(await page.evaluate(() => window.__metrics));
      await page.screenshot({ path: resolve(out, `${screen}-${v}-${w}x${h}.png`) });
    }
  await ctx.close();
}
await browser.close();
writeFileSync(resolve(out, 'report.json'), JSON.stringify(report, null, 2));
const bad = report.filter((r) => !r.pageNoScroll || !r.dialogsFit);
console.log(`${report.length} captures, ${bad.length} with scrolling/overflow`);
for (const r of bad) console.log(' overflow:', r.screen, r.v, `${r.vw}x${r.vh}`);
