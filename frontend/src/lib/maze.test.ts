import { describe, expect, it } from 'vitest';
import { dijkstra, generateMaze, neighbours, wallFollower } from './maze';

function bfs(m: ReturnType<typeof generateMaze>) {
  const dist = new Map<string, number>([[m.start.join(), 0]]); const q = [m.start];
  while (q.length) { const [x, y] = q.shift()!; for (const n of neighbours(m, x, y)) if (!dist.has(n.join())) { dist.set(n.join(), dist.get(`${x},${y}`)! + 1); q.push(n); } }
  return dist.get(m.exit.join());
}

describe('maze + dijkstra', () => {
  for (const seed of [1, 7, 42, 99]) {
    const m = generateMaze(12, 8, seed);
    it(`seed ${seed}: path is connected, wall-respecting and optimal`, () => {
      const r = dijkstra(m);
      expect(r.path[0]).toEqual(m.start);
      expect(r.path.at(-1)).toEqual(m.exit);
      for (let i = 1; i < r.path.length; i++) {
        const [px, py] = r.path[i - 1];
        expect(neighbours(m, px, py)).toContainEqual(r.path[i]); // never crosses a wall
      }
      expect(r.distance).toBe(r.path.length - 1);
      expect(r.distance).toBe(bfs(m)); // unit weights → must equal BFS optimum
    });
  }
  it('wall follower reaches the exit and is never shorter than Dijkstra', () => {
    const m = generateMaze(12, 8, 7);
    const route = wallFollower(m);
    expect(route.at(-1)).toEqual(m.exit);
    expect(route.length - 1).toBeGreaterThanOrEqual(dijkstra(m).distance);
  });
});
