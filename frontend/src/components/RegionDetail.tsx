import { ArrowLeftRight, ArrowRight, Database, FlaskConical, Layers } from 'lucide-react';
import { useState } from 'react';
import { pickRegionPhoto } from '../data/earthPhotos';
import type { MissionResult, Region } from '../types/astranovus';
import { BODY_ACCENT, bodyLabel, pct, rankScore, suitabilitySummary } from '../utils/mission';
import { DimensionTable } from './DimensionTable';
import { EarthLimitsNote } from './DataBanners';
import { ReferenceEvidence } from './ReferenceEvidence';
import { ScoreDonut } from './ScoreDonut';
import { InfoNote } from './StatusViews';
import { SuitabilityPanel } from './SuitabilityPanel';

interface Props {
  region: Region;
  result: MissionResult;
  inCompare: boolean;
  onToggleCompare: () => void;
  onOpenProfile: () => void;
}

const TABS = [
  ['overview', 'Overview'],
  ['environment', 'Environment'],
  ['suitability', 'Testing suitability'],
  ['evidence', 'Scientific evidence'],
  ['limits', 'Limitations'],
] as const;
type TabId = (typeof TABS)[number][0];

const fmtCoord = (lat: number, lon: number) => `${Math.abs(lat).toFixed(2)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(2)}°${lon >= 0 ? 'E' : 'W'}`;

