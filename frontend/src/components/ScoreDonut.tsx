interface ScoreDonutProps {
  score: number;
  label?: string;
  accentColor?: string;
}

export function ScoreDonut({
  score,
  label,
  accentColor = '#0B5ED7',
}: ScoreDonutProps) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clamped / 100) * circumference;

  const matchLabel =
    label ??
    (clamped >= 80 ? 'High Match' : clamped >= 65 ? 'Moderate Match' : 'Partial Match');

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-36 h-36 -rotate-90" viewBox="0 0 128 128" aria-hidden="true">
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke="#EDF3FA"
            strokeWidth="12"
          />
          <circle
            cx="64"
            cy="64"
            r={radius}
            fill="none"
            stroke={accentColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-300"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display font-extrabold text-3xl text-[#142B50] tabular-nums">
            {clamped.toFixed(0)}%
          </span>
          <span className="text-[11px] font-medium text-[#68788F]">Similarity</span>
        </div>
      </div>
      <div className="mt-2 text-xs font-semibold text-[#142B50]">{matchLabel}</div>
    </div>
  );
}
