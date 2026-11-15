import type { RegionDimension } from '../types/astranovus';
import { pct } from '../utils/mission';

const RULE_TEXT = { high: 'higher is more target-like', low: 'lower is more target-like', band: 'a middle band is most target-like' } as const;

function explain(d: RegionDimension): string {
  if (d.similarity === null) return 'Not assessed: no Earth data for this dimension yet.';
  const p = Math.round((d.similarity ?? 0) * 100);
  const lvl = p >= 80 ? 'Strong alignment' : p >= 60 ? 'Moderate alignment' : p >= 40 ? 'Partial alignment' : 'Weak alignment';
  const ep = d.percentile === null ? '' : ` This cell ranks at the ${Math.round(d.percentile * 100)}th percentile of Earth cells.`;
  return `${lvl} (${p}%): target rule is "${RULE_TEXT[d.rule]}".${ep}`;
}
import { StatusChip } from './StatusViews';

/** Per-dimension breakdown. Missing dimensions are shown as "no data", never as 0%. */
export function DimensionTable({ dims, accent = '#0B5ED7' }: { dims: RegionDimension[]; accent?: string }) {
  return (
    <div className="divide-y divide-[#E6ECF3] border border-[#E1E8F0] rounded-xl bg-[#FFFFFF] overflow-hidden">
      {dims.map((d) => (
        <div key={d.dimension} className="px-4 py-3 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-[#0B5ED7]">{d.dimension.split('_')[0]}</span>
              <span className="font-display font-semibold text-sm text-[#142B50]">{d.name}</span>
              <StatusChip status={d.data_status} />
              {d.temporal && d.data_status !== 'missing' && (
                <span className="px-2 py-0.5 rounded-full border border-[#E1E8F0] bg-[#F4F8FF] text-[10px] font-semibold text-[#68788F]">{d.temporal}</span>
              )}
            </div>
            <div className="text-[11px] font-mono text-[#68788F] tabular-nums">
              weight {d.weight.toFixed(1)} · rule: {d.rule}
            </div>
          </div>
          {d.similarity === null ? (
            <div className="text-xs text-[#B42318] bg-[#FDECEC] rounded-md px-2.5 py-1.5">
              {d.missing_reason ?? 'No data yet for this dimension.'} Excluded from the score (not counted as zero).
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div
                className="flex-1 h-2 rounded-full bg-[#EDF3FA] overflow-hidden"
                role="img"
                aria-label={`${d.name} match ${pct(d.similarity)}`}
              >
                <div className="h-full rounded-full" style={{ width: `${Math.round(d.similarity * 100)}%`, backgroundColor: accent }} />
              </div>
              <span className="text-xs font-mono font-semibold text-[#142B50] tabular-nums w-24 text-right">
                {pct(d.similarity)} match
              </span>
            </div>
          )}
          <div className="text-xs text-[#142B50] leading-snug">{explain(d)}</div>
          <div className="text-[11px] text-[#68788F] leading-snug">Earth data: {d.source}</div>
        </div>
      ))}
    </div>
  );
}
