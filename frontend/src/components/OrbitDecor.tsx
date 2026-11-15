/** Faint orbital rings, a planet outline and a few stars (decorative SVG, CSS-animated, motion-safe). */
export function OrbitDecor({ className = '' }: { className?: string }) {
  const stars = [
    [60, 70, 1.4], [150, 340, 1], [260, 90, 1.2], [420, 410, 1.5], [540, 60, 1], [610, 250, 1.3], [90, 220, 0.9], [330, 190, 1], [480, 150, 0.9],
  ];
  return (
    <svg viewBox="0 0 700 460" fill="none" aria-hidden="true" className={`pointer-events-none ${className}`} preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="an-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0B5ED7" stopOpacity="0.5" />
          <stop offset="1" stopColor="#54B9F5" stopOpacity="0.1" />
        </linearGradient>
      </defs>
      <g stroke="url(#an-ring)" strokeWidth="1">
        <circle cx="440" cy="240" r="120" />
        <circle cx="440" cy="240" r="190" strokeDasharray="2 7" />
        <g className="an-orbit-slow" style={{ transformOrigin: '440px 240px' }}>
          <ellipse cx="440" cy="240" rx="260" ry="86" transform="rotate(-24 440 240)" />
          <circle cx="654" cy="160" r="4" fill="#54B9F5" stroke="none" opacity="0.8" />
        </g>
        <g className="an-orbit-rev" style={{ transformOrigin: '440px 240px' }}>
          <ellipse cx="440" cy="240" rx="330" ry="120" transform="rotate(18 440 240)" strokeDasharray="1 9" />
          <circle cx="110" cy="300" r="2.6" fill="#0B5ED7" stroke="none" opacity="0.7" />
        </g>
      </g>
      <g fill="#0B5ED7" opacity="0.35">
        {stars.map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      <g stroke="#0B5ED7" strokeOpacity="0.08">
        {Array.from({ length: 8 }, (_, i) => (
          <line key={`v${i}`} x1={i * 100} y1="0" x2={i * 100} y2="460" />
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 100} x2="700" y2={i * 100} />
        ))}
      </g>
    </svg>
  );
}
