# Scientific validation report v3 (final scientific enhancement phase)

Supersedes nothing: `docs/SCIENTIFIC_VALIDATION_REPORT.md` (v2) and `data/processed/baseline_2026-11-16/` are kept as the baseline. All numbers below come from
`scripts/validate_v3.py` (`data/validation_v3_dev.json`, `data/validation_v3_final.json`), `scripts/diagnose_targets.py`, `scripts/d4_analysis.py`,
`scripts/ranking_stability.py` and `scripts/experiment_validation.py`; rerun them to reproduce.

## 1. Baseline (saved before any change; commit 3031204)

3,435 land cells; D1-D8 coverage 100 / 100 / 68.9 / 100 / 12.6 / 99.9 / 100 / 99.9 %; 29 planetary measurements (17 primary-fetched, 12 search-summary);
49 evidence rules (32 supported, 13 unverified, 4 retired); 11 positive sites, 15 controls; all 14 in-grid pairs: median percentile 0.788 (site-cluster CI 0.56-0.86),
AUC 0.84 vs all / 0.72 vs hard controls; 39 backend tests. **Reproduced exactly** by `validate_v3.py` (cohort A, raw score: median 0.788, 14 pairs).

## 2. What changed (rule-change audit; weights untouched)

| Change | Evidence for it | Why it is not tuning |
|---|---|---|
| Targets defined by exposed ground (all but MOON_PSR) require a verified surface-exposure value (D3); ice/snow/water-covered cells are excluded from default rankings and counted | Diagnosis (section 5): MARS_MUDVOLC's top-50 cells were 100% Antarctic ice sheet because no rule measures geology and an ice sheet is flat, dry and cold | Written down on physical grounds before validation scores were examined (`data/target_readiness.json`); effect on validation reported afterwards |
| D4 (terrain) relabelled "proxy (scale mismatch)" in readiness; weight unchanged | `scripts/d4_analysis.py`: for flat-terrain targets, real analog sites have LOWER D4 similarity than their controls (section 6) | Resolution argument, not a score argument; weight left unchanged |
| Per-region suitability status, evidence tier, ranking-stability note | Sections 4, 7 | Labels only, no change to scores |
| Evidence-adjusted ranking kept | Coverage bias (v2) plus the alternative comparison in section 7 | Not selected by AUC; the alternative (shrink to target median) gives the same medians |

No weight, band or gate value was changed in this phase. The one gating change is the exposed-surface requirement above.

## 3. Validation dataset (details in `docs/ANALOG_DATASET_V3.md`)

- Positives: the 11 historical sites plus 7 newly accepted sites (4 eligible, 3 exploratory); a further 17 candidates were rejected for stated reasons (impact-crater/sedimentary training sites with no modelled target, Titan-only dunes, icy-world tests, non-peer-reviewed or tourism-only sources, duplicates of an existing 2.5 degree cell, and the four Pakistani hypotheses, which stay hypotheses).
- Eligible new sites: Gobustan (mud volcanoes), Lanzarote Corona tube, Qaidam/Dalangtan (evaporites; yardangs as a partial AEOLIAN relationship), White Sands (gypsum dunes). Exploratory only (weak or unverified support): Jingpo Lake, Jeju Manjanggul, Black Point flow.
- Controls: 25 sites (15 earlier, 10 new), 19 hard; each with a written, model-blind physical rationale (Deccan/Parana/Siberian basalt with incompatible climate, Libyan sand sea, East Antarctic plateau, Greenland ice sheet, boreal shield, steppe, Sahel).
- **Cohorts:** A historical (11 sites, influenced development), B development (3 sites: Lanzarote, Jingpo, Black Point), C frozen independent (4 sites: Gobustan, Jeju, Qaidam, White Sands). B/C assignment: parity of sha256(site id), made before any new site was scored; membership hash-locked in `data/analog_cohorts_v3_frozen.json` and checked by the code and a test. Model choices used cohorts A+B and physical reasoning only; C was scored once, at the end.
- Experiment-specific controls and positives do not exist: no source labels a site as suitable for one of the twelve *experiments* (as opposed to a planetary target), so results are by target. This is a limit, not an omission.

