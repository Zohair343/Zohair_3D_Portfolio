import { describe, expect, it } from 'vitest';
import { buildLayout, resolveUrl } from './layout';
import type { PageDef } from './types';

const P = (id: string, path: string, anchors?: string[]): PageDef => ({ id, path, anchors, Component: () => null });
const pages = [P('cover', '/'), P('contents', '/contents'), P('s1', '/projects/scorched', ['arena']), P('s2', '/projects/scorched/2', ['combo']), P('end', '/credits')];

describe('book layout', () => {
  const L = buildLayout(pages);
  it('pairs pages into leaves, padding odd counts', () => {
    expect(L.leaves.map((l) => [l.front.id, l.back.id])).toEqual([['cover', 'contents'], ['s1', 's2']]);
    expect(L.N).toBe(2);
  });
  it('locates pages on the correct spread and side', () => {
    expect(L.locate('cover')).toEqual({ spread: 0, side: 'right' });
    expect(L.locate('contents')).toEqual({ spread: 1, side: 'left' });
    expect(L.locate('s1')).toEqual({ spread: 1, side: 'right' });
    expect(L.locate('s2')).toEqual({ spread: 2, side: 'left' });
    expect(L.locate('end')).toEqual({ spread: 2, side: 'right' });
  });
  it('resolves chapter URLs and citation anchors', () => {
    expect(resolveUrl(pages, '/projects/scorched', '').page.id).toBe('s1');
    expect(resolveUrl(pages, '/projects/scorched', '#combo').page.id).toBe('s2');
    expect(resolveUrl(pages, '/projects/scorched/', '').page.id).toBe('s1');
    expect(resolveUrl(pages, '/nope', '').page.id).toBe('cover');
  });
});
