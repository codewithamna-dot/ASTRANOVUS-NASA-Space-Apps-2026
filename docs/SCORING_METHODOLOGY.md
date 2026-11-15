# Scoring methodology (final, 2026-11-16)

Generated tables come from `data/targets.json`, `data/purposes.json` and `data/target_readiness.json` by `scripts/build_docs_v3.py`. Code: `model/scoring_core.py`, `model/recommend.py`, `backend/mission_api.py`.

## 1. Earth side
Each of 3,435 land cells (2.5 degree grid, `data/processed/earth_grid.csv`) holds eight dimensions stored as **percentile ranks** (0-1) among valid cells; an empty value means no data (never zero) and carries a stored reason. D1 cold (NASA POWER 2 m air temperature, derived), D2 aridity (POWER precipitation, cross-checked with GPM, derived), D3 barren ground (MODIS peak NDVI 2024, derived), D4 terrain (SRTMGL30 / NSIDC-0422 1 km relief, derived; treated as a scale-mismatched proxy), D5 composition (ASTER GED silicate contrast, proxy, bare ground only, about 13% of cells), D6 snow (MODIS MOD10CM 2015-2024 mean snow cover over observed months, proxy; not glaciers, permafrost or subsurface ice; peak snow cover until 2026-11-16, see `docs/D6_SNOW_METRIC_REVIEW.md`), D7 light (POWER seasonal insolation swing, derived; analogy to lunar illumination is by proxy), D8 thermal swing (MODIS LST day minus night 2024, derived).

## 2. Rules and similarity
A planetary reference site (target) has, per dimension, a rule and a weight 0-3: `high` similarity = p, `low` similarity = 1 - p, `band[lo,hi]` similarity = clip(1 - distance_to_band / 0.5, 0, 1). Weight 0 means retired.

| target | D1_cold | D2_aridity | D3_barren | D4_terrain | D5_rock | D6_ice | D7_polar_light | D8_thermal_swing | screening scope | needs exposed surface |
|---|---|---|---|---|---|---|---|---|---|---|
| MOON_SP_RIDGE | high w2 | high w3 | high w3 | high w2 | retired (0) | - | high w3 | high w1 | partial_environmental_assessment | yes |
| MOON_PSR | high w3 | high w2 | high w3 | low w2 | - | high w3 | retired (0) | - | partial_environmental_assessment | no |
| MOON_LAVATUBE | - | high w2 | high w3 | band[0.3-0.7] w2 | high w3 | - | - | high w2 | climate_terrain_similarity_only | yes |
| MARS_ICE | high w3 | high w2 | high w2 | low w2 | - | high w3 | - | high w1 | partial_environmental_assessment | yes |
| MARS_JEZERO | band[0.5-0.9] w1 | high w3 | high w3 | band[0.3-0.7] w2 | high w2 | - | - | high w2 | climate_terrain_similarity_only | yes |
| MARS_MUDVOLC | high w2 | high w2 | high w2 | low w3 | retired (0) | - | - | - | climate_terrain_similarity_only | yes |
| MARS_CHLORIDE | - | high w3 | high w3 | low w2 | - | - | - | high w2 | climate_terrain_similarity_only | yes |
| MARS_AEOLIAN | - | high w3 | high w3 | low w2 | retired (0) | - | - | high w2 | climate_terrain_similarity_only | yes |
| MOON_MARE | - | high w2 | high w3 | low w3 | high w2 | - | - | high w2 | climate_terrain_similarity_only | yes |

## 3. Mission profile (experiment -> purpose)
The chosen experiment maps to a purpose that multiplies target weights (`weight' = weight x multiplier`) and adds hard gates (cell percentile must satisfy the comparison). Optional per-experiment overrides are flagged as drafts.

| purpose | weight multipliers | gates | targets |
|---|---|---|---|
| ISRU_WATER | D6_icex2.0, D1_coldx1.5, D4_terrainx0.7 | D6_ice >= 0.5 | MOON_PSR, MOON_SP_RIDGE, MARS_ICE |
| POWER_THERMAL | D8_thermal_swingx2.0, D7_polar_lightx1.5, D1_coldx1.2 | D2_aridity >= 0.4 | MOON_SP_RIDGE, MOON_MARE, MARS_JEZERO, MARS_CHLORIDE |
| MOBILITY | D4_terrainx2.0, D3_barrenx1.5, D5_rockx1.3 | D3_barren >= 0.4 | MOON_MARE, MOON_SP_RIDGE, MARS_JEZERO, MARS_MUDVOLC, MARS_AEOLIAN |
| HABITAT | D5_rockx2.0, D3_barrenx1.3, D8_thermal_swingx1.3 | none | MOON_LAVATUBE, MOON_MARE, MARS_JEZERO, MARS_CHLORIDE |
| SCIENCE | D5_rockx2.0, D2_aridityx1.3, D3_barrenx1.3 | D2_aridity >= 0.4 | MARS_JEZERO, MARS_CHLORIDE, MARS_MUDVOLC, MOON_MARE |
| CREW_OPS | D1_coldx1.3, D3_barrenx1.3, D2_aridityx1.2 | none | MOON_SP_RIDGE, MOON_PSR, MARS_ICE, MARS_JEZERO |

