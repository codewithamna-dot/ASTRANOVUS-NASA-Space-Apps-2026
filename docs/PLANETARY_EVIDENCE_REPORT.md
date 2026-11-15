# Planetary evidence report (Moon and Mars reference sites)

Machine-readable source of truth: `data/planetary_measurements.csv` / `.json` (built by `scripts/build_planetary_measurements.py`), served by the API at `GET /evidence/{target_id}` and shown in the UI under "Reference-site measurements". Qualitative rule support lives in `data/target_evidence.csv` (49 rows).

## 1. What this is, and what it is not

Every row records: target, location, quantity, value, units, spatial resolution, observation period, uncertainty, instrument/method, dataset or publication, source URL, how the value was extracted, an evidence class (**observed** = measured by an instrument; **derived** = computed from measurements, e.g. a crater depth from topography; **inferred** = interpretation from data, e.g. buried ice), a scope (**site**, **region** or **body**), and a retrieval flag.

Retrieval flag, applied honestly:
- `primary_fetched` (17 rows): the value was read from the primary page (NASA release, paper abstract, catalogue entry) during this work.
- `search_summary` (12 rows): the value came from a search-result summary only. These are **not** to be quoted as verified; each is queued for re-verification in `docs/MANUAL_EVIDENCE_NEEDED.md`.

No value was filled in from memory. Where the sources disagree (lunar pit depth: 34, 40 or 80-88 m depending on source and instrument) the conflict is stored as its own row (M11) rather than resolved.

## 2. Completion counts

| Measure | Count |
|---|---|
| Measurement rows | 29 (observed 8, derived 14, inferred 7) |
| Scope | site 16, region 11, body 2 |
| Primary-fetched / search-summary | 17 / 12 |
| Targets with at least one measurement | 8 of 9 (MARS_AEOLIAN has none) |
| Qualitative rule rows (`target_evidence.csv`) | 49: 32 supported, 13 unverified, 4 retired |

The core six requested targets:

| Target | Rows | What is now numerically recorded | What is still missing |
|---|---|---|---|
| MOON_PSR (Shackleton) | 6 | 25 K minimum floor temperature (Diviner), 16,055 km2 total southern PSR area, crater 21 km wide / 4 km deep, permanent shadow of the floor, 127/-173 C surface extremes | floor slope statistics, annual mean floor temperature, floor diameter |
| MOON_SP_RIDGE | 3 | ~240 days continuous sunlight per year, longest darkness ~1.5 days, >90% collective sunlit fraction | ridge coordinates, LOLA slope statistics, FeO composition |
| MOON_LAVATUBE | 6 | pit depth and diameter ~100 m (with the 34 / 40 / 80-88 m conflict recorded), shaded temperature 17 C, radar cave extent >200 ft | none retrievable beyond these; pit-floor temperature is a single value |
| MARS_ICE (Arcadia) | 5 | ~1e4 km3 excess ice, 15-60 m deposit thickness (preliminary), ice within 0-5 m, -153 to +20 C surface | slope and SWIM score at Arcadia |
| MARS_JEZERO | 4 | 45 km crater, reference point -2656 m (flagged), HiRISE DTM bounds, -83 to +5 C on sampled sols | floor/delta slope, coordinates re-verification |
| MARS_MUDVOLC | 2 | 0.304 m/pixel HiRISE scale, mound abundance (qualitative only) | coordinates, sizes, counts |

Optional targets: MARS_CHLORIDE (1 row, ~200 THEMIS deposits, search-summary), MOON_MARE (2 rows, search-summary), MARS_AEOLIAN (0 rows).

## 3. How the measurements connect to the model

The model compares *Earth properties* (D1-D8 percentile ranks on a 2.5 degree grid) with a target's *rules* (high / low / band, weight). Measurements here ground those rules, but they do not enter the score as numbers: a lunar crater at 25 K cannot be compared to an Earth cell at 2.5 degree resolution, and the percentile approach deliberately avoids pretending it can. The measurements therefore:

1. justify or retire a rule (four rules retired earlier: MOON_PSR D7, MOON_SP_RIDGE D5, MARS_MUDVOLC D5, MARS_AEOLIAN D5);
2. state what the Earth analog cannot reproduce (see `cannot_reproduce` per experiment);
3. are displayed next to results so a reader sees the planetary side of the comparison.

## 4. D1-D8 coverage on the Earth side

