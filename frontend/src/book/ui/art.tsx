/* Inline SVG artwork for project pages (accent colour comes from the page's --accent). */

export const Hit = ({ n, lit }: { n: number; lit: number }) => (
  <svg viewBox="0 0 180 60" className="hits" aria-hidden="true">
    <path d="M30 30 H150" stroke="#1a1612" strokeWidth="5" strokeDasharray="8 6" />
    {[30, 90, 150].map((x, i) => (
      <g key={x}>
        <circle cx={x} cy="30" r="20" fill={i < lit ? 'var(--accent)' : '#f4ecdc'} stroke="#1a1612" strokeWidth="5" />
        <text x={x} y="38" textAnchor="middle" fontWeight="900" fontSize="22" fontFamily="Barlow Condensed, sans-serif">{i + 1}</text>
      </g>
    ))}
    {n === 3 && <path d="M150 6 l6 14 l14 -6 l-8 13 l12 9 l-15 1 l1 15 l-10 -11 l-10 11 l1 -15 l-15 -1 l12 -9 l-8 -13 l14 6 z" fill="var(--accent)" stroke="#1a1612" strokeWidth="3" opacity=".9" />}
  </svg>
);

export function BlueprintArt() {
  return (
    <svg viewBox="0 0 300 90" aria-hidden="true" className="bp">
      <rect width="300" height="90" fill="#1f3550" />
      {[[16, 20], [120, 40], [220, 14]].map(([x, y], i) => (
        <g key={i}><rect x={x} y={y} width="66" height="40" rx="5" fill="#2d4a6e" stroke="#e8eef6" strokeWidth="2" /><rect x={x} y={y} width="66" height="10" rx="3" fill="var(--accent)" /></g>
      ))}
      <path d="M82 40 C100 40 100 60 120 60 M186 60 C205 60 200 34 220 34" stroke="#e8eef6" strokeWidth="3" fill="none" />
    </svg>
  );
}
export function EnemyArt({ kind }: { kind: 'melee' | 'ranged' }) {
  return (
    <svg viewBox="0 0 200 130" aria-hidden="true" className="enemy-art">
      <rect width="200" height="130" fill="#ead2a5" />
      <path d="M0 105 H200" stroke="#1a1612" strokeWidth="4" />
      <path d="M10 118 H190" stroke="#1a1612" strokeWidth="2" strokeDasharray="6 6" />
      <g stroke="#1a1612" strokeWidth="5" fill="#3a2a1a" strokeLinejoin="round">
        <circle cx="100" cy="34" r="14" />
        <path d="M86 50 h28 l6 40 h-40 z" />
        <path d="M90 90 l-6 15 M110 90 l6 15" fill="none" />
        {kind === 'melee' ? <path d="M118 58 l38 -30 l6 6 l-38 30 z" fill="#d9d4c4" /> : <path d="M118 62 h50 v8 h-50 z M150 70 v10" fill="#7a3d0e" />}
      </g>
      {kind === 'ranged' && <path d="M172 66 h22" stroke="var(--accent)" strokeWidth="5" strokeDasharray="6 4" />}
    </svg>
  );
}
export function HudArt() {
  return (
    <svg viewBox="0 0 300 120" aria-hidden="true" className="hud-art">
      <rect width="300" height="120" fill="#f4ecdc" />
      <rect x="12" y="44" width="70" height="34" fill="var(--accent)" stroke="#1a1612" strokeWidth="4" />
      <text x="47" y="66" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="sans-serif">DELEGATE</text>
      {[34, 88].map((y, i) => (
        <g key={y}><path d={`M82 61 L190 ${y}`} stroke="#1a1612" strokeWidth="3" markerEnd="url(#ah)" /><rect x="192" y={y - 13} width="96" height="26" fill="#fff" stroke="#1a1612" strokeWidth="3" />
          <text x="240" y={y + 5} textAnchor="middle" fontSize="12" fontWeight="700" fontFamily="sans-serif">{['Health', 'Ability state'][i]}</text></g>
      ))}
      <defs><marker id="ah" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 z" fill="#1a1612" /></marker></defs>
    </svg>
  );
}
