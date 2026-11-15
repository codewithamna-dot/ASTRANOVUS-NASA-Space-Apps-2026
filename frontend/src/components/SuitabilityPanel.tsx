import { ShieldAlert } from 'lucide-react';
import type { RankingStability, Region, TargetCard } from '../types/astranovus';

const STATUS_STYLE: Record<string, string> = {
  'Supported by available evidence': 'bg-[#E7F6EC] border-[#1B7F3B]/30 text-[#14532D]',
  'Partial environmental match': 'bg-[#FFF4E5] border-[#A15C00]/30 text-[#6B3F00]',
  'Geological suitability unverified': 'bg-[#FFF4E5] border-[#A15C00]/30 text-[#6B3F00]',
  'Insufficient data': 'bg-[#FDECEC] border-[#B42318]/30 text-[#7A1A12]',
};

const CATEGORY_LABEL: Record<string, string> = {
  climate: 'Climate',
  terrain: 'Terrain',
  surface_exposure: 'Exposed surface',
  composition_proxy: 'Composition (proxy)',
  ice_proxy: 'Ice / snow (proxy)',
};

const SCOPE_LABEL: Record<string, string> = {
  full_environmental_screen: 'Full environmental screen',
  partial_environmental_assessment: 'Partial environmental assessment',
  climate_terrain_similarity_only: 'Climate / terrain similarity only',
};

function List({ title, items, tone }: { title: string; items: string[]; tone: string }) {
  return (
    <div className="space-y-1.5">
      <h4 className="font-display font-bold text-xs text-[#142B50]">{title}</h4>
      {items.length === 0 ? (
        <p className="text-[11px] text-[#68788F]">None.</p>
      ) : (
        <ul className={`space-y-1 text-[11px] ${tone}`}>
          {items.slice(0, 6).map((t) => (
            <li key={t} className="leading-snug">• {t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SuitabilityPanel({ region: r, target, stability }: { region: Region; target: TargetCard; stability?: RankingStability | null }) {
  const s = r.suitability;
  if (!s) return null;
  const cats = Object.entries(s.categories);
  return (
    <div className="space-y-3">
      <div className={`border rounded-xl px-4 py-3 ${STATUS_STYLE[s.status] ?? STATUS_STYLE['Partial environmental match']}`}>
        <div className="flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <div className="text-sm font-bold">{s.status}</div>
            <div className="text-[11px]">{s.status_basis}.</div>
            {s.screening_scope && (
              <div className="text-[11px]">
                Target screening scope: <strong>{SCOPE_LABEL[s.screening_scope] ?? s.screening_scope}</strong> ({target.name}).
              </div>
            )}
            {r.evidence_tier && (
              <div className="text-[11px]">
                <strong>{r.evidence_tier.label}.</strong> {r.evidence_tier.note}
              </div>
            )}
          </div>
        </div>
      </div>

      {cats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          {cats.map(([k, v]) => (
            <div key={k} className="bg-[#F4F8FF] border border-[#E1E8F0] rounded-lg px-3 py-2">
              <div className="text-[10px] text-[#68788F]">{CATEGORY_LABEL[k] ?? k}</div>
              <div className="font-mono font-semibold text-[#142B50]">{v.similarity === null ? 'no data' : `${Math.round(v.similarity * 100)}%`}</div>
              <div className="text-[10px] text-[#68788F]">{v.basis === 'proxy' ? 'proxy' : v.basis === 'missing' ? 'missing' : 'data'} · {v.data_available}</div>
            </div>
          ))}
        </div>
      )}
      {stability && r.rank === 1 && (
        <p className="text-[11px] text-[#142B50] bg-[#F4F8FF] border border-[#E1E8F0] rounded-lg px-3 py-2">
          <strong>How stable is this #1 region?</strong> It stays within 5° in {Math.round(stability.weights_top1_within_5deg * 100)}% of weight perturbations and in{' '}
          {Math.round(stability.missing_20pct_top1_within_5deg * 100)}% of runs where 20% of cells lose a dimension. Treat the ranking as a broad region, not an exact cell.
        </p>
      )}
      <p className="text-[11px] text-[#142B50] bg-[#FFF4E5] border border-[#A15C00]/25 rounded-lg px-3 py-2">
        <strong>Benchmark note:</strong> on the current validation benchmark a simple dry-and-barren score performs as well as, or better than, this full model, so the target-specific ranking is not shown to add skill. Use results as screening regions to investigate.
      </p>
      <p className="text-[10px] text-[#68788F]">
        Category values are weighted means of the dimension similarities above, not independent measurements. Operational suitability (access, permits, logistics) and
        geology identity (lithology, subsurface voids, sedimentary volcanism) are not computed.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <List title="Supported by the data" items={s.supported} tone="text-[#14532D]" />
        <List title="Partially supported (proxy, weak or missing)" items={s.partially_supported} tone="text-[#6B3F00]" />
        <List title="Not supported / cannot be evaluated" items={s.unsupported} tone="text-[#7A1A12]" />
      </div>
    </div>
  );
}
