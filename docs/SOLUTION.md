# ASTRANOVUS — the solution in detail

ASTRANOVUS answers one question: **"Where on Earth should we test *this* Moon or Mars experiment?"** It does so with a transparent
rule-and-weight model fed by NASA Earth-observation data. It is an independent prototype, not an official NASA tool.

## 1. Why a purpose-driven design
"Most Mars-like place on Earth" has no single answer. A drill team needs cold, dry, ice-bearing ground; a rover team needs bare, rough terrain; a thermal-hardware team needs
large day-night swings. So the user chooses **Moon/Mars → experiment → reference environment**, and the engine ranks Earth regions *for that purpose*.

## 2. The chain of logic (end to end)
1. **Earth observation → Earth grid.** NASA products are read from their original HDF files, quality-filtered, aggregated to grid cells and converted to eight comparison
   dimensions expressed as percentile ranks among Earth cells (`scripts/build_earth_grid.py`). Provenance, time span and cross-checks are written next to the grid.
2. **Reference environment → rules.** Each Moon/Mars site (shadowed crater floor, Jezero delta, …) is a set of rules ("colder is better", "middle terrain band", …) with weights. These
   are team drafts; `docs/TARGET_EVIDENCE.md` shows which rules have a retrieved NASA source.
3. **Experiment → mission profile.** An experiment maps onto an existing mission profile that multiplies the weights that matter for that test and adds hard gates (must-haves).
   Only reference sites that the profile defines for the chosen body are offered.
4. **Scoring.** For each cell, per-dimension similarity is combined as a weighted average over the dimensions that have data; coverage says how much weight had data. Missing data is excluded, never zero.
5. **Gates and regions.** Cells failing a gate are dropped (missing gate data is flagged "unverified"). The best cells are merged into regions; confidence is derived from coverage and region size.
6. **Honest presentation.** The UI shows the data state (ready / partial / unavailable), per-dimension status (derived / proxy / missing), time span, datasets, weak points, what Earth cannot reproduce,
   and a terrain check from a finer elevation model where available.
7. **Calibration by the user.** Sliders multiply dimension weights (×0–3); the same Python engine re-ranks. The result is labelled custom.

## 3. What each dimension honestly means
| Dimension | Data | What it is | What it is not |
|---|---|---|---|
| D1 cold | NASA POWER annual 2 m air temperature | long-term cold | land-surface temperature |
| D2 aridity | NASA POWER annual precipitation (cross-checked with GPM IMERG) | dryness | soil moisture or humidity |
| D3 barren | MODIS MOD13C2 peak NDVI (2024) | little vegetation | rock type, or "geology" |
| D4 terrain | NASA SRTMGL30 (~1 km) and NSIDC-0422 Antarctic 1 km DEM: relief in the cell | landscape-scale relief | rover-scale slope |
| D5 rock composition | NASA ASTER GED emissivity (silicate contrast), bare ground only | silica-poor (mafic-like) vs silica-rich bare surface proxy | rock exposure, mineral identification or lithology |
| D6 ice | MODIS MOD10CM snow cover, 2015-2024 climatology (mean over observed months) | snow-cover proxy | glacier presence, permafrost or subsurface ice |
| D7 light | NASA POWER seasonal insolation swing | high-latitude light seasonality | lunar illumination |
| D8 thermal swing | MODIS MOD11C3 land-surface temperature day minus night | diurnal surface swing | air-temperature range |

## 4. Why the numbers can be trusted (and where not)
* Independent sources agree: POWER air temperature vs MODIS surface temperature (rank correlation ≈ 0.98); POWER precipitation vs GPM (≈ 0.91).
* A disagreeing source was replaced, not tuned away: the old POWER-based swing measure correlated negatively with MODIS, so D8 uses MODIS.
* Validation against NASA-documented analog sites (Atacama, Dry Valleys, Devon Island, Svalbard, Lava Beds, Death Valley, Colorado Desert) with a held-out split and humid control regions: strong separation,
  but the sample is small and the controls easy, so it is indicative only.
* Limits that remain: one year of MODIS/GPM, no lithology, 1-km terrain, draft reference rules with partial evidence, candidate regions rather than verified sites.

## 5. Realistic next steps (ordered by scientific value)
1. Ground the Moon/Mars rules with real values from Moon Trek / Mars Trek (LOLA, MOLA, Diviner, SWIM) and record them in `data/target_evidence.csv`.
2. Add a lithology dimension with a documented method (GLiM classes mapped by geologists to "mafic / felsic / sedimentary / evaporite", or EMIT for arid regions).
3. Extend MODIS/GPM to multiple years for a true climatology.
4. Refine candidate regions to site scale with 30 m terrain and imagery.
5. Expand the validation set with literature-cited sites and a proper train/test protocol.
