import { Download, Globe2, Map as MapIcon } from 'lucide-react';
import { lazy, Suspense, useMemo, useState } from 'react';
import { useMission } from '../state/MissionContext';
import type { Region } from '../types/astranovus';
import { pickRegionPhoto } from '../data/earthPhotos';
import { REFERENCE_SITES } from '../data/referenceSites';
import { BODY_ACCENT, bodyLabel, buildRegionsCsv, dimLabel, pct, rankScore, regionsToMapSites, suitabilitySummary } from '../utils/mission';
import { LeafletAnalogMap } from './LeafletAnalogMap';
import { RegionCard } from './RegionCard';
import { RegionDetail } from './RegionDetail';
import { WeightTuner } from './WeightTuner';
import { ErrorPanel, InfoNote, LoadingPanel, StateChip } from './StatusViews';

const EarthAnalogGlobe = lazy(() => import('./EarthAnalogGlobe').then((m) => ({ default: m.EarthAnalogGlobe })));

const CONF_STYLE = {
  high: 'bg-[#EAF7EE] text-[#177A3C] border-[#177A3C]/25',
  medium: 'bg-[#FFF4E5] text-[#A15C00] border-[#A15C00]/30',
  low: 'bg-[#FDECEC] text-[#B42318] border-[#B42318]/25',
} as const;

