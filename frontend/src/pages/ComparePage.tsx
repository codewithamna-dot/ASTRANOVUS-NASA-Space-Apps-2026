import { Bar, BarChart, CartesianGrid, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { PageId } from '../components/Navbar';
import { InfoNote } from '../components/StatusViews';
import { useMission } from '../state/MissionContext';
import type { Region } from '../types/astranovus';
import { BODY_ACCENT, bodyLabel, pct, rankScore } from '../utils/mission';

const SERIES_COLORS = ['#0B5ED7', '#F28B45', '#16A34A'];

function tradeOff(regions: Region[]): string[] {
  if (regions.length < 2) return [];
  const lines: string[] = [];
  const top = [...regions].sort((a, b) => rankScore(b) - rankScore(a));
  if (rankScore(top[0]) - rankScore(top[1]) >= 0.5) {
    lines.push(`${top[0].location_label} has the higher evidence-adjusted score (${rankScore(top[0]).toFixed(1)} vs ${rankScore(top[1]).toFixed(1)}).`);
  } else {
    lines.push('Scores are within 0.5 points of each other, which is below the precision these estimates support.');
  }
  const cov = [...regions].sort((a, b) => b.coverage - a.coverage);
  if (cov[0].coverage - cov[1].coverage >= 0.01) {
    lines.push(`${cov[0].location_label} rests on more data coverage (${pct(cov[0].coverage)} vs ${pct(cov[1].coverage)}), so its score is better supported.`);
  }
  const conf = regions.filter((r) => r.confidence === 'low');
  if (conf.length) lines.push(`Low-confidence: ${conf.map((r) => r.location_label).join('; ')}.`);
  return lines;
}

export function ComparePage({ onNavigate }: { onNavigate: (p: PageId) => void }) {
  const m = useMission();
  const result = m.result;

  if (!result || result.regions.length < 2) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-10 text-center space-y-3">
          <h1 className="font-display font-bold text-xl text-[#142B50]">Nothing to compare yet</h1>
          <p className="text-sm text-[#68788F] max-w-lg mx-auto">
            Comparison works on the Earth regions recommended for one experiment. Run a mission workflow that returns at least two regions.
          </p>
          <button type="button" onClick={() => onNavigate('explore')} className="px-5 py-2.5 rounded-lg bg-[#0B5ED7] hover:bg-[#094DB3] text-[#FFFFFF] text-xs font-semibold">
            Go to mission workflow
          </button>
        </div>
      </div>
    );
  }

  const chosen = result.regions.filter((r) => m.compareIds.includes(r.id));
  const dimIds = result.regions[0].dimensions.map((d) => d.dimension);
  const body = result.experiment.body;

  const chart = dimIds.map((id) => {
    const row: Record<string, string | number | null> = { dimension: result.regions[0].dimensions.find((d) => d.dimension === id)?.name ?? id };
    chosen.forEach((r) => {
      const d = r.dimensions.find((x) => x.dimension === id);
      row[r.id] = d?.similarity === null || d === undefined ? null : Math.round(d.similarity * 100);
    });
    return row;
  });

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div>
        <div className="text-xs font-semibold" style={{ color: BODY_ACCENT[body] }}>
          Compare · {bodyLabel(body)} · {result.experiment.name}
        </div>
        <h1 className="font-display font-extrabold text-2xl text-[#142B50]">Compare recommended regions</h1>
        <p className="text-sm text-[#68788F]">Reference site {result.target_info.name}. Pick up to three regions.</p>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Regions to compare">
        {result.regions.map((r) => {
          const on = m.compareIds.includes(r.id);
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => m.toggleCompare(r.id)}
              aria-pressed={on}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                on ? 'bg-[#EDF3FA] border-[#0B5ED7] text-[#0B5ED7]' : 'bg-[#FFFFFF] border-[#E1E8F0] text-[#142B50] hover:border-[#0B5ED7]'
              }`}
            >
              #{r.rank} {r.region_name ?? r.location_label}
            </button>
          );
        })}
      </div>

      {chosen.length < 2 ? (
        <InfoNote>Select at least two regions to compare.</InfoNote>
      ) : (
        <>
          {result.provisional && (
            <InfoNote tone="danger">
              <strong>Provisional, unverified ranking.</strong> Comparisons inherit that limitation.
            </InfoNote>
          )}
          <div className="overflow-x-auto bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl">
            <table className="w-full text-xs min-w-[640px]">
              <caption className="sr-only">Comparison of recommended Earth regions</caption>
              <thead>
                <tr className="bg-[#F4F8FF] text-left text-[#68788F]">
                  <th scope="col" className="px-4 py-3 font-semibold w-48">
                    Metric
                  </th>
                  {chosen.map((r, i) => (
                    <th key={r.id} scope="col" className="px-4 py-3 font-display font-bold text-[#142B50]">
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: SERIES_COLORS[i] }} />
                      #{r.rank} {r.location_label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6ECF3]">
                {[
                  ['Evidence-adjusted score (0-100)', (r: Region) => rankScore(r).toFixed(1)],
                  ['Raw similarity (0-100)', (r: Region) => r.best_score.toFixed(1)],
                  ['Data coverage', (r: Region) => pct(r.coverage)],
                  ['Confidence', (r: Region) => r.confidence],
                  ['Evidence status', (r: Region) => r.suitability?.status ?? 'n/a'],
                  ['Evidence tier', (r: Region) => r.evidence_tier?.label ?? 'n/a'],
                  ['Cells in region', (r: Region) => String(r.n_cells)],
                  ['Not yet assessed', (r: Region) => (r.missing_data.length ? r.missing_data.join(', ') : 'none')],
                ].map(([label, fn]) => (
                  <tr key={label as string}>
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold text-[#142B50]">
                      {label as string}
                    </th>
                    {chosen.map((r) => (
                      <td key={r.id} className="px-4 py-2.5 font-mono text-[#142B50] tabular-nums">
                        {(fn as (r: Region) => string)(r)}
                      </td>
                    ))}
                  </tr>
                ))}
                {dimIds.map((id) => (
                  <tr key={id}>
                    <th scope="row" className="px-4 py-2.5 text-left font-semibold text-[#142B50]">
                      {chosen[0].dimensions.find((d) => d.dimension === id)?.name ?? id}
                    </th>
                    {chosen.map((r) => {
                      const d = r.dimensions.find((x) => x.dimension === id);
                      return (
                        <td key={r.id} className="px-4 py-2.5 font-mono tabular-nums">
                          {d?.similarity === null || !d ? <span className="text-[#B42318]">no data</span> : <span className="text-[#142B50]">{pct(d.similarity)}</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-5">
            <h2 className="font-display font-bold text-base text-[#142B50] mb-2">Dimension similarity comparison (%)</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart}>
                  <CartesianGrid stroke="#E6ECF3" vertical={false} />
                  <XAxis dataKey="dimension" tick={{ fontSize: 11, fill: '#142B50' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#68788F' }} />
                  <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#E1E8F0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {chosen.map((r, i) => (
                    <Bar key={r.id} dataKey={r.id} name={`#${r.rank} ${r.region_name ?? r.location_label}`} fill={SERIES_COLORS[i]} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-[#68788F]">Dimensions with no data appear as gaps, not as zero.</p>
          </div>
          <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-5">
            <h2 className="font-display font-bold text-base text-[#142B50] mb-2">Multi-site radar overlay</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={chart.filter((row) => chosen.every((r) => row[r.id] !== null))} outerRadius="70%">
                  <PolarGrid stroke="#E1E8F0" />
                  <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#142B50', fontWeight: 600 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#68788F' }} />
                  {chosen.map((r, i) => (
                    <Radar key={r.id} name={`#${r.rank} ${r.region_name ?? r.location_label}`} dataKey={r.id} stroke={SERIES_COLORS[i]} fill={SERIES_COLORS[i]} fillOpacity={0.2} />
                  ))}
                  <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#E1E8F0', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-[#68788F]">Only dimensions with data for every selected region are drawn.</p>
          </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-2xl p-5 space-y-2">
            <h2 className="font-display font-bold text-base text-[#142B50]">Trade-off summary</h2>
            <ul className="list-disc pl-5 text-xs text-[#142B50] space-y-1">
              {tradeOff(chosen).map((l) => (
                <li key={l}>{l}</li>
              ))}
              <li>Mission-specific suitability: all regions are ranked for &ldquo;{result.experiment.short_name}&rdquo; using the {result.experiment.purpose.id} profile.</li>
            </ul>
            <p className="text-[11px] text-[#68788F]">{result.disclaimer}</p>
          </div>
        </>
      )}
    </div>
  );
}
