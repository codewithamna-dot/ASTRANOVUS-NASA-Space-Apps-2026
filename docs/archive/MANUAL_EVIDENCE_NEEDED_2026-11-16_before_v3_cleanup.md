# Values that need manual retrieval (Moon Trek / Mars Trek / PDS)

Everything retrievable from public NASA pages was retrieved and recorded in `data/target_evidence.csv`. The numbers below were NOT available in any page this
project could read; nobody should type them in from memory. For each one: open the tool, record the value, the layer name, the coordinates you sampled and a
screenshot or permalink, then add a row to `data/target_evidence.csv` (`status=supported`, `evidence_type=observed`) and rerun `scripts/build_target_evidence.py` after
adding the entry to its table.

| Target | Needed value | Why it matters | How to get it |
|---|---|---|---|
| MOON_PSR | Median LOLA slope on the Shackleton floor (and a second PSR floor, e.g. Faustini) | tests the "low roughness floor" rule (D4) | Moon Trek (trek.nasa.gov/moon): search "Shackleton", add the LRO LOLA slope layer, use the area/profile tool over the floor, note median slope and baseline |
| MOON_PSR | Diviner annual maximum and mean surface temperature of the floor | tests the cold rule quantitatively (D1) | Moon Trek Diviner temperature layers (or diviner.ucla.edu data products) over the same floor polygon |
| MOON_SP_RIDGE | LOLA slope statistics and percent-sunlit fraction on the Connecting Ridge / Peak Near Shackleton | quantifies D4 (rugged) and D7 for the ridge | Moon Trek: LOLA slope and illumination layers over the ridge polygon |
| MOON_SP_RIDGE | Surface composition (for example FeO wt %) at the ridge | confirms the feldspathic-highland statement used to retire D5 | Moon Trek: Lunar Prospector / Kaguya / Clementine FeO layers |
| MOON_LAVATUBE, MOON_MARE | Regional LOLA roughness for the maria that host pits (Mare Tranquillitatis, Marius Hills) | grounds the 0.3-0.7 terrain band (D4) | Moon Trek: LOLA slope over a mare box; record median slope and baseline |
| MARS_JEZERO | MOLA elevation and slope across the crater floor and delta | grounds the terrain band (D4) | Mars Trek (trek.nasa.gov/mars): MOLA elevation and slope layers over Jezero |
| MARS_ICE | MOLA slope and SWIM ice-consistency score over Arcadia Planitia | quantifies "flat plains with ice" (D4, D6) | Mars Trek MOLA slope; swim.psi.edu SWIM composite map |
| MARS_MUDVOLC | HiRISE/CTX mound counts and MOLA slope in Acidalia/Utopia | currently qualitative; origin is debated | Mars Trek CTX mosaic; HiRISE catalogue entries cited in the CSV |
| MARS_CHLORIDE | Latitude/longitude list of the ~200 THEMIS chloride deposits | to test whether any deposit-bearing region is resolvable at all (deposits are 1-25 km2, far below a 2.5 degree cell) | Osterloo et al. 2008 deposit table via NASA PDS / the Odyssey THEMIS release cited in the CSV |
| MARS_AEOLIAN | MOLA slope over a major dune field | quantifies "low relief" (D4) | Mars Trek MOLA slope over the dune polygon |

Weights and band limits stay unchanged until real values exist.

## Update after the planetary-measurement round

Retrieved and recorded since the table above (see `data/planetary_measurements.csv`): Shackleton floor temperature, size and shadow state; south-pole ridge illumination figures; lunar pit dimensions (with source conflict); Arcadia ice volume, thickness and depth ranges; Jezero crater size and sampled temperatures; HiRISE image scale for the mud-volcano field. Those rows are no longer manual tasks.

Genuinely manual (cannot be read from a static page by this project, and are not to be typed from memory):

1. **Re-verify the 12 `search_summary` rows** (column `retrieval`): open `source_url`, confirm the value and units, change `retrieval` to `primary_fetched` in `scripts/build_planetary_measurements.py` and rerun it. Priority: J01 (Jezero reference point; the JPL MarsNext listing failed a certificate check), M09-M12 (lunar pit values conflict between sources), M15-M16 (mare slope and temperature), C01 (chloride count).
2. **Interactive Trek/PDS values** listed in the table above (LOLA slopes, Diviner annual statistics, MOLA slopes, SWIM score, mound counts). Each needs a person to pick coordinates in Moon/Mars Trek, record layer name, coordinates and a screenshot or permalink.
3. **Coordinates** for the south-pole ridge, mud-volcano fields and THEMIS chloride deposits (needed before any stage-2 terrain check can be run for those targets).
4. **Independent analog sites** for a second, untouched validation cohort, and a literature check of any Pakistani analog claim (Karakoram/Baltoro, Hingol, Khewra, Katpana) before it is counted as a positive.
5. **Official Space Apps deadline and submission rules**: the official page could not be fetched (certificate error); confirm by hand.

Weights, band limits and rules remain unchanged until real values exist.

## Update after the final scientific phase (2026-11-16)

Resolved by opening the original pages: most of the `search_summary` rows (see `docs/PLANETARY_EVIDENCE_REPORT.md` section 6). Still genuinely manual:

1. **Five rows that could not be opened here.** Open `source_url` in a normal browser, read the value, and if it matches change `retrieval` to `primary_fetched` in `scripts/build_planetary_measurements.py` and rerun it:
   - M15 mare median slope 3.5 degrees (USGS publication 70223199; 403 here)
   - J01 Jezero reference elevation -2656 m (marsnext.jpl.nasa.gov landing-site listing; certificate error here)
   - J03 Jezero HiRISE DTM bounds (USGS Astropedia product page; 403 here)
   - A03 Arcadia ice-rich deposit thickness 15-60 m (NASA Human Landing Sites newsletter PDF; no extractable text here)
   - M11b other Marius Hills pit depths (34 m NASA article, 80-88 m Kaguya): find the actual papers or discard the row.
2. **Open and read the search-summary sources behind the new analog sites** (marked `search_summary` in `data/analog_dataset_v3.json`): Sauro et al. 2020 (lava tubes on Earth, Moon and Mars; Lanzarote), the ESA PANGAEA programme paper, Wang et al. 2016 (Qaidam as a Mars analogue), the White Sands / Meridiani gypsum-dune paper (Geology 2006), the BASALT overview (Astrobiology 2019), and whichever review proposes Jingpo Lake and Jeju. Upgrade or drop each site accordingly.
3. **More independent sites per target.** Gobustan, Lanzarote, Qaidam and White Sands are the only new eligible sites; MARS_MUDVOLC, MARS_AEOLIAN, MARS_CHLORIDE and MOON_MARE each have at most one or two. A second frozen cohort needs several additional, independently sourced analog papers per target, chosen without looking at model output.
4. **Layers that would change the science, not just the evidence:** a lithology map (GLiM geodatabase, needs GDAL), an evaporite/salt-flat map, a dune/sand-cover map, and a scale-appropriate terrain metric (for example the fraction of 1 km pixels with slope below 5 degrees, from the SRTMGL30 files already downloaded). Each is a data-engineering task rather than a manual retrieval; none was added because it needs new data and design decisions beyond this phase.
5. **Interactive Trek/PDS values** in the first table (LOLA slopes, Diviner annual statistics, MOLA slopes, SWIM score, mound counts and sizes) and **coordinates** for the south-pole ridge, mud-volcano fields and chloride deposits remain as before.
6. **Official Space Apps deadline and rules**: still unverified from this environment.
