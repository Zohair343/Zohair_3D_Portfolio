// Playable Pages: 30-second trailer. Every frame is a pure function of time (render(t)),
// following the BangMotion runtime contract, so it can be previewed, scrubbed and rendered frame-exactly.
import { start } from './runtime.js';

const DURATION = 30;
export const CONFIG = {
  name: ['MUHAMMAD', 'ZOHAIR', 'SHAIKH'],
  role: 'GAME DEVELOPER',
  url: 'zohair-3-d-portfolio.vercel.app', // the live portfolio address
  skills: ['UNITY', 'UNREAL ENGINE 5', 'GAMEPLAY PROGRAMMING', '3D ENVIRONMENTS'],
  projects: [
    { name: 'SCORCHED', meta: 'Unreal Engine 5 · First-person action rogue-like', img: 'assets/thumb-scorched.jpg', sfx: 'KRAK!', color: '#d9822b' },
    { name: 'DARKNESS WITHIN', meta: 'Unity · First-person survival horror', img: 'assets/thumb-darkness-within.jpg', sfx: 'CREAK…', color: '#7a1f1f' },
    { name: 'LAST DANCE', meta: 'Unity · Point-and-click detective puzzle', img: 'assets/thumb-last-dance.jpg', sfx: 'CASE FILE!', color: '#5b3a8c' },
    { name: '2D MAZE PATHFINDING', meta: "Unity & C# · Dijkstra's shortest path", img: 'assets/art-maze.svg', sfx: 'PATH FOUND!', color: '#2f5d62' },
  ],
};

/* ---------- timing (seconds) ---------- */
const BEAT = 0.5689;                 // the track's beat; the drop is placed at 8.0 s
const KW = [0, 1, 2, 3].map((i) => 8.0 + i * 2 * BEAT);
const PT = [14.1, 16.5, 18.9, 21.3]; // project shots
const ENTER = 27.2;                  // "ENTER MY WORLD"
const IMPACTS = [[0.62, 16], [0.86, 16], [1.1, 20], [8.0, 26], ...KW.slice(1).map((k) => [k, 14]), [13.12, 18],
  ...PT.map((p) => [p + 0.15, 22]), [ENTER, 34]];

/* ---------- maths ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const outBack = (x, s = 1.9) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
const outExpo = (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x));
const inOut = (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2);
const inCubic = (x) => x ** 3;
const lerp = (a, b, x) => a + (b - a) * x;

/* ---------- DOM ---------- */
const stage = document.getElementById('stage');
function el(tag, cls = '', parent = stage, html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  parent.appendChild(e);
  return e;
}
const css = (e, s) => Object.assign(e.style, s);
const show = (e, on) => { e.style.visibility = on ? 'visible' : 'hidden'; };
const img = (src, parent, cls = '') => { const i = el('img', cls, parent); i.src = src; i.decoding = 'sync'; return i; };

function speedLines(parent, n = 72, color = '#1a1612') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-960 -960 1920 1920');
  css(svg, { position: 'absolute', left: '0px', top: '-420px', width: '1920px', height: '1920px' });
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.sin(i * 12.9898) * 0.03;
    const r0 = 330 + ((i * 37) % 5) * 70, w = 3 + ((i * 53) % 7) * 2.2;
    const l = document.createElementNS(ns, 'polygon');
    const p = (r, da) => `${Math.cos(a + da) * r},${Math.sin(a + da) * r}`;
    l.setAttribute('points', `${p(r0, 0)} ${p(1400, w / 1400)} ${p(1400, -w / 1400)}`);
    l.setAttribute('fill', color);
    svg.appendChild(l);
  }
  parent.appendChild(svg);
  return svg;
}
function burst(parent, size, fill = '#f7e39a') {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '-100 -100 200 200');
  css(svg, { position: 'absolute', width: size + 'px', height: size + 'px', overflow: 'visible' });
  const pts = [];
  for (let i = 0; i < 28; i++) { const r = i % 2 ? 62 : 98 - (i % 4) * 6; const a = (i / 28) * Math.PI * 2; pts.push(`${Math.cos(a) * r},${Math.sin(a) * r}`); }
  const poly = document.createElementNS(ns, 'polygon');
  poly.setAttribute('points', pts.join(' ')); poly.setAttribute('fill', fill);
  poly.setAttribute('stroke', '#1a1612'); poly.setAttribute('stroke-width', '5'); poly.setAttribute('stroke-linejoin', 'round');
  svg.appendChild(poly); parent.appendChild(svg);
  return svg;
}

