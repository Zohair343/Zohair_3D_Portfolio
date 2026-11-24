/** Lets any page send a question to the Ask Zohair page before turning to it. */
let pending: string | null = null;
const listeners = new Set<() => void>();
export const askStore = {
  set(q: string) { pending = q; listeners.forEach((l) => l()); },
  take(): string | null { const q = pending; pending = null; return q; },
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};
