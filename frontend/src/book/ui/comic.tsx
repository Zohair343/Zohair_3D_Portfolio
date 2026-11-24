import type { ReactNode } from 'react';
import type { Panel as PanelData } from '../../lib/content';

/* Small comic building blocks used by every page. */

/** Round speech-balloon button (or link). Use for actions. */
export function Balloon({ children, onClick, href, tail = 'left', className = '' }: { children: ReactNode; onClick?: () => void; href?: string; tail?: 'left' | 'right'; className?: string }) {
  const cls = `balloon balloon-tail-${tail} ${className}`;
  return href ? <a className={cls} href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <button className={cls} onClick={onClick}>{children}</button>;
}

/** Someone speaking (the avatar). */
export function Speech({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`speech ${className}`}>{children}</div>;
}

/** Rectangular caption box: explains mechanics, tools and contributions. */
export function Cap({ children, small = false }: { children: ReactNode; small?: boolean }) {
  return <p className={small ? 'cap cap-small' : 'cap'}>{children}</p>;
}

/** Page header: kicker caption + big title. */
export function PageTitle({ kicker, title, accent }: { kicker?: string; title: string; accent?: string }) {
  return (
    <header className="page-title">
      {kicker && <Cap>{kicker}</Cap>}
      <h2 style={accent ? { textShadow: `4px 4px 0 ${accent}` } : undefined}>{title}</h2>
    </header>
  );
}

/** A content panel whose id is a link/citation anchor. */
export function Panel({ data, art, children, className = '', compact = false }: { data: PanelData; art?: ReactNode; children?: ReactNode; className?: string; compact?: boolean }) {
  return (
    <section id={data.id} className={`bpanel ${compact ? 'compact' : ''} ${className}`} aria-labelledby={`${data.id}-h`}>
      {art && <div className="bpanel-art" aria-hidden="true">{art}</div>}
      <div className="bpanel-body">
        <Cap small>{data.caption}</Cap>
        <h3 id={`${data.id}-h`}>{data.title}</h3>
        <p>{data.body}</p>
        {children}
      </div>
      {data.sfx && <span className="sfx bpanel-sfx" aria-hidden="true">{data.sfx}</span>}
    </section>
  );
}

/** Tiny pager line at the foot of a page. */
export function Folio({ n, label }: { n: number; label: string }) {
  return <p className="folio" aria-hidden="true">{n} · {label}</p>;
}
