import { createContext, useCallback, useContext, useRef, type ReactNode } from 'react';

/** Guarantees one active clip at a time across the whole book. */
interface MediaCtx {
  claim: (el: HTMLMediaElement) => void;
  release: (el: HTMLMediaElement) => void;
}
const Ctx = createContext<MediaCtx>({ claim: () => {}, release: () => {} });

export function MediaProvider({ children }: { children: ReactNode }) {
  const active = useRef<HTMLMediaElement | null>(null);
  const claim = useCallback((el: HTMLMediaElement) => {
    if (active.current && active.current !== el) active.current.pause();
    active.current = el;
  }, []);
  const release = useCallback((el: HTMLMediaElement) => {
    if (active.current === el) active.current = null;
  }, []);
  return <Ctx.Provider value={{ claim, release }}>{children}</Ctx.Provider>;
}
export const useMedia = () => useContext(Ctx);
