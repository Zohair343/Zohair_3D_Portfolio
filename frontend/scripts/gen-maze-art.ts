// Generates public/art/maze-pathfinding.svg from the real demo maze + Dijkstra result.
import { writeFileSync } from 'node:fs';
import { dijkstra, generateMaze, toSvg, wallFollower } from '../src/lib/maze';
export const DEMO = { w: 14, h: 8, seed: 7 };
const m = generateMaze(DEMO.w, DEMO.h, DEMO.seed);
const cell = 90, ox = (1600 - DEMO.w * cell) / 2, oy = (900 - DEMO.h * cell) / 2;
const { path } = dijkstra(m);
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" role="img" aria-labelledby="t d">
<title id="t">2D Maze Pathfinding — the maze</title>
<desc id="d">Ink maze on graph paper. A dashed blue line shows an illustrative player route; a bold red line shows the Dijkstra shortest path from start to exit, computed by the portfolio demo code.</desc>
<defs><pattern id="g" width="22.5" height="22.5" patternUnits="userSpaceOnUse"><path d="M22.5 0H0V22.5" fill="none" stroke="#a9bfdc" stroke-width="1"/></pattern>
<pattern id="g5" width="90" height="90" patternUnits="userSpaceOnUse" x="${ox}" y="${oy}"><path d="M90 0H0V90" fill="none" stroke="#7d9ccb" stroke-width="2"/></pattern></defs>
<rect width="1600" height="900" fill="#f3f1e7"/><rect width="1600" height="900" fill="url(#g)"/><rect width="1600" height="900" fill="url(#g5)"/>
${toSvg(m, { cell, ox, oy, player: wallFollower(m), path })}
<circle cx="${ox + m.start[0] * cell + cell / 2}" cy="${oy + m.start[1] * cell + cell / 2}" r="22" fill="#2f6db5" stroke="#1a1612" stroke-width="5"/>
<rect x="${ox + m.exit[0] * cell + cell / 2 - 22}" y="${oy + m.exit[1] * cell + cell / 2 - 22}" width="44" height="44" fill="#d94c3d" stroke="#1a1612" stroke-width="5"/>
</svg>`;
writeFileSync(new URL('../public/art/maze-pathfinding.svg', import.meta.url), svg);
console.log('maze art written; shortest path steps =', path.length - 1);
