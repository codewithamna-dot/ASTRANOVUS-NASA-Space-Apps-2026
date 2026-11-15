# Failure-case analysis

Numbers: `data/failure_cases.json` (from `scripts/failure_cases.py`, adopted model: evidence-adjusted score + exposed-surface rule). Written **after** the model was final and used only to explain
results: nothing below was used to change a rule, weight or gate. The cohort-C pairs (Gobustan, Jeju) were included here after the single frozen scoring run; no change followed.

A pair is listed when its percentile is below 0.5 (worse than the median cell for that target) or when it cannot be scored. Each case is classified against the questions asked for the phase:
missing dimensions, target mapping, experiment objective, coarse grid, unsupported geology, source quality, model assumption, and whether the model can legitimately address it.

| Pair | Cohort / status | Percentile | Coverage | Distance to cell |
|---|---|---|---|---|
| Gobustan -> MARS_MUDVOLC | C frozen, primary | 0.33 | 1.00 | 1.3 deg |
| Iceland -> MOON_LAVATUBE | A historical, primary | 0.50 (0.495) | 0.75 | 1.3 deg |
| Jeju -> MOON_LAVATUBE | C frozen, exploratory | 0.18 | 0.75 | 3.2 deg |
| Jingpo Lake -> MOON_LAVATUBE | B, exploratory | 0.23 | 0.75 | 0.2 deg |
| Jingpo Lake -> MOON_MARE | B, exploratory | 0.09 | 0.83 | 0.2 deg |
| Kilauea -> MOON_LAVATUBE | A, primary | not scored | - | 34 deg (island) |
| McMurdo Dry Valleys -> MARS_ICE | A, primary | not scored | - | exposed-surface rule |

## Gobustan (Azerbaijan) -> MARS_MUDVOLC: 0.33
- **Why.** Dimension similarities: aridity 0.57, barren 0.72, terrain 0.05, cold 0.30. The cell contains the Greater Caucasus (1 km relief 2,154 m), so the "flat plains" terrain rule scores it 0.05; the "cold" rule (weight 2) scores a warm semi-arid cell 0.30.
- **Classification.** Target mapping: correct (verified NASA abstract names Azerbaijan as the largest onshore concentration). Unsupported geology: yes, all active rules are climate/surface/terrain; no layer sees sedimentary basins or mud volcanism. Coarse grid: yes, the 2.5 degree cell mixes the mountain range with the lowland where the mud volcanoes lie. Model assumption: the cold rule was written for Mars climate, not derived from the analog evidence.
- **Can the model address it?** Not legitimately with the current data. A better terrain metric (flat-area fraction) and a sedimentary-basin/lithology layer would help; neither exists in the grid. Lowering the cold weight to lift this site would be tuning on a frozen-cohort result and is not done. The recommendation is already labelled "Geological suitability unverified".

## Iceland -> MOON_LAVATUBE: 0.50
- **Why.** Aridity similarity 0.02 (very wet), barren 0.80, terrain 0.74, thermal swing 0.55; composition proxy missing (vegetated / snow).
- **Classification.** Incompatible rule vs analog objective: the target rule assumes a dry environment because the lunar surface is dry, but Earth lava tubes in wet climates are still geological analogs. Source quality: moderate; the project verified no source naming Iceland for lava tubes specifically (Apollo-era geological-style training only). Missing dimension: D5. Unsupported geology: tube presence is invisible.
- **Can the model address it?** Partly by design: it measures environmental similarity, not geological analogy. Removing the aridity rule would change what the target means (dry-regolith environment) and was not done.

## Jeju (South Korea) -> MOON_LAVATUBE: 0.18 (exploratory)
- **Why.** The nearest land cell is 3.2 degrees away, a mainland Korean cell, not the island. Humid, vegetated: aridity 0.12, barren 0.11; terrain 1.0 (band rule satisfied).
- **Classification.** Coarse-grid limitation (island not represented) and incompatible climate; source quality weak (the review notes the analogy is incomplete; not verified by a primary source). Exploratory by design.
- **Can the model address it?** No: sub-cell and island sites are outside what a 280 km land grid can represent. The pair is not used for any primary metric.

## Jingpo Lake (China) -> MOON_LAVATUBE 0.23 and MOON_MARE 0.09 (exploratory)
- **Why.** Forested humid-continental cell: barren 0.01, aridity 0.33. Composition proxy undefined (vegetated).
- **Classification.** Target mapping and source quality: the claim that Jingpo Lake is a Marius Hills analog came from a review summary and was not verified at the source; for MOON_MARE the relation is indirect. Incompatible objective: the analogy is geological (basalt, tubes) while the model scores bare, dry ground.
- **Can the model address it?** No. If the source is verified the pair stays a documented limitation: geology-based analogs under vegetation are invisible to this model.

## Kilauea (Hawaii) -> MOON_LAVATUBE: not scored
Hawaii is not in the 2.5 degree land grid (nearest land cell 34 degrees away). Coarse-grid limitation; the site is excluded rather than mapped to a wrong cell. This also removes the best-known lava-tube region from the benchmark; the model cannot represent islands at this resolution.

## McMurdo Dry Valleys -> MARS_ICE: not scored after the exposed-surface rule
The 2.5 degree cell is ice sheet (no D3 value), while the real Dry Valleys are small ice-free patches within it. Under the exposed-surface rule it cannot be matched to a target defined by buried ice under exposed regolith. Coarse-grid limitation; before the rule it ranked 0.66 only because an ice-sheet cell looks cold, dry and flat. The sample for MARS_ICE is therefore one site (Devon Island).

## Patterns across failures
1. **Geology that the model cannot see** (lava tubes, mud volcanoes, basalt under vegetation): the largest source of low ranks. Legitimate fix: new data layers, not weight changes.
2. **Coarse grid**: islands (Hawaii, Jeju), mixed mountain/plain cells (Gobustan), small ice-free valleys (McMurdo).
3. **Rules written for the planetary environment** (dry, cold) applied to analogs chosen for geology.
4. **Weak or unverified source evidence** for three exploratory pairs.
5. All of these are reported as limits; none was tuned away.

## Borderline cases (percentile 0.5-0.6; not failures)
Lava Beds -> MOON_LAVATUBE 0.59, Svalbard -> MARS_JEZERO 0.57, Craters of the Moon -> MOON_MARE 0.54 (adopted model): above the median but mid-distribution; the lava-tube and mare cases behave like the failures above (dry basalt terrain is common on Earth, so the model cannot single out the analog).
