import { useRef, type ReactNode } from 'react';

/** Wraps a page: a folded corner to turn it, and touch swipes (mouse drags stay free for text). */
export function PageShell({ side, canTurn, onTurn, children }: { side: 'left' | 'right'; canTurn: boolean; onTurn: () => void; children: ReactNode }) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return (
    <div className="page-shell"
      onPointerDown={(e) => { if (e.pointerType === 'touch') start.current = { x: e.clientX, y: e.clientY }; }}
      onPointerUp={(e) => {
        const s0 = start.current; start.current = null;
        if (!s0 || !canTurn) return;
        const dx = e.clientX - s0.x, dy = e.clientY - s0.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && (side === 'right' ? dx < 0 : dx > 0)) onTurn();
      }}>
      {children}
      {canTurn && (
        <button className={`dog-ear dog-ear-${side}`} onClick={onTurn} aria-label={side === 'right' ? 'Turn to the next page' : 'Turn back a page'}>
          <span aria-hidden="true">{side === 'right' ? '▶' : '◀'}</span>
        </button>
      )}
    </div>
  );
}
