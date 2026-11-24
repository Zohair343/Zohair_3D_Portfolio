// Renders the Ask Zohair portrait from the live shaded model so the face matches the cover.
// Usage: node tools/render-portrait.cjs [baseUrl]   (dev server or preview must be running)
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const base = process.argv[2] || 'http://127.0.0.1:5173';
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 400, height: 400 }, deviceScaleFactor: 2 });
  await page.goto(`${base}/lab/portrait`, { waitUntil: 'load', timeout: 90000 });
  await page.waitForSelector('[data-ready=yes]', { timeout: 60000 });
  await page.waitForTimeout(2500);
  const out = path.join(__dirname, '../frontend/public/avatar/portrait.png');
  await page.locator('.lab-stage').screenshot({ path: out, omitBackground: true });
  console.log('wrote', out);
  await browser.close();
})();
