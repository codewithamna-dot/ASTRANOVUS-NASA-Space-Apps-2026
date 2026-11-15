# Scientific validation report (evaluation framework, final)

The previous version of this report (2026-11-15, v2 evaluation, 14 pairs / 10 sites) is preserved at `docs/archive/SCIENTIFIC_VALIDATION_REPORT_2026-11-15.md`.
Detailed phase narrative, dimension-level findings and the target-readiness table: `docs/SCIENTIFIC_VALIDATION_REPORT_V3.md`. Benchmark: `docs/ANALOG_BENCHMARK.md`.
Failure cases: `docs/FAILURE_CASE_ANALYSIS.md`. Formulas: `docs/SCORING_METHODOLOGY.md`. Experiments: `docs/EXPERIMENT_VALIDATION.md`.

## 1. What is evaluated
The question is narrow and honest: *does the model rank the Earth cell of a documented analog site above the median Earth cell for the matching planetary target, and above negative controls?*
It is **not** evaluated for whether a recommended region would actually work for a specific experiment: no ground truth for that exists in any source found.

## 2. Evaluation framework
- **Unit of observation:** a site-target pair (site scored at its nearest land cell, within 5 degrees for historical sites and 3.5 degrees for new ones; farther sites are reported as outside the grid, not mapped).
- **Metrics:** percentile of the site's cell among all scored cells for that target (0.5 = chance; generic target rules, no mission profile); top-10% and top-25% hit rates; AUC of positives against target-scoped negative controls (all controls and hard controls separately, averaged over targets with controls).
- **Uncertainty:** 95% percentile bootstrap resampling **sites** (pairs of one site move together; neighbouring cells are never treated as independent). Intervals are suppressed with fewer than 3 sites; any metric from fewer than 5 sites carries `reliable: false`.
- **Cohorts:** A historical (11 sites, influenced development), B development (3), C frozen independent (4; assignment by parity of sha256(site id) before scoring; hash-locked in `data/analog_cohorts_v3_frozen.json`; `validate_v3.py` refuses to run if it changes and does not score C without `--final`).
- **Positives:** primary metrics use eligible pairs (15 eligible sites); exploratory pairs (3 sites, weak or unverified support) are reported separately.
- **Controls:** 25 sites (19 hard) with written, model-blind physical rationales, scoped to the targets they are negatives for. No experiment-specific controls exist.
- **Reproducibility record** (in every output): git commit, SHA-256 of targets, dataset, grid and readiness files, seeds, inclusion rule. Commit used for the reported run: see `data/validation_v3_final.json` (`provenance`; `scoring_files_modified_since_commit` is true until the final changes are committed).
- **Leakage controls:** B/C split before scoring; no duplicate nearby samples (test); controls not chosen from model output; C scored once; nothing was changed after C was scored (failure analysis only).

Reproduce: `python scripts/build_analog_dataset_v3.py` (only to rebuild the data files; it re-freezes cohorts, so do not rerun it casually), `python scripts/validate_v3.py` (development), `python scripts/validate_v3.py --final` (adds C), `python scripts/build_validation_v3_summary.py`.

## 3. Results (adopted model = evidence-adjusted score + exposed-surface rule; nothing weighted differently from the baseline of 2026-11-15)

| Set | Pairs / sites | Median percentile | 95% CI | Top-25% | AUC all / hard controls |
|---|---|---|---|---|---|
| Baseline v2 (all 14 pairs, raw score; kept for comparison) | 14 / 10 | 0.788 | 0.56-0.86 | 0.64 | 0.84 / 0.72 |
| Development A+B, adopted | 14 / 10 | 0.817 | 0.59-0.93 | 0.64 | 0.91 / 0.83 |
| Frozen C, adopted (scored once) | 3 / 3 | 0.798 | 0.33-0.90 (unreliable) | 0.67 | 0.33 (hard; unreliable) |
| Random reference | - | 0.50 | - | 0.25 | 0.50 |

Worse results, stated plainly: on the frozen cohort the hard-control AUC is 0.33 (three sites, so not interpretable) and one of three primary pairs (Gobustan, mud volcano) falls below the median. Before/after on the same development pairs: median 0.788 -> 0.817, AUC vs hard 0.72 -> 0.83 (partly because ice-covered controls are no longer in the comparison pool, which is the intent of the exposed-surface rule, and one positive became unrankable).