function downloadCsv(regions: Region[], name: string) {
  const blob = new Blob([buildRegionsCsv(regions)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `astranovus_${name}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ResultsPanel({ onOpenProfile }: { onOpenProfile: () => void }) {
  const m = useMission();
  const { result, resultStatus, resultError, experiment, targetId } = m;
  const [view, setView] = useState<'map' | 'globe'>('map');

  const sites = useMemo(() => (result ? regionsToMapSites(result.regions) : []), [result]);

  const mapMarkers = useMemo(
    () =>
      !result
        ? []
        : sites.map((s) => ({
        id: s.id,
        name: s.region.replace(/\s*\([^)]*\)\s*$/, ''),
        country: result.regions.find((x) => x.id === s.id)?.country ?? result.regions.find((x) => x.id === s.id)?.region_name ?? 'Land region',
        lat: s.lat,
        lon: s.lon,
        score: s.overall_score,
        coverage: s.data_coverage,
        role: s.role,
        published: true,
        rank: result.regions.find((x) => x.id === s.id)?.rank,
        status: result.regions.find((x) => x.id === s.id)?.suitability?.status,
        explanation: (() => {
          const rg = result.regions.find((x) => x.id === s.id);
          return rg ? suitabilitySummary(rg) : undefined;
        })(),
                  })),
    [result, sites]
  );

  if (resultStatus === 'loading' && !result) {
    return <LoadingPanel message="Asking the ASTRANOVUS engine for the best Earth regions..." />;
  }
  if (resultStatus === 'error') {
    return <ErrorPanel title="Recommendation failed" message={resultError ?? 'Unknown error'} onRetry={() => m.setTarget(targetId!)} />;
  }
  if (!result || !experiment) return null;

  const body = result.experiment.body;
  const accent = BODY_ACCENT[body];
  const unavailable = result.data_state === 'unavailable' && !result.provisional;
  const others = result.allowed_targets.filter((t) => t.id !== result.target_info.id);
  const selected = m.selectedRegion;

  return (
    <div className="space-y-5" aria-live="polite">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold" style={{ color: accent }}>
            Step 4 · Earth analog recommendations
          </div>
          <h2 className="font-display font-bold text-2xl text-[#142B50]">{experiment.name}</h2>
          <p className="text-sm text-[#68788F]">
            {bodyLabel(body)} reference site: <strong className="text-[#142B50]">{result.target_info.name}</strong> · mission profile{' '}
            <span className="font-mono">{experiment.purpose.id}</span> · {result.n_cells_passed} cells passed the gates
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StateChip state={result.provisional ? 'unavailable' : result.data_state} />
          {result.regions.length > 0 && (
            <button
              type="button"
              onClick={() => downloadCsv(result.regions, `${experiment.id}_${result.target_info.id}`)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E1E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#142B50] hover:border-[#0B5ED7]"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          )}
        </div>
      </div>

      {result.target_info.is_draft && (
        <InfoNote tone="warn">
          <strong>Team-written reference profile.</strong> {result.target_info.evidence.grounded} of {result.target_info.evidence.total} rules for &ldquo;{result.target_info.name}&rdquo; have a
          retrieved NASA source (qualitative direction only). Rankings are only as good as this profile.
        </InfoNote>
      )}

      {unavailable && (
        <div role="alert" className="bg-[#FFFFFF] border-2 border-[#B42318]/50 rounded-2xl p-6 space-y-4">
          <div>
            <h3 className="font-display font-bold text-lg text-[#7A1A12]">Not enough real data yet for this experiment</h3>
            <p className="text-sm text-[#142B50] mt-1">
              ASTRANOVUS does not invent recommendations. The Earth grid currently covers{' '}
              <strong>{pct(result.assessment.max_coverage)}</strong> of the criteria this experiment weighs, and at least one required check cannot be
              verified.
            </p>
          </div>
          <ul className="list-disc pl-5 text-xs text-[#7A1A12] space-y-1">
            {result.assessment.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <div className="text-xs text-[#142B50]">
            <strong>Dimensions with no data yet:</strong> {result.assessment.missing_dimensions.map(dimLabel).join(', ') || 'none'}. These are waiting for
            real NASA dataset integration (see Methodology).
          </div>
          {others.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center text-xs">
              <span className="text-[#68788F]">Other compatible reference sites:</span>
              {others.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => m.setTarget(t.id)}
                  className="px-3 py-1.5 rounded-lg border border-[#E1E8F0] bg-[#F4F8FF] font-semibold text-[#142B50] hover:border-[#0B5ED7]"
                >
                  {t.name} · <StateChip state={t.readiness.state} />
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => m.setAllowUnverified(true)}
            className="px-4 py-2 rounded-lg border border-[#B42318] text-[#B42318] text-xs font-semibold hover:bg-[#FDECEC]"
          >
            Show provisional ranking from available dimensions only (unverified)
          </button>
        </div>
      )}

      {Object.keys(result.custom_weights ?? {}).length > 0 && (
        <InfoNote tone="warn">
          <strong>Custom weights active:</strong> {Object.entries(result.custom_weights).map(([k, v]) => `${dimLabel(k)} ×${v}`).join(', ')}. This is your own calibration, not the default experiment profile.
        </InfoNote>
      )}

      {result.provisional && (
        <InfoNote tone="danger">
          <strong>PROVISIONAL, UNVERIFIED.</strong> Required checks cannot be performed because their data is missing:{' '}
          {result.assessment.gate_dimensions_missing.map(dimLabel).join(', ') || 'coverage is below the minimum'}. The ranking uses only the
          dimensions that have data.{' '}
          <button type="button" className="underline font-semibold" onClick={() => m.setAllowUnverified(false)}>
            Hide provisional results
          </button>
        </InfoNote>
      )}

      {!unavailable && result.data_state === 'partial' && (
        <InfoNote tone="warn">
          <strong>Partial data.</strong> Scores use only the dimensions that have data ({pct(result.assessment.max_coverage)} of this experiment&apos;s weighted
          criteria).
          {result.assessment.missing_dimensions.length > 0 && <> Not yet assessed: {result.assessment.missing_dimensions.map(dimLabel).join(', ')}.</>}
          {result.assessment.proxy_dimensions.length > 0 && <> Proxy (not a direct measurement): {result.assessment.proxy_dimensions.map(dimLabel).join(', ')}.</>}
          {(result.assessment.sparse_dimensions ?? []).length > 0 && <> Defined in under half of all cells (excluded elsewhere): {(result.assessment.sparse_dimensions ?? []).map(dimLabel).join(', ')}.</>}
        </InfoNote>
      )}

      {!unavailable && result.regions.length === 0 && (
        <InfoNote>
          No region passed this mission&apos;s gates and the minimum coverage. Try another reference site for this experiment.
        </InfoNote>
      )}

      {result.regions.length > 0 && (
        <>
          <p className="text-xs text-[#68788F]">
            Each marker is a {result.grid.step_deg ?? '?'}° grid cell (about 280 km): a candidate <em>area</em> to investigate, not a certified test site. Full warnings are listed at the end.
          </p>
          <WeightTuner />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-3 space-y-3 lg:max-h-[640px] lg:overflow-y-auto lg:pr-1" role="list" aria-label="Ranked Earth regions">
              {result.regions.map((r) => (
                <RegionCard
                  key={r.id}
                  region={r}
                  accent={accent}
                  selected={r.id === m.selectedRegionId}
                  inCompare={m.compareIds.includes(r.id)}
                  onSelect={() => {
                    m.selectRegion(r.id);
                    if (window.innerWidth < 1024) document.getElementById('results-map')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                  onDetails={() => {
                    m.selectRegion(r.id);
                    window.setTimeout(() => document.getElementById('region-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
                  }}
                  onToggleCompare={() => m.toggleCompare(r.id)}
                />
              ))}
            </div>

            <div id="results-map" className="lg:col-span-6 space-y-3 scroll-mt-24">
              <div role="group" aria-label="Map view" className="inline-flex glass-light-hud rounded-lg p-0.5">
                {(
                  [
                    ['map', 'Map', MapIcon],
                    ['globe', '3D Globe', Globe2],
                  ] as const
                ).map(([id, label, Icon]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setView(id)}
                    aria-pressed={view === id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold ${
                      view === id ? 'bg-[#0B5ED7] text-[#FFFFFF]' : 'text-[#142B50] hover:bg-[#EDF3FA]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </button>
                ))}
              </div>
              {view === 'map' ? (
                <LeafletAnalogMap
                  markers={mapMarkers}
                  referenceSites={REFERENCE_SITES}
                  onOpenProfile={(id) => {
                    m.selectRegion(id);
                    onOpenProfile();
                  }}
                  selectedId={m.selectedRegionId}
                  onSelectMarker={m.selectRegion}
                  cellSizeDeg={result.grid.step_deg ?? undefined}
                  bodyTheme={bodyLabel(body)}
                  heightClass="h-[540px] lg:h-[560px]"
                />
              ) : (
                <Suspense fallback={<LoadingPanel message="Loading 3D globe..." />}>
                  <EarthAnalogGlobe
                    sites={sites}
                    selectedTarget={{ id: result.target_info.id, body: bodyLabel(body) }}
                    selectedSiteId={m.selectedRegionId}
                    onSelectSite={m.selectRegion}
                    onOpenProfile={(id) => {
                      m.selectRegion(id);
                      onOpenProfile();
                    }}
                    heightClass="h-[420px] lg:h-[560px]"
                  />
                </Suspense>
              )}
            </div>

            <aside className="lg:col-span-3" aria-label="Selected region summary">
              {selected && (
                <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl overflow-hidden shadow-xs">
                  <img src={pickRegionPhoto(selected).src} alt={`Representative landscape: ${pickRegionPhoto(selected).title}`} loading="lazy" className="h-28 w-full object-cover" />
                  <div className="px-4 pt-1 text-[9px] text-[#68788F]">Representative image · {pickRegionPhoto(selected).credit.author}, {pickRegionPhoto(selected).credit.license}</div>
                  <div className="p-4 space-y-3">
                    <div className="text-[11px] text-[#68788F]">
                      Rank #{selected.rank} · {selected.region_name ?? 'Land region'}
                    </div>
                    <h3 className="font-display font-bold text-base text-[#142B50] leading-snug">{selected.location_label}</h3>
                    <div className="grid grid-cols-2 gap-2 bg-[#EDF3FA] rounded-xl p-3 text-xs">
                      <div>
                        <div className="text-[10px] text-[#68788F]">Adjusted score (raw {selected.best_score.toFixed(1)})</div>
                        <div className="font-mono font-bold text-lg tabular-nums" style={{ color: accent }}>
                          {rankScore(selected).toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#68788F]">Data coverage</div>
                        <div className="font-mono font-bold text-lg tabular-nums text-[#142B50]">{pct(selected.coverage)}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-[#68788F] leading-relaxed">{suitabilitySummary(selected)}</p>
                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="w-full py-2.5 rounded-lg bg-[#0B5ED7] hover:bg-[#094DB3] text-[#FFFFFF] text-sm font-semibold"
                    >
                      View Profile →
                    </button>
                  </div>
                </div>
              )}
            </aside>
          </div>

          {selected && (
            <RegionDetail
              region={selected}
              result={result}
              inCompare={m.compareIds.includes(selected.id)}
              onToggleCompare={() => m.toggleCompare(selected.id)}
              onOpenProfile={onOpenProfile}
            />
          )}

          <section aria-label="Warnings and limitations" className="rounded-2xl border border-[#A15C00]/30 bg-[#FFF8EC] p-5 space-y-2">
            <h3 className="font-display font-bold text-sm text-[#6B3F00]">Warnings and limitations</h3>
            <ul className="list-disc pl-5 text-xs text-[#6B3F00] space-y-1">
              <li>
                <strong>Regions, not sites.</strong> Markers are {result.grid.step_deg ?? '?'}° grid cells (about 280 km). They are areas to investigate, not certified landing or field-test sites; place names are approximate.
              </li>
              <li>
                <strong>Geology is not measured</strong> for most targets (lava tubes, mare basalt, mud volcanoes, delta sediments, evaporites, dunes). Those results are climate, terrain and surface similarity only.
              </li>
              <li>
                <strong>Proxies and gaps.</strong> Snow cover is not ice, composition is a thermal-infrared proxy defined for bare ground only, terrain is 1 km relief. Missing data are never filled.
              </li>
              {(result.n_cells_excluded_unverified ?? 0) > 0 && (
                <li>{result.n_cells_excluded_unverified} cells were excluded because a required check has no data there (for example ice-covered ground has no barren-ground value).</li>
              )}
              <li>
                <strong>Earth cannot reproduce</strong> lunar or Martian gravity, vacuum or thin atmosphere, radiation and regolith chemistry.
              </li>
              <li>
                <strong>Benchmark note.</strong> On the current validation benchmark a simple dry-and-barren score performs as well as this full model; rankings are screening aids, not proof of suitability. See Methodology.
              </li>
              <li>Photographs are representative of an environment type, not of the exact recommended location.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