const world = el('div', 'fill');
const S = [0, 1, 2, 3, 4].map(() => el('div', 'scene', world));
const projScenes = CONFIG.projects.map(() => el('div', 'scene', world));
const overlay = el('div', 'fill', stage);
const flash = el('div', 'fill', overlay); css(flash, { background: '#fffbea', opacity: 0 });
const wipe = el('div', 'wipe', overlay); css(wipe, { transform: 'skewX(-14deg)' });

/* ---------- scene 1: title ---------- */
const s1 = S[0]; css(s1, { background: '#d9822b' });
const s1dots = el('div', 'fill dots', s1);
const s1lines = speedLines(s1, 80, 'rgba(26,22,18,.55)');
const s1burst = burst(s1, 1500); css(s1burst, { left: '210px', top: '-210px' });
const s1panel = el('div', 'panel', s1); css(s1panel, { left: '300px', top: '150px', width: '1320px', height: '700px', background: '#f4ecdc' });
el('div', 'fill dots', s1panel).style.opacity = '.35';
const s1issue = el('div', 'cap', s1, 'Playable Pages · Issue #1'); css(s1issue, { left: '340px', top: '110px', fontSize: '40px' });
const s1name = CONFIG.name.map((w, i) => { const e = el('div', 'big abs', s1, w); css(e, { left: '380px', top: 205 + i * 175 + 'px', fontSize: '200px', transformOrigin: '20% 60%' }); return e; });
const s1role = el('div', 'cap', s1, CONFIG.role); css(s1role, { left: '1080px', top: '760px', fontSize: '68px', background: '#1a1612', color: '#f7e39a', boxShadow: '8px 8px 0 #f7e39a' });

