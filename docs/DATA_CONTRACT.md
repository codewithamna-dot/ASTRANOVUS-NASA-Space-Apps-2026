# DATA CONTRACT (v0) — the one thing everybody must agree on

## 1. Dimensions  (`data/dimensions.json`)
Eight dimensions, ids fixed:
`D1_cold, D2_aridity, D3_barren, D4_terrain, D5_rock, D6_ice, D7_polar_light, D8_thermal_swing`

Each Earth cell has, for every dimension, a **percentile 0-1 among all land cells**
(1 = the most of that trait: coldest, driest, most barren, roughest, rockiest, most ice,
biggest seasonal daylight swing, biggest day/night temperature swing).
Percentiles let us compare Earth to the Moon/Mars by *rank and direction*, not raw units.

## 2. Earth grid  (`data/processed/earth_grid.csv`, sample in `data/sample/`)
One row per 0.25° land cell.

| column | type | meaning |
|---|---|---|
| cell_id | int | unique id |
| lat, lon | float | cell centre, degrees (lat -90..90, lon -180..180) |
| D1_cold ... D8_thermal_swing | float 0-1 or empty | percentile; **empty = no data** (never write 0 for missing) |
| country | str, optional | for display |

## 3. Targets  (`data/targets.json`)
List of objects:
```json
{
  "id": "MARS_JEZERO", "body": "mars", "name": "...", "description": "...", "status": "core|optional",
  "rules": {
    "D2_aridity": {"rule": "high", "weight": 3},
    "D1_cold":    {"rule": "band", "lo": 0.4, "hi": 0.7, "weight": 2}
  }
}
```
Rules: `high` (more is better), `low` (less is better), `band` (best inside lo..hi).
Weight: 0 (ignore) to 3 (critical). Dimensions not listed are ignored.

## 4. Score formula
`s` = per-dimension similarity 0-1 (high: p, low: 1-p, band: 1 inside, falls linearly to 0 over 0.5 outside)
`S = 100 * sum(w*s) / sum(w)` over dimensions that have data for that cell.
`coverage = sum(w with data) / sum(w total)` is returned too; low coverage = low trust.

## 5. API  (`backend/main.py`)
| endpoint | returns |
|---|---|
| GET /health | `{"ok": true}` |
| GET /targets | list of targets |
| GET /dimensions | dimension list |
| GET /score?target=ID&min_score=0&limit=5000 | `[{cell_id,lat,lon,score,coverage}]` best first |
| GET /site?lat=..&lon=..&target=ID | per-dimension breakdown for the nearest cell |
| GET /compare?lat=..&lon=..  | that cell's score against every target |
| POST /score_custom | body: `{"target": {...rules...}}` score with user-edited weights |

## 6. Purposes  (`data/purposes.json`) — added in v1
Flow: **body (moon|mars) -> purpose -> best Earth regions.**
```json
{"id":"ISRU_WATER","name":"...","question":"We want to test ...","bodies":["moon","mars"],
 "targets":["MOON_PSR","MARS_ICE"], "nasa_basis":"...",
 "multipliers":{"D6_ice":2.0}, "gates":[{"dim":"D6_ice","op":">=","value":0.5,"why":"..."}]}
```
- `multipliers`: purpose changes how much each dimension matters (effective weight = target weight x multiplier).
- `gates`: hard must-haves. A cell failing a gate is dropped. **Missing data never passes silently: it is flagged "unverified".**
- Results are grouped into **regions** (neighbouring top cells merged), each with why-match, weak points, missing data, confidence.

New endpoints: `GET /purposes?body=moon`, `GET /recommend?body=&purpose=&target=&min_coverage=0.4&top=10`.
D6_ice is currently a PROXY (share of months below 0 C from NASA POWER). Replace with MODIS snow/ice when available.

## 7. Grid build outputs (v2, real NASA data) — added
`scripts/build_earth_grid.py` writes, next to `earth_grid.csv`:
* `earth_grid_features.csv`: raw physical per-cell features (LST K, NDVI, snow %, precipitation mm/day per month; derived means/peaks) for traceability.
* `earth_grid_metadata.json`: product versions/DOIs, granule file names, months covered, quality rules, per-dimension status (`derived` / `proxy` / `missing`) and temporal span, cell coverage, cross-checks.
The previous POWER-only grid is preserved in `data/processed/archive/earth_grid_power_only_v1.csv`.
MODIS/GPM-derived dimensions cover only the months listed in the metadata (currently all 12 months of 2024: a single year). With fewer months the build labels them PARTIAL SEASONAL.

## 8. Mission layer (v2) — added
`data/experiments.json` (12 scenarios → existing purposes, NASA sources, limits), `data/target_evidence.csv` / `target_evidence_summary.json`, `data/known_analogs.json`, `data/validation_summary.json`.
New endpoints: `GET /experiments`, `GET /data_status`, `GET /mission/recommend?experiment=&target=&allow_unverified=`, `GET /validation`.
`/health` additionally returns `data_source` and `is_synthetic_sample`. The API refuses to start without `earth_grid.csv` unless `ASTRANOVUS_ALLOW_SAMPLE=1`.
Data state (UI layer): `unavailable` if a gate dimension has no data or under 50% of weighted criteria have data; `partial` if any dimension is missing or a proxy; else `ready`.

## 9. Features file (v3)
`earth_grid_features.csv` additionally holds: `dem_*` (elevation, relief, slope, roughness, `dem_source` SRTMGL30 or NSIDC-0422), `emis_delta_*` (silicate emissivity index per month and mean; `emis_delta_bare` for bare-ground cells), `snow_mean_valid_pct`, `perennial_snow_ice`, and per-cell `D3/D4/D5/D6/D8_missing_reason` text for every empty dimension value (empty means "no data" and always has a reason).
`/mission/recommend` regions carry `lat/lon` equal to a real grid cell (the best cell), `centroid`, `country`, `surface` (coarse terrain/snow context), `terrain` (30 m check), and `missing_reason` on empty dimensions. The response also returns `n_cells_excluded_unverified` and `custom_weights`.
