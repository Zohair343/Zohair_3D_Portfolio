import { projects } from '../../lib/content';
import type { PageProps } from '../engine/types';
import { PageTitle } from '../ui/comic';

/** Chapter opener for the projects: four mini covers, each jumps to its project. */
export function ProjectsIndexPage({ book }: PageProps) {
  return (
    <div className="face face-projects">
      <PageTitle kicker="Chapter 3" title="Projects" />
      <p className="lede">Four games, four covers. Pick one, or turn the page to start with Scorched.</p>
      <ul className="project-covers">
        {projects.map((p, i) => (
          <li key={p.slug} style={{ ['--acc' as string]: p.accent }}>
            <button onClick={() => book.goTo(`${p.slug}-1`)} aria-label={`${p.title}: ${p.genre}, ${p.engine}`}>
              <span className="pc-no">No. {i + 1}</span>
              <img src={p.media.poster} alt="" />
              <span className="pc-title">{p.title}</span>
              <span className="pc-line">{p.coverLine}</span>
              <span className="pc-engine">{p.engine}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
