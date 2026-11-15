import { useEffect, useMemo, useState } from 'react';
import { fetchCompare, fetchScoredCells, fetchTargets, fetchValidation } from '../api/client';
import { DataCoverageStrip, SyntheticDataWarning } from '../components/DataBanners';
import { LeafletAnalogMap } from '../components/LeafletAnalogMap';
import { ErrorPanel, InfoNote, LoadingPanel } from '../components/StatusViews';
import { useMission } from '../state/MissionContext';
import type { BackendTarget, CompareResponse, HeatmapPoint, ScoredCell, ValidationResponse, ValidationRow } from '../types/astranovus';
import { bodyLabel, formatCoords, pct } from '../utils/mission';

type Category = 'all' | 'engine' | 'analog' | 'hypothesis';

interface Item {
  id: string;
  kind: Exclude<Category, 'all'>;
  name: string;
  lat: number;
  lon: number;
  score: number;
  coverage: number | null;
  percentile: number | null;
  note: string;
}

const KIND_LABEL: Record<Item['kind'], string> = {
  engine: 'Engine candidate cell',
  analog: 'Known analog (NASA-documented)',
  hypothesis: 'Unverified hypothesis',
};

export function DiscoverPage() {
  const m = useMission();
  const [targets, setTargets] = useState<BackendTarget[]>([]);
  const [targetId, setTargetId] = useState<string>(m.targetId ?? '');
  const [cells, setCells] = useState<ScoredCell[] | null>(null);
  const [val, setVal] = useState<ValidationResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [minCov, setMinCov] = useState(0.5);
  const [opacity, setOpacity] = useState(0.75);
  const [cat, setCat] = useState<Category>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [cmp, setCmp] = useState<CompareResponse | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ac = new AbortController();
    fetchTargets(ac.signal)
      .then((t) => {
        setTargets(t);
        setTargetId((cur) => cur || t[0]?.id || '');
      })
      .catch((e: Error) => e.name !== 'AbortError' && setErr(e.message));
    fetchValidation(ac.signal).then(setVal).catch(() => undefined);
    return () => ac.abort();
  }, [tick]);

  useEffect(() => {
    if (!targetId) return;
    const ac = new AbortController();
    setCells(null);
    setErr(null);
    setSelected(null);
    setCmp(null);
    fetchScoredCells(targetId, 5000, ac.signal)
      .then(setCells)
      .catch((e: Error) => e.name !== 'AbortError' && setErr(e.message));
    return () => ac.abort();
  }, [targetId, tick]);

  const target = targets.find((t) => t.id === targetId);
  const body = target ? bodyLabel(target.body) : 'Moon';

  const shown = useMemo(() => (cells ?? []).filter((c) => c.coverage >= minCov), [cells, minCov]);
  const heat: HeatmapPoint[] = useMemo(
    () => shown.map((c) => ({ lat: c.lat, lon: c.lon, intensity: Math.max(0, Math.min(1, c.score / 100)), region_name: '', cluster_id: String(c.cell_id) })),
    [shown]
  );

  const items: Item[] = useMemo(() => {
    const out: Item[] = [];
    [...shown].sort((a, b) => b.score - a.score).slice(0, 10).forEach((c, i) =>
      out.push({ id: `cell-${c.cell_id}`, kind: 'engine', name: `#${i + 1} cell ${formatCoords(c.lat, c.lon)}`, lat: c.lat, lon: c.lon, score: c.score, coverage: c.coverage, percentile: null, note: 'Top-scoring grid cell for this reference site (generic weights).' })
    );
    const add = (rows: ValidationRow[] | undefined, kind: Item['kind']) =>
      (rows ?? [])
        .filter((r) => r.target === targetId && r.score !== null && r.in_grid && (kind !== 'analog' || r.kind === 'positive'))
        .forEach((r) =>
          out.push({ id: `${kind}-${r.site}`, kind, name: r.site, lat: r.cell_lat, lon: r.cell_lon, score: r.score as number, coverage: null, percentile: r.percentile,
            note: kind === 'analog' ? 'Evaluated at its nearest 2.5° cell; see Methodology for the validation caveats.' : 'Proposed in the original plan; no NASA analog citation retrieved. A hypothesis, not validation.' })
        );
    add(val?.rows, 'analog');
    add(val?.hypotheses, 'hypothesis');
    return out;
  }, [shown, val, targetId]);

  const visible = items.filter((i) => cat === 'all' || i.kind === cat);
  const sel = items.find((i) => i.id === selected) ?? null;

  useEffect(() => {
    if (!sel) return;
    const ac = new AbortController();
    setCmp(null);
    fetchCompare(sel.lat, sel.lon, ac.signal)
      .then(setCmp)
      .catch(() => undefined);
    return () => ac.abort();
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  const chip = (on: boolean, accent = '#0B5ED7') =>
    `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${on ? 'text-[#FFFFFF]' : 'bg-[#EDF3FA] text-[#142B50] hover:bg-[#E1E8F0]'}`;

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-[#142B50]">Global Analog Discovery</h1>
            <p className="text-sm text-[#68788F] max-w-3xl mt-1">
              Similarity of every Earth grid cell to one reference site, from the FastAPI engine&apos;s generic <span className="font-mono">/score</span> (no
              experiment multipliers or gates; use Explore for mission-specific answers). Known analog sites are overlaid with their real model scores.
            </p>
          </div>
          {target && (
            <div className="font-mono text-[11px] bg-[#EDF3FA] border border-[#E1E8F0] rounded-xl px-4 py-2 text-[#142B50]">
              {cells ? `${cells.length} cells · ${new Set(cells.map((c) => c.lat)).size} latitude rows` : 'loading…'}
            </div>
          )}
        </div>
        <SyntheticDataWarning />
        <div className="flex flex-wrap gap-2 border-t border-[#E6ECF3] pt-4" role="group" aria-label="Reference site">
          {targets.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTargetId(t.id)}
              aria-pressed={t.id === targetId}
              className={chip(t.id === targetId)}
              style={t.id === targetId ? { backgroundColor: t.body === 'mars' ? '#F28B45' : '#0B5ED7' } : undefined}
            >
              {bodyLabel(t.body)} · {t.name}
            </button>
          ))}
        </div>
      </div>

      <DataCoverageStrip />

      <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-4 flex flex-wrap items-center gap-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
          {(
            [
              ['all', 'All categories'],
              ['engine', 'Engine candidates'],
              ['analog', 'Known analogs'],
              ['hypothesis', 'Hypotheses'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} type="button" onClick={() => setCat(id)} aria-pressed={cat === id} className={chip(cat === id)} style={cat === id ? { backgroundColor: '#0B5ED7' } : undefined}>
              {label}
            </button>
          ))}
        </div>
        <div className="min-w-[200px] flex-1 max-w-xs">
          <label htmlFor="disc-op" className="flex justify-between text-[11px] font-semibold text-[#68788F]">
            <span>Heatmap opacity</span>
            <span className="font-mono text-[#142B50]">{Math.round(opacity * 100)}%</span>
          </label>
          <input id="disc-op" type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="astranovus-slider w-full" />
        </div>
        <div className="min-w-[200px] flex-1 max-w-xs">
          <label htmlFor="disc-cov" className="flex justify-between text-[11px] font-semibold text-[#68788F]">
            <span>Minimum data coverage</span>
            <span className="font-mono text-[#142B50]">{pct(minCov)}</span>
          </label>
          <input id="disc-cov" type="range" min={0} max={1} step={0.05} value={minCov} onChange={(e) => setMinCov(Number(e.target.value))} className="astranovus-slider w-full" />
        </div>
        {cells && <div className="text-xs text-[#68788F]">{shown.length} of {cells.length} cells shown</div>}
      </div>

      {err && <ErrorPanel message={err} onRetry={() => setTick((t) => t + 1)} />}
      {!err && !cells && <LoadingPanel message="Scoring every Earth cell..." />}

      {cells && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8">
            <LeafletAnalogMap
              markers={visible.map((i) => ({ id: i.id, name: i.name, country: KIND_LABEL[i.kind], lat: i.lat, lon: i.lon, score: i.score, coverage: (i.coverage ?? 1) * 100, role: i.kind, published: false }))}
              selectedId={selected}
              onSelectMarker={setSelected}
              heatmapPoints={heat}
              heatmapOpacity={opacity}
              bodyTheme={body as 'Moon' | 'Mars'}
              heightClass="h-[460px] lg:h-[620px]"
            />
          </div>
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-5 space-y-3">
              <h2 className="font-display font-bold text-base text-[#142B50]">Selected location</h2>
              {!sel && <p className="text-xs text-[#68788F]">Click a marker or list item to inspect it.</p>}
              {sel && (
                <>
                  <div className="text-[11px] text-[#68788F]">{KIND_LABEL[sel.kind]}</div>
                  <div className="font-display font-bold text-lg text-[#142B50] leading-snug">{sel.name}</div>
                  <div className="font-mono text-[11px] text-[#68788F]">{formatCoords(sel.lat, sel.lon)}</div>
                  <div className="grid grid-cols-2 gap-3 bg-[#EDF3FA] rounded-xl p-3 text-xs">
                    <div>
                      <div className="text-[10px] text-[#68788F]">Similarity</div>
                      <div className="font-mono font-bold text-xl text-[#0B5ED7] tabular-nums">{sel.score.toFixed(1)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#68788F]">{sel.coverage !== null ? 'Data coverage' : 'Percentile of all cells'}</div>
                      <div className="font-mono font-bold text-xl text-[#142B50] tabular-nums">{sel.coverage !== null ? pct(sel.coverage) : pct(sel.percentile)}</div>
                    </div>
                  </div>
                  <InfoNote tone={sel.kind === 'hypothesis' ? 'warn' : 'info'}>{sel.note}</InfoNote>
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-[#142B50]">This cell vs every reference site</div>
                    {!cmp && <p className="text-xs text-[#68788F]">Loading...</p>}
                    {cmp && (
                      <ul className="space-y-1">
                        {cmp.scores.slice().sort((a, b) => (b.score ?? -1) - (a.score ?? -1)).map((s) => (
                          <li key={s.target} className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="truncate text-[#142B50]">{s.name}</span>
                            <span className="font-mono tabular-nums text-[#0B5ED7]">{s.score === null ? 'n/a' : s.score.toFixed(1)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-4 space-y-2">
              <h2 className="font-display font-bold text-sm text-[#142B50]">Locations for {target?.name ?? targetId}</h2>
              <ul className="divide-y divide-[#E6ECF3] max-h-72 overflow-y-auto">
                {visible.map((i) => (
                  <li key={i.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(i.id)}
                      aria-pressed={selected === i.id}
                      className={`w-full text-left py-2 px-2 rounded-md flex items-center justify-between gap-2 text-xs ${selected === i.id ? 'bg-[#EDF3FA]' : 'hover:bg-[#F4F8FF]'}`}
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-[#142B50] truncate">{i.name}</span>
                        <span className="block text-[10px] text-[#68788F]">{KIND_LABEL[i.kind]}</span>
                      </span>
                      <span className="font-mono tabular-nums text-[#0B5ED7]">{i.score.toFixed(1)}</span>
                    </button>
                  </li>
                ))}
                {visible.length === 0 && <li className="py-3 text-xs text-[#68788F]">Nothing in this category for this reference site.</li>}
              </ul>
            </div>
          </div>
        </div>
      )}

      <section aria-label="Warnings and limitations" className="rounded-2xl border border-[#A15C00]/30 bg-[#FFF8EC] p-5 space-y-2">
        <h2 className="font-display font-bold text-sm text-[#6B3F00]">Warnings and limitations</h2>
        <ul className="list-disc pl-5 text-xs text-[#6B3F00] space-y-1">
          <li>The heatmap and markers are 2.5° grid cells (about 280 km): regions to investigate, not certified sites.</li>
          <li>Known analogs and hypotheses are shown for context from literature or team research; hypotheses are unverified and never validated.</li>
          <li>Similarity uses climate, terrain and surface layers; geology (lava tubes, basalt, mud volcanoes, sediments, evaporites, dunes) is not measured.</li>
          <li>Snow cover is not ice, composition is a proxy for bare ground only, and missing data are never filled.</li>
        </ul>
      </section>
    </div>
  );
}
