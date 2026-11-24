import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Canvas, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer.js';
import { useLocation, useNavigate } from 'react-router-dom';
import { H, PAPER, PX_H, PX_W, W } from './constants';
import { buildLayout, resolveUrl } from './layout';
import { makeTexture, paperCanvas, snapshotInto } from './snapshot';
import { Animator, Binding, CameraRig, Leaf, Renderers, zLeft, zRight } from './scene';
import { PageContext } from './PageContext';
import { PageShell } from './PageShell';
import { DeskLamp, DeskProps, DeskTop } from './desk';
import type { BookApi, PageDef, TabDef } from './types';
import { TabBar } from './TabBar';
import { CoverAvatar } from '../../avatar/CoverAvatar';
import { PointingArm, type PointTarget } from '../../avatar/PointingArm';
import { NarratorAvatar } from '../../avatar/NarratorAvatar';
import { NarrationPlayer } from '../narration/player';
import { Captions } from '../narration/Captions';
import { music } from '../music/music';
import { avatarConfig } from '../../avatar/config';

interface Slot { page: PageDef; outer: HTMLDivElement; inner: HTMLDivElement; obj: CSS3DObject; tex: THREE.CanvasTexture; blank: THREE.CanvasTexture; mat?: THREE.MeshStandardMaterial; side: 'left' | 'right'; invalidate: () => void }

const ALL_LAYERS = (() => { const l = new THREE.Layers(); l.enableAll(); return l; })();
const nextFrames = (n = 2) => new Promise<void>((r) => { const f = (k: number) => (k ? requestAnimationFrame(() => f(k - 1)) : r()); f(n); });

/**
 * The 3D comic book. Pages come from book.config.ts; this file never needs editing to add one.
 * Resting pages show their live HTML aligned over the 3D page; turning pages show a snapshot texture.
 */
