# ASTRANOVUS - current project status (2026-11-15)

This file holds the current facts. `PROJECT_HANDOFF.md` is kept unchanged as history: it describes the earlier chat-based build and is outdated.

## Data (real NASA-derived, built by `scripts/build_earth_grid.py`)
Grid: 3,435 land cells at 2.5 degrees (about 280 km), including Antarctica. MODIS vegetation/temperature and GPM: calendar year 2024 (12 monthly granules, one year). MODIS snow: 2015-2024 monthly climatology. ASTER emissivity: one July 2014 monthly file.

| Dim | Source | Status | Cells with value |
|---|---|---|---|
| D1 cold | NASA POWER annual 2 m air temperature | derived | 100% |
| D2 aridity | NASA POWER annual precipitation (cross-checked with GPM IMERG, rank correlation 0.91) | derived | 100% |
| D3 barren | MODIS MOD13C2 peak NDVI, 2024 | derived | 69% (ice-covered cells are undefined by design; the reason is stored per cell) |
| D4 terrain | NASA SRTMGL30 (~1 km) north of 60S; NSIDC-0422 Antarctic 1 km DEM south of 60S | derived, coarse | 100% |
| D5 rock composition | NASA ASTER GED v4.1 silicate contrast (July 2014 file); silica-poor = high | proxy, bare ground only | 13% |
| D6 ice | MODIS MOD10CM snow cover, 2015-2024 monthly climatology (mean over observed months; peak until 2026-11-16) | proxy: snow cover only | 100% |
| D7 light | NASA POWER seasonal insolation swing | derived proxy | 100% |
| D8 thermal swing | MODIS MOD11C3 day minus night land-surface temperature | derived | 100% |

Distinctions kept apart: snow cover (D6), perennial snow/ice flag (features file, not scored), glacier presence (not integrated), subsurface water ice (not measurable from these data), temperature-based proxies (none are used for ice any more).
Terrain: coarse global relief (D4, 1 km, whole cell) is shown separately from the 30 m SRTM check, which exists only for the top candidate regions (`data/processed/stage2.json`); regions outside SRTM coverage are marked "not verified".

## Moon/Mars reference profiles
49 evidence rows (qualitative rule support): 32 `supported` by retrieved sources (including generic NASA Moon/Mars fact-page properties, flagged as not site-specific), 4 rules retired (weight 0) with written reasons, 13 unverified.
Four evidence-backed profile changes this round: MOON_PSR D7, MOON_SP_RIDGE D5, MARS_MUDVOLC D5, MARS_AEOLIAN D5 set to 0 (`_reason` fields in `data/targets.json`; the previous file is archived under `data/processed/archive/`). No weight was changed to improve validation results.
Numbers that still need manual Moon Trek / Mars Trek retrieval: `docs/MANUAL_EVIDENCE_NEEDED.md`.

## Experiments
12 scenarios mapped onto 6 existing mission profiles. NASA support: 5 direct, 6 related, 1 indirect (MOON_POWER_THERMAL). Default results use strict gating: cells whose required check has no data are excluded and counted; they appear only in the provisional view.

## Geography
Region markers are real grid cells. Names combine a country (Natural Earth 110m boundaries) with an approximate region box; coordinates are always shown; the map draws the selected 2.5 degree cell footprint. Regions group cells within 15 degrees of their best cell. Great-circle distances handle the date line and poles.

## Planetary evidence (`docs/PLANETARY_EVIDENCE_REPORT.md`)
29 numeric, provenance-complete measurements for 8 of 9 targets in `data/planetary_measurements.csv` (observed 8, derived 14, inferred 7; 17 primary-fetched, 12 search-summary awaiting re-verification). Served at `/evidence/{target_id}` and shown in the UI. They ground and limit the rules; they do not enter the score as numbers.

## Ranking
Results are ranked by an evidence-adjusted score (`coverage * score + (1 - coverage) * 50`) because the raw score favoured cells with missing data (score-vs-coverage Spearman down to -0.74 for polar targets). Raw similarity is still returned and shown (`ranking_basis` in the API).

## Validation (`docs/SCIENTIFIC_VALIDATION_REPORT.md`, `docs/VALIDATION.md`)
All 14 site-target pairs (10 sites): median percentile 0.788 (95% site-cluster interval 0.56-0.86), AUC 0.84 vs all and 0.72 vs hard controls. Held-out v1: 0.811 (0.44-0.95). Prospective v2 (2 sites, disclosed, too small): 0.755. Complete-data sites 0.861 vs incomplete 0.559. Lunar lava-tube/mare targets are near chance. Drop-one ablation: D8 and D3 carry the result; removing D4 would raise the median to 0.89 (flagged, weight not changed to fit validation). No weights changed this round.