## 4. Results

### 4.1 Development stage (cohorts A+B; 15 pairs / 11 sites for raw, 14 / 10 where the exposed-surface rule leaves the McMurdo cell unrankable)

| Variant | Median percentile | 95% CI (site cluster) | Top-25% hit | AUC all | AUC hard |
|---|---|---|---|---|---|
| raw similarity | 0.816 | 0.56-0.91 | 0.67 | 0.87 | 0.78 |
| evidence-adjusted (shrink to 50, current) | 0.846 | 0.64-0.94 | 0.67 | 0.89 | 0.81 |
| adjusted, shrink to target median | 0.846 | 0.57-0.93 | 0.67 | 0.89 | 0.81 |
| raw, minimum coverage 0.6 | 0.816 | 0.59-0.87 | 0.53 | 0.88 | 0.79 |
| equal weights, raw | 0.819 | 0.52-0.87 | 0.60 | 0.85 | 0.74 |
| equal weights, adjusted | 0.861 | 0.57-0.92 | 0.67 | 0.86 | 0.75 |
| **adjusted + exposed-surface rule (adopted)** | **0.817** | 0.59-0.93 | 0.64 | **0.91** | **0.83** |

Reading: the adjusted score helps slightly and the alternative coverage-aware form is indistinguishable, so there is no evidence for preferring one over the other; the
simple form is kept for transparency. Equal weights perform about as well as hand-set weights (the weights are not demonstrably better than flat ones). The exposed-surface
rule leaves the median about the same and raises AUC against hard controls (it removes ice-covered controls from the comparison pool, which is the intended effect, and it
removes one positive: the Dry Valleys cell is ice sheet at 2.5 degrees and so cannot be assessed).

### 4.2 By target and completeness (A+B, adopted variant)

| Target | Pairs | Median percentile | AUC vs hard controls |
|---|---|---|---|
| MARS_JEZERO | 5 | 0.88 | 0.94 |
| MARS_CHLORIDE | 2 | 0.88 | 0.92 |
| MARS_ICE | 1 (Devon only) | 0.99 | 1.00 |
| MOON_LAVATUBE | 4 | 0.65 | 0.71 |
| MOON_MARE | 2 | 0.66 | 0.58 |

Sites with data coverage >= 0.9: 8 pairs / 5 sites, median 0.91 (CI 0.88-0.98), AUC vs hard controls 0.95. Coverage < 0.9: 6 pairs / 5 sites, median 0.58, AUC vs hard 0.67. Performance depends strongly on data completeness. n is small everywhere; per-target rows with fewer than 5 sites are indicative only.

### 4.3 Frozen independent cohort C (scored once; disclosure, not used to choose anything)

| Pair | Percentile (adopted variant) |
|---|---|
| Qaidam/Dalangtan -> MARS_CHLORIDE | 0.90 |
| White Sands -> MARS_AEOLIAN | 0.80 |
| **Gobustan -> MARS_MUDVOLC** | **0.33** |
| Qaidam -> MARS_AEOLIAN (exploratory) | 0.90 |
| Jeju -> MOON_LAVATUBE (exploratory) | 0.18 |

Primary pairs: n = 3 sites; median 0.80 (interval 0.33-0.90); AUC vs hard controls 0.33. **This sample is far too small for any confirmatory claim** and is flagged unreliable in the data file (fewer than 5 sites). What it does show, honestly: the two evaporite/dune analogs rank high, while the Azerbaijan mud-volcano province ranks low (below the median score of cells for that target): the model's mud-volcano similarity is a climate/terrain similarity, and Azerbaijan is a warmer, semi-arid, sedimentary-basin setting. That is consistent with the label "Geological suitability unverified" and with the diagnosis in section 5, and it was *not* used to adjust anything. Dropping D4 would raise the frozen median to 0.85-0.90 (with and without the exposed-surface rule), which is again not acted on.

