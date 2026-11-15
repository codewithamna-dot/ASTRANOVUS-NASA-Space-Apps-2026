# Scientific validation report

Numbers below are produced by `scripts/validate_known_analogs.py` (`data/validation_summary.json`, `docs/VALIDATION.md`), `scripts/sensitivity_analysis.py` (`data/sensitivity_summary.json`) and `scripts/experiment_validation.py` (`docs/EXPERIMENT_VALIDATION.md`). Re-run them to reproduce.

## 1. Design

- **Positives:** 11 published/documented terrestrial analog sites (citations in `data/known_analogs.json`) mapped to targets, 14 site-target pairs (10 sites in the 2.5 degree grid).
- **Controls:** 15 negative sites. *Easy* controls differ a lot from the target; *hard* controls look superficially similar (cold forest vs. cold desert, dry vegetated land). Hard controls are scoped to the targets they are meant to be negatives for.
- **Metric:** percentile of the site's score among all scored cells for that target; top-10/25/50% hit rates; AUC vs controls.
- **Uncertainty:** 95% bootstrap interval where the resampling unit is the **site** (cluster bootstrap), because pairs from one site are not independent. Intervals are omitted when fewer than 3 sites exist.
- **Leakage disclosure:** the v1 held-out half was chosen by a hash of the site id but those sites were visible in earlier diagnostics, so they are not pristine. Cohort v2 (2 sites / 3 pairs) was added afterwards, scored first by this run, and never used for any rule change. It is far too small for a confirmatory claim.
- **No weights were changed in this round, and none were changed to improve these scores.**

## 2. Results (raw similarity)

| Set | Pairs / sites | Median percentile | 95% CI (site bootstrap) | Top-25% | Top-10% | AUC vs all / hard controls |
|---|---|---|---|---|---|---|
| Held-out v1 | 6 / 4 | 0.811 | 0.44-0.95 | 0.67 | 0.33 | 0.87 / 0.78 |
| Prospective v2 | 3 / 2 | 0.755 | n/a (too few sites) | 0.67 | 0.00 | 0.80 / 0.64 |
| Tuning half | 5 / 4 | 0.816 | 0.47-0.85 | 0.60 | 0.20 | 0.86 / 0.74 |
| **All positives** | **14 / 10** | **0.788** | **0.56-0.86** | **0.64** | **0.21** | **0.84 / 0.72** |

Comparison with the previous round (`PROJECT_STATUS` before this work): held-out median 0.811 is unchanged; its interval widened from 0.55-0.97 to 0.44-0.95 because the site (not pair) is now the resampling unit, and hard-control AUC fell from 0.787 to 0.775 because hard controls are now properly scoped. The earlier interval was too optimistic.

## 3. Where it works and where it does not

- **By data completeness:** sites whose best cell has coverage >= 0.9 (7 pairs, 4 sites): median 0.861, AUC vs hard controls 0.93. Sites with coverage < 0.9 (7 pairs, 6 sites): median 0.559, AUC vs hard controls 0.58, top-10% hit rate 0. Evidence is only as good as the data behind a cell; the UI shows coverage and confidence for this reason.
- **By target:** Mars targets (chloride 0.90, Jezero 0.86, ice 0.74) discriminate better than lunar ones. MOON_LAVATUBE (Lava Beds 0.56, Iceland 0.44) and MOON_MARE perform near chance: a lava-tube analog is defined by subsurface structure that a 1 km DEM and climate/vegetation layers cannot see.
- **Pakistani hypotheses** (Karakoram/Baltoro, Hingol, Khewra, Katpana desert) are listed as *hypotheses* with a literature note; they are not counted as validated positives because no peer-reviewed analog designation was verified.

## 4. Sensitivity and ablation

Drop-one median percentile (baseline 0.788):

| Removed | Median | | Removed | Median |
|---|---|---|---|---|
| D1 cold | 0.799 | | D5 composition proxy | 0.785 |
| D2 aridity | 0.843 | | D6 snow proxy | 0.777 |
| D3 barren | 0.705 | | D7 light proxy | 0.788 |
| **D4 terrain** | **0.891** | | **D8 thermal swing** | **0.598** |
| All proxies (D5, D6, D7) | 0.776 | | Equal weights | 0.790 |

Findings, stated as findings and not acted on:
1. **D8 thermal swing and D3 barren carry the result**; removing D8 drops the median from 0.79 to 0.60.
2. **D4 terrain looks harmful**: removing it raises the median to 0.89. Because that would be tuning on the validation set with a tiny sample, the weight was left unchanged and flagged for review with an independent site set and higher-resolution terrain.
3. The three proxy dimensions together change the median by only ~0.01; the result does not depend on them, which is reassuring but also means they add little validated signal.
4. Equal weights perform as well as tuned weights (0.790 vs 0.788): the hand-set weights are not demonstrably better than flat ones.
5. Under 300 log-normal weight perturbations (sigma 0.3) the cell ranking is stable (rank correlation 0.96-0.99) while the validation median ranges 0.68-0.83 and AUC vs hard controls 0.66-0.82.

## 5. Coverage bias and the evidence-adjusted score

Raw scores are `100 * sum(w*s) / sum(w with data)`, which rewards cells with missing dimensions (a missing weak dimension simply drops out). Spearman correlation of score vs coverage is -0.73 (MOON_SP_RIDGE), -0.74 (MOON_PSR), -0.71 (MARS_ICE), -0.52 (MARS_MUDVOLC): polar cells with missing data were rising to the top.

Fix: ranking uses `score_adj = coverage * score + (1 - coverage) * 50` (missing evidence counts as chance-level). The raw score is still returned and displayed. The justification is the documented bias, not validation; as a consequence check only, the adjusted ranking gives median percentile 0.837 (vs 0.788) and mean AUC vs hard controls by target 0.777 (vs 0.755). The reasoning does not rest on these numbers, and they carry the same small-sample caveat.

## 6. Mission profile effects

Over the 25 experiment-target pairs, removing mission multipliers changes the top-5 regions substantially (mean Jaccard 0.55, minimum 0.11), removing gates changes little (0.96), and the minimum-coverage threshold (0.2 or 0.6 instead of 0.4) changes nothing in the top five. The mission multipliers are therefore the main lever and are hand-set by the team from NASA mission needs (`nasa_basis` per purpose); they are untested against any ground truth.

## 7. Experiment-level validation

All 12 experiments x 25 compatible targets run through the real API: **0 invariant violations** (gates non-null and passing, ordering, coverage, no snow-dominated cell for dry-ground purposes). Details in `docs/EXPERIMENT_VALIDATION.md`. Known weak spots there: the Mars mud-volcano target returns Antarctica / Canadian Arctic as top regions for some experiments; this follows from mostly cold/barren rules and should be read as "cold barren plains", not as a mud-volcano analog.

## 8. Verdict

Defensible: the pipeline is reproducible, uses real NASA-derived Earth data, discloses proxies and missing data, and ranks known analog sites well above random (median percentile ~0.79, AUC 0.84 vs all controls). Not defensible: any claim of predictive accuracy for a given site, any claim for lunar lava-tube/mare targets, or any ranking finer than a region. The sample (14 pairs, 10 sites) is too small for more than "better than chance, with wide uncertainty".
