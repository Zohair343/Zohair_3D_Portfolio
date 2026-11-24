import { projectBySlug, panelOf } from '../../lib/content';
import type { PageProps } from '../engine/types';
import { Cap, Panel } from '../ui/comic';
import { ProjectOpening } from '../ui/ProjectOpening';
import { AskChip } from '../ui/AskChip';
import { BlueprintArt, EnemyArt, Hit, HudArt } from '../ui/art';

const p = projectBySlug('scorched')!;
const P = (id: string) => panelOf(p, id);
const theme = { ['--accent' as string]: p.accent, ['--accent-2' as string]: p.accent2 };

/* Scorched: sandstone, deep ink, amber. Four pages. */

export function Scorched1() {
  return (
    <ProjectOpening project={p} no={1}
      overlay={<div className="inset panel"><Hit n={3} lit={3} /><span className="inset-label">3 connected hits</span></div>} />
  );
}

/** Three beats of the combo, one per row. */
export function Scorched2() {
  return (
    <div className="face theme-scorched" style={theme}>
      <Cap>How the combo works · three beats</Cap>
      {(['combo', 'hit-detection', 'slow-motion'] as const).map((id, i) => (
        <Panel key={id} data={P(id)} className="beat" art={<Hit n={i + 1} lit={i + 1} />} />
      ))}
    </div>
  );
}

/** Paired enemies + the HUD that listens. */
export function Scorched3() {
  const e = P('enemies');
  return (
    <div className="face theme-scorched" style={theme}>
      <section id="enemies" className="bpanel" aria-labelledby="enemies-h">
        <div className="bpanel-body"><Cap small>{e.caption}</Cap><h3 id="enemies-h">{e.title}</h3></div>
        <div className="pair-book">
          <figure><EnemyArt kind="melee" /><figcaption className="caption-box">Melee · its own behaviour logic</figcaption></figure>
          <figure><EnemyArt kind="ranged" /><figcaption className="caption-box">Ranged · its own behaviour logic</figcaption></figure>
        </div>
        <div className="bpanel-body"><p>{e.body}</p></div>
      </section>
      <Panel data={P('hud')} art={<HudArt />} compact />
    </div>
  );
}

/** The look and the tools: toon shader + Blueprints. */
export function Scorched4({ book }: PageProps) {
  return (
    <div className="face theme-scorched" style={theme}>
      <Cap>The look and the tools</Cap>
      <Panel data={P('toon-shader')} art={<div className="toon-swatch"><span /><span /><span /></div>} />
      <Panel data={P('blueprint')} art={<BlueprintArt />} />
      <AskChip book={book} q="How does the three-hit combo work in Scorched?" />
    </div>
  );
}