function Fact({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-[#F4F8FF] border border-[#E1E8F0] rounded-lg px-3 py-2">
      <div className="text-[10px] text-[#68788F]">{k}</div>
      <div className="text-xs font-semibold text-[#142B50] leading-snug">{v}</div>
    </div>
  );
}

export function RegionDetail({ region: r, result, inCompare, onToggleCompare, onOpenProfile }: Props) {
  const [tab, setTab] = useState<TabId>('overview');
  const body = result.experiment.body;
  const accent = BODY_ACCENT[body];
  const supporting = r.dimensions.filter((d) => d.similarity !== null && d.similarity >= 0.7);
  const weak = r.dimensions.filter((d) => d.similarity !== null && d.similarity < 0.5);
  const missing = r.dimensions.filter((d) => d.similarity === null);
  const datasets = Array.from(new Set(r.dimensions.filter((d) => d.data_status !== 'missing').map((d) => d.source)));
  const photo = pickRegionPhoto(r);
  const tierLabel = r.evidence_tier?.label ?? 'Global screening candidate';

  return (
    <section id="region-detail" className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl shadow-xs overflow-hidden scroll-mt-24" aria-label={`Details for region ${r.rank}`}>
      <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-6 border-b border-[#E6ECF3]">
        <div className="md:col-span-8 space-y-2">
          <div className="text-xs font-semibold" style={{ color: accent }}>
            Rank #{r.rank} · {bodyLabel(body)} · {result.experiment.short_name} · reference {result.target_info.name}
          </div>
          <h2 className="font-display font-bold text-xl text-[#142B50]">{r.location_label}</h2>
          <p className="text-sm text-[#142B50] leading-relaxed">{suitabilitySummary(r)}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenProfile}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B5ED7] hover:bg-[#094DB3] text-[#FFFFFF] text-xs font-semibold transition-colors"
            >
              <span>Open full profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleCompare}
              aria-pressed={inCompare}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                inCompare ? 'bg-[#EDF3FA] border-[#0B5ED7] text-[#0B5ED7]' : 'bg-[#FFFFFF] border-[#E1E8F0] text-[#142B50] hover:border-[#0B5ED7]'
              }`}
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>{inCompare ? 'In comparison' : 'Add to comparison'}</span>
            </button>
          </div>
        </div>
        <div className="md:col-span-4 flex flex-col items-center">
          <ScoreDonut score={rankScore(r)} accentColor={accent} label={`${r.confidence} confidence`} />
          <div className="text-[11px] text-[#68788F] text-center mt-1">
            Evidence-adjusted score (raw similarity {r.best_score.toFixed(1)}, data coverage {pct(r.coverage)})
          </div>
        </div>
      </div>

      <div role="tablist" aria-label="Location details" className="flex gap-1 overflow-x-auto px-3 sm:px-5 pt-3 border-b border-[#E6ECF3]">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            id={`tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap rounded-t-lg border-b-2 transition-colors ${
              tab === id ? 'text-[#0B5ED7] border-[#0B5ED7] bg-[#EDF3FA]/60' : 'text-[#68788F] border-transparent hover:text-[#142B50]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-5 sm:p-6 space-y-5" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {result.provisional && (
          <InfoNote tone="danger">
            <strong>Provisional result.</strong> Required checks could not be verified. Treat this ranking as exploratory only.
          </InfoNote>
        )}

        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Fact k="Best-cell coordinates" v={fmtCoord(r.best_cell.lat, r.best_cell.lon)} />
                <Fact k="Country / region" v={[r.country, r.region_name].filter(Boolean).join(' · ') || 'Land region'} />
                <Fact k="Region type" v={`${r.n_cells} grid cell${r.n_cells === 1 ? '' : 's'} (about 280 km each)`} />
                <Fact k="Planetary reference" v={result.target_info.name} />
                <Fact k="Test objective" v={result.experiment.name} />
                <Fact k="Evidence tier" v={tierLabel} />
              </div>
              {r.notes.length > 0 && (
                <InfoNote tone="warn">
                  {r.notes.map((n) => (
                    <div key={n}>{n}</div>
                  ))}
                </InfoNote>
              )}
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-sm text-[#142B50] inline-flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-[#0B5ED7]" /> What could be tested here
                </h3>
                <ul className="list-disc pl-5 text-xs text-[#142B50] space-y-1">
                  {r.applications.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-[#68788F]">Suggestions for the selected objective. Access, permits, safety and logistics are not assessed.</p>
              </div>
            </div>
            <figure className="lg:col-span-2 rounded-xl overflow-hidden border border-[#E1E8F0] bg-[#F4F8FF] self-start">
              <img src={photo.src} alt={`Representative landscape: ${photo.title}`} loading="lazy" className="w-full h-44 object-cover" />
              <figcaption className="p-3 text-[10px] text-[#68788F] space-y-0.5">
                <div className="font-semibold text-[#142B50] text-[11px]">Representative image, not this exact location</div>
                <div>{photo.title}</div>
                <div>
                  Photo: {photo.credit.author} · {photo.credit.license} ·{' '}
                  <a href={photo.credit.page} target="_blank" rel="noopener noreferrer" className="text-[#0B5ED7] underline">
                    source
                  </a>
                </div>
              </figcaption>
            </figure>
          </div>
        )}

        {tab === 'environment' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm text-[#142B50] inline-flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-[#0B5ED7]" /> Every dimension used for this objective
              </h3>
              <DimensionTable dims={r.dimensions} accent={accent} />
            </div>
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm text-[#142B50]">Terrain, snow and surface</h3>
              {r.surface ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <Fact k="Mean elevation (1 km data)" v={r.surface.elevation_mean_m === null ? 'n/a' : `${r.surface.elevation_mean_m} m`} />
                    <Fact k="Relief in cell (P95-P5, 1 km)" v={r.surface.relief_1km_m === null ? 'n/a' : `${r.surface.relief_1km_m} m`} />
                    <Fact k="Mean 1 km slope" v={r.surface.slope_1km_deg === null ? 'n/a' : `${r.surface.slope_1km_deg}°`} />
                    <Fact k="Elevation source" v={r.surface.dem_source ?? 'n/a'} />
                  </div>
                  <p className="text-[11px] text-[#68788F]">
                    {r.surface.perennial_snow_ice ? (
                      <strong className="text-[#0B5ED7]">Perennial snow/ice cover (MODIS snow flag; not glaciers or subsurface ice). </strong>
                    ) : (
                      'No perennial snow/ice flag. '
                    )}
                    {r.surface.snow_mean_valid_pct !== null && <>Mean snow cover over observed months: {r.surface.snow_mean_valid_pct}%. </>}
                    Values are averages over the whole grid cell, not site measurements.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-[#68788F]">No surface context available for this cell.</p>
              )}
              <h4 className="font-display font-bold text-xs text-[#142B50] pt-1">Local terrain check (NASA SRTM 30 m)</h4>
              {r.terrain.state === 'verified_local' ? (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                  <Fact k="Class" v={String(r.terrain.terrain_class)} />
                  <Fact k="Mean slope" v={`${r.terrain.slope_mean_deg}°`} />
                  <Fact k="95th pct slope" v={`${r.terrain.slope_p95_deg}°`} />
                  <Fact k="Relief (P95-P5)" v={`${r.terrain.relief_m} m`} />
                  <Fact k="Mean elevation" v={`${r.terrain.elevation_mean_m} m`} />
                </div>
              ) : (
                <p className={`text-xs rounded-lg px-3 py-2 ${r.terrain.state === 'outside_coverage' ? 'bg-[#FDECEC] text-[#7A1A12]' : 'bg-[#F4F8FF] text-[#68788F]'}`}>{r.terrain.note}</p>
              )}
            </div>
          </div>
        )}

        {tab === 'suitability' && (
          <div className="space-y-5">
            <SuitabilityPanel region={r} target={result.target_info} stability={result.ranking_stability} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-2">
                <h3 className="font-display font-bold text-sm text-[#142B50]">Requirements that match</h3>
                {supporting.length === 0 ? (
                  <p className="text-xs text-[#68788F]">No assessed dimension reaches a strong (70%+) match.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-[#142B50]">
                    {supporting.map((d) => (
                      <li key={d.dimension} className="flex justify-between gap-3 bg-[#F4F8FF] border border-[#E1E8F0] rounded-lg px-3 py-2">
                        <span className="font-semibold">{d.name}</span>
                        <span className="font-mono text-[#0B5ED7] tabular-nums">{pct(d.similarity)} match</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-sm text-[#142B50]">Weak or missing</h3>
                {weak.length + missing.length === 0 ? (
                  <p className="text-xs text-[#68788F]">None: every assessed dimension is at least a moderate match.</p>
                ) : (
                  <ul className="space-y-1.5 text-xs">
                    {weak.map((d) => (
                      <li key={d.dimension} className="flex justify-between gap-3 bg-[#FFF4E5] border border-[#A15C00]/25 rounded-lg px-3 py-2 text-[#6B3F00]">
                        <span className="font-semibold">{d.name}</span>
                        <span className="font-mono tabular-nums">{pct(d.similarity)} (weak)</span>
                      </li>
                    ))}
                    {missing.map((d) => (
                      <li key={d.dimension} className="flex justify-between gap-3 bg-[#FDECEC] border border-[#B42318]/25 rounded-lg px-3 py-2 text-[#7A1A12]">
                        <span className="font-semibold">{d.name}</span>
                        <span>no data</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === 'evidence' && (
          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm text-[#142B50] inline-flex items-center gap-1.5">
                <Database className="w-4 h-4 text-[#0B5ED7]" /> NASA-derived Earth datasets behind this region
              </h3>
              {datasets.length === 0 ? (
                <p className="text-xs text-[#68788F]">No dimension has data for this region.</p>
              ) : (
                <ul className="list-disc pl-5 text-xs text-[#142B50] space-y-1">
                  {datasets.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-[#68788F]">Earth values are percentile ranks among the loaded land cells, not raw physical measurements.</p>
            </div>
            <ReferenceEvidence targetId={result.target_info.id} targetName={result.target_info.name} />
          </div>
        )}

        {tab === 'limits' && (
          <div className="space-y-4">
            <InfoNote>
              <strong>Spatial resolution:</strong> this marker is the centre of a {result.grid.step_deg ?? '?'}° grid cell (about 280 km wide). The result is a candidate{' '}
              <em>area</em> to investigate, not a pinpointed or certified test site. Place names are approximate labels.
            </InfoNote>
            {r.suitability && r.suitability.unsupported.length > 0 && (
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-sm text-[#142B50]">What this model cannot establish for this target</h3>
                <ul className="list-disc pl-5 text-xs text-[#7A1A12] space-y-1">
                  {r.suitability.unsupported.slice(0, 8).map((u) => (
                    <li key={u}>{u}</li>
                  ))}
                </ul>
              </div>
            )}
            <EarthLimitsNote limits={result.limits_on_earth} />
          </div>
        )}
      </div>
    </section>
  );
}
