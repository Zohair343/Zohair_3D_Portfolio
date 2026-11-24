import { useSyncExternalStore } from 'react';
/** The riddle-or-inventory choice on Darkness Within page 1, revealed on page 2. */
type Choice = 'riddle' | 'inventory' | null;
let choice: Choice = null;
const listeners = new Set<() => void>();
export const darknessStore = {
  set(c: Choice) { choice = c; listeners.forEach((l) => l()); },
  get: () => choice,
  subscribe(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; },
};
export const useDarknessChoice = () => useSyncExternalStore(darknessStore.subscribe, darknessStore.get);
