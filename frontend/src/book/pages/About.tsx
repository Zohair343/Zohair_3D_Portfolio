import { content } from '../../lib/content';
import type { PageProps } from '../engine/types';
import { Panel, PageTitle } from '../ui/comic';
import { avatarConfig } from '../../avatar/config';

/** The résumé file lives in frontend/public/. Replace that file (same name) to update it. */
const RESUME = '/Muhammad_Zohair_Shaikh_Resume.pdf';

export function AboutPage({ book }: PageProps) {
  const [intro, systems, software] = content.about.panels.map((p) => ({ ...p, kind: 'support' }));
  return (
    <div className="face face-about">
      <PageTitle kicker="Chapter 1" title="About me" />
      <a className="balloon resume-btn" href={RESUME} download>
        <span aria-hidden="true">⬇</span> Download résumé <small>(PDF)</small>
      </a>
      <Panel data={intro} art={<img src={avatarConfig.portrait} alt="" className="about-portrait" />} className="about-intro" />
      <Panel data={systems} compact>
        <p className="links-row">
          <button className="linklike" onClick={() => book.goTo('scorched-2', 'combo')}>Combat</button> ·{' '}
          <button className="linklike" onClick={() => book.goTo('darkness-within-2', 'threat')}>Enemy AI</button> ·{' '}
          <button className="linklike" onClick={() => book.goTo('last-dance-2', 'clues')}>Puzzles</button> ·{' '}
          <button className="linklike" onClick={() => book.goTo('maze-pathfinding-1', 'dijkstra')}>Pathfinding</button>
        </p>
      </Panel>
      <Panel data={software} compact />
    </div>
  );
}