## 4. Baselines (9.4)
Same pool, same exposed-surface rule and same adjusted ranking, but simpler scoring:

| Baseline | A+B median (95% CI) | A+B AUC hard | C median |
|---|---|---|---|
| Aridity only (D2) | 0.84 (0.53-0.91) | 0.81 | 0.79 |
| **Dry + barren (D2, D3), identical for every target** | **0.86 (0.71-0.93)** | **0.89** | **0.81** |
| Dry + barren + flat (D2, D3, D4) | 0.71 (0.47-0.85) | 0.64 | 0.67 |
| Equal weights over the target's own rules | 0.82 (0.59-0.90) | 0.81 | 0.79 |
| Full model, hand-set weights (adopted) | 0.82 (0.59-0.93) | 0.83 | 0.80 |

Paired site-cluster bootstrap of (adopted - baseline) mean percentile: vs dry+barren -0.03 (-0.06 to +0.01) on A+B and **-0.16 (-0.42 to -0.01) on C**; vs aridity only +0.05 (-0.02 to +0.16) and -0.16 (-0.43 to +0.01); vs dry+barren+flat +0.14 (+0.10 to +0.17); vs equal weights +0.01 (-0.01 to +0.03).
**Conclusion: the target-specific rules and hand-set weights show no demonstrated advantage over a generic "dry and barren" score on this benchmark; adding the terrain rule makes it clearly worse.** The benchmark's positives are mostly dry-ground analogs, so the cold, ice and illumination targets are barely tested (one MARS_ICE site). The tool must not be described as advanced AI or as validated beyond "ranks dry-ground analog sites above chance, about as well as a simple dryness score".

## 5. Ablation and sensitivity
D6 was changed from peak to mean monthly snow cover after these development results were first produced; the change did not alter the development or frozen metrics of the adopted model (only MARS_ICE and MOON_PSR use D6; the frozen cohort has no such pair; development median 0.817 and AUC vs hard 0.83 are identical before and after; the raw-score median moved 0.816 -> 0.782 because of one pair, Devon Island). Archived pre-change outputs: `data/processed/archive/pre_d6_mean/`.
- Leave-one-dimension-out (development, adopted): without D3 median 0.77 (AUC hard 0.70), without D8 0.77, without D2 0.80 (AUC hard 0.74), without D1 0.80, without D5/D6/D7 about 0.82; **without D4 0.89 (AUC hard 0.94)**. D4 was not removed: `data/d4_analysis.json` shows a scale mismatch (real analog sites have lower D4 similarity than flat controls), a resolution argument, not a score argument.
- Redundancy: D1 ~ D6 0.94, D1 ~ D7 0.97, D6 ~ D7 0.93 (Spearman).
- Ranking stability over 25 experiment-target pairs (`data/ranking_stability.json`): #1 region within 5 degrees in 65% of weight perturbations (sigma 0.3) and 33% when 20% of cells lose a dimension; switching D5, D6, D7 off keeps the #1 in 52% of pairs (after the D6 change; before it 65% / 36% / 56%).
- Experiment matrix: 25 pairs, 0 invariant failures, 2 pass and 23 pass with warnings.
- Measurement uncertainty of the Earth inputs is not propagated (percentile ranks of gridded products without per-cell uncertainty).

## 6. Independent evaluation disclosure (9.3)
Configuration: adopted variant; frozen membership and inclusion rule as above; code and file hashes recorded; results above. No parameter was changed after C was scored. The three primary C pairs were Gobustan -> MARS_MUDVOLC 0.33, Qaidam -> MARS_CHLORIDE 0.90, White Sands -> MARS_AEOLIAN 0.80; exploratory: Qaidam -> MARS_AEOLIAN 0.90, Jeju -> MOON_LAVATUBE 0.18. Because C has three sites, it is a disclosure of behaviour, not a confirmation. If the model is tuned further, C must be reclassified as exploratory and a new cohort obtained.

## 7. Limitations
Small samples (10-11 sites development, 3 frozen); one benchmark site for MARS_ICE; no benchmark for the cold/illumination lunar targets; approximate coordinates; several new-site sources only seen as search summaries; geology not measured for six targets; no ground truth for experiment-level suitability; D6 is a snow-extent proxy highly correlated with D1 cold (rho 0.97; changed from peak to mean on 2026-11-16, see `docs/D6_SNOW_METRIC_REVIEW.md`); single-cell rankings unstable.
