import * as THREE from 'three';
import { domToCanvas } from 'modern-screenshot';
import { PAPER, PX_H, PX_W, SNAP } from './constants';

/** Paper background with faint grain, at the final texture size. */
export function paperCanvas(tint = PAPER): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = PX_W * SNAP; c.height = PX_H * SNAP;
  const g = c.getContext('2d')!;
  g.fillStyle = tint; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(90,70,40,${Math.random() * 0.05})`; g.fillRect(Math.random() * c.width, Math.random() * c.height, 2, 2); }
  return c;
}

export function makeTexture(canvas: HTMLCanvasElement, mirror: boolean): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (mirror) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = -1; t.offset.x = 1; }
  return t;
}

/**
 * Page snapshots render inside an SVG image, which can't see the document's fonts.
 * Letting the library find and embed them per capture cost ~2 s a page, so the Latin
 * font files are inlined once as data URLs and handed to every capture.
 */
let fontCss: Promise<string> | null = null;
function inlineFontCss(): Promise<string> {
  fontCss ??= (async () => {
    const rules: CSSFontFaceRule[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let list: CSSRuleList;
      try { list = sheet.cssRules; } catch { continue; }
      for (const r of Array.from(list)) if (r instanceof CSSFontFaceRule && /U\+0+-0*FF\b/i.test(r.style.getPropertyValue('unicode-range'))) rules.push(r);
    }
    const parts = await Promise.all(rules.map(async (r) => {
      const m = /url\("?([^")]+\.woff2)"?\)/.exec(r.style.getPropertyValue('src'));
      if (!m) return '';
      const bytes = new Uint8Array(await (await fetch(m[1])).arrayBuffer());
      let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      return r.cssText.replace(/src:[^;]+;/, `src: url(data:font/woff2;base64,${btoa(bin)}) format("woff2");`);
    }));
    return parts.join('\n');
  })();
  return fontCss;
}

/** Draws the page's live HTML onto its texture canvas (paper underneath). Never throws. */
export async function snapshotInto(node: HTMLElement, tex: THREE.CanvasTexture, tint: string): Promise<void> {
  try {
    const cssText = await inlineFontCss();
    const shot = await Promise.race([
      domToCanvas(node, {
        width: PX_W, height: PX_H, scale: SNAP, backgroundColor: null as unknown as string, font: { cssText },
        // Cross-origin iframes (YouTube) can't be captured; the page shows the poster instead.
        filter: (n) => !(n instanceof HTMLIFrameElement),
      }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('snapshot timeout')), 5000)),
    ]);
    const c = tex.image as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    g.drawImage(paperCanvas(tint), 0, 0, c.width, c.height);
    g.drawImage(shot, 0, 0, c.width, c.height);
    tex.needsUpdate = true;
  } catch (e) {
    console.warn('page snapshot failed', e);
  }
}
