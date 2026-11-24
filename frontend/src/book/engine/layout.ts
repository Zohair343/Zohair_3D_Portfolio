import type { PageDef } from './types';
import { PAPER } from './constants';

/**
 * Turns the flat page list into leaves (sheets of paper) and spreads.
 * pages[0] is the cover (front of leaf 0); after that pages alternate back/front.
 * The last page is printed inside the back cover (the "endpaper").
 */
export interface Leaf { front: PageDef; back: PageDef; board: boolean }

export function buildLayout(pages: PageDef[]) {
  const end = pages[pages.length - 1];
  const turnable = pages.slice(0, -1);
  if (turnable.length % 2 === 1) {
    turnable.push({ id: 'blank', path: '', paper: PAPER, Component: () => null }); // keep fronts/backs paired
  }
  const leaves: Leaf[] = [];
  for (let i = 0; i < turnable.length; i += 2) leaves.push({ front: turnable[i], back: turnable[i + 1], board: i === 0 });
  const N = leaves.length;
  /** Page ids visible in spread s (left, right). */
  const spreadPages = (s: number): [PageDef | null, PageDef] => [s > 0 ? leaves[s - 1].back : null, s < N ? leaves[s].front : end];
  /** Spread that shows a page, and which side it's on. */
  const locate = (pageId: string): { spread: number; side: 'left' | 'right' } => {
    if (pageId === end.id) return { spread: N, side: 'right' };
    const i = turnable.findIndex((p) => p.id === pageId);
    if (i <= 0) return { spread: 0, side: 'right' };
    return i % 2 === 1 ? { spread: (i + 1) / 2, side: 'left' } : { spread: i / 2, side: 'right' };
  };
  const all = [...turnable, end];
  return { leaves, N, end, all, spreadPages, locate };
}
export type Layout = ReturnType<typeof buildLayout>;

/** Resolves a URL (path + hash) to a page: an anchor match wins, then the longest matching path. */
export function resolveUrl(pages: PageDef[], pathname: string, hash: string): { page: PageDef; anchor?: string } {
  const anchor = decodeURIComponent(hash.replace(/^#/, '')) || undefined;
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (anchor) {
    const inChapter = pages.filter((p) => p.path && clean.startsWith(p.path.split('/').slice(0, 3).join('/') || '/'));
    const hit = inChapter.find((p) => p.anchors?.includes(anchor)) ?? pages.find((p) => p.anchors?.includes(anchor));
    if (hit) return { page: hit, anchor };
  }
  const exact = pages.find((p) => p.path === clean);
  if (exact) return { page: exact, anchor };
  const prefix = pages.filter((p) => p.path && p.path !== '/' && clean.startsWith(p.path)).sort((a, b) => b.path.length - a.path.length)[0];
  return { page: prefix ?? pages[0], anchor };
}
