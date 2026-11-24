import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { projectBySlug, panelOf } from '../../lib/content';
import type { PageProps } from '../engine/types';
import { Cap, Panel } from '../ui/comic';
import { ProjectOpening } from '../ui/ProjectOpening';
import { AskChip } from '../ui/AskChip';
import { darknessStore, useDarknessChoice } from '../stores/darknessStore';
import { usePage } from '../engine/PageContext';

const p = projectBySlug('darkness-within')!;
const P = (id: string) => panelOf(p, id);
const theme = { ['--accent' as string]: p.accent, ['--accent-2' as string]: p.accent2 };

/* Darkness Within: a choice on page 1, the threat revealed when you turn the page. */

export function Darkness1({ book }: PageProps) {
  const choice = useDarknessChoice();
  const pick = (c: 'riddle' | 'inventory') => { darknessStore.set(c); book.goTo('darkness-within-2', c); };
  return (
    <ProjectOpening project={p} no={2}>
      <div className="choice">
        <Cap small>Your move</Cap>
        <div className="choice-buttons" role="group" aria-label="Choose what to examine">
          <button className={`btn ${choice === 'riddle' ? '' : 'secondary'}`} aria-pressed={choice === 'riddle'} onClick={() => pick('riddle')}>Read the riddle →</button>
          <button className={`btn ${choice === 'inventory' ? '' : 'secondary'}`} aria-pressed={choice === 'inventory'} onClick={() => pick('inventory')}>Check the inventory →</button>
        </div>
      </div>
    </ProjectOpening>
  );
}

export function Darkness2({ book }: PageProps) {
  const choice = useDarknessChoice();
  const { hash } = useLocation();
  const { invalidate } = usePage();
  const deepLinked = ['threat', 'shooting', 'atmosphere', 'riddle', 'inventory'].includes(hash.slice(1));
  const revealed = choice !== null || deepLinked;
  useEffect(() => { invalidate(); }, [revealed, choice, invalidate]); // refresh this page's turning texture
  return (
    <div className="face theme-darkness" style={theme}>
      <div className="duo">
        <Panel data={P('riddle')} compact className={choice === 'riddle' ? 'chosen' : ''} />
        <Panel data={P('inventory')} compact className={choice === 'inventory' ? 'chosen' : ''} />
      </div>
      {revealed ? (
        <>
          <Panel data={P('threat')} className="threat" art={<ThreatArt />} />
          <div className="duo">
            <Panel data={P('shooting')} compact />
            <Panel data={P('atmosphere')} compact />
          </div>
          <AskChip book={book} q="How did Zohair use NavMesh in his games?" />
        </>
      ) : (
        <p className="locked">Make a choice on the previous page. Something else is in the corridor.</p>
      )}
    </div>
  );
}

function ThreatArt() {
  return (
    <svg viewBox="0 0 600 200" aria-hidden="true">
      <rect width="600" height="200" fill="#1c221c" />
      <g stroke="#7fa37a" strokeWidth="2" opacity=".5">{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${i * 50} 200 L300 30`} />)}</g>
      <path d="M60 175 C160 135 220 155 300 105 S460 60 540 50" stroke="#d8f0c8" strokeWidth="5" strokeDasharray="10 8" fill="none" />
      <circle cx="540" cy="50" r="14" fill="#7fa37a" stroke="#0b0d0b" strokeWidth="4" />
      <g fill="#d8f0c8"><ellipse cx="52" cy="172" rx="9" ry="5" /><ellipse cx="76" cy="172" rx="9" ry="5" /></g>
      <text x="300" y="192" textAnchor="middle" fill="#d8f0c8" fontFamily="Barlow Condensed, sans-serif" fontWeight="800" fontSize="20" letterSpacing="2">NAVMESH PATH → PLAYER</text>
    </svg>
  );
}
