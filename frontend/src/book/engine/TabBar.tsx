import { useEffect, useRef, useState } from 'react';
import type { TabDef } from './types';

/** Chapter tabs. A tab with children (e.g. Projects) opens a menu of its pages. */
export function TabBar({ tabs, active, onGo }: { tabs: TabDef[]; active?: string; onGo: (pageId: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const bar = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !bar.current?.contains(e.target as Node)) setOpen(null);
    };
    addEventListener('keydown', close); addEventListener('pointerdown', close);
    return () => { removeEventListener('keydown', close); removeEventListener('pointerdown', close); };
  }, [open]);
  return (
    <nav ref={bar} id="book-tabs" aria-label="Chapters" className="book-tabs">
      {tabs.map((t) => {
        const on = t.pageId === active;
        if (!t.children) {
          return <button key={t.pageId} className={`tab ${on ? 'on' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => onGo(t.pageId)}>{t.label}</button>;
        }
        const isOpen = open === t.pageId;
        return (
          <div key={t.pageId} className="tab-group">
            <button className={`tab ${on ? 'on' : ''}`} aria-haspopup="true" aria-expanded={isOpen} aria-controls={`menu-${t.pageId}`}
              onClick={() => setOpen(isOpen ? null : t.pageId)}>{t.label} <span aria-hidden="true">▾</span></button>
            {isOpen && (
              <ul id={`menu-${t.pageId}`} className="tab-menu">
                {t.children.map((c) => (
                  <li key={c.pageId}><button onClick={() => { setOpen(null); onGo(c.pageId); }}>{c.label}</button></li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