/* ---------- scene 2: meet the developer (the real cover, with the avatar) ---------- */
const s2 = S[1]; css(s2, { background: '#2b2520' });
const s2cam = el('div', 'fill', s2);
const s2img = img('assets/site-cover.png', s2cam); css(s2img, { position: 'absolute', left: 0, top: 0, width: '1920px', height: '1080px' });
const s2vig = el('div', 'fill', s2); css(s2vig, { background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(26,22,18,.55) 100%)' });
const s2frame = el('div', 'fill', s2); css(s2frame, { border: '16px solid #1a1612', boxSizing: 'border-box' });
const s2cap = el('div', 'cap', s2, 'Meet the developer'); css(s2cap, { left: '70px', top: '70px', fontSize: '58px' });
const s2bubble = el('div', 'bubble', s2, 'Welcome to my world!'); css(s2bubble, { left: '150px', top: '250px', transformOrigin: '20% 110%' });

/* ---------- scene 3: skills on the beat ---------- */
const s3 = S[2];
const s3bg = el('div', 'fill', s3);
const s3dots = el('div', 'fill dots', s3);
const s3lines = speedLines(s3, 90, 'rgba(26,22,18,.6)');
const s3head = el('div', 'cap', s3, 'The toolkit'); css(s3head, { left: '90px', top: '80px', fontSize: '52px', background: '#1a1612', color: '#f7e39a', boxShadow: '8px 8px 0 #f7e39a' });
const s3big = CONFIG.skills.map((w) => {
  const e = el('div', 'big abs', s3, w);
  const size = Math.min(250, 1700 / (w.length * 0.5));
  css(e, { left: '50%', top: '50%', fontSize: size + 'px' });
  return e;
});
const s3stack = CONFIG.skills.map((w, i) => { const e = el('div', 'cap', s3, w); css(e, { left: '90px', top: 200 + i * 108 + 'px', fontSize: '54px' }); return e; });
const S3COL = ['#f7e39a', '#d9822b', '#5fa8a0', '#e26d5a'];

/* ---------- scene 4: projects ---------- */
const s4 = S[3]; css(s4, { background: '#2b2520' });
const s4cam = el('div', 'fill', s4);
const s4img = img('assets/site-projects.png', s4cam); css(s4img, { position: 'absolute', left: 0, top: 0, width: '1920px', height: '1080px' });
const s4frame = el('div', 'fill', s4); css(s4frame, { border: '16px solid #1a1612', boxSizing: 'border-box' });
const s4cap = el('div', 'big abs', s4, 'The projects'); css(s4cap, { left: '90px', top: '760px', fontSize: '190px' });

const P = CONFIG.projects.map((pr, i) => {
  const root = projScenes[i]; css(root, { background: pr.color, perspective: '2600px' });
  el('div', 'fill dots', root);
  const lines = speedLines(root, 70, 'rgba(26,22,18,.45)');
  const tag = el('div', 'cap', root, `Project 0${i + 1}`); css(tag, { left: '90px', top: '70px', fontSize: '48px', background: '#1a1612', color: '#f7e39a', boxShadow: '8px 8px 0 #f7e39a' });
  const panel = el('div', 'panel', root); css(panel, { left: '560px', top: '120px', width: '1240px', height: '698px', transformOrigin: i === 1 ? '0% 50%' : '50% 50%' });
  const pic = img(pr.img, panel); if (pr.img.endsWith('.svg')) css(pic, { objectFit: 'contain', background: '#f3f1e7' });
  const title = el('div', 'big abs', root, pr.name); css(title, { left: '80px', top: '800px', fontSize: pr.name.length > 14 ? '128px' : '160px', transformOrigin: '10% 60%' });
  const meta = el('div', 'cap', root, pr.meta); css(meta, { left: '90px', top: '962px', fontSize: '42px', textTransform: 'none' });
  const sfx = el('div', 'sfx', root, pr.sfx); css(sfx, { left: '1380px', top: '730px', fontSize: '110px', transformOrigin: '50% 50%' });
  return { root, lines, tag, panel, pic, title, meta, sfx };
});

/* ---------- scene 5: splash page ---------- */
const s5 = S[4]; css(s5, { background: '#d9822b' });
el('div', 'fill dots', s5);
const s5lines = speedLines(s5, 90, 'rgba(26,22,18,.4)');
const SLOTS = [[80, 150, -6], [1300, 150, 5], [80, 640, 4], [1300, 640, -5]];
const s5thumbs = CONFIG.projects.map((pr, i) => {
  const p = el('div', 'panel', s5); css(p, { width: '540px', height: '304px', left: SLOTS[i][0] + 'px', top: SLOTS[i][1] + 'px', borderWidth: '8px', boxShadow: '12px 12px 0 #1a1612' });
  const im = img(pr.img, p); if (pr.img.endsWith('.svg')) css(im, { objectFit: 'contain', background: '#f3f1e7' });
  const lab = el('div', 'cap', p, pr.name); css(lab, { left: '-6px', bottom: '-6px', fontSize: '30px', padding: '2px 14px', boxShadow: 'none', borderWidth: '5px' });
  return p;
});
const s5book = el('div', 'panel', s5); css(s5book, { left: '655px', top: '150px', width: '610px', height: '812px', borderWidth: '9px' });
const s5bookImg = img('assets/cover-book.png', s5book); css(s5bookImg, { objectFit: 'cover', objectPosition: '50% 0%' });
const s5name = el('div', 'cap', s5, `${CONFIG.name.join(' ')} · ${CONFIG.role}`); css(s5name, { left: '50%', top: '28px', fontSize: '54px', background: '#1a1612', color: '#f7e39a', boxShadow: '8px 8px 0 #f7e39a' });
const s5url = el('div', 'cap url', s5, CONFIG.url); css(s5url, { left: '50%', top: '985px', fontSize: '44px' });
const s5burst = burst(s5, 1350); s5burst.setAttribute('preserveAspectRatio', 'none'); css(s5burst, { left: '210px', top: '-20px', width: '1500px', height: '380px' });
const s5enter = el('div', 'big abs', s5, 'Enter my world'); css(s5enter, { left: '50%', top: '172px', fontSize: '190px', color: '#f7e39a' });

/* ---------- helpers for render ---------- */
function slam(e, t, t0, base = '', from = 2.6, dur = 0.26) {
  const x = prog(t, t0, t0 + dur);
  e.style.opacity = t < t0 ? 0 : 1;
  const s = lerp(from, 1, outBack(x, 1.4));
  e.style.transform = `${base} scale(${s})`;
}
function slideIn(e, t, t0, dx = -900, base = '', dur = 0.32) {
  const x = outExpo(prog(t, t0, t0 + dur));
  e.style.opacity = t < t0 ? 0 : 1;
  e.style.transform = `${base} translateX(${(1 - x) * dx}px)`;
}
function shake(t) {
  let dx = 0, dy = 0, r = 0;
  for (const [T, A] of IMPACTS) {
    const k = t - T;
    if (k < 0 || k > 0.38) continue;
    const a = A * (1 - k / 0.38) ** 2;
    dx += a * Math.sin(k * 97 + T); dy += a * Math.cos(k * 83 + T * 2); r += a * 0.02 * Math.sin(k * 61);
  }
  return `translate(${dx}px, ${dy}px) rotate(${r}deg)`;
}
function flashAt(t) {
  let f = 0;
  for (const [T, A] of [[8.0, 0.9], [14.1, 0.55], [ENTER, 0.85], [0.62, 0.35]]) { const k = t - T; if (k >= 0 && k < 0.3) f = Math.max(f, A * (1 - k / 0.3)); }
  return f;
}
/** Ink band sweeping across the frame: covers fully at tMid. */
function wipeAt(t, t0, tMid, t1, dir = 1) {
  if (t < t0 || t > t1) return null;
  const a = t < tMid ? inOut(prog(t, t0, tMid)) : 1, b = t < tMid ? 0 : inOut(prog(t, tMid, t1));
  const right = lerp(-400, 2400, a), left = lerp(-400, 2400, b);
  return dir > 0 ? { left, width: right - left } : { left: 1920 - right, width: right - left };
}

/* ---------- render ---------- */
function render(t) {
  world.style.transform = shake(t);
  flash.style.opacity = flashAt(t);

  const w = wipeAt(t, 3.55, 3.85, 4.15, 1) || wipeAt(t, 23.7, 24.0, 24.3, -1);
  wipe.style.visibility = w ? 'visible' : 'hidden';
  if (w) css(wipe, { left: w.left - 300 + 'px', width: w.width + 600 + 'px' });

  // which scenes are on screen
  show(S[0], t < 3.85);
  show(S[1], t >= 3.85 && t < 8.0);
  show(S[2], t >= 8.0 && t < 13.15);
  show(S[3], t >= 12.55 && t < PT[0]);
  P.forEach((p, i) => show(p.root, t >= PT[i] - (i === 1 ? 0.35 : 0) && t < (PT[i + 1] ?? 24.0)));
  show(S[4], t >= 24.0);
  S[2].style.zIndex = 2; S[3].style.zIndex = 1;
  projScenes.forEach((s, i) => { s.style.zIndex = 3 + i; });

  /* scene 1 */
  if (t < 3.85) {
    s1lines.style.transform = `rotate(${t * 6}deg) scale(${1 + 0.05 * Math.sin(t * 3)})`;
    s1lines.style.opacity = 0.25 + 0.75 * prog(t, 0.55, 0.8);
    s1dots.style.backgroundPosition = `${t * 30}px ${t * 18}px`;
    const bp = outBack(prog(t, 0.5, 0.85), 1.6);
    s1burst.style.transform = `scale(${bp}) rotate(${t * 10}deg)`;
    const pp = outBack(prog(t, 0.1, 0.45), 1.2);
    css(s1panel, { opacity: t < 0.1 ? 0 : 1, transform: `rotate(${lerp(-12, -2, pp)}deg) scale(${lerp(1.8, 1, pp)})` });
    s1name.forEach((e, i) => slam(e, t, [0.62, 0.86, 1.1][i], 'rotate(-2deg)', 3));
    slideIn(s1role, t, 1.55, 1200, 'rotate(-2deg)');
    slideIn(s1issue, t, 1.85, -1000, 'rotate(-2deg)');
    // slow drift so the frame never freezes
    s1panel.parentElement.style.transform = `scale(${1 + 0.02 * prog(t, 1.4, 3.85)})`;
  }

  /* scene 2: push in on the avatar */
  if (t >= 3.85 && t < 8.0) {
    const z = inOut(prog(t, 3.85, 7.75));
    const s = lerp(1.0, 1.95, z);
    css(s2cam, { transformOrigin: '56% 46%', transform: `scale(${s}) rotate(${lerp(0, -1.2, z)}deg)` });
    slideIn(s2cap, t, 4.25, -900, 'rotate(-2deg)');
    const b = prog(t, 5.0, 5.32);
    css(s2bubble, { opacity: t < 5.0 ? 0 : 1, transform: `scale(${outBack(b, 2.2)}) rotate(${-3 + Math.sin(t * 2.4) * 1.2}deg)` });
    if (t > 7.6) css(s2cam, { transform: `scale(${s + inCubic(prog(t, 7.6, 8.0)) * 1.6})` });
  }

  /* scene 3: keywords on the beat, then stacked; leaves with a page turn */
  if (t >= 8.0 && t < 13.15) {
    const k = Math.max(0, KW.filter((x) => t >= x).length - 1);
    const sub = Math.floor((t - 8.0) / BEAT);
    s3bg.style.background = S3COL[(k + (sub % 2 ? 0 : 0)) % 4];
    const pulse = 1 - prog(t - 8.0 - sub * BEAT, 0, 0.2);
    s3lines.style.transform = `rotate(${-t * 14}deg) scale(${1 + 0.06 * pulse})`;
    s3lines.style.opacity = 0.55 + 0.45 * pulse;
    s3dots.style.backgroundPosition = `${-t * 50}px 0px`;
    slideIn(s3head, t, 8.1, -800, 'rotate(-2deg)');
    s3big.forEach((e, i) => {
      const T = KW[i], out = prog(t, T + 0.85, T + 1.05);
      if (t < T || out >= 1) { e.style.opacity = 0; return; }
      const x = prog(t, T, T + 0.22);
      const s = lerp(2.8, 1, outBack(x, 1.3)) * lerp(1, 0.3, inCubic(out));
      const tx = lerp(0, -560, inCubic(out)), ty = lerp(0, -260 + i * 108, inCubic(out));
      css(e, { opacity: 1 - out * 0.9, transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) rotate(-3deg) scale(${s})` });
    });
    s3stack.forEach((e, i) => slideIn(e, t, KW[i] + 0.95, -700, 'rotate(-1.5deg)', 0.22));
    // page turn out
    const pt = prog(t, 12.55, 13.15);
    css(S[2], { transformOrigin: '0% 50%', transform: `perspective(2600px) rotateY(${-110 * inOut(pt)}deg)`, filter: `brightness(${1 - 0.5 * pt})` });
  }

  /* scene 4a: the real portfolio Projects page, then dive in */
  if (t >= 12.55 && t < PT[0]) {
    const z = inOut(prog(t, 12.55, 13.7));
    let s = lerp(1.0, 1.25, z);
    const dive = inCubic(prog(t, 13.7, 14.1));
    s += dive * 2.2;
    css(s4cam, { transformOrigin: '74% 42%', transform: `scale(${s})` });
    slam(s4cap, t, 13.12, 'rotate(-3deg)', 2.4);
    s4cap.style.opacity = t < 13.12 ? 0 : 1 - dive;
  }

  /* scene 4b: one project per shot */
  P.forEach((p, i) => {
    const T = PT[i];
    if (t < T - 0.4 || t >= (PT[i + 1] ?? 24.0)) return;
    const local = t - T;
    p.lines.style.transform = `rotate(${t * (i % 2 ? -8 : 8)}deg)`;
    p.lines.style.opacity = 0.5 + 0.5 * (1 - prog(local, 0.1, 0.6));
    const e = prog(t, T, T + 0.3);
    let tr = '';
    if (i === 0) tr = `translateX(${(1 - outExpo(e)) * 1700}px) rotate(${lerp(8, 2, outExpo(e))}deg)`;
    if (i === 1) tr = `rotateY(${lerp(-100, 0, outBack(prog(t, T - 0.35, T + 0.15), 1.1))}deg) rotate(-2deg)`;
    if (i === 2) tr = `translateY(${(1 - outBack(e, 1.5)) * -1200}px) rotate(${lerp(-10, -2.5, e)}deg)`;
    if (i === 3) tr = `scale(${outBack(e, 1.6)}) rotate(${lerp(-30, 2, outExpo(e))}deg)`;
    p.panel.style.transform = tr;
    p.pic.style.transform = `scale(${lerp(1.04, 1.18, prog(local, 0, 2.4))}) translateX(${lerp(0, -30, prog(local, 0, 2.4))}px)`;
    slideIn(p.tag, t, T + 0.15, -700, 'rotate(-2deg)', 0.25);
    slam(p.title, t, T + 0.35, 'rotate(-2deg)', 2.4);
    slideIn(p.meta, t, T + 0.55, -1200, 'rotate(-1deg)', 0.28);
    const sx = prog(t, T + 0.8, T + 1.0);
    css(p.sfx, { opacity: t < T + 0.8 ? 0 : 1, transform: `rotate(-8deg) scale(${outBack(sx, 2.4) * (1 + 0.03 * Math.sin(t * 9))})` });
    // whip out to the next shot
    const out = prog(t, (PT[i + 1] ?? 24.0) - 0.22, PT[i + 1] ?? 24.0);
    if (out > 0 && i !== 0) p.root.style.filter = ''; // keep simple
    p.root.style.transform = out > 0 && i < 3 ? `translateX(${-inCubic(out) * 300}px)` : '';
  });

  /* scene 5: splash page */
  if (t >= 24.0) {
    s5lines.style.transform = `rotate(${t * 5}deg)`;
    s5thumbs.forEach((p, i) => {
      const T = 24.05 + i * 0.15, x = outBack(prog(t, T, T + 0.35), 1.4);
      const fromX = i % 2 ? 1400 : -1400, fromY = i < 2 ? -500 : 500;
      css(p, { opacity: t < T ? 0 : 1, transform: `translate(${(1 - x) * fromX}px, ${(1 - x) * fromY}px) rotate(${SLOTS[i][2] + (1 - x) * 30}deg) scale(${1 + 0.012 * Math.sin(t * 2 + i)})` });
    });
    const b = outBack(prog(t, 24.55, 25.0), 1.3);
    css(s5book, { transform: `translateY(${(1 - b) * 1100}px) rotate(${lerp(8, -1.5, b)}deg)` });
    s5bookImg.style.transform = `scale(${lerp(1.02, 1.08, prog(t, 24.5, 30))})`;
    slideIn(s5name, t, 25.2, -1600, 'translateX(-50%) rotate(-1deg)', 0.35);
    if (t >= ENTER - 0.15) css(s5name, { opacity: 1 - prog(t, ENTER - 0.15, ENTER), transform: `translateX(-50%) translateY(${-inCubic(prog(t, ENTER - 0.15, ENTER)) * 200}px) rotate(-1deg)` });
    slideIn(s5url, t, 25.6, 1600, 'translateX(-50%) rotate(1deg)', 0.35);
    const eb = prog(t, ENTER, ENTER + 0.3);
    css(s5burst, { opacity: t < ENTER ? 0 : 1, transform: `scale(${outBack(eb, 1.5) * (1 + 0.02 * Math.sin((t - ENTER) * 6))})` });
    s5burst.style.transformOrigin = '50% 50%';
    if (t < ENTER) s5enter.style.opacity = 0;
    else {
      const x = prog(t, ENTER, ENTER + 0.24);
      css(s5enter, { opacity: 1, transform: `translate(-50%, -50%) rotate(-4deg) scale(${lerp(3.2, 1, outBack(x, 1.4)) * (1 + 0.015 * Math.sin((t - ENTER) * 5))})` });
    }
    // the cast steps back a little when the title lands
    const dim = prog(t, ENTER, ENTER + 0.3) * 0.25;
    s5thumbs.forEach((e) => { e.style.filter = `brightness(${1 - dim})`; });
  }
}

/* fit the 1920×1080 stage to the window */
function fit() {
  const s = Math.min(innerWidth / 1920, innerHeight / 1080);
  stage.style.transform = `scale(${s}) translate(-50%, -50%)`;
}
addEventListener('resize', fit); fit();

// Fonts and images must be ready before the first frame is drawn (the renderer captures exact frames).
const ready = Promise.all([document.fonts.ready, ...[...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))]);
ready.then(() => start(render, { duration: DURATION, audio: './out/sound/mix.wav' }));
