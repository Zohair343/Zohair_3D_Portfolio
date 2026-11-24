// Captures the documentation screenshots into docs/screenshots. Server must be running.
const { chromium, devices } = require('playwright');
const path = require('path');
const OUT = path.join(__dirname, '../docs/screenshots');
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
(async () => {
  const base = process.argv[2] || 'http://127.0.0.1:8000';
  const b = await chromium.launch({ args: GL });
  const shot = async (ctxOpts, url, file, fn, full = false) => {
    const ctx = await b.newContext(ctxOpts); const p = await ctx.newPage();
    await p.goto(base + url, { waitUntil: 'load' }); await p.waitForTimeout(1200);
    if (fn) await fn(p);
    await p.screenshot({ path: path.join(OUT, file), fullPage: full }); await ctx.close(); console.log('✓', file);
  };
  const desk = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };
  for (const mode of ['original', 'toon']) {
    const ctx = await b.newContext({ viewport: { width: 500, height: 560 }, deviceScaleFactor: 2 }); const p = await ctx.newPage();
    await p.goto(`${base}/lab/avatar?mode=${mode}&framing=cover&size=480&bare`, { waitUntil: 'load' });
    await p.waitForSelector('[data-ready=yes]'); await p.waitForTimeout(2500);
    await p.locator('.lab-stage').screenshot({ path: path.join(OUT, `avatar-${mode === 'toon' ? 'after-toon' : 'before-original'}.png`) }); await ctx.close();
  }
  console.log('✓ avatar before/after');
  await shot(desk, '/', 'cover-desktop.png', (p) => p.waitForSelector('.cover-avatar canvas').then(() => p.waitForTimeout(3000)));
  await shot(devices['Pixel 7'], '/', 'cover-mobile.png', (p) => p.waitForTimeout(3000), true);
  await shot(devices['Pixel 7'], '/projects/scorched', 'scorched-mobile.png', null, true);
  await shot(desk, '/projects/scorched', 'scorched-spread.png', null, true);
  await shot(desk, '/projects/scorched', 'scorched-video-panel.png', async (p) => {
    await p.getByRole('button', { name: /Play gameplay/ }).click(); await p.waitForSelector('#arena.revealed'); await p.waitForTimeout(2500);
    await p.locator('#arena').scrollIntoViewIfNeeded();
  });
  await shot(desk, '/projects/darkness-within', 'darkness-within.png', (p) => p.getByRole('button', { name: 'Read the riddle' }).click().then(() => p.waitForTimeout(700)), true);
  await shot(desk, '/projects/last-dance', 'last-dance.png', (p) => p.getByRole('button', { name: /Three clubs/ }).click().then(() => p.waitForTimeout(400)), true);
  await shot(desk, '/projects/maze-pathfinding', 'maze.png', async (p) => { await p.getByRole('button', { name: 'Reveal shortest path' }).click(); await p.waitForTimeout(3500); }, true);
  await shot(desk, '/projects', 'gallery.png', null, true);
  await shot(desk, '/skills', 'skills.png', null, true);
  await shot(desk, '/journey', 'journey.png', null, true);
  await shot(desk, '/about', 'about.png', null, true);
  await shot(desk, '/film', 'film.png', async (p) => { await p.$eval('video', (v) => { v.currentTime = 8; }); await p.waitForTimeout(1200); }, true);
  await shot(desk, '/ask', 'ask-provider-unavailable.png', async (p) => { await p.getByRole('button', { name: /three-hit combo/ }).click(); await p.waitForSelector('.system-notice'); });
  await shot(desk, '/contact', 'contact-form-errors.png', async (p) => { await p.getByRole('button', { name: 'Send the letter' }).click(); await p.waitForTimeout(300); }, true);
  await b.close();
})();
