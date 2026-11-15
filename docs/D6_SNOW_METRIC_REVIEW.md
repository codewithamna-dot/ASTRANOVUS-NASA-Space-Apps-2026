# D6 snow-cover metric review (2026-11-16)

Data: existing verified MODIS MOD10CM 2015-2024 monthly snow cover (no new downloads). Numbers: `data/d6_metric_comparison.json` (`scripts/d6_metric_comparison.py`). Change applied by `scripts/rebuild_d6.py`; previous grid and every dependent result archived in `data/processed/archive/pre_d6_mean/`.

## Candidates and criteria (fixed before looking at benchmark scores; the benchmark and the frozen cohort were not used to choose)
| Metric | Distinct values | Cells tied at maximum | Robustness to unobserved polar-night months (Spearman of 0/100-filled bounds) | Physical ordering violations (7 reference places) | Exposed-ground cells at zero |
|---|---|---|---|---|---|
| Peak monthly snow (previous) | 766 | 37.6% | 0.972 | 1 | 24% |
| **Mean over observed months (adopted)** | **1,317** | 28.1% (permanent snow only) | **0.988** | 1 | 24% |
| Persistence (share of months >= 50%) | 23 | 31.4% | 0.986 | 1 | 56% |
| Minimum monthly (perennial cover) | 364 | 28.1% | 0.787 | 2 | 32% |

- **Peak** gave the Antarctic plateau, Greenland interior and the Canadian polar desert the identical percentile (0.81): seasonal and permanent snow were indistinguishable.
- **Mean** orders reference places physically (Antarctic 0.86 > Greenland 0.71 > Canadian polar desert 0.68 > Siberian taiga 0.56 > Tibet 0.37 / Alps 0.41 > Sahara 0.08) and has no tie at the maximum among exposed ground.
- **Persistence** is too coarse (23 values). **Minimum** is the perennial-ice idea, but it is the least robust to missing months and is nearly uninformative for the exposed-ground cells that ground-defined ice targets can use after the exposed-surface rule.
- Decision: **mean snow cover over observed months**: highest resolution, robust to the missing months, physically ordered. It is still a snow proxy, not glacier, permafrost or ground ice.

## Effect
- Recommendations change where D6 is used: MOON_PSR top-5 Jaccard 0.67, MOON_SP_RIDGE 0.43 (via the D6 gate in the water-ice profile), MARS_ICE 0.43. Top regions remain polar/high-latitude exposed ground; the Canadian Arctic stays #1 for Mars ice.
- Validation: adopted-model development metrics identical (median 0.817, AUC vs hard 0.83); raw-score median 0.816 -> 0.782 (one pair, Devon Island). **Frozen-cohort metrics identical for all 21 variants** (no frozen pair uses D6), so the cohort stayed untouched. Ranking stability: #1 within 5 degrees 65% (weights) and 33% (20% missing; was 36%).
- Redundancy did not improve: D6 vs D1 cold rho 0.94 -> 0.97. D6 adds little independent information; the ice targets behave largely as cold-and-dry targets.

## Limitations of this comparison
Only two development pairs depend on D6 and the frozen cohort has none, so benchmark validation of D6 is essentially absent; the choice rests on saturation, robustness and physical ordering. The 7 reference places and the ordering criteria are author judgements. Unobserved polar-night months are excluded from the mean (bounded, not filled). Gate semantics: the water-ice gate `D6 >= 0.5` is a percentile threshold, so the set of cells that pass changed with the metric.
