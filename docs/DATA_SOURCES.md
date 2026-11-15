# NASA data sources (challenge-suggested datasets come FIRST)

Source: challenge "Suggested datasets" list as mirrored on spacedata.swapniltamse.com (an unofficial aggregator;
the official spaceappschallenge.org page could not be opened by our tooling). **Team: re-check the Resources tab of the official challenge page and fix this file if different.**

| # | Dataset (challenge-suggested) | Provider | Used for | Access | Login? |
|---|---|---|---|---|---|
| 1 | EMIT L2B Surface Mineral ID (`EMITL2BMIN`, CMR `C2408034484-LPCLOUD`) | LP DAAC | Earth: D5_rock, D3_barren (arid regions only -> partial coverage, fine: empty = no data) | `earthaccess` / CMR | Download: free Earthdata Login |
| 2 | SRTM Global 1 arc-sec (`SRTMGL1` V003, `C2763266360-LPCLOUD`) | LP DAAC | Earth: D4_terrain (slope, relief). Covers 60N-56S only | `earthaccess` | Download: Earthdata Login |
| 3 | HLS Landsat 30 m (`HLSL30` v2.0, `C2021957657-LPCLOUD`) | LP DAAC | Earth: vegetation/bare ground check on the top candidates (too heavy for global grid) | `earthaccess` | Earthdata Login |
| 4 | MRO CRISM MTRDR mineral maps | PDS Geosciences | Mars targets: mineral signature (Jezero etc.) | ODE REST `https://ode.rsl.wustl.edu/mars/` | No |
| 5 | Mars Trek WMTS (CTX mosaic, MOLA colour hillshade) | Solar System Treks (JPL) | Mars terrain + basemap/verify links in UI | WMTS tiles, open CORS | No |
| 6 | LRO Diviner surface & polar temperature maps | UCLA / PDS | Moon targets: temperature, cold traps, thermal swing | `https://www.diviner.ucla.edu/data` | No |

## Gap: the list has no Earth climate data
Cold, aridity, ice, polar light and thermal swing need Earth climate. Use **NASA POWER climatology** (free, no login, API)
as the supporting NASA source. In the app/video say clearly: "primary = challenge datasets, POWER = supporting".

## Do FIRST (Boy 1, Earthdata login = 5 min, do it NOW)
1. Create free account: https://urs.earthdata.nasa.gov  -> `pip install earthaccess` -> `earthaccess.login()`
2. Run `python scripts/earthdata_search.py` (search only, proves access works).
3. Pipeline order: SRTMGL1 -> D4 first (easiest), POWER -> D1,D2,D6,D7,D8, EMIT -> D5,D3 last (hardest, partial coverage OK).

## Safety net
If a download fails or is too slow: keep the sample grid (data/sample), say so honestly, and ship. A working
app with 4 real dimensions beats a broken one with 8.

## Status update (2026-11-15)
* MOD11C3, MOD13C2, MOD10CM (collection 061) and GPM IMERG V07B: downloaded for **all 12 months of 2024**; parsed by `scripts/build_earth_grid.py` (see docs/METHODOLOGY.md).
* SRTMGL1 v003: 10 tiles downloaded for the top candidate regions (`data/raw/srtm/`); `scripts/stage2_srtm.py` writes `data/processed/stage2.json`.
* EMIT: not used (coverage is partial and mineral classes are categorical).
* The official challenge page could not be re-checked from this environment; re-verify the dataset list there.

* ASTER GED v4.1 monthly (AG5KMMOH, one July 2014 file, ~337 MB) and MODIS MOD10CM snow 2015-2024 (118 monthly files) downloaded and integrated (see docs/METHODOLOGY.md). SRTMGL30 and NSIDC-0422 Antarctic 1 km DEM provide terrain.
