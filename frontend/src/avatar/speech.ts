/** Shared "is the narrator speaking, and how loudly" state, read every frame by the characters. */
type Listener = () => void;
export const speech = {
  speaking: false,
  /** 0..1 loudness, smoothed: drives head and hand movement. */
  amp: 0,
  text: '',
  source: '' as '' | 'recorded' | 'browser',
  listeners: new Set<Listener>(),
  set(patch: Partial<{ speaking: boolean; text: string; source: '' | 'recorded' | 'browser' }>) {
    Object.assign(speech, patch);
    speech.listeners.forEach((l) => l());
  },
  subscribe(l: Listener) { speech.listeners.add(l); return () => { speech.listeners.delete(l); }; },
};

if (import.meta.env.DEV) (window as unknown as { __speech: typeof speech }).__speech = speech; // test hook (dev only)
