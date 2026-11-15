import { ArrowRight, MapPin } from 'lucide-react';
import { pickRegionPhoto } from '../data/earthPhotos';
import type { Region } from '../types/astranovus';
import { pct, rankScore } from '../utils/mission';

const STATUS: Record<string, { label: string; cls: string }> = {
  'Supported by available evidence': { label: 'Supported', cls: 'bg-[#EAF7EE] text-[#177A3C] border-[#177A3C]/25' },
  'Partial environmental match': { label: 'Partial match', cls: 'bg-[#EAF2FF] text-[#0B5ED7] border-[#0B5ED7]/25' },
  'Geological suitability unverified': { label: 'Geology unverified', cls: 'bg-[#FFF4E5] text-[#A15C00] border-[#A15C00]/30' },
  'Insufficient data': { label: 'Insufficient data', cls: 'bg-[#FDECEC] text-[#B42318] border-[#B42318]/25' },
};
const CONF: Record<Region['confidence'], string> = {
  high: 'bg-[#EAF7EE] text-[#177A3C] border-[#177A3C]/25',
  medium: 'bg-[#FFF4E5] text-[#A15C00] border-[#A15C00]/30',
  low: 'bg-[#FDECEC] text-[#B42318] border-[#B42318]/25',
};

const fmt = (lat: number, lon: number) => `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;

interface Props {
  region: Region;
  accent: string;
  selected: boolean;
  inCompare: boolean;
  onSelect: () => void;
  onDetails: () => void;
  onToggleCompare: () => void;
}

export function RegionCard({ region: r, accent, selected, inCompare, onSelect, onDetails, onToggleCompare }: Props) {
  const photo = pickRegionPhoto(r);
  const name = r.location_label.replace(/\s*\([^)]*\)\s*$/, '');
  const strong = r.dimensions.filter((d) => (d.similarity ?? 0) >= 0.7).slice(0, 3);
  const missing = r.dimensions.filter((d) => d.similarity === null);
  const status = STATUS[r.suitability?.status ?? ''] ?? STATUS['Partial environmental match'];
  const reason = strong.length ? `Strong match: ${strong.map((d) => d.name.toLowerCase()).join(', ')}.` : 'No dimension reaches a strong match.';

  return (
    <div
      role="listitem"
      className={`an-card rounded-xl bg-[#FFFFFF] border overflow-hidden ${selected ? 'ring-2 ring-offset-1' : ''}`}
      style={{ borderColor: selected ? accent : '#E1E8F0', ['--tw-ring-color' as string]: accent }}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5ED7]"
      >
        <div className="flex gap-3 p-3">
          <div className="relative w-[72px] h-[72px] shrink-0 rounded-lg overflow-hidden bg-[#EDF3FA]">
            <img src={photo.src} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            <span
              className="absolute top-1 left-1 w-5 h-5 rounded-full text-[10px] font-bold text-[#FFFFFF] flex items-center justify-center shadow"
              style={{ backgroundColor: accent }}
            >
              {r.rank}
            </span>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="font-display font-bold text-[13px] text-[#142B50] leading-snug line-clamp-2" title={name}>
                  {name}
                </div>
                <div className="text-[10px] text-[#68788F] inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {fmt(r.best_cell.lat, r.best_cell.lon)}
                  {r.country ? ` · ${r.country}` : ''}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-lg leading-none tabular-nums" style={{ color: accent }}>
                  {rankScore(r).toFixed(1)}
                </div>
                <div className="text-[9px] text-[#68788F]">score</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 text-[10px] font-semibold">
              <span className={`px-1.5 py-0.5 rounded-full border ${status.cls}`}>{status.label}</span>
              <span className="px-1.5 py-0.5 rounded-full border border-[#E1E8F0] bg-[#F4F8FF] text-[#142B50]">coverage {pct(r.coverage)}</span>
              <span className={`px-1.5 py-0.5 rounded-full border ${CONF[r.confidence]}`}>{r.confidence}</span>
            </div>
          </div>
        </div>
        <p className="px-3 pb-2 text-[11px] text-[#68788F] leading-snug">
          {reason}
          {missing.length > 0 && <span className="text-[#B42318]"> Not assessed: {missing.map((d) => d.name.toLowerCase()).join(', ')}.</span>}
        </p>
      </button>
      <div className="flex items-center justify-between gap-2 px-3 pb-3">
        <label className="flex items-center gap-1.5 text-[11px] text-[#68788F] cursor-pointer">
          <input type="checkbox" checked={inCompare} onChange={onToggleCompare} className="accent-[#0B5ED7]" />
          Compare
        </label>
        <button
          type="button"
          onClick={onDetails}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0B5ED7] hover:bg-[#094DB3] text-[#FFFFFF] text-[11px] font-semibold transition-colors"
        >
          Explore location <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
