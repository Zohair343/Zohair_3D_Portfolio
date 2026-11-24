// Usage: node tools/capture.cjs <url> <out.png> [width] [height] [scale] [waitSelector]
const { chromium } = require('playwright');
(async () => {
  const [url, out, w = '1280', h = '900', scale = '1', sel] = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load', timeout: 90000 });
  if (sel) await page.waitForSelector(sel, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out, fullPage: process.env.FULL === '1' });
  if (errors.length) console.log('ERRORS:', errors.slice(0, 5).join('\n'));
  await browser.close();
})();