## 4. Score formulas
- Raw similarity S = 100 x sum(w_i x s_i) / sum(w_i) over dimensions with data.
- Coverage C = sum(w_i with data) / sum(all w_i).
- **Evidence-adjusted score S_adj = C x S + (1 - C) x 50** (missing evidence counts as chance). Regions are ranked by S_adj; S is always shown beside it. Cells with C below the minimum coverage (default 0.4) are dropped.
- Strict gating: a cell whose gate dimension (or, for targets defined by exposed ground, D3) has no data cannot be a verified match. It is excluded and counted in `n_cells_excluded_unverified`, and appears only in the explicitly provisional view.
- Regions: among the top 60% of passing cells by S_adj, peak-seeded regions of up to 15 degrees radius; the marker is the best cell.
- Confidence: high when C >= 85% and the region has >= 3 cells, medium when C >= 60%, otherwise low.
- Data state: unavailable if a gate dimension has no data or under 50% of weighted criteria have data; partial if any used dimension is missing, a proxy or defined in under half of cells; otherwise ready.
- Custom weights (UI tuner): factors 0-3 multiply the profile weights.

## 5. Suitability labels (no new score)
Per region: **Supported by available evidence** / **Partial environmental match** / **Geological suitability unverified** / **Insufficient data**. Geology-defined targets can never be labelled Supported; coverage below 0.5 is Insufficient; any proxy, incomplete coverage or non-full screening scope is Partial. Category values (climate, terrain, exposed surface, composition proxy, snow proxy) are weighted means of the existing dimension similarities. Evidence tier: global screening candidate, or locally supported region when a 30 m SRTM check exists for the best cell. A precomputed stability note accompanies the #1 region.

## 6. Scientific assumptions (explicit)
1. Percentile rank compares an Earth cell with other Earth cells, not with lunar or Martian values; planetary measurements ground the rules but never enter the score.
2. Similarity of climate, surface cover and relief is a screening signal for analog regions, not proof of geological equivalence.
3. Missing data are never filled; they lower evidence-adjusted scores and confidence.
4. The weights are team judgements. The v3 evaluation shows equal weights perform as well, and a simple dry-and-barren baseline matches the full model on the benchmark.
5. Only calendar 2024 is used for LST, NDVI and GPM; snow uses 2015-2024; terrain is static.

## 7. Changes from previous versions
| Date | Change | Basis |
|---|---|---|
| earlier | POWER-only prototype (5 degree grid, D6 temperature proxy, D8 air-temperature range) | initial handoff |
| 2026-11-14/15 | Real MODIS/GPM/SRTM/ASTER data, 2.5 degree grid, D6 = MODIS snow, D8 = MODIS LST, D5 = ASTER | data integration |
| 2026-11-15 | Four rules retired (weight 0): MOON_PSR D7, MOON_SP_RIDGE D5, MARS_MUDVOLC D5, MARS_AEOLIAN D5; strict gating; sparse-dimension rule; top-60% regions; peak-seeded 15 degree regions | evidence review and QA |
| 2026-11-15 | Evidence-adjusted ranking | coverage bias (score vs coverage rho down to -0.74) |
| 2026-11-16 | Exposed-surface requirement for ground-defined targets; readiness labels; evidence tier; D4 labelled scale-mismatched proxy; D5 missing-reason text corrected (data unchanged) | mud-volcano diagnosis; integrity audit |
| 2026-11-16 | **D6 changed from peak to mean monthly snow cover** (same MODIS data; previous grid archived) | saturation of the peak metric; `docs/D6_SNOW_METRIC_REVIEW.md` |
| not changed | All weights, band limits and gate values | no independent evidence to justify a change; changes forbidden on validation scores alone |

## 8. Known unresolved scoring issues (decision needed)
- D6 (resolved 2026-11-16): the peak metric saturated; it is now the mean over observed months. D6 remains a snow-extent proxy that is highly correlated with D1 cold (rho 0.97), so the ice targets are effectively cold-and-dry targets.
- D4: replace relief with a scale-appropriate metric (for example flat-area fraction of 1 km pixels) when added.
- D1, D6, D7 are highly correlated (rho 0.96-0.97): the polar signal is counted three times in cold targets.
- A generic dry-and-barren baseline matches or beats the full model on the benchmark (`docs/SCIENTIFIC_VALIDATION_REPORT.md` section 4): the target-specific rules and weights are not shown to add skill.
