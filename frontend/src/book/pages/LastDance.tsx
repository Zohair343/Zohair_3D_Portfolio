import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { projectBySlug, panelOf } from '../../lib/content';
import { Cap } from '../ui/comic';
import { ProjectOpening } from '../ui/ProjectOpening';

const p = projectBySlug('last-dance')!;
const P = (id: string) => panelOf(p, id);
const theme = { ['--accent' as string]: p.accent, ['--accent-2' as string]: p.accent2 };

/* Last Dance: an evidence board under nightclub light. The solution stays sealed. */

export function LastDance1() {
  return <ProjectOpening project={p} no={3}><p className="margin-note" aria-hidden="true">← three clubs, one question</p></ProjectOpening>;
}

export function LastDance2() {
  const { hash } = useLocation();
  const cards = ['three-clubs', 'clues']; // 'case-file' leads page 1 (ids must be unique)
  const [open, setOpen] = useState<string | null>(() => (cards.includes(hash.slice(1)) ? hash.slice(1) : null));
  const [sealed, setSealed] = useState(true);
  const outcomes = P('outcomes');
  return (
    <div className="face face-board theme-last-dance" style={theme}>
      <Cap>Evidence board · select a card</Cap>
      <ul className="clue-cards">
        {cards.map((id, i) => {
          const c = P(id), isOpen = open === id;
          return (
            <li key={id} id={id} className={`clue ${isOpen ? 'open' : ''}`} style={{ ['--tilt' as string]: `${[-2, 1.5][i]}deg` }}>
              <button aria-expanded={isOpen} aria-controls={`${id}-body`} onClick={() => setOpen(isOpen ? null : id)}>
                <span className="pin" aria-hidden="true" />
                <span className="clue-tag">Exhibit {'AB'[i]}</span>
                <span className="clue-title">{c.title}</span>
              </button>
              <div id={`${id}-body`} className="clue-body" hidden={!isOpen}><p className="caption-box">{c.caption}</p><p>{c.body}</p></div>
            </li>
          );
        })}
      </ul>
      <section id="outcomes" className="sealed" aria-labelledby="outcomes-h">
        <Cap small>{outcomes.caption}</Cap>
        <h3 id="outcomes-h">{outcomes.title}</h3>
        <button className="btn secondary" aria-expanded={!sealed} aria-controls="outcomes-body" onClick={() => setSealed((s) => !s)}>{sealed ? 'Open the sealed case notes' : 'Seal them again'}</button>
        <p id="outcomes-body" hidden={sealed}>{outcomes.body}</p>
      </section>
    </div>
  );
}