## 5. Weak targets

**MARS_MUDVOLC.** Active rules are D2 aridity, D1 cold, D3 barren, D4 flat; D5 was retired earlier. 100% of the weight is climate (44%), surface cover (22%), terrain (33%). Before this phase its top 50 cells were all Antarctica: an ice sheet is the driest, coldest, flattest surface on Earth. The verified source (Allen and Oehler 2010) names Azerbaijan as the largest onshore analog and the Gulf of Cadiz submarine volcanoes as the closest morphologic analogs, i.e. geology-driven choices a land climate grid cannot reproduce. Remedies adopted: exposed-surface requirement (Antarctic ice sheet excluded; top regions now come from exposed ground), target readiness `climate_terrain_similarity_only`, per-region label "Geological suitability unverified", and explicit unsupported properties. Not done: no arbitrary conditions to lift expected sites; Gobustan stays low.

**MOON_LAVATUBE.** The defining property (a subsurface basaltic cavity behind a 10-100 m collapse pit) is not observable by any layer. The dimensions that do the work are D3 (rank correlation with score 0.91), D2 (0.69) and a sparse composition proxy (D5, 13% of cells, 0.46). Positives: Lanzarote Corona 0.91, Craters of the Moon 0.76, Lava Beds 0.56, Iceland 0.44, Jeju (C, exploratory) 0.18, Jingpo Lake (exploratory) 0.19: discrimination follows aridity, not basalt or tubes. A high score is explicitly NOT evidence of a lava tube.

**MOON_MARE.** Composition (D5) is an ASTER silicate-contrast proxy defined for bare ground; it is not FeO/basalt and shows a negative rank correlation with the score (-0.48) because it is anti-correlated with aridity (-0.68). The terrain rule compares 1 km cell relief with a 15 m baseline slope (measured median 3.5 degrees on maria, USGS source still unverified). Result: indicative of dry flat barren ground only.

## 6. Feature dominance and D4

- Redundancy: D1 cold ~ D7 light 0.97, D1 ~ D6 snow 0.97 (0.94 before the D6 change from peak to mean), D6 ~ D7 0.96, D1 ~ D8 -0.79, D2 ~ D3 0.81 (Spearman over cells). D1, D6 and D7 are essentially latitude: they add little independent information, and the three together carry the "polar" signal under three names.
- Ablations (adopted variant): D3 (barren) removal is most harmful (median 0.82 -> 0.77, AUC hard 0.70), then D8 (thermal swing; median 0.77) and D2 (aridity; AUC hard 0.74). D5, D6, D7 have almost no measurable effect (median changes <= 0.003).
- D4: removing it raises the median to 0.89 and AUC against hard controls to 0.94. The diagnosis (`data/d4_analysis.json`): for targets whose rule is "low relief", positives have a mean D4 similarity of about 0.2 while controls have about 0.7. Known analog sites such as Atacama, Death Valley and the Colorado desert sit in Andean or Basin-and-Range cells whose 1 km relief across 280 km is large; flat controls (boreal plains, ice sheets, sand seas) look "flat". This is a scale mismatch between planetary metre-scale slope and Earth cell relief. Action: label D4 a scale-mismatched proxy; keep the weight until a scale-appropriate metric (for example fraction of 1 km pixels with slope < 5 degrees) exists. Removing the dimension merely because validation improves would be tuning.
- D8 relevance: thermal swing is a legitimate property for lunar thermal-environment targets, but Earth's air-temperature swing (tens of K) is a small fraction of the lunar swing (about 300 K); it ranks Earth deserts relative to each other, nothing more.
- D3 is appropriate for exposed-ground targets but physically irrelevant to subsurface features and to buried ice; it is why ice-covered terrain is now excluded for them.

## 7. Ranking and stability

