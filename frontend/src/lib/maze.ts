/**
 * Maze generation + Dijkstra shortest path for the web explanation on the
 * 2D Maze spread. This is portfolio demo code, NOT the original Unity project.
 */
export interface Maze {
  w: number;
  h: number;
  /** walls[y][x] bitmask: 1=N 2=E 4=S 8=W (set = wall present) */
  walls: number[][];
  start: [number, number];
  exit: [number, number];
}
const N = 1, E = 2, S = 4, W = 8;
const DIRS: [number, number, number, number][] = [[0, -1, N, S], [1, 0, E, W], [0, 1, S, N], [-1, 0, W, E]];

function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Deterministic recursive-backtracker maze with a few extra openings so several routes exist. */
export function generateMaze(w: number, h: number, seed = 7, loops = 0.12): Maze {
  const r = rng(seed);
  const walls = Array.from({ length: h }, () => Array(w).fill(N | E | S | W));
  const seen = Array.from({ length: h }, () => Array(w).fill(false));
  const stack: [number, number][] = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const opts = DIRS.filter(([dx, dy]) => { const nx = x + dx, ny = y + dy; return nx >= 0 && ny >= 0 && nx < w && ny < h && !seen[ny][nx]; });
    if (!opts.length) { stack.pop(); continue; }
    const [dx, dy, a, b] = opts[Math.floor(r() * opts.length)];
    walls[y][x] &= ~a; walls[y + dy][x + dx] &= ~b; seen[y + dy][x + dx] = true; stack.push([x + dx, y + dy]);
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w - 1; x++) if (r() < loops / 2) { walls[y][x] &= ~E; walls[y][x + 1] &= ~W; }
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w; x++) if (r() < loops / 2) { walls[y][x] &= ~S; walls[y + 1][x] &= ~N; }
  return { w, h, walls, start: [0, h - 1], exit: [w - 1, 0] };
}

export function neighbours(m: Maze, x: number, y: number): [number, number][] {
  return DIRS.filter(([, , bit]) => !(m.walls[y][x] & bit)).map(([dx, dy]) => [x + dx, y + dy]);
}

/** Dijkstra with a binary heap. Edge weights are 1 per step; cost(x,y) lets callers weight tiles. */
export function dijkstra(m: Maze, cost: (x: number, y: number) => number = () => 1) {
  const key = (x: number, y: number) => y * m.w + x;
  const dist = new Array(m.w * m.h).fill(Infinity);
  const prev = new Array<number>(m.w * m.h).fill(-1);
  const order: number[] = []; // settle order, used to animate the search frontier
  const heap: [number, number][] = [];
  const push = (d: number, k: number) => { heap.push([d, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop()!; if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let s = i; if (l < heap.length && heap[l][0] < heap[s][0]) s = l; if (r < heap.length && heap[r][0] < heap[s][0]) s = r; if (s === i) break; [heap[s], heap[i]] = [heap[i], heap[s]]; i = s; } } return top; };
  const s = key(...m.start);
  dist[s] = 0; push(0, s);
  const settled = new Set<number>();
  while (heap.length) {
    const [d, k] = pop();
    if (settled.has(k)) continue;
    settled.add(k); order.push(k);
    if (k === key(...m.exit)) break;
    const x = k % m.w, y = Math.floor(k / m.w);
    for (const [nx, ny] of neighbours(m, x, y)) {
      const nk = key(nx, ny), nd = d + cost(nx, ny);
      if (nd < dist[nk]) { dist[nk] = nd; prev[nk] = k; push(nd, nk); }
    }
  }
  const path: [number, number][] = [];
  for (let k = key(...m.exit); k !== -1; k = prev[k]) path.unshift([k % m.w, Math.floor(k / m.w)]);
  return { path: path[0]?.[0] === m.start[0] && path[0]?.[1] === m.start[1] ? path : [], distance: dist[key(...m.exit)], order };
}

/** A deliberately non-optimal "player" route (left-hand wall follower) used only in the illustration. */
export function wallFollower(m: Maze, limit = 2000): [number, number][] {
  let [x, y] = m.start; let dir = 1; const route: [number, number][] = [[x, y]];
  for (let i = 0; i < limit && !(x === m.exit[0] && y === m.exit[1]); i++) {
    for (const turn of [3, 0, 1, 2]) {
      const d = (dir + turn) % 4; const [dx, dy, bit] = DIRS[d];
      if (!(m.walls[y][x] & bit)) { dir = d; x += dx; y += dy; route.push([x, y]); break; }
    }
  }
  return route;
}

export function toSvg(m: Maze, opts: { cell: number; ox: number; oy: number; player?: [number, number][]; path?: [number, number][] }): string {
  const { cell: c, ox, oy } = opts; const segs: string[] = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const X = ox + x * c, Y = oy + y * c, b = m.walls[y][x];
    if (b & N) segs.push(`M${X} ${Y}h${c}`); if (b & W) segs.push(`M${X} ${Y}v${c}`);
    if (y === m.h - 1 && b & S) segs.push(`M${X} ${Y + c}h${c}`); if (x === m.w - 1 && b & E) segs.push(`M${X + c} ${Y}v${c}`);
  }
  const line = (p: [number, number][]) => p.map(([x, y], i) => `${i ? 'L' : 'M'}${ox + x * c + c / 2} ${oy + y * c + c / 2}`).join('');
  return [
    `<path d="${segs.join('')}" stroke="#1a1612" stroke-width="${Math.max(4, c * 0.12)}" stroke-linecap="square" fill="none"/>`,
    opts.player ? `<path d="${line(opts.player)}" stroke="#2f6db5" stroke-width="${c * 0.08}" stroke-dasharray="${c * 0.18} ${c * 0.14}" fill="none" stroke-linejoin="round" opacity=".8"/>` : '',
    opts.path ? `<path d="${line(opts.path)}" stroke="#d94c3d" stroke-width="${c * 0.16}" fill="none" stroke-linejoin="round" stroke-linecap="round"/>` : '',
  ].join('\n');
}
