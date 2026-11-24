import { useEffect, useState } from 'react';
export function useReducedMotion() {
  const q = '(prefers-reduced-motion: reduce)';
  const [rm, setRm] = useState(() => (typeof window !== 'undefined' && window.matchMedia?.(q).matches) || false);
  useEffect(() => {
    const mq = window.matchMedia?.(q);
    if (!mq) return;
    const fn = () => setRm(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return rm;
}
