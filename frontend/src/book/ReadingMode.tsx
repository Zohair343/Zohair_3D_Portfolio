import { PAGES } from './book.config';
import { PageContext } from './engine/PageContext';
import type { BookApi } from './engine/types';

/**
 * The same pages, flat and in order: for devices without WebGL and for screen-reader users.
 * Reached automatically when 3D can't start, or at /read.
 */
export default function ReadingMode({ notice }: { notice?: string }) {
  const api: BookApi = {
    goTo: (id, anchor) => document.getElementById(anchor ?? `page-${id}`)?.scrollIntoView({ behavior: 'smooth' }),
    next: () => {}, prev: () => {},
  };
  return (
    <div className="reading-mode">
      <header className="book-bar"><a className="book-brand" href="/">Playable Pages <small>reading mode</small></a></header>
      {notice && <p className="status warn reading-notice">{notice}</p>}
      <main>
        {PAGES.map((p) => (
          <article key={p.id} id={`page-${p.id}`} className="reading-page face-root" style={{ background: p.paper }}>
            <PageContext.Provider value={{ live: true, side: 'right', invalidate: () => {} }}>
              <p.Component book={api} />
            </PageContext.Provider>
          </article>
        ))}
      </main>
    </div>
  );
}
