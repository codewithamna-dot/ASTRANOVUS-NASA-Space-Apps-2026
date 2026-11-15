import { ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchValidation, fetchValidationV3 } from '../api/client';
import type { ValidationResponse, ValidationV3 } from '../types/astranovus';
import { InfoNote, StatusChip } from '../components/StatusViews';
import { useMission } from '../state/MissionContext';
import { DOC_LEVEL_LABEL, dimLabel } from '../utils/mission';

export function MethodologyPage() {
  const m = useMission();
  const [val, setVal] = useState<ValidationResponse | null>(null);
  const [v3, setV3] = useState<ValidationV3 | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    fetchValidation(ac.signal).then(setVal).catch(() => undefined);
    fetchValidationV3(ac.signal).then(setV3).catch(() => undefined);
    return () => ac.abort();
  }, []);
  const sources = new Map<string, { label: string; url: string }>();
  m.experiments.forEach((e) => e.nasa_documented.sources.forEach((s) => sources.set(s.id, s)));

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      <h1 className="font-display font-extrabold text-2xl text-[#142B50]">Methodology &amp; honesty statement</h1>
      <InfoNote>{m.dataStatus?.disclaimer ?? 'ASTRANOVUS scores are team-generated estimates, not official NASA ratings.'}</InfoNote>
      <InfoNote tone="warn">
        ASTRANOVUS is an <strong>Earth analog screening and research-support tool</strong>. It is not a NASA-certified landing-site or field-site evaluation system. Results are
        2.5° regions to investigate, not verified test sites.
      </InfoNote>

      <section className="glass-panel rounded-2xl p-6 space-y-3 text-sm text-[#142B50] leading-relaxed">
        <h2 className="font-display font-bold text-lg">How a recommendation is made</h2>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Each Earth land cell has up to eight dimensions, stored as percentile ranks (0-1) among the loaded cells. Empty means no data, never zero.</li>
          <li>A planetary reference site is a set of rules per dimension: <em>high</em> (more is better), <em>low</em> (less is better) or <em>band</em> (best inside a range), each with a weight 0-3.</li>
          <li>The experiment you choose maps to a mission profile that multiplies those weights and adds hard gates (must-haves). Cells failing a gate are dropped.</li>
          <li>Targets defined by exposed ground (all except the lunar permanently shadowed floor) also require a verified surface-exposure value: cells covered by snow, ice or water are excluded and counted, because an ice sheet is not exposed regolith.</li>
          <li>Raw similarity = 100 × Σ(weight × similarity) / Σ(weight) over dimensions that have data. Coverage = share of weight that had data. <strong>Ranking uses the evidence-adjusted score = coverage × raw + (1 − coverage) × 50</strong> (missing evidence counts as chance level); the raw score is always shown beside it.</li>
          <li>Peak-seeded regions (up to 15° around the best cells among the top 60% of passing cells) are ranked by adjusted score. Confidence is high when coverage ≥ 85% and the region has ≥ 3 cells, medium when coverage ≥ 60%, otherwise low.</li>
          <li>Data-unavailable rule (ASTRANOVUS UI layer): if a gate dimension has no data at all, or under 50% of the weighted criteria have data, no ranking is shown by default. An experiment is labelled partial (never ready) whenever a used dimension is missing, a proxy, or defined in under half of all cells. A clearly labelled provisional view can be requested.</li>
        </ol>
        <p className="text-xs text-[#68788F]">All scoring runs in the Python engine (model/scoring_core.py, model/recommend.py). The web app only displays its output.</p>
      </section>

      <section className="glass-panel rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-lg text-[#142B50]">Earth data status (live from the backend)</h2>
        {m.dataStatus && (
          <p className="text-xs text-[#68788F]">
            Grid file {m.dataStatus.grid.file}: {m.dataStatus.grid.cells} cells{m.dataStatus.grid.step_deg ? ` at ${m.dataStatus.grid.step_deg}° spacing` : ''}, latitude {m.dataStatus.grid.lat_range[0]}° to {m.dataStatus.grid.lat_range[1]}°. {m.dataStatus.values_are}.
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-left text-[#68788F]">
                <th className="py-2 pr-3">Dimension</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Time span</th>
                <th className="py-2 pr-3">Cells with value</th>
                <th className="py-2">Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6ECF3] align-top">
              {m.dataStatus?.dimensions.map((d) => (
                <tr key={d.id}>
                  <td className="py-2 pr-3 font-semibold text-[#142B50]">{dimLabel(d.id)}</td>
                  <td className="py-2 pr-3">
                    <StatusChip status={d.status} />
                  </td>
                  <td className="py-2 pr-3 text-[#68788F]">{d.temporal || '-'}</td>
                  <td className="py-2 pr-3 font-mono tabular-nums">{Math.round(d.cell_coverage * 100)}%</td>
                  <td className="py-2 text-[#68788F]">{d.provenance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-lg text-[#142B50]">Data build and cross-checks</h2>
        {m.dataStatus?.build ? (
          <>
            <p className="text-xs text-[#68788F]">
              Built {m.dataStatus.build.built_utc} from {Object.entries(m.dataStatus.build.products).map(([k, v]) => `${k} ${v}`).join(', ')}. MODIS/GPM months:{' '}
              {m.dataStatus.build.temporal_coverage.MODIS_GPM_months.join(', ')}. {m.dataStatus.build.temporal_coverage.note}
            </p>
            <ul className="text-xs text-[#142B50] space-y-1 list-disc pl-5">
              {Object.entries(m.dataStatus.build.cross_checks).map(([k, v]) => (
                <li key={k}>
                  {k}: Spearman rank correlation <span className="font-mono">{v.spearman}</span> (n={v.n})
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-[#68788F]">A negative correlation means the two independent sources disagree on what that dimension measures; this is why D8 now uses MODIS surface temperatures instead of the earlier POWER air-temperature range.</p>
          </>
        ) : (
          <p className="text-xs text-[#68788F]">No build metadata available.</p>
        )}
      </section>

      <section className="glass-panel rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-lg text-[#142B50]">Validation against known Earth analogs</h2>
        {!val?.available ? (
          <p className="text-xs text-[#68788F]">{val?.note ?? 'Validation results are not available.'}</p>
        ) : (
          <>
            <p className="text-xs text-[#68788F]">
              Earlier (v1/v2) evaluation, kept for history: real grid built {val.grid_built_utc}. Sites NASA publishes as analog sites, evaluated at their nearest 2.5° cell with generic target weights. The v3 evaluation above supersedes it.
            </p>
            {val.heldout && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                {[
                  ['Held-out sites / pairs', `${val.heldout.n_sites} / ${val.heldout.n_pairs}`],
                  ['Median percentile', `${val.heldout.median_percentile}${val.heldout.median_ci95 ? ` (95% CI ${val.heldout.median_ci95[0]}–${val.heldout.median_ci95[1]})` : ''}`],
                  ['Top-25% hits', val.heldout.top25_hit_rate],
                  ['AUC vs all controls', val.heldout.auc_vs_all_controls ?? 'n/a'],
                  ['AUC vs hard controls', val.heldout.auc_vs_hard_controls ?? 'n/a'],
                  ['Hard controls median', val.heldout.hard_controls_median_percentile ?? 'n/a'],
                ].map(([k, v]) => (
                  <div key={String(k)} className="bg-[#F4F8FF] border border-[#E1E8F0] rounded-lg px-3 py-2">
                    <div className="text-[10px] text-[#68788F]">{k}</div>
                    <div className="font-mono font-semibold text-[#142B50]">{v}</div>
                  </div>
                ))}
              </div>
            )}
            {val.diagnostics && val.diagnostics.length > 0 && (
              <div className="text-xs text-[#142B50] space-y-1">
                <div className="font-semibold">Weakly ranked analogs (diagnosed, not tuned away):</div>
                <ul className="list-disc pl-5 text-[#68788F]">
                  {val.diagnostics.map((d) => (
                    <li key={d.site + d.target}>
                      {d.site} → {d.target}: percentile {d.percentile}, coverage {d.coverage}
                      {Object.keys(d.missing).length > 0 && `; missing ${Object.keys(d.missing).join(', ')}`}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-[11px] text-[#A15C00]">
              Small sample with wide intervals; controls include hard negatives (cold forests, dry vegetated land). Ice and composition are proxies and rock composition exists only for bare ground. Indicative, not proof.
            </p>
          </>
        )}
      </section>

      <section className="glass-panel rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-lg text-[#142B50]">Independent evaluation, baselines and sensitivity (v3)</h2>
        {!v3?.available ? (
          <p className="text-xs text-[#68788F]">{v3?.note ?? 'The v3 evaluation summary is not available.'}</p>
        ) : (
          <>
            <p className="text-xs text-[#68788F]">
              Benchmark: {v3.dataset.positive_sites} analog sites ({v3.dataset.eligible_sites} eligible, {v3.dataset.exploratory_sites} exploratory), {v3.dataset.controls} controls (
              {v3.dataset.hard_controls} hard), {v3.dataset.rejected_candidates} candidates rejected with reasons. Cohorts: historical {v3.dataset.cohorts.A_historical}, development{' '}
              {v3.dataset.cohorts.B_development}, frozen independent {v3.dataset.cohorts.C_frozen_independent}. Intervals resample sites, not cells; metrics with fewer than 5 sites are marked unreliable.
              Code version {v3.provenance.git_commit.slice(0, 8)}. Percentile = rank of the analog's nearest cell among all scored cells for its target (0.5 = chance).
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[720px]">
                <thead>
                  <tr className="text-left text-[#68788F]">
                    <th className="py-2 pr-3">Variant</th>
                    <th className="py-2 pr-3">Development: median (95% CI), n sites</th>
                    <th className="py-2 pr-3">Top-25% hit</th>
                    <th className="py-2 pr-3">AUC vs hard controls</th>
                    <th className="py-2">Frozen cohort: median (n sites)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E6ECF3] align-top">
                  {v3.variants.map((x) => (
                    <tr key={x.id} className={x.id === v3.adopted_variant ? 'bg-[#F4F8FF]' : ''}>
                      <td className="py-2 pr-3 font-semibold text-[#142B50]">{x.label}</td>
                      <td className="py-2 pr-3 font-mono">
                        {x['dev_A+B'].median_percentile}
                        {x['dev_A+B'].median_ci95_site_cluster ? ` (${x['dev_A+B'].median_ci95_site_cluster[0]}-${x['dev_A+B'].median_ci95_site_cluster[1]})` : ''}, {x['dev_A+B'].n_sites}
                      </td>
                      <td className="py-2 pr-3 font-mono">{x['dev_A+B'].top25_hit}</td>
                      <td className="py-2 pr-3 font-mono">{x['dev_A+B'].auc_vs_hard_controls_by_target ?? 'n/a'}</td>
                      <td className="py-2 font-mono">
                        {x.frozen_C.median_percentile} ({x.frozen_C.n_sites}, unreliable)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="text-xs text-[#142B50] space-y-1">
              <div className="font-semibold">Leave-one-dimension-out (development cohorts): median percentile</div>
              <p className="text-[#68788F]">{v3.ablations.map((a) => `${a.label} ${a['dev_A+B'].median_percentile}`).join(' · ')}</p>
            </div>
            <div className="text-xs text-[#142B50] space-y-1">
              <div className="font-semibold">Frozen independent pairs (scored once, never used to tune)</div>
              <p className="text-[#68788F]">
                {v3.frozen_pairs.map((p) => `${p.site_id} → ${p.target}: ${p.percentile}${p.exploratory ? ' (exploratory)' : ''}`).join(' · ')}
              </p>
            </div>
            <div className="text-xs text-[#142B50] space-y-1">
              <div className="font-semibold">Ranking stability over {v3.experiment_matrix.pairs} experiment-target pairs</div>
              <p className="text-[#68788F]">
                #1 region stays within 5° in {Math.round((v3.ranking_stability.weights?.top1_stays_within_5deg ?? 0) * 100)}% of weight perturbations and in{' '}
                {Math.round((v3.ranking_stability.missing_20pct?.top1_stays_within_5deg ?? 0) * 100)}% of runs with 20% missing data. Experiment checks: {v3.experiment_matrix.pass} pass,{' '}
                {v3.experiment_matrix.pass_with_warnings} pass with warnings, {v3.experiment_matrix.fail} fail (code-level invariants only, not scientific validation).
              </p>
            </div>
            <ul className="list-disc pl-5 text-[11px] text-[#A15C00] space-y-0.5">
              {v3.statements.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="glass-panel rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-lg text-[#142B50]">Experiments and mission profiles</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[640px]">
            <thead>
              <tr className="text-left text-[#68788F]">
                <th className="py-2 pr-3">Experiment</th>
                <th className="py-2 pr-3">Profile</th>
                <th className="py-2 pr-3">Weight multipliers</th>
                <th className="py-2 pr-3">Gates</th>
                <th className="py-2">NASA basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6ECF3] align-top">
              {m.experiments.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 pr-3 font-semibold text-[#142B50]">{e.name}</td>
                  <td className="py-2 pr-3 font-mono">{e.purpose.id}</td>
                  <td className="py-2 pr-3 font-mono">{Object.entries(e.purpose.multipliers).map(([k, v]) => `${dimLabel(k)}×${v}`).join(', ') || '-'}</td>
                  <td className="py-2 pr-3">{e.purpose.gates.map((g) => `${dimLabel(g.dim)} ${g.op} ${g.value}`).join('; ') || 'none'}</td>
                  <td className="py-2 text-[#68788F]">{DOC_LEVEL_LABEL[e.nasa_documented.level]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {m.experimentsMeta && (
          <ul className="text-[11px] text-[#68788F] space-y-0.5">
            {Object.entries(m.experimentsMeta.classification).map(([k, v]) => (
              <li key={k}>
                <strong>{k}:</strong> {v}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-panel rounded-2xl p-6 space-y-3">
        <h2 className="font-display font-bold text-lg text-[#142B50]">NASA sources (checked {m.experimentsMeta?.sources_verified_on ?? ''})</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {[...sources.values()].map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-[#FFFFFF] border border-[#E1E8F0] hover:border-[#0B5ED7] text-[#142B50] font-medium">
                <span>{s.label}</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#0B5ED7] shrink-0" />
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl p-6 space-y-2 bg-[#FFF4E5] border border-[#A15C00]/30 text-[#6B3F00] text-xs leading-relaxed">
        <h2 className="font-display font-bold text-base">Known limitations (current state)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Composition (D5) is an ASTER silicate-contrast proxy defined for bare ground in about 13% of cells; it is not mineralogy or lithology. Terrain (D4) is 1 km landscape relief across a 2.5° cell, a scale-mismatched proxy for metre-scale slope. MODIS temperature, vegetation and rainfall layers cover calendar 2024; the snow layer (D6) is the mean of a 2015-2024 monthly snow-cover climatology (not glaciers, permafrost or subsurface ice); it is highly correlated with cold (D1), so ice targets behave largely as cold-and-dry targets.</li>
          <li>Moon and Mars reference-site rules are team-written from NASA pages and papers, only qualitatively grounded; planetary measurements are shown for context and are not scored. Geology that defines several targets (lava tubes, mare basalt, mud volcanoes, delta sediments, evaporites, dunes) is not measured, so those results are climate/terrain similarity only.</li>
          <li>Validation uses 18 documented analog sites (15 eligible) at 2.5° resolution; the frozen independent cohort has only 3 sites. A simple dry-and-barren baseline performs as well as the full model on this benchmark, so no advantage of the target-specific rules is demonstrated. Single-cell rankings are unstable.</li>
          <li>Region place-names are approximate labels; the engine scores grid cells.</li>
          <li>Earth cannot reproduce lunar or Martian gravity, atmosphere, radiation or dust behaviour.</li>
        </ul>
      </section>
    </div>
  );
}
