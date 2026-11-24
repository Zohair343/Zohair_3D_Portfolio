import { createContext, useContext } from 'react';

/**
 * Per-page info.
 * - live: true only while the page lies open and interactive.
 * - invalidate(): call when the page's look changes while it is NOT open (e.g. a choice made
 *   on another page), so its turning texture is re-drawn.
 */
export interface PageInfo { live: boolean; side: 'left' | 'right'; invalidate: () => void }
export const PageContext = createContext<PageInfo>({ live: true, side: 'right', invalidate: () => {} });
export const usePage = () => useContext(PageContext);
