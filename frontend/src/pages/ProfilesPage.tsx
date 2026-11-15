import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts';
import { fetchCompare } from '../api/client';
import { DimensionTable } from '../components/DimensionTable';
import { SuitabilityPanel } from '../components/SuitabilityPanel';
import { EarthLimitsNote } from '../components/DataBanners';
import type { PageId } from '../components/Navbar';
import { ScoreDonut } from '../components/ScoreDonut';
import { InfoNote, LoadingPanel } from '../components/StatusViews';
import { useMission } from '../state/MissionContext';
import type { CompareResponse } from '../types/astranovus';
import { BODY_ACCENT, bodyLabel, dimsWithData, pct, rankScore, suitabilitySummary } from '../utils/mission';

export function ProfilesPage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const m = useMission();
  const r = m.selectedRegion;
  const result = m.result;
  const [cmp, setCmp] = useState<CompareResponse | null>(null);
  const [cmpErr, setCmpErr] = useState<string | null>(null);

  useEffect(() => {
    if (!r) return;
    const ac = new AbortController();
    setCmp(null);
    setCmpErr(null);
    fetchCompare(r.best_cell.lat, r.best_cell.lon, ac.signal)
      .then(setCmp)
      .catch((e: Error) => e.name !== 'AbortError' && setCmpErr(e.message));
    return () => ac.abort();
  }, [r?.id, r?.best_cell.lat, r?.best_cell.lon]);

  if (!result || !r || !m.experiment) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-10 text-center space-y-3">
          <h1 className="font-display font-bold text-xl text-[#142B50]">No region selected yet</h1>
          <p className="text-sm text-[#68788F] max-w-lg mx-auto">
            Site profiles describe the Earth regions recommended for a Moon or Mars experiment. Run a mission workflow first
            {result && result.regions.length === 0 ? ' (the last run produced no regions, so there is nothing to profile)' : ''}.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('explore')}
            className="px-5 py-2.5 rounded-lg bg-[#0B5ED7] hover:bg-[#094DB3] text-[#FFFFFF] text-xs font-semibold"
          >
            Go to mission workflow
          </button>
        </div>
      </div>
    );
  }

  const body = result.experiment.body;
  const accent = BODY_ACCENT[body];
  const radar = dimsWithData(r.dimensions).map((d) => ({ dimension: d.name, match: Math.round((d.similarity ?? 0) * 100), ideal: 100 }));
  const key = new Set(m.experiment.key_dimensions);
  const checks = r.dimensions
    .filter((d) => key.has(d.dimension) || m.experiment!.purpose.gates.some((g) => g.dim === d.dimension))
    .map((d) => ({ d, status: d.similarity === null ? 'missing' : d.similarity >= 0.7 ? 'pass' : 'caution' }));

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-xs font-semibold" style={{ color: accent }}>
            Site profile · {bodyLabel(body)} · {m.experiment.short_name}
          </div>
          <h1 className="font-display font-extrabold text-2xl text-[#142B50]">{r.location_label}</h1>
          <p className="text-xs text-[#68788F]">Reference site: {result.target_info.name} · name label basis: {r.label_basis}</p>
        </div>
        <div>
          <label htmlFor="region-select" className="block text-[11px] font-semibold text-[#68788F] mb-1">
            Recommended region
          </label>
          <select
            id="region-select"
            value={r.id}
            onChange={(e) => m.selectRegion(e.target.value)}
            className="bg-[#EDF3FA] border border-[#E1E8F0] text-[#142B50] text-xs font-semibold rounded-lg px-3 py-2"
          >
            {result.regions.map((x) => (
              <option key={x.id} value={x.id}>
                #{x.rank} · {x.location_label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {result.provisional && (
        <InfoNote tone="danger">
          <strong>Provisional, unverified result.</strong> This region was ranked without a required check that has no data yet.
        </InfoNote>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-6 space-y-4">
          <ScoreDonut score={rankScore(r)} accentColor={accent} label={`${r.confidence} confidence`} />
          <dl className="grid grid-cols-2 gap-3 text-xs">
            {[
              ['Coordinates', `${r.lat.toFixed(2)}, ${r.lon.toFixed(2)}`],
              ['Best cell', `${r.best_cell.lat}, ${r.best_cell.lon}`],
              ['Data coverage', pct(r.coverage)],
              ['Cells in region', String(r.n_cells)],
              ['Raw similarity', r.best_score.toFixed(1)],
              ['Mission profile', result.experiment.purpose.id],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#F4F8FF] border border-[#E1E8F0] rounded-lg px-3 py-2">
                <dt className="text-[10px] text-[#68788F]">{k}</dt>
                <dd className="font-mono font-semibold text-[#142B50] tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-[#142B50] leading-relaxed">{suitabilitySummary(r)}</p>
        </div>

        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-6 space-y-2">
          <h2 className="font-display font-bold text-base text-[#142B50]">Match profile</h2>
          {radar.length >= 3 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radar} outerRadius="72%">
                  <PolarGrid stroke="#E1E8F0" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#142B50', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#68788F' }} />
                  <Radar name="Reference ideal" dataKey="ideal" stroke="#C7D2E0" fill="#EDF3FA" fillOpacity={0.35} strokeDasharray="4 4" />
                  <Radar name="Match %" dataKey="match" stroke={accent} fill={accent} fillOpacity={0.28} />
                  <Tooltip formatter={(v: unknown) => [`${Number(v)}%`, 'Match']} contentStyle={{ borderRadius: 10, borderColor: '#E1E8F0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-[#68788F]">Fewer than three dimensions have data, so a radar chart would be misleading. See the table below.</p>
          )}
          {r.dimensions.some((d) => d.similarity === null) && (
            <p className="text-[11px] text-[#B42318]">
              Dimensions without data are omitted from the chart (not plotted as zero): {r.dimensions.filter((d) => d.similarity === null).map((d) => d.name).join(', ')}.
            </p>
          )}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-display font-bold text-base text-[#142B50]">How far the evidence supports this match</h2>
        <SuitabilityPanel region={r} target={result.target_info} stability={result.ranking_stability} />
      </section>

      <section className="space-y-2">
        <h2 className="font-display font-bold text-base text-[#142B50]">Dimension breakdown for {m.experiment.short_name}</h2>
        <DimensionTable dims={r.dimensions} accent={accent} />
      </section>

      <section className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-base text-[#142B50]">Experiment suitability checklist</h2>
        <p className="text-xs text-[#68788F]">
          The dimensions that matter most for <strong>{m.experiment.short_name}</strong> (from its mission profile), judged from engine similarity: pass ≥ 70%, caution below.
          This is a desk assessment from satellite-derived percentiles, not a field-readiness check.
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {checks.map(({ d, status }) => (
            <li key={d.dimension} className={`rounded-lg border px-3 py-2 text-xs ${status === 'pass' ? 'bg-[#EAF7EE] border-[#177A3C]/25 text-[#177A3C]' : status === 'caution' ? 'bg-[#FFF4E5] border-[#A15C00]/30 text-[#6B3F00]' : 'bg-[#FDECEC] border-[#B42318]/25 text-[#7A1A12]'}`}>
              <div className="flex justify-between font-semibold"><span>{d.name}</span><span className="font-mono">{d.similarity === null ? 'no data' : pct(d.similarity)}</span></div>
              <div className="opacity-90">{status === 'pass' ? 'Supports this experiment.' : status === 'caution' ? 'Only a partial match: expect differences from the reference environment.' : 'Cannot be assessed yet.'}</div>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-base text-[#142B50]">How this cell scores against every reference site</h2>
        <p className="text-xs text-[#68788F]">
          Generic target similarity from the engine&apos;s <span className="font-mono">/compare</span> endpoint (target default weights, no mission-specific
          multipliers or gates). Useful context, not the experiment ranking.
        </p>
        {cmpErr && <p className="text-xs text-[#B42318]">{cmpErr}</p>}
        {!cmp && !cmpErr && <LoadingPanel message="Comparing against all reference sites..." />}
        {cmp && (
          <ul className="space-y-2">
            {cmp.scores
              .slice()
              .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
              .map((s) => (
                <li key={s.target} className="flex items-center gap-3 text-xs">
                  <span className="w-64 shrink-0 truncate text-[#142B50] font-semibold">{s.name}</span>
                  {s.score === null ? (
                    <span className="text-[#B42318]">no score (no data)</span>
                  ) : (
                    <>
                      <div className="flex-1 h-2 rounded-full bg-[#EDF3FA] overflow-hidden">
                        <div className="h-full rounded-full bg-[#0B5ED7]" style={{ width: `${s.score}%` }} />
                      </div>
                      <span className="font-mono tabular-nums w-12 text-right">{s.score.toFixed(1)}</span>
                    </>
                  )}
                </li>
              ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-6 space-y-2">
          <h2 className="font-display font-bold text-base text-[#142B50]">Scenario context</h2>
          <p className="text-xs text-[#142B50] leading-relaxed">
            <strong>{m.experiment.name}:</strong> {m.experiment.why}
          </p>
          <p className="text-xs text-[#68788F]">{m.experiment.nasa_documented.summary}</p>
          <ul className="space-y-1">
            {m.experiment.nasa_documented.sources.map((s) => (
              <li key={s.id}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B5ED7] hover:underline">
                  {s.label} <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            ))}
          </ul>
          <h3 className="font-display font-bold text-sm text-[#142B50] pt-2">Potential applications</h3>
          <ul className="list-disc pl-5 text-xs text-[#142B50] space-y-0.5">
            {r.applications.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        <EarthLimitsNote limits={result.limits_on_earth} />
      </section>

      <div className="flex gap-3">
        <button type="button" onClick={() => onNavigate('explore')} className="px-4 py-2 rounded-lg border border-[#E1E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#142B50] hover:border-[#0B5ED7]">
          ← Back to results
        </button>
        <button type="button" onClick={() => onNavigate('compare')} className="px-4 py-2 rounded-lg bg-[#0B5ED7] text-[#FFFFFF] text-xs font-semibold hover:bg-[#094DB3]">
          Compare regions
        </button>
      </div>
    </div>
  );
}
