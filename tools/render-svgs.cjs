// Rasterizes the poster SVGs to 1280x720 PNG frames (used for dev clips and film animatic).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const [outDir, ...files] = process.argv.slice(2);
  fs.mkdirSync(outDir, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const f of files) {
    const svg = fs.readFileSync(f, 'utf8');
    await p.setContent(`<style>html,body{margin:0}svg{width:1280px;height:720px;display:block}</style>${svg}`);
    await p.screenshot({ path: path.join(outDir, path.basename(f, '.svg') + '.png') });
  }
  await b.close();
})();
