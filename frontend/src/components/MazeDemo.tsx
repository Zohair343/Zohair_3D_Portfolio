import { useEffect, useMemo, useRef, useState } from 'react';
import { dijkstra, generateMaze } from '../lib/maze';
import { useReducedMotion } from '../lib/useReducedMotion';

const SEEDS = [7, 21, 42, 99];

/** Interactive explanation of Dijkstra on a sample maze. Not the original Unity project. */
export default function MazeDemo() {
  const [seedIdx, setSeedIdx] = useState(0);
  const maze = useMemo(() => generateMaze(12, 8, SEEDS[seedIdx]), [seedIdx]);
  const result = useMemo(() => dijkstra(maze), [maze]);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'searching' | 'done'>('idle');
  const [step, setStep] = useState(0);
  const timer = useRef<number>();

  useEffect(() => { setPhase('idle'); setStep(0); }, [maze]);
  useEffect(() => () => window.clearInterval(timer.current), []);

  const run = () => {
    window.clearInterval(timer.current);
    if (reduced) { setStep(result.order.length); setPhase('done'); return; }
    setPhase('searching'); setStep(0);
    timer.current = window.setInterval(() => {
      setStep((s) => {
        if (s + 3 >= result.order.length) { window.clearInterval(timer.current); setPhase('done'); return result.order.length; }
        return s + 3;
      });
    }, 30);
  };

  const c = 40, W = maze.w * c, H = maze.h * c;
  const visited = new Set(result.order.slice(0, step));
  const walls: string[] = [];
  maze.walls.forEach((row, y) => row.forEach((b, x) => {
    const X = x * c, Y = y * c;
    if (b & 1) walls.push(`M${X} ${Y}h${c}`); if (b & 8) walls.push(`M${X} ${Y}v${c}`);
    if (y === maze.h - 1 && b & 4) walls.push(`M${X} ${Y + c}h${c}`); if (x === maze.w - 1 && b & 2) walls.push(`M${X + c} ${Y}v${c}`);
  }));
  const pathD = result.path.map(([x, y], i) => `${i ? 'L' : 'M'}${x * c + c / 2} ${y * c + c / 2}`).join('');

  return (
    <div className="maze-demo">
      <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} role="img" aria-label={phase === 'done' ? `Sample maze with the shortest path revealed: ${result.distance} steps from start to exit.` : 'Sample maze. The shortest path is hidden until you reveal it.'}>
        <rect x="-6" y="-6" width={W + 12} height={H + 12} fill="#f3f1e7" />
        {[...visited].map((k) => <rect key={k} x={(k % maze.w) * c + 3} y={Math.floor(k / maze.w) * c + 3} width={c - 6} height={c - 6} fill="#9fc0e8" opacity=".55" />)}
        <path d={walls.join('')} stroke="#1a1612" strokeWidth="5" strokeLinecap="square" fill="none" />
        {phase === 'done' && <path d={pathD} stroke="#d94c3d" strokeWidth="8" fill="none" strokeLinejoin="round" strokeLinecap="round" className="maze-path" />}
        <circle cx={maze.start[0] * c + c / 2} cy={maze.start[1] * c + c / 2} r="11" fill="#2f6db5" stroke="#1a1612" strokeWidth="3" />
        <rect x={maze.exit[0] * c + c / 2 - 11} y={maze.exit[1] * c + c / 2 - 11} width="22" height="22" fill="#d94c3d" stroke="#1a1612" strokeWidth="3" />
      </svg>
      <div className="maze-controls">
        <button className="btn" onClick={run} disabled={phase === 'searching'}>{phase === 'done' ? 'Run Dijkstra again' : 'Reveal shortest path'}</button>
        <button className="btn secondary" onClick={() => setSeedIdx((i) => (i + 1) % SEEDS.length)}>New sample maze</button>
        <p className="small" aria-live="polite">
          {phase === 'idle' && 'Blue = start, red = exit. Press reveal to run Dijkstra’s algorithm.'}
          {phase === 'searching' && `Searching… ${step} cells settled.`}
          {phase === 'done' && `Shortest path: ${result.distance} steps. Dijkstra settled ${result.order.length} of ${maze.w * maze.h} cells to prove it.`}
        </p>
      </div>
    </div>
  );
}
