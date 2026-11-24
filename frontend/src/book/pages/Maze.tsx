import { projectBySlug, panelOf } from '../../lib/content';
import type { PageProps } from '../engine/types';
import { Cap, Panel } from '../ui/comic';
import { ProjectOpening } from '../ui/ProjectOpening';
import { AskChip } from '../ui/AskChip';
import MazeDemo from '../../components/MazeDemo';

const p = projectBySlug('maze-pathfinding')!;
const P = (id: string) => panelOf(p, id);
const theme = { ['--accent' as string]: p.accent, ['--accent-2' as string]: p.accent2 };

/* 2D Maze: the order of events, then a hands-on explanation. */

export function Maze1() {
  return (
    // The two steps below say what the premise says, in order, so the premise is left out here.
    <ProjectOpening project={p} no={4} hidePremise videoId="maze-video">
      <ol className="steps">
        <li><Panel data={P('navigate')} compact /></li>
        <li><Panel data={P('dijkstra')} compact /></li>
      </ol>
    </ProjectOpening>
  );
}

export function Maze2({ book }: PageProps) {
  const d = P('demo');
  return (
    <div className="face theme-maze" style={theme}>
      <section id="demo" aria-labelledby="demo-h">
        <Cap>{d.caption}</Cap>
        <h3 id="demo-h">{d.title}</h3>
        <p>{d.body}</p>
        <MazeDemo />
      </section>
      <AskChip book={book} q="When does the maze game show the shortest path?" />
    </div>
  );
}
