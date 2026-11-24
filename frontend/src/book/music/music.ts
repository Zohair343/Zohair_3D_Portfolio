import { speech } from '../../avatar/speech';

/*
 * Background music: one looping track, quiet, under everything else.
 * - Browsers block sound until the visitor interacts, so it starts on the first click or key press.
 * - It fades down while the narrator speaks and goes silent while a video plays.
 * - The visitor's on/off choice is remembered in this browser.
 */
export const MUSIC = {
  src: '/media/music/lay-low.mp3',
  volume: 0.16,          // normal level (0..1)
  underNarration: 0.04,  // while the narrator speaks
  fadeSeconds: 1.2,
};

const KEY = 'pp-music';
type Listener = () => void;

class Music {
  private audio: HTMLAudioElement | null = null;
  private target = 0;
  private raf = 0;
  private last = 0;
  private ducks = new Set<string>();
  private listeners = new Set<Listener>();
  /** The visitor's choice; on by default. */
  enabled = (() => { try { return localStorage.getItem(KEY) !== 'off'; } catch { return true; } })();
  started = false;

  constructor() {
    speech.subscribe(() => this.update());
  }

  /** Call once: starts the music on the visitor's first interaction (if they haven't turned it off). */
  armAutostart() {
    const go = () => { off(); if (this.enabled) this.start(); };
    const off = () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); };
    window.addEventListener('pointerdown', go, { once: true });
    window.addEventListener('keydown', go, { once: true });
    return off;
  }

  private ensure() {
    if (this.audio) return this.audio;
    const a = new Audio(MUSIC.src);
    a.loop = true; a.preload = 'auto'; a.volume = 0;
    this.audio = a;
    return a;
  }

  start() {
    const a = this.ensure();
    this.started = true;
    this.update();
    if (this.target > 0) a.play().catch(() => { /* blocked until a gesture; armAutostart retries */ });
  }

  toggle() {
    this.enabled = !this.enabled;
    try { localStorage.setItem(KEY, this.enabled ? 'on' : 'off'); } catch { /* private mode */ }
    if (this.enabled) this.start(); else this.update();
    this.emit();
  }

  /** Silence the music while something else plays (e.g. a video). */
  duck(reason: string, on: boolean) {
    if (on) this.ducks.add(reason); else this.ducks.delete(reason);
    this.update();
  }

  private update() {
    this.target = !this.enabled || !this.started || this.ducks.size ? 0 : speech.speaking ? MUSIC.underNarration : MUSIC.volume;
    const a = this.audio;
    if (!a) return;
    if (this.target > 0 && a.paused) a.play().catch(() => {});
    if (!this.raf) { this.last = performance.now(); this.raf = requestAnimationFrame(this.fade); }
  }

  private fade = (now: number) => {
    const a = this.audio!;
    // rAF's timestamp can be slightly older than performance.now() on the first frame: never step backwards
    const dt = Math.min(Math.max((now - this.last) / 1000, 0), 0.25);
    this.last = Math.max(now, this.last);
    const step = dt * (MUSIC.volume / MUSIC.fadeSeconds) * 1.5;
    const d = this.target - a.volume;
    const next = Math.abs(d) <= step ? this.target : a.volume + Math.sign(d) * step;
    a.volume = Math.min(1, Math.max(0, next));
    if (a.volume === this.target) {
      this.raf = 0;
      if (this.target === 0) a.pause();
      return;
    }
    this.raf = requestAnimationFrame(this.fade);
  };

  subscribe(l: Listener) { this.listeners.add(l); return () => { this.listeners.delete(l); }; }
  private emit() { this.listeners.forEach((l) => l()); }
}

export const music = new Music();
