# Evidence that still needs manual NASA-portal interaction

Only items that need a person in a NASA/USGS/PDS tool or portal are listed here. Everything retrievable from static public pages was retrieved (`data/planetary_measurements.csv`,
`data/target_evidence.csv`). Nobody should type these values from memory. The previous, longer version of this file is preserved at
`docs/archive/MANUAL_EVIDENCE_NEEDED_2026-11-16_before_v3_cleanup.md`. Non-portal open work (more analog sources, data layers, decisions) is in `docs/PROJECT_STATUS.md`.

**Recording rule for every value:** record the value, units, layer/product name, the coordinates or polygon you used, the baseline/resolution and a permalink or screenshot. Then add a row to
`scripts/build_planetary_measurements.py` (`retrieval = primary_fetched`, `evidence_class = observed` or `derived`) and rerun it; run `pytest` to confirm the provenance tests still pass.

## A. Rows whose original page could not be opened from this environment (verify in a normal browser)
| Row | Value to confirm | Where | Steps |
|---|---|---|---|
| M15 | median slope of lunar maria, 3.5 degrees, 15 m baseline | USGS publication 70223199 (pubs.usgs.gov/publication/70223199) | Open the page (403 here), read the abstract/results for the median mare slope and the baseline; copy the sentence; set `retrieval` to `primary_fetched` if it matches |
| J01 | Jezero reference point elevation -2656 m (MOLA geoid) and coordinates | NASA/JPL Mars landing-site listing (marsnext.jpl.nasa.gov/landingsites/index.cfm; certificate error here) | Open the listing, find the Jezero entry, record latitude, longitude, elevation and the datum; if the page still fails, use Stack et al. 2020, Space Science Reviews 216:127 (doi:10.1007/s11214-020-00739-x) |
| J03 | bounds of the 1 m HiRISE DTM (Jezero) | USGS Astropedia product page (403 here) | Open the product page, record the minimum/maximum latitude and longitude and the vertical reference |
| A03 | ice-rich deposit thickness 15-60 m, Arcadia (SHARAD interpretation) | NASA Human Landing Sites newsletter PDF (no extractable text here) | Open the PDF, find the passage on Arcadia/Amazonis ice-rich deposits, record the thickness range, the radar instrument and its depth-resolution statement, with the page number |
| M11b | other Marius Hills pit depths (34 m, 80-88 m) | NASA LRO articles; Kaguya papers | Find the exact articles that state these depths; record each separately with its method, or delete the row if they cannot be found |

## B. Values that need Moon Trek / Mars Trek / PDS tools
| Target | Needed value | Why it matters | How to get it |
|---|---|---|---|
| MOON_PSR | Median LOLA slope on the Shackleton floor (and a second PSR floor, e.g. Faustini) | tests the "low roughness floor" rule (D4) | Moon Trek (trek.nasa.gov/moon): search "Shackleton", add the LRO LOLA slope layer, use the area/profile tool over the floor, note median slope and baseline |
| MOON_PSR | Diviner annual maximum and mean surface temperature of the floor | tests the cold rule quantitatively (D1) | Moon Trek Diviner temperature layers (or diviner.ucla.edu data products) over the same floor polygon |
| MOON_SP_RIDGE | LOLA slope statistics, percent-sunlit fraction and ridge coordinates (Connecting Ridge / Peak Near Shackleton) | quantifies D4 and D7 for the ridge | Moon Trek: LOLA slope and illumination layers over the ridge polygon; record the polygon corners |
| MOON_SP_RIDGE | Surface composition (for example FeO wt %) at the ridge | confirms the feldspathic-highland statement used to retire D5 | Moon Trek: Lunar Prospector / Kaguya / Clementine FeO layers |
| MOON_LAVATUBE, MOON_MARE | Regional LOLA roughness for the maria that host pits (Mare Tranquillitatis, Marius Hills) | grounds the terrain band (D4) and the scale-mismatch argument | Moon Trek: LOLA slope over a mare box; record median slope and baseline |
| MARS_JEZERO | MOLA elevation and slope across the crater floor and delta | grounds the terrain band (D4) | Mars Trek (trek.nasa.gov/mars): MOLA elevation and slope layers over Jezero |
| MARS_ICE | MOLA slope and SWIM ice-consistency score over Arcadia Planitia | quantifies "flat plains with ice" (D4, D6) | Mars Trek MOLA slope; swim.psi.edu SWIM composite map (also record the ice depth the map states) |
| MARS_MUDVOLC | HiRISE/CTX mound counts, sizes and coordinates in Acidalia/Utopia; MOLA slope | currently only region-level (>18,000 features reported) | Mars Trek CTX mosaic; HiRISE catalogue entries cited in the CSV |
| MARS_CHLORIDE | Latitude/longitude list of the ~200 THEMIS chloride deposits | tests whether any deposit-bearing region is resolvable at all (deposits are 1-25 km2, far below a 2.5 degree cell) | Osterloo et al. 2008 deposit table via NASA PDS / the THEMIS release cited in the CSV |
| MARS_AEOLIAN | MOLA slope over a major dune field | quantifies "low relief" (D4); MARS_AEOLIAN has no measurement rows yet | Mars Trek MOLA slope over the dune polygon |

Weights and band limits stay unchanged until real values exist; adding values to the evidence files never changes scores.