export default function Book({ pages, tabs }: { pages: PageDef[]; tabs: TabDef[] }) {
  const layout = useMemo(() => buildLayout(pages), [pages]);
  const { leaves, N, end, all, spreadPages, locate } = layout;
  const location = useLocation();
  const navigate = useNavigate();

  /* ---------- one DOM page + texture per page ---------- */
  const slots = useMemo(() => {
    const map = new Map<string, Slot>();
    const blanks = new Map<string, THREE.CanvasTexture>();
    for (const page of all) {
      const side = leaves.some((l) => l.back.id === page.id) ? 'left' : 'right';
      const outer = document.createElement('div');
      const inner = document.createElement('div');
      inner.className = 'face-root';
      Object.assign(inner.style, { width: `${PX_W}px`, height: `${PX_H}px` });
      outer.appendChild(inner);
      const obj = new CSS3DObject(outer);
      Object.assign(outer.style, { pointerEvents: 'none', userSelect: 'text', opacity: '0' }); // CSS3DObject forces other values
      obj.scale.setScalar(W / PX_W);
      const tint = page.paper ?? PAPER;
      const key = `${tint}-${side}`;
      if (!blanks.has(key)) blanks.set(key, makeTexture(paperCanvas(tint), side === 'left'));
      const tex = makeTexture(paperCanvas(tint), side === 'left');
      let timer: ReturnType<typeof setTimeout> | undefined;
      // Re-draw this page's turning texture shortly after its content changes.
      const invalidate = () => { clearTimeout(timer); timer = setTimeout(() => void snapshotInto(inner, tex, tint), 250); };
      map.set(page.id, { page, outer, inner, obj, tex, blank: blanks.get(key)!, side, invalidate });
    }
    leaves.forEach((l, i) => {
      map.get(l.front.id)!.obj.position.set(W / 2, 0, zRight(i, N) + 0.002);
      map.get(l.back.id)!.obj.position.set(-W / 2, 0, zLeft(i) + 0.002);
    });
    map.get(end.id)!.obj.position.set(W / 2, 0, zRight(N, N) + 0.002);
    return map;
  }, [all, leaves, end, N]);

  /* ---------- state ---------- */
  const initial = useMemo(() => resolveUrl(all, location.pathname, location.hash), []); // eslint-disable-line react-hooks/exhaustive-deps
  const start = locate(initial.page.id);
  const [spread, setSpread] = useState(start.spread);
  const [focus, setFocus] = useState<'left' | 'right'>(start.side);
  const [live, setLive] = useState<Set<string>>(new Set());
  const [single, setSingle] = useState(() => innerWidth / innerHeight < 0.9);
  const progress = useRef<number[]>(leaves.map((_, i) => (i < start.spread ? 1 : 0)));
  const target = useRef(start.spread);
  const pendingAnchor = useRef<string | undefined>(initial.anchor);
  const askedFor = useRef<string | null>(null);
  const [navCount, setNavCount] = useState(0); // bumps on every goTo, so the URL updates even without a page turn
  const turning = useRef(false);
  const lastUrl = useRef('');
  const announce = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const fn = () => setSingle(innerWidth / innerHeight < 0.9);
    addEventListener('resize', fn); return () => removeEventListener('resize', fn);
  }, []);

  /* Show live HTML only on the two open pages; everything else is a texture. */
  const settle = useCallback((s: number) => {
    const open = new Set(spreadPages(s).filter(Boolean).map((p) => p!.id));
    for (const slot of slots.values()) {
      const on = open.has(slot.page.id);
      slot.outer.style.opacity = on ? '1' : '0';
      slot.outer.style.pointerEvents = on ? 'auto' : 'none';
      slot.outer.inert = !on; // not visibility:hidden — it's inherited and blanks the snapshots
      if (slot.mat) { slot.mat.map = on ? slot.blank : slot.tex; slot.mat.needsUpdate = true; }
    }
    setLive(open);
    const [l, r] = spreadPages(s);
    if (announce.current) announce.current.textContent = `Pages: ${[l?.tab ?? l?.id, r.tab ?? r.id].filter(Boolean).join(', ')}`;
    const a = pendingAnchor.current;
    if (a) {
      pendingAnchor.current = undefined;
      requestAnimationFrame(() => {
        const el = [...open].map((id) => slots.get(id)!.inner.querySelector<HTMLElement>(`#${CSS.escape(a)}`)).find(Boolean);
        if (el) { el.classList.add('cited'); setTimeout(() => el.classList.remove('cited'), 2600); }
      });
    }
  }, [slots, spreadPages]);

  /* Snapshot every page in the background, nearest pages first. */
  const [inking, setInking] = useState(true);
  useEffect(() => {
    let stop = false;
    (async () => {
      await document.fonts.ready;
      await new Promise((r) => setTimeout(r, 400));
      const order = [...slots.values()].sort((a, b) => Math.abs(locate(a.page.id).spread - target.current) - Math.abs(locate(b.page.id).spread - target.current));
      for (const s of order) {
        if (stop) return;
        while (turning.current) await new Promise((r) => setTimeout(r, 200)); // never compete with a page turn
        await snapshotInto(s.inner, s.tex, s.page.paper ?? PAPER);
        await new Promise((r) => setTimeout(r, 60)); // let input and animation breathe
      }
      if (!stop) setInking(false);
    })();
    return () => { stop = true; };
  }, [slots, locate]);

  /* ---------- navigation ---------- */
  const turnTo = useCallback(async (s: number, side: 'left' | 'right', anchor?: string) => {
    s = Math.min(Math.max(s, 0), N);
    pendingAnchor.current = anchor;
    setFocus(side);
    if (s === target.current) { settle(s); return; }
    pointTarget.current = null;
    stageRef.current?.removeAttribute('data-pointing');
    player.stop();
    const leaving = spreadPages(target.current).filter(Boolean).map((p) => slots.get(p!.id)!);
    setLive(new Set());            // pages stop media and drop iframes
    await nextFrames(2);
    await Promise.race([Promise.all(leaving.map((sl) => snapshotInto(sl.inner, sl.tex, sl.page.paper ?? PAPER))), new Promise((r) => setTimeout(r, 900))]);
    for (const slot of slots.values()) {
      slot.outer.style.opacity = '0'; slot.outer.style.pointerEvents = 'none'; slot.outer.inert = true;
      if (slot.mat) { slot.mat.map = slot.tex; slot.mat.needsUpdate = true; }
    }
    target.current = s;
    turning.current = true;
    setSpread(s);
  }, [N, settle, slots, spreadPages]);

  const goTo = useCallback((pageId: string, anchor?: string) => {
    askedFor.current = pageId;
    setNavCount((n) => n + 1);
    const { spread: s, side } = locate(pageId);
    void turnTo(s, side, anchor);
  }, [locate, turnTo]);

  const next = useCallback(() => {
    askedFor.current = null;
    const s = target.current;
    if (single && s > 0 && s < N && focus === 'left') return setFocus('right');
    if (s < N) void turnTo(s + 1, 'left');
  }, [single, focus, N, turnTo]);
  const prev = useCallback(() => {
    askedFor.current = null;
    const s = target.current;
    if (single && s > 0 && focus === 'right') return setFocus('left');
    if (s > 0) void turnTo(s - 1, 'right');
  }, [single, focus, turnTo]);

  const api: BookApi = useMemo(() => ({ goTo, next, prev }), [goTo, next, prev]);

  /* URL ⇄ book: the page in focus owns the URL; back/forward turns pages. */
  useEffect(() => {
    const [l, r] = spreadPages(spread);
    const here = resolveUrl(all, location.pathname, location.hash).page.id;
    if ((here === l?.id || here === r.id) && (!askedFor.current || here === askedFor.current)) return; // URL already names an open page
    const asked = [l, r].find((pg) => pg && pg.id === askedFor.current && pg.path);
    // Default: a spread is read from its left page, so that page names the URL (unless a
    // specific page was asked for, or a phone is showing only the right page).
    const page = asked ?? (single ? (focus === 'left' && l ? l : r) : (l?.path ? l : r));
    const url = page.path || '/';
    if (url !== location.pathname) { lastUrl.current = url; navigate(url); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spread, focus, single, navCount]);
  useEffect(() => {
    if (location.pathname === lastUrl.current && !location.hash) return;
    const { page, anchor } = resolveUrl(all, location.pathname, location.hash);
    lastUrl.current = location.pathname;
    goTo(page.id, anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select, [contenteditable]')) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
    };
    addEventListener('keydown', fn); return () => removeEventListener('keydown', fn);
  }, [next, prev]);

  /* Clicking bare 3D paper (only reachable while pages turn or around edges). */
  const onPaper = useCallback((e: ThreeEvent<PointerEvent>, side: 'front' | 'back') => {
    if (!(e.nativeEvent.target instanceof HTMLCanvasElement)) return;
    e.stopPropagation();
    if (side === 'front') next(); else prev();
  }, [next, prev]);

  const endMat = useMemo(() => {
    const s = slots.get(end.id)!;
    const m = new THREE.MeshStandardMaterial({ map: s.tex, roughness: 0.92 });
    m.userData.outlineParameters = { visible: false };
    s.mat = m;
    return m;
  }, [slots, end]);

  /* ---------- the pointing hand ---------- */
  const pointTarget = useRef<PointTarget | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const clearTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    // What the hand points at: clickable things only, never form fields.
    const SELECTOR = 'button, a[href], summary, [role="button"]';
    const coarse = matchMedia('(pointer: coarse)').matches;
    const offs: (() => void)[] = [];
    for (const slot of slots.values()) {
      const aimAt = (el: HTMLElement) => {
        if (slot.outer.style.opacity !== '1' || spreadRef.current === 0) return; // only open pages, not the cover
        // element position in page pixels (untransformed), then into book space, then world
        let x = 0, y = 0, n: HTMLElement | null = el;
        while (n && n !== slot.inner) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent as HTMLElement | null; }
        const k = W / PX_W, h = el.offsetHeight;
        // aim just inside the element's edge nearest the arm: unambiguous, without covering much of it
        const inset = Math.min(30, el.offsetWidth * 0.2);
        const px = slot.side === 'left' ? x + inset : x + el.offsetWidth - inset;
        const local = new THREE.Vector3(slot.obj.position.x + (px - PX_W / 2) * k, slot.obj.position.y - (y + h / 2 - PX_H / 2) * k, slot.obj.position.z);
        local.z += avatarConfig.pointing.hover; // fingertip hovers above the paper so the page never hides the hand
        clearTimeout(clearTimer.current);
        pointTarget.current = { page: slot.side, world: bookGroup.current ? bookGroup.current.localToWorld(local) : local };
        stageRef.current?.setAttribute('data-pointing', slot.side); // for tests and styling
      };
      const release = () => {
        clearTimeout(clearTimer.current);
        clearTimer.current = setTimeout(() => { pointTarget.current = null; stageRef.current?.removeAttribute('data-pointing'); }, 250);
      };
      const over = (e: Event) => { const el = (e.target as HTMLElement).closest?.(SELECTOR) as HTMLElement | null; if (el && slot.inner.contains(el)) aimAt(el); };
      const out = (e: Event) => { const to = (e as PointerEvent).relatedTarget as HTMLElement | null; if (!to?.closest?.(SELECTOR)) release(); };
      if (!coarse) { slot.inner.addEventListener('pointerover', over); slot.inner.addEventListener('pointerout', out); }
      slot.inner.addEventListener('focusin', over); slot.inner.addEventListener('focusout', release);
      offs.push(() => {
        slot.inner.removeEventListener('pointerover', over); slot.inner.removeEventListener('pointerout', out);
        slot.inner.removeEventListener('focusin', over); slot.inner.removeEventListener('focusout', release);
      });
    }
    return () => offs.forEach((f) => f());
  }, [slots]);
  const spreadRef = useRef(spread);
  spreadRef.current = spread;
  const edgeX = useCallback(() => {
    const g = bookGroup.current;
    const l = new THREE.Vector3(-W - 0.012, 0, 0), r = new THREE.Vector3(W + 0.012, 0, 0);
    if (g) { g.localToWorld(l); g.localToWorld(r); }
    return { left: l.x, right: r.x };
  }, []);

  /* ---------- narration ---------- */
  const player = useMemo(() => new NarrationPlayer(), []);
  const [narrating, setNarrating] = useState(false);
  const narratingRef = useRef(false);
  narratingRef.current = narrating;
  /** Pages to read for the open spread (just the focused page on phones). */
  const pagesToRead = useCallback((s: number) => {
    const [l, r] = spreadPages(s);
    return (single ? [focus === 'left' && l ? l : r] : [l, r]).filter(Boolean).map((p) => p!.id);
  }, [spreadPages, single, focus]);
  const toggleNarration = () => {
    if (narrating) { player.stop(); setNarrating(false); return; }
    player.unlock(); // must happen inside the click
    setNarrating(true);
    void player.play(pagesToRead(target.current));
  };
  useEffect(() => () => player.stop(), [player]);

  /* ---------- background music ---------- */
  const [musicOn, setMusicOn] = useState(music.enabled);
  useEffect(() => { const off = music.armAutostart(); const unsub = music.subscribe(() => setMusicOn(music.enabled)); return () => { off(); unsub(); }; }, []);
  const narratorAnchor = useCallback(() => {
    const [l] = spreadPages(spreadRef.current);
    const left = single ? (focus === 'left' && l) : !!l;
    const v = new THREE.Vector3(left ? -W + 0.16 : W - 0.16, -H / 2 - 0.004, 0.06);
    if (!left) v.x = W - 0.16;
    return bookGroup.current ? bookGroup.current.localToWorld(v) : v;
  }, [spreadPages, single, focus]);

  const coverClipY = useRef<() => number>(() => 0);
  const bookGroup = useRef<THREE.Group>(null);
  coverClipY.current = () => {
    const v = new THREE.Vector3(0, -H * 0.5 + H * 0.14, 0);
    bookGroup.current?.localToWorld(v);
    return v.y;
  };

  const activeTab = useMemo(() => {
    const [l, r] = spreadPages(spread);
    const ids = all.map((p) => p.id);
    const focusId = (single && focus === 'left' && l ? l : r).id;
    const idx = ids.indexOf(focusId);
    let best: (typeof tabs)[number] | undefined;
    for (const t of tabs) if (ids.indexOf(t.pageId) <= idx) best = t;
    return best?.pageId;
  }, [spread, focus, single, tabs, all, spreadPages]);

  return (
    <div className="book-app">
      <a className="skip-link" href="#book-tabs">Skip to chapters</a>
      <header className="book-bar">
        <button className="book-brand" onClick={() => goTo(all[0].id)}>Playable Pages <small>Muhammad Zohair Shaikh</small></button>
        <TabBar tabs={tabs} active={activeTab} onGo={goTo} />
      </header>
      <div className="book-stage" ref={stageRef}>
        <Canvas shadows dpr={[1, 2]} camera={{ fov: 32, position: [0.5, -0.3, 3], near: 0.05, far: 40 }} gl={{ antialias: true }}>
          <color attach="background" args={['#17120e']} />
          <ambientLight intensity={0.7} color="#e3d2bf" layers={ALL_LAYERS} />
          <directionalLight layers={ALL_LAYERS} position={[-2.5, 3, 4]} intensity={0.9} color="#fff1d6" />
          <DeskTop />
          <DeskLamp />
          <DeskProps />
          <group ref={bookGroup} rotation={[-0.06, 0, 0]}>
            <Binding count={N} />
            {leaves.map((l, i) => {
              const f = slots.get(l.front.id)!, b = slots.get(l.back.id)!;
              return (
                <Leaf key={l.front.id} index={i} count={N} frontTex={f.tex} backTex={b.tex} progress={progress} board={l.board} onPointerDown={onPaper}
                  registerMaterials={(fm, bm) => { f.mat = fm; b.mat = bm; }} />
              );
            })}
            <mesh position={[W / 2, 0, zRight(N, N) + 0.0005]} material={endMat} receiveShadow><planeGeometry args={[W, H]} /></mesh>
            {[...slots.values()].map((s) => <primitive key={s.page.id} object={s.obj} />)}
            <Suspense fallback={null}>
              <CoverAvatar visible={spread === 0} position={[W * 0.73, 0, zRight(0, N) + 0.09]} scale={1.25} waistY={-H * 0.5 + H * 0.14} clipY={() => coverClipY.current()} />
            </Suspense>
          </group>
          <Suspense fallback={null}><PointingArm target={pointTarget} edgeX={edgeX} /></Suspense>
          <Suspense fallback={null}><NarratorAvatar enabled={spread > 0} anchor={narratorAnchor} /></Suspense>
          <Animator progress={progress} target={target} onSettled={(t) => {
            const wasTurning = turning.current;
            turning.current = false;
            settle(t);
            if (wasTurning && narratingRef.current) void player.play(pagesToRead(t));
          }} />
          <CameraRig spread={spread} focus={focus} single={single} />
          <Renderers />
        </Canvas>
        {inking && <div className="book-loading" aria-hidden="true">Inking the pages…</div>}
        <Captions onStop={() => { player.stop(); setNarrating(false); }} />
      </div>
      <div className="book-controls">
        <button className="balloon balloon-tail-left" onClick={prev} disabled={spread === 0}>← Back</button>
        <button className={`balloon narrate ${narrating ? 'on' : ''}`} onClick={toggleNarration} aria-pressed={narrating} aria-label={narrating ? 'Stop narrating' : 'Narrate'}>
          <span aria-hidden="true">{narrating ? '■' : '🔊'}</span><span className="lbl">{narrating ? 'Stop narrating' : 'Narrate'}</span>
        </button>
        <button className={`balloon music ${musicOn ? 'on' : ''}`} onClick={() => music.toggle()} aria-pressed={musicOn}
          aria-label={musicOn ? 'Background music on. Turn it off' : 'Background music off. Turn it on'} title="Background music">
          <span aria-hidden="true">♪</span><span className="lbl">{musicOn ? 'Music' : 'Music off'}</span>
        </button>
        <p className="book-hint">Click a page corner, swipe, or use ← →</p>
        <button className="balloon balloon-tail-right" onClick={next} disabled={spread === N && (!single || focus === 'right')}>Next page →</button>
      </div>
      <p ref={announce} className="sr-only" aria-live="polite" />
      {[...slots.values()].map((s) => createPortal(
        <PageContext.Provider value={{ live: live.has(s.page.id), side: s.side, invalidate: s.invalidate }}>
          <PageShell side={s.side} canTurn={s.side === 'left' ? true : s.page.id !== end.id} onTurn={s.side === 'right' ? next : prev}>
            <s.page.Component book={api} />
          </PageShell>
        </PageContext.Provider>, s.inner, s.page.id))}
    </div>
  );
}