## Experiment validation (`docs/EXPERIMENT_VALIDATION.md`)
12 experiments x 25 compatible targets run through the real API: 0 invariant violations (strict gates, ordering, coverage, no snow-dominated cells for dry-ground tests).

## Tests
Backend pytest suite (engine, API, real-data provenance, evidence/measurement schema), frontend vitest, TypeScript check, production build; see the final run in the session report. Browser review of the evidence panel and adjusted scores.

## Final scientific phase (2026-11-16; `docs/SCIENTIFIC_VALIDATION_REPORT_V3.md`, `docs/ANALOG_DATASET_V3.md`)
- Planetary evidence: 35 rows, 30 primary-fetched, 5 unverified (was 29 / 17 / 12); five corrections where pages differed from earlier summaries; an evidence-quality grade per row.
- Validation: dataset v3 with 18 sites (11 historical, 4 eligible new, 3 exploratory new), 17 rejected candidates with reasons, 25 controls (19 hard) with written rationale; cohorts A historical / B development / C frozen independent (hash-locked, scored once). Primary pairs: A+B 14-15 pairs from 10-11 sites (median 0.82, AUC vs hard controls 0.83 with the adopted rule); frozen C: 3 sites, median 0.80, unreliable (Gobustan mud volcano 0.33).
- Model/API: exposed-surface requirement for ground-defined targets (the Antarctic ice sheet no longer dominates mud-volcano results), per-region suitability status, evidence tier, ranking-stability note. Weights unchanged.
- Findings: D3, D8, D2 carry the score; D1/D6/D7 are redundant (rho 0.93-0.97); D4 has a scale mismatch; single-cell #1 regions are unstable (65% under weight noise, 33% under 20% missing data); lava-tube, mare, mud-volcano, Jezero, chloride and dune targets are climate/terrain similarity only.
- Tests: 58 backend, 6 frontend, tsc, build.

## Phase-complete status (2026-11-16, after the remaining-phase work)
- Baselines (9.4): a generic dry-and-barren score matches the full model on the benchmark (development median 0.857 vs 0.817; frozen 0.809 vs 0.798): no demonstrated advantage of the target-specific rules. Reported in `docs/SCIENTIFIC_VALIDATION_REPORT.md`.
- Failure cases documented in `docs/FAILURE_CASE_ANALYSIS.md` (geology invisible to the model, coarse grid, rules written for the planetary environment, weak sources).
- Integrity audit (`scripts/integrity_audit.py`, `data/integrity_audit.json`): ranges, fill values, orientation, dimension direction, dates, proxy labels and missing reasons all pass. One real defect fixed: D5 missing-reason text called vegetated, seasonally snowy cells "snow/ice-covered" (`scripts/relabel_missing_reasons.py`; data values unchanged; builder updated). One stale backend description fixed (D6 fallback text said POWER temperature proxy). Frontend Methodology page rewritten to match the engine (adjusted score, exposed-surface rule, current limitations, v3 evaluation, baselines).
- D6 review done (`docs/D6_SNOW_METRIC_REVIEW.md`): peak -> mean snow cover over observed months; previous grid and results archived in `data/processed/archive/pre_d6_mean/`; frozen-cohort metrics unchanged (no frozen pair uses D6).
- Open decisions that need the project owner: (1) D4 scale-appropriate metric; (2) whether to keep the target-specific rules given the baseline result (a generic dry-and-barren score matches or beats the full model); (3) whether to add lithology / evaporite / dune layers (new data).
- Non-portal open work: read the search-summary sources behind the new analog sites (Sauro 2020, PANGAEA, Wang 2016, White Sands, BASALT, Jingpo/Jeju review); find more independent sites per target; confirm the Space Apps deadline.

## Blocked / needs input
- Multi-year climate: NDVI (~100 MB/month) and land-surface temperature (~70 MB/month) are 2024 only; each extra year is about 2 GB. Not downloaded (the brief says to ask before large downloads).
- Lithology (GLiM) is not NASA data and needs GDAL for its geodatabase: not integrated.
- Glacier outlines (RGI, NSIDC-0770) and permafrost maps would separate glaciers and permafrost from snow cover: not integrated.
- Real Moon Trek / Mars Trek values: `docs/MANUAL_EVIDENCE_NEEDED.md`.
- Official Space Apps deadline: could not be verified from this environment.