Weight perturbation (100 draws, sigma 0.3) over the 25 experiment-target pairs: the #1 region stays within 5 degrees of the original in **65%** of draws on average (worst pairs 25-32%: two of the three mud-volcano pairs and three Jezero pairs); the mean Jaccard of the top-5 sets is 0.62. Switching all proxies (D5, D6, D7) off keeps the #1 region in 52% of pairs (56% before the D6 change). Blanking 20% of cells per dimension at random drops #1 stability to **36%** (mean top-5 Jaccard 0.17). Conclusion: single-cell rankings are fragile; the useful output is the broad region and its evidence labels. The UI states this for the #1 region and the markers are 2.5 degree cells. Measurement uncertainty is not propagated: the Earth layers are percentile ranks of gridded products without per-cell uncertainty.

## 8. Target-specific scientific readiness

No target qualifies for a full environmental screen (`data/target_readiness.json`):

| Target | Scope | Measured/derived on Earth | Proxy | Not measured / not reproducible |
|---|---|---|---|---|
| MOON_PSR | partial assessment | exposed relief (proxy at 1 km) | ice (snow), cold (air) | cryogenic permanent shadow (not reproducible) |
| MOON_SP_RIDGE | partial | - | light swing, cold, relief | illumination geometry |
| MOON_LAVATUBE | climate/terrain only | aridity, barren | composition, thermal | subsurface cavity, basalt map |
| MOON_MARE | climate/terrain only | aridity, barren | composition, relief, thermal | basalt/FeO, regolith |
| MARS_ICE | partial | cold/dry | snow cover, relief | buried ground ice |
| MARS_JEZERO | climate/terrain only | aridity, barren | relief | delta sediments, lithology |
| MARS_MUDVOLC | climate/terrain only | aridity, barren | relief | sedimentary-basin mud volcanism |
| MARS_CHLORIDE | climate/terrain only | aridity, barren | relief | evaporites (1-25 km2, below grid resolution) |
| MARS_AEOLIAN | climate/terrain only | aridity, barren | relief | dune/sand cover |

## 9. Experiment validation matrix

25 experiment-target pairs run through the real API (`data/experiment_validation.json`): 0 invariant failures; 2 `pass`, 23 `pass_with_warnings`. `pass` means code-level invariants held (gates non-null and passing, ordering, coverage, exposed-surface requirement, descriptions present, target compatible with the experiment's body and purpose); it is not scientific validation. The warnings record what cannot be established (geology unverified, partial data, unstable #1, polar regions for non-ice Mars targets). No literature review of the twelve experiments' scientific claims beyond the NASA grounding levels in `data/experiments.json` was possible in this phase.

## 10. Geographic reliability

Tests cover: regular 2.5 degree geometry and unique cells; great-circle distance against an independent haversine, across the date line and over the pole; island sites outside the land grid are reported with their distance (Kilauea: 34 degrees to the nearest land cell, so it is excluded, not mapped); country labels for known cells; every region marker is a real grid cell; ice/snow cells excluded for exposed-ground targets. Each region carries an evidence tier: **global screening candidate** (default) or **locally supported region** (30 m SRTM terrain checked for the best cell); neither is a field site. Land/ocean: the grid contains land cells only; coastal and island cells average sea and land within the cell. Sub-cell precision is not claimed.

## 11. Verdict

Defensible: a transparent regional screening tool whose stated limits now travel with each result (per-region suitability status, unsupported properties, evidence tier, stability). It ranks documented dry-ground analog sites for Jezero-, chloride- and ice-style targets well above chance. Not defensible: any claim of geological confirmation for mud volcanoes, lava tubes, mare basalt, delta sediments, evaporites or dunes; any single-cell or single-site recommendation; any statement of predictive accuracy from a sample of 11-14 sites (3 frozen). To go further, the model needs a lithology layer (for example GLiM), an evaporite/dune layer, a scale-appropriate terrain metric, and several more independently sourced sites per target.
