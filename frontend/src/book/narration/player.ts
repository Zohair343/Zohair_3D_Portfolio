import narration from '@content/narration.json';
import { speech } from '../../avatar/speech';

/** Recorded files listed by backend/generate_narration.py; missing → the browser's own voice is used. */
interface Manifest { voice: string; pages: Record<string, { file: string; seconds: number }> }
let manifest: Manifest | null | undefined;
async function loadManifest(): Promise<Manifest | null> {
  if (manifest !== undefined) return manifest ?? null;
  try {
    const r = await fetch('/media/narration/manifest.json', { cache: 'no-cache' });
    manifest = r.ok ? await r.json() : null;
  } catch { manifest = null; }
  return manifest ?? null;
}
export const narrationText = (pageId: string): string | undefined => (narration.pages as Record<string, string>)[pageId];

/**
 * Plays narration for a list of pages in order. Measures loudness with the Web Audio API so the
 * characters can gesture in time with the voice. Must be started from a click (autoplay rules).
 */
export class NarrationPlayer {
  private audio = new Audio();
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buf = new Float32Array(512);
  private raf = 0;
  private run = 0; // bumps on stop(), cancelling any queue in progress

  /** Call inside the click that turns narration on. */
  unlock() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      const src = this.ctx.createMediaElementSource(this.audio);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 512;
      src.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    } catch { this.ctx = null; }
    void this.ctx?.resume();
    void loadManifest();
  }

  async play(pageIds: string[]) {
    this.stop();
    const run = this.run;
    const m = await loadManifest();
    for (const id of pageIds) {
      const text = narrationText(id);
      if (!text || run !== this.run) continue;
      speech.set({ speaking: true, text, source: m?.pages[id] ? 'recorded' : 'browser' });
      if (m?.pages[id]) await this.playFile(`/media/narration/${m.pages[id].file}`, run);
      else await this.speakWithBrowser(text, run);
      if (run !== this.run) return;
    }
    this.done();
  }

  stop() {
    this.run++;
    this.audio.pause();
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.done();
  }

  private done() {
    cancelAnimationFrame(this.raf);
    speech.amp = 0;
    speech.set({ speaking: false, text: '', source: '' });
  }

  private playFile(url: string, run: number) {
    return new Promise<void>((resolve) => {
      this.audio.src = url;
      this.audio.onended = this.audio.onerror = () => resolve();
      this.audio.play().catch(() => resolve());
      const tick = () => {
        if (run !== this.run) return resolve();
        if (this.analyser) {
          this.analyser.getFloatTimeDomainData(this.buf);
          let sum = 0;
          for (const v of this.buf) sum += v * v;
          const level = Math.min(1, Math.sqrt(sum / this.buf.length) * 6);
          speech.amp += (level - speech.amp) * 0.35;
        } else speech.amp = 0.6;
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    });
  }

  /** Fallback until recordings exist. Loudness isn't measurable here, so words drive short pulses. */
  private speakWithBrowser(text: string, run: number) {
    return new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) return resolve();
      const u = new SpeechSynthesisUtterance(text);
      const voices = speechSynthesis.getVoices().filter((v) => v.lang.startsWith('en'));
      u.voice = voices.find((v) => /male|david|daniel|guy|mark|alex/i.test(v.name) && !/female/i.test(v.name)) ?? voices[0] ?? null;
      u.rate = 1; u.pitch = 0.95;
      let pulse = 0;
      u.onboundary = () => { pulse = 1; };
      u.onend = u.onerror = () => resolve();
      speechSynthesis.speak(u);
      const tick = () => {
        if (run !== this.run) return resolve();
        pulse *= 0.9;
        speech.amp += (0.35 + 0.5 * pulse - speech.amp) * 0.3;
        this.raf = requestAnimationFrame(tick);
      };
      tick();
    });
  }
}
