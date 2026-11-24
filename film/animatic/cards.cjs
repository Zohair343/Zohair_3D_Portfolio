// Renders storyboard cards (1280x720) for the animatic using the site's fonts and art.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const art = (f) => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(ROOT, 'frontend/public/art', f)).toString('base64');
const portrait = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'frontend/public/avatar/portrait.png')).toString('base64');
const css = `<link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;700&family=Barlow+Condensed:wght@800;900&display=swap" rel="stylesheet">
<style>*{box-sizing:border-box}body{margin:0;width:1280px;height:720px;background:#f4ecdc;font-family:'Atkinson Hyperlegible Next',sans-serif;color:#1a1612;overflow:hidden;position:relative}
.frame{position:absolute;inset:28px;border:8px solid #1a1612;box-shadow:12px 12px 0 #1a1612;overflow:hidden;background:#f4ecdc}
.art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cap{position:absolute;left:36px;bottom:36px;max-width:74%;background:#f7e39a;border:4px solid #1a1612;padding:14px 20px;font-weight:700;font-size:34px;line-height:1.2;box-shadow:6px 6px 0 #1a1612}
.title{position:absolute;left:36px;top:30px;font:900 84px 'Barlow Condensed';text-transform:uppercase;color:#fff;-webkit-text-stroke:3px #1a1612;paint-order:stroke fill;text-shadow:6px 6px 0 #1a1612}
.wm{position:absolute;right:14px;top:6px;font:800 18px 'Barlow Condensed';letter-spacing:2px;color:#a3261b;z-index:9;text-transform:uppercase}
h1{font:900 108px/0.9 'Barlow Condensed';margin:0}h2{font:800 44px 'Barlow Condensed';margin:12px 0 0;text-transform:uppercase;letter-spacing:2px}
.dots{position:absolute;inset:0;background:radial-gradient(rgba(26,22,18,.13) 1.6px,transparent 1.8px) 0 0/10px 10px}
.por{position:absolute;right:40px;bottom:0;width:420px;border:6px solid #1a1612;border-bottom:0;border-radius:50% 50% 0 0}
.txt{position:absolute;left:60px;top:150px;width:700px}</style>`;
const cards = {
  '01-cover': `<div class="frame"><div class="dots"></div><img class="por" src="${portrait}"><div class="txt"><h1>Muhammad Zohair Shaikh</h1><h2>Game Developer · Karachi</h2></div></div>`,
  '02-scorched': `<div class="frame"><img class="art" src="${art('scorched-arena.svg')}"><div class="title">Scorched</div><div class="cap">Land three hits to unlock the slow-motion gun ability.</div></div>`,
  '03-darkness': `<div class="frame"><img class="art" src="${art('darkness-within.svg')}"><div class="title">Darkness Within</div><div class="cap">Riddles, inventory — and an enemy that follows you on the NavMesh.</div></div>`,
  '04-lastdance': `<div class="frame"><img class="art" src="${art('last-dance.svg')}"><div class="title">Last Dance</div><div class="cap">A murder mystery across three clubs.</div></div>`,
  '05-maze': `<div class="frame"><img class="art" src="${art('maze-pathfinding.svg')}"><div class="cap">Finish the maze. Then Dijkstra shows the shortest path.<br><small style="font-size:24px">Unity · Unreal Engine · Gameplay programming</small></div></div>`,
  '06-ned': `<div class="frame"><div class="dots"></div><div class="txt" style="top:120px;width:1100px"><h2>Computer Science · NED University, Karachi</h2><h1 style="margin-top:30px">CEGA Game Jam<br>Runner-Up</h1></div></div>`,
  '07-close': `<div class="frame"><div class="dots"></div><img class="por" src="${portrait}"><div class="txt"><h1 style="font-size:92px">Explore the projects.</h1><h2>Ask me how they work.</h2><p style="font-size:26px;margin-top:40px">Portfolio URL: pending deployment</p></div></div>`,
};
(async () => {
  const out = path.join(__dirname, 'frames'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const [name, html] of Object.entries(cards)) {
    await p.setContent(`<html><head>${css}</head><body>${html}<div class="wm">Animatic · placeholder for After Effects film</div></body></html>`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(out, name + '.png') });
  }
  await b.close();
})();
