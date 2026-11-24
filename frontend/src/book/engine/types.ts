import type { ComponentType } from 'react';

/** What every page component receives. */
export interface BookApi {
  /** Turn to a page by id (see book.config.ts), optionally highlighting an element id on it. */
  goTo: (pageId: string, anchor?: string) => void;
  next: () => void;
  prev: () => void;
}

export interface PageProps { book: BookApi }

export interface PageDef {
  /** Unique id; also used for snapshots and debugging. */
  id: string;
  /** URL for this page. The first page of a chapter usually owns the chapter URL. */
  path: string;
  /** If set, a tab with this label appears in the top bar and jumps to this page. */
  tab?: string;
  /** If set, this page appears in a drop-down menu under the nearest `tab` above it. */
  subtab?: string;
  /** Element ids on this page that links/citations may target (e.g. "combo" → /projects/scorched#combo). */
  anchors?: string[];
  /** Paper colour of this page. */
  paper?: string;
  /** Narration text read aloud by the avatar (stage 4). */
  narration?: string;
  Component: ComponentType<PageProps>;
}

/** Top-bar entry. Tabs with children open a menu. */
export interface TabDef { label: string; pageId: string; children?: { label: string; pageId: string }[] }

/** Builds the top bar from the page list: `tab` pages become tabs, `subtab` pages join the tab above. */
export function buildTabs(pages: PageDef[]): TabDef[] {
  const tabs: TabDef[] = [];
  for (const p of pages) {
    if (p.tab) tabs.push({ label: p.tab, pageId: p.id });
    else if (p.subtab && tabs.length) {
      const t = tabs[tabs.length - 1];
      (t.children ??= [{ label: `All ${t.label.toLowerCase()}`, pageId: t.pageId }]).push({ label: p.subtab, pageId: p.id });
    }
  }
  return tabs;
}