| Dimension | Basis | Class | Cell coverage |
|---|---|---|---|
| D1 cold | NASA POWER 2 m air temperature | derived (air, not surface, temperature) | ~100% |
| D2 aridity | NASA POWER precipitation, cross-checked with GPM | derived | ~100% |
| D3 barren | MODIS peak NDVI 2024 | derived | 69% (snow/ice/water cells have a stored reason) |
| D4 terrain | SRTMGL30 (~1 km) + NSIDC-0422 Antarctic DEM | observed (relief at ~1 km) | 100% |
| D5 composition | ASTER GED v4.1 silicate contrast, bare snow-free pixels | proxy (not mineralogy) | ~13% (sparse; rule only active where data exists) |
| D6 snow cover | MODIS MOD10CM 2015-2024 climatology | proxy (not glaciers, permafrost or subsurface ice) | ~100% |
| D7 light | POWER insolation swing | proxy (Earth seasonal swing, not lunar illumination) | ~100% |
| D8 thermal swing | MODIS LST day minus night, 2024 | derived | high |

Direct for the purpose stated: D4 (relief), D8 (diurnal swing). Derived but indirect: D1, D2, D3. Proxy: D5, D6, D7. Missing: nothing is silently filled; absent cells carry a reason string.

## 5. Irreducible limits

- No Earth surface reproduces lunar PSR temperatures (25-40 K), vacuum, 1/6 g, radiation, or regolith chemistry; Mars-like cold deserts do not reproduce 0.6 kPa CO2 atmosphere or perchlorates.
- Site features (a 100 m pit, a 1-25 km2 chloride deposit, a 21 km crater) are below 2.5 degree (~280 km) resolution. Results are *regions to investigate*, not sites.
- Several planetary datasets (LOLA, Diviner, MOLA, HiRISE) require interactive Trek/PDS work or large downloads; these are listed with exact retrieval steps in `docs/MANUAL_EVIDENCE_NEEDED.md`.

## 6. Verification round (2026-11-16)

The original pages of the 12 `search_summary` rows were opened again. Result: **35 rows, 30 `primary_fetched`, 5 still unverified** (`M11b`, `M15`, `J01`, `J03`, `A03`).
Pages that could not be opened (HTTP 403/404, certificate error, PDF without extractable text) were left unverified and are not treated as evidence.

Evidence quality (kept separate from data coverage and from the recommendation score; column `evidence_quality`):
primary measured 7, derived measurement 7, published model 5, supported inference 9, generic planetary property 2, unverified 5. No row is graded "team hypothesis"; hypotheses live in the analog dataset, not here.

Corrections made because the page said something different (full list in `CORRECTION_LOG` in `scripts/build_planetary_measurements.py`):
- M10 Mare Tranquillitatis pit width was "~100 m"; the page says 100-115 m. M09 depth "a bit over 100 m" confirmed (55 m shadow at 26.5 degrees incidence; independent check about 110 m).
- M11 mixed several depths for the Marius Hills pit; only the LROC page values (about 65 m, updated to 58 x 49 m, depth 40 m) are verified. The other values (34 m, 80-88 m) are kept in unverified M11b.
- M12 Mare Ingenii pit: the page states a width of about 130 m at 35.95 S, 166.06 E and **no depth**. The earlier "~70 m deep" entry was withdrawn.
- M16 Diviner: "almost 400 K" at equatorial noon and "below 100 K" at night (the earlier paraphrase 385-400 / 95-100 K was replaced). New M18: continuously lit polar rims stay near 220 K (generic polar-rim statement).
- J02 Jezero: 45 km diameter and "about 18 degrees latitude, 77 degrees longitude" confirmed on the JPL press kit. J01 (-2656 m MOLA reference elevation) remains unverified.
- A01: the Arcadia box (36-56 N, 132-176 W) could not be found on the cited page and was withdrawn; replaced by the verified SWIM mapping range, equator to 60 N (the page gives no ice depth).
- C01 chloride count confirmed (about 200 sites, 1-25 km2 each, Noachian) on the THEMIS release; Osterloo et al. 2008, Science 319:1651 added as the publication.
- New: U03 (over 18,000 Acidalia cones/domes identified, about 40,000 estimated; Allen and Oehler 2010) and U04 (Azerbaijan named as the largest onshore concentration).

Still unverified and why: M15 (USGS page 403), J01 (certificate error), J03 (USGS Astropedia 403), A03 (NASA newsletter PDF without text), M11b (values not on the LROC page).

Location-specific checks: whole-body values are stored with `scope = body` (M17, A05) and are never shown as site values; the Diviner PSR minimum (25 K) is a region statement, not a Shackleton value; pit measurements describe the visible pit, not the tube; snow cover is never used as a subsurface-ice measurement.
