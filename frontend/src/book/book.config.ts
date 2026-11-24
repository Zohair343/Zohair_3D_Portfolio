/**
 * THE BOOK — page order lives here.
 *
 * To add a page: write a component in src/book/pages/, then add one line below.
 * `tab` puts a page in the top bar; `subtab` lists it in the menu of the tab above it.
 * Keep the number of pages before the last one EVEN, or a blank page is added to pair them.
 * Pages pair up automatically into left/right pages; the last entry is printed
 * inside the back cover. `anchors` are element ids that links and chatbot
 * citations can target (e.g. /projects/scorched#combo).
 */
import { buildTabs, type PageDef } from './engine/types';
import { CoverPage, ContentsPage } from './pages/FrontMatter';
import { AboutPage } from './pages/About';
import { SkillsPage } from './pages/Skills';
import { Scorched1, Scorched2, Scorched3, Scorched4 } from './pages/Scorched';
import { Darkness1, Darkness2 } from './pages/DarknessWithin';
import { LastDance1, LastDance2 } from './pages/LastDance';
import { Maze1, Maze2 } from './pages/Maze';
import { Journey1, Journey2 } from './pages/Journey';
import { FilmPage } from './pages/Film';
import { AskPage } from './pages/Ask';
import { ContactPage } from './pages/Contact';
import { CreditsPage } from './pages/Endpapers';
import { ProjectsIndexPage } from './pages/ProjectsIndex';

export const PAGES: PageDef[] = [
  { id: 'cover', path: '/', paper: '#e8d7b5', Component: CoverPage },
  { id: 'contents', path: '/contents', tab: 'Contents', Component: ContentsPage },
  { id: 'about', path: '/about', tab: 'About', anchors: ['intro', 'systems', 'software'], Component: AboutPage },
  { id: 'skills', path: '/skills', tab: 'Skills', anchors: ['skills-game-dev', 'skills-programming', 'skills-software-dev', 'skills-web', 'skills-tools'], Component: SkillsPage },
  { id: 'projects', path: '/projects', tab: 'Projects', Component: ProjectsIndexPage },
  { id: 'scorched-1', path: '/projects/scorched', subtab: 'Scorched', anchors: ['arena'], paper: '#f6e7cb', Component: Scorched1 },
  { id: 'scorched-2', path: '/projects/scorched/combo', anchors: ['combo', 'hit-detection', 'slow-motion'], paper: '#f6e7cb', Component: Scorched2 },
  { id: 'scorched-3', path: '/projects/scorched/enemies', anchors: ['enemies', 'hud'], paper: '#f6e7cb', Component: Scorched3 },
  { id: 'scorched-4', path: '/projects/scorched/look', anchors: ['toon-shader', 'blueprint'], paper: '#f6e7cb', Component: Scorched4 },
  { id: 'darkness-within-1', path: '/projects/darkness-within', subtab: 'Darkness Within', anchors: ['reveal'], paper: '#e3e7df', Component: Darkness1 },
  { id: 'darkness-within-2', path: '/projects/darkness-within/threat', anchors: ['riddle', 'inventory', 'threat', 'shooting', 'atmosphere'], paper: '#e3e7df', Component: Darkness2 },
  { id: 'last-dance-1', path: '/projects/last-dance', subtab: 'Last Dance', anchors: ['case-file'], paper: '#f3e6f0', Component: LastDance1 },
  { id: 'last-dance-2', path: '/projects/last-dance/board', anchors: ['three-clubs', 'clues', 'outcomes'], paper: '#f3e6f0', Component: LastDance2 },
  { id: 'maze-pathfinding-1', path: '/projects/maze-pathfinding', subtab: '2D Maze Pathfinding', anchors: ['navigate', 'dijkstra'], paper: '#eef1f6', Component: Maze1 },
  { id: 'maze-pathfinding-2', path: '/projects/maze-pathfinding/demo', anchors: ['demo'], paper: '#eef1f6', Component: Maze2 },
  { id: 'journey-1', path: '/journey', tab: 'Journey', anchors: ['ned', 'earlier-education', 'a-levels', 'o-levels'], Component: Journey1 },
  { id: 'journey-2', path: '/journey/achievements', anchors: ['cega', 'indus', 'practice'], Component: Journey2 },
  { id: 'film', path: '/film', tab: 'Film', Component: FilmPage },
  { id: 'ask', path: '/ask', tab: 'Ask Zohair', Component: AskPage },
  { id: 'contact', path: '/contact', tab: 'Contact', Component: ContactPage },
  { id: 'credits', path: '/credits', Component: CreditsPage }, // last entry = inside back cover
];

export const TABS = buildTabs(PAGES);
