// End-to-end checks for the 3D book. Usage: node tests/book.cjs <baseUrl> [outDir]
// Needs the site running (vite dev on :5173, or the built site via `python app.py` on :5000).
const { chromium, devices } = require('playwright');
const path = require('path');
const fs = require('fs');
const GL = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'];
let failed = 0;
const ok = (c, m) => { console.log(c ? '  ✓' : '  ✗', m); if (!c) failed++; };
const settle = (p, ms = 3500) => p.waitForTimeout(ms);
const live = (p, sel) => p.evaluate((s) => [...document.querySelectorAll(s)].some((el) => {
  const root = el.closest('.face-root');
  return root && getComputedStyle(root.parentElement).opacity === '1';
}), sel);

/** Polls until a selector is on an open page (software rendering in CI is slow). */
const waitLive = async (p, sel, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await live(p, sel)) return true; await p.waitForTimeout(400); } return false; };
const waitPath = async (p, want, ms = 30000) => { const t = Date.now(); while (Date.now() - t < ms) { if (new URL(p.url()).pathname === want) return true; await p.waitForTimeout(400); } return false; };

(async () => {
  const base = process.argv[2] || 'http://127.0.0.1:5000';
  const out = process.argv[3];
  const b = await chromium.launch({ args: GL });
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e)));

  console.log('cover & navigation');
  await p.goto(base + '/', { waitUntil: 'load' });
  ok(await waitLive(p, '.cv-name'), 'cover page is open with the name');
  await settle(p, 3000);
  ok(await p.locator('canvas').count() > 0, '3D canvas present');
  if (out) await p.screenshot({ path: path.join(out, 'book-cover.png') });
  const menu = async (item) => { await p.locator('.tab-group > .tab').click(); await p.locator('.tab-menu').getByRole('button', { name: item, exact: true }).click(); };
  await menu('Last Dance');
  ok(await waitPath(p, '/projects/last-dance') && await waitLive(p, '#case-file'), 'Projects menu jumps straight to Last Dance');
  await menu('All projects');
  ok(await waitPath(p, '/projects') && await waitLive(p, '.project-covers'), 'Projects menu → "All projects" opens the divider page');
  await p.locator('.project-covers').getByRole('button', { name: /^Darkness Within/ }).click();
  ok(await waitPath(p, '/projects/darkness-within') && await waitLive(p, '#reveal'), 'a cover on the divider page opens its project');
  await menu('Scorched');
  ok(await waitPath(p, '/projects/scorched') && await waitLive(p, '.theme-scorched .project-title'), 'Projects menu → Scorched');
  await p.keyboard.press('ArrowRight');
  ok(await waitPath(p, '/projects/scorched/enemies') && await waitLive(p, '#enemies'), 'arrow key turns the page');
  await p.goBack();
  ok(await waitPath(p, '/projects/scorched') && await waitLive(p, '#arena'), 'browser Back turns back');

  console.log('pointing hand');
  await p.goto(base + '/skills', { waitUntil: 'load' }); await waitLive(p, '.project-covers');
  await p.locator('.chip-link', { hasText: 'NavMesh' }).hover(); await p.waitForTimeout(600);
  ok(await p.locator('.book-stage').getAttribute('data-pointing') === 'left', 'hovering a link on the left page brings the hand from the left');
  await p.locator('.project-covers button').nth(3).hover(); await p.waitForTimeout(600);
  ok(await p.locator('.book-stage').getAttribute('data-pointing') === 'right', 'hovering on the right page brings it from the right');
  if (out) await p.screenshot({ path: path.join(out, 'book-pointing.png') });
  await p.mouse.move(4, 450); await p.waitForTimeout(800);
  ok(await p.locator('.book-stage').getAttribute('data-pointing') === null, 'the hand withdraws when nothing is hovered');
  await p.goto(base + '/projects/scorched', { waitUntil: 'load' }); await waitLive(p, '#arena');

  console.log('YouTube panel');
  await p.locator('#arena').getByRole('button', { name: /Play gameplay/ }).click();
  await p.waitForSelector('#arena iframe', { timeout: 10000 });
  const src = await p.$eval('#arena iframe', (f) => f.src);
  ok(src.includes('youtube-nocookie.com/embed/fdXOgMXlxmI'), 'Scorched plays its YouTube video (privacy-enhanced embed)');
  await p.waitForTimeout(3000);
  ok(await p.$eval('#arena', (f) => f.classList.contains('revealed')), 'inked art gives way to the video');
  if (out) await p.screenshot({ path: path.join(out, 'book-video.png') });
  await p.keyboard.press('ArrowRight'); await waitLive(p, '#enemies');
  ok(await p.locator('#arena iframe').count() === 0, 'video stops when the page turns');

  // YouTube reports blocked embeds (e.g. a copyright claim) as error 150: the panel must explain, not stall.
  await p.goto(base + '/projects/last-dance', { waitUntil: 'load' }); await waitLive(p, '#case-file');
  await p.locator('#case-file').getByRole('button', { name: /Play gameplay/ }).click();
  await p.waitForSelector('#case-file iframe', { timeout: 10000 });
  await p.waitForTimeout(1500);
  const yt = p.frames().find((f) => f.url().includes('youtube') || f.parentFrame() === p.mainFrame() && f !== p.mainFrame());
  if (yt) await yt.evaluate(() => parent.postMessage(JSON.stringify({ event: 'onError', info: 150 }), '*')).catch(() => {});
  await p.waitForSelector('#case-file .yt-error', { timeout: 5000 }).catch(() => {});
  ok(await p.locator('#case-file .yt-error a[href="https://youtu.be/zNGxGxRM0Ws"]').count() === 1, 'a blocked YouTube video shows an explanation and a Watch on YouTube link');
  if (out) await p.locator('figure#case-file').screenshot({ path: path.join(out, 'book-video-blocked.png') });

  console.log('citations / deep links');
  const cases = JSON.parse(fs.readFileSync(path.join(__dirname, '../backend/eval_cases.json'), 'utf8'));
  for (const url of [...new Set(cases.flatMap((c) => c.url))]) {
    await p.goto(base + url, { waitUntil: 'load' });
    const id = url.split('#')[1];
    ok(await waitLive(p, `#${id}`), `${url} opens with #${id} on an open page`);
  }

  console.log('page interactions');
  await p.goto(base + '/projects/darkness-within', { waitUntil: 'load' }); await waitLive(p, '#reveal');
  await p.getByRole('button', { name: /Read the riddle/ }).click();
  ok(await waitLive(p, '#threat') && await waitPath(p, '/projects/darkness-within/threat'), 'choosing the riddle turns the page, reveals the NavMesh threat, and names that page in the URL');
  await p.goto(base + '/projects/maze-pathfinding/demo', { waitUntil: 'load' }); await waitLive(p, '#demo');
  await p.getByRole('button', { name: 'Reveal shortest path' }).click();
  await p.waitForFunction(() => /Shortest path: \d+ steps/.test(document.querySelector('.maze-controls [aria-live]')?.textContent || ''), null, { timeout: 90000 }).catch(() => {});
  ok(/Shortest path: \d+ steps/.test(await p.locator('.maze-controls [aria-live]').innerText()), 'maze demo reveals a Dijkstra path');
  await p.getByRole('button', { name: /Ask Zohair: “When does the maze/ }).click();
  ok(await waitPath(p, '/ask') && await waitLive(p, '.chatbox'), 'Ask chip turns to the chat page');
  await p.waitForSelector('.msg-visitor', { timeout: 10000 });
  ok((await p.locator('.msg-visitor').innerText()).includes('maze'), 'the chip question is sent to the chat');
  await p.waitForFunction(() => document.querySelectorAll('.msg-guide .bubble:not(.thinking)').length > 1 || document.querySelector('.system-notice'), null, { timeout: 60000 });
  const answered = await p.locator('.msg-guide .bubble:not(.thinking)').count() > 1;
  const notice = await p.locator('.system-notice').count() > 0;
  ok(answered || notice, `chat replies with ${answered ? 'an answer' : 'an explicit "no answer" notice'}`);
  if (out) await p.screenshot({ path: path.join(out, 'book-ask.png') });

  console.log('contact');
  await p.goto(base + '/contact', { waitUntil: 'load' }); await waitLive(p, '.face-contact');
  await p.getByRole('button', { name: 'Send the letter' }).click(); await p.waitForTimeout(300);
  ok(await p.locator('.face-contact .field-error').count() === 4, 'empty letter shows four field errors');
  await p.locator('#c-email').focus(); await p.waitForTimeout(500);
  ok(await p.locator('.book-stage').getAttribute('data-pointing') === null, 'the hand does not point at form fields');

  console.log('narration');
  await p.goto(base + '/about', { waitUntil: 'load' }); await waitLive(p, '.face-about');
  await p.getByRole('button', { name: /Narrate/ }).click();
  ok(await p.getByRole('button', { name: /Stop narrating/ }).getAttribute('aria-pressed') === 'true', 'the Narrate balloon turns narration on (only after a click)');
  await p.getByRole('button', { name: /Stop narrating/ }).click();
  ok(await p.getByRole('button', { name: /Narrate/ }).getAttribute('aria-pressed') === 'false' && await p.locator('.captions').count() === 0, 'narration stops and captions disappear');

  console.log('music & résumé');
  const musicBtn = p.locator('.balloon.music');
  const before = await musicBtn.getAttribute('aria-pressed');
  await musicBtn.click(); await p.waitForTimeout(300);
  ok(await musicBtn.getAttribute('aria-pressed') !== before, 'the Music balloon toggles background music');
  await musicBtn.click();
  const resume = await p.locator('.face-about .resume-btn').getAttribute('href');
  const pdf = await p.request.get(base + resume);
  ok(pdf.ok() && (pdf.headers()['content-type'] || '').includes('pdf'), 'About has a working résumé download (PDF)');

  console.log('every page fits');
  const over = await p.evaluate(() => [...document.querySelectorAll('.face-root .face')].filter((f) => {
    const kids = [...f.children].filter((c) => getComputedStyle(c).position !== 'absolute');
    const last = kids.at(-1); return last && last.offsetTop + last.offsetHeight > f.clientHeight - 40;
  }).map((f) => f.className));
  ok(over.length === 0, `no page content is cut off ${over.join(', ')}`);

  const dupes = await p.evaluate(() => { const seen = {}; for (const el of document.querySelectorAll('.face-root [id]')) seen[el.id] = (seen[el.id] || 0) + 1; return Object.keys(seen).filter((k) => seen[k] > 1); });
  ok(dupes.length === 0, `every element id is unique across the book ${dupes.join(', ')}`);

  console.log('reading mode');
  await p.goto(base + '/read', { waitUntil: 'load' }); await p.waitForTimeout(1500);
  ok(await p.locator('.reading-page').count() >= 20, 'all pages render flat in reading mode');
  ok(errors.length === 0, 'no page errors ' + errors.slice(0, 3).join(' | '));
  await p.close();

  console.log('phone (Pixel 7)');
  const ctx = await b.newContext(devices['Pixel 7']); const m = await ctx.newPage();
  await m.goto(base + '/about', { waitUntil: 'load' });
  ok(await waitLive(m, '.face-about'), 'About opens on a phone');
  await settle(m, 2500);
  ok(await m.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 1, 'no horizontal scroll on a phone');
  if (out) await m.screenshot({ path: path.join(out, 'book-phone.png') });
  await b.close();
  console.log(failed ? `\n${failed} check(s) failed` : '\nall checks passed');
  process.exit(failed ? 1 : 0);
})();
