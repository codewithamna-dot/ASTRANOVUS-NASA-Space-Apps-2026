> **HISTORICAL DOCUMENT.** Written when the project moved from a chat; many statements below (missing parsers, 629-cell grid, no terrain, etc.) are outdated. Current facts: `docs/PROJECT_STATUS.md`.

# PROJECT_HANDOFF.md — ASTRANOVUS (NASA Space Apps 2026)

**Purpose of this document:** This project is being migrated from a claude.ai chat conversation (where files were exchanged manually, one at a time, because live local file access could never be established) to Claude Code Desktop, which has direct read/write access to the local project folder. This document is the complete handoff so a new agent (or a human) can continue without re-reading the old chat.

**Status marking convention used throughout this doc:**
- ✅ **Built & sandbox-tested** — code was written and tested against synthetic/mock data in the assistant's own sandbox. Logic is believed correct but was never run against the user's real files or real NASA servers (sandbox has no network access to NASA).
- 🟡 **Run on user's machine, partially confirmed** — the user actually executed this and reported some output, but full verification is incomplete.
- ⬜ **Not started / not written yet**
- ⚠️ **Known issue, risk, or unresolved conflict** — flagged explicitly, do not silently resolve.

Nothing below is invented. Where something is uncertain (e.g., exact current state of a file on the user's disk), it is explicitly marked unverified rather than assumed.

---

## 1. Project Overview

**Team:** Astravant — NASA Space Apps Challenge 2026, Islamabad local event (Nov 14–15, 2026).

**Challenge chosen:** *"Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars."*

**Problem statement (as understood from the challenge):** Use open Earth, Moon and Mars data to find and describe places on Earth (deserts, polar regions, volcanic ground, caves, etc.) that resemble candidate lunar/Martian base-site environments, so NASA/partners can use them as test sites for hardware, operations, or science rehearsal.

**Team composition (original plan, from earlier proposal documents — see §12 "Superseded Material"):**
- 2 boys — on-site in Islamabad
- 4 girls — remote

**Project name history:** Originally **TerraTwin**, renamed to **ASTRANOVUS** partway through development (all code, titles, and API names were updated — see §6).

**Core idea (current, pivoted design):** A purpose-driven recommender, not just a static global scoring map:

> User picks a **body** (Moon or Mars) → picks a **mission purpose** (why they need an Earth analog — e.g. testing ISRU water extraction, rover mobility, habitat construction) → picks a **reference site** (specific Moon/Mars target) → the app returns the **best-matching Earth regions**, each with:
> - a numeric score (0–100)
> - *why* it matches (which environmental dimensions matched, citing the NASA dataset behind each)
> - weak points / mismatches
> - what data is still missing/unverified for that region
> - a confidence level (high/medium/low based on data coverage)

This pivot happened mid-session when the user clarified they wanted NASA's actual mission-purpose framing (testing hardware, ISRU, crew ops, science, etc.) to drive which Earth locations get suggested — not a generic "pick any target, see all scores" tool.

---

## 2. System Architecture

**Stack:**
- **Backend:** Python, FastAPI, pandas, numpy
- **Model/scoring:** pure-Python module, no ML framework (explainable, rules + weights, not a trained model)
- **Frontend:** React + Vite + TypeScript + react-leaflet (Leaflet map) — no Streamlit (an earlier proposal draft mentioned Streamlit; that was superseded)
- **Data:** CSV/JSON files on disk, read into memory by the backend at startup (no database)

**Data flow:**
```
NASA datasets (Earth)  →  data/processed/earth_grid.csv  ─┐
NASA datasets (Moon/Mars, read manually) → data/targets.json + data/target_evidence.csv ─┤→ model/scoring_core.py + model/recommend.py → backend/main.py (FastAPI) → frontend (React/Leaflet wizard UI)
Mission purposes (hand-authored, NASA-objective-based) → data/purposes.json ─┘
```

**Repo layout (relative to project root):**
```
data/
  dimensions.json        8 comparison dimensions + their NASA sources
  targets.json           9 Moon/Mars target profiles (rules + weights)
  purposes.json           6 mission-purpose profiles (multipliers + gates)
  known_analogs.json      12 known analog sites (positives) + 6 non-analog controls
  target_evidence.csv     49-row worksheet to ground target rules in real NASA data
  sample/earth_grid_sample.csv   SYNTHETIC placeholder grid (never for submission)
  processed/earth_grid.csv       REAL Earth grid (target location — see §7 for current status)
  processed/stage2.json          terrain verification output (not yet generated)
  processed/validation.csv       validation run output
  raw/                    downloaded NASA raw files (gitignored) + power_cache.json
model/
  scoring_core.py         dim_similarity(), score_grid(), explain_cell()
  recommend.py            apply_purpose(), gating, region-clustering, recommend()
backend/
  main.py                 FastAPI app and all endpoints
  requirements.txt
frontend/
  src/App.tsx              3-step wizard UI
  src/vite-env.d.ts
  package.json, vite.config.ts, tsconfig.json, index.html
scripts/
  make_sample_grid.py            synthetic grid generator (testing only)
  validate_data.py               schema/sanity checker — run before every commit
  fetch_power_grid.py            NASA POWER climatology → real grid builder
  download_earthdata_monthly.py  earthaccess downloader for MODIS/GPM products
  inspect_file.py                prints structure of any NASA HDF/HDF5/netCDF/raster file
  stage2_srtm.py                 SRTM terrain stats for top candidate regions
  validate_known_analogs.py      validates model against known analog sites
  apply_evidence.py              merges target_evidence.csv findings into targets.json
  power_fetch.py                 LEGACY — early single-point POWER test, superseded
  earthdata_search.py            LEGACY — early connectivity test, superseded
docs/
  DATA_CONTRACT.md        exact file/field formats — READ FIRST
  DATA_SOURCES.md         NASA dataset sourcing notes
  VALIDATION.md           generated validation report (see §9 — currently stale/synthetic)
README.md
.gitignore
```

**Local environment (user's machine, as observed):**
- Windows, path: `D:\OneDrive - Higher Education Commission\Documents\Astranovus-NASA`
- Editor: VS Code with integrated terminal
- Python **3.14** (unusually new — relevant to a known risk, see §10)
- Git repo already initialized and pushed to GitHub (user confirmed this was done)
- ⚠️ Project folder is inside **OneDrive** — large downloads can trigger slow sync; user was advised to pause OneDrive sync during big downloads.

---

## 3. Data Model (Detailed)

### 3.1 Dimensions (`data/dimensions.json`) ✅
8 fixed-id dimensions, each a 0–1 percentile among Earth land cells:
`D1_cold, D2_aridity, D3_barren, D4_terrain, D5_rock, D6_ice, D7_polar_light, D8_thermal_swing`

Each entry has `earth_source` and `target_source` fields naming the NASA dataset/instrument intended for that dimension (e.g. D1_cold → "NASA POWER climatology (T2M) [supporting]" for Earth, "LRO Diviner temperature maps" for Moon targets).

### 3.2 Earth grid (`data/processed/earth_grid.csv`) 🟡 — see §7 for exact current status
One row per land cell: `cell_id, lat, lon, D1_cold...D8_thermal_swing (0-1 or empty), country (optional)`.
**Empty means "no data" — must never be silently treated as 0.**

### 3.3 Targets (`data/targets.json`) ✅ (draft) / ⬜ (NASA-verified)
9 targets — 6 marked `"status": "core"`, 3 `"status": "optional"`:

| ID | Body | Name | Status |
|---|---|---|---|
| MOON_SP_RIDGE | moon | Lunar south-pole ridge (near Shackleton) | core |
| MOON_PSR | moon | Permanently shadowed crater floor | core |
| MOON_LAVATUBE | moon | Lunar lava-tube / pit region | core |
| MARS_ICE | mars | Mars mid-latitude ice (Arcadia/Utopia) | core |
| MARS_JEZERO | mars | Jezero crater delta | core |
| MARS_MUDVOLC | mars | Mars mud volcanoes | core |
| MARS_CHLORIDE | mars | Mars chloride/salt deposits | optional |
| MARS_AEOLIAN | mars | Mars dune fields | optional |
| MOON_MARE | moon | Lunar mare basalt plain | optional |

Each target has `rules: {dimension: {rule: "high"|"low"|"band", weight: 0-3 [, lo, hi]}}`, a `terrain_class` (flat/moderate/rugged — assistant's qualitative guess, **not yet verified against LOLA/MOLA**), and a `_note` field flagging it as a v0 draft.

⚠️ **This is explicitly the weakest part of the project as of handoff:** these rules/weights were written by the assistant from general literature knowledge, not checked against actual NASA Moon/Mars data. The `target_evidence.csv` + `apply_evidence.py` workflow (§3.5) was built specifically to fix this, but has only been partially executed (1 test row applied then reverted; real fill-in is still pending).

### 3.4 Purposes (`data/purposes.json`) ✅
6 mission-purpose profiles, the core of the pivoted design:

| ID | Name | NASA basis |
|---|---|---|
| ISRU_WATER | Water-ice extraction & processing | Artemis/Moon-to-Mars ISRU objectives |
| POWER_THERMAL | Power & thermal-extreme hardware testing | Surface power/thermal control needs |
| MOBILITY | Rover mobility, landing & autonomy testing | LTV / Mars rover traverse & landing needs |
| HABITAT | Habitat, construction & radiation shelter | Surface habitat / lava-tube shelter studies |
| SCIENCE | Geology & astrobiology science | Mars 2020 / Artemis science objectives |
| CREW_OPS | Crew operations & isolation analog missions | NEEMO/HI-SEAS/CHAPEA-style analog missions |

Each has: `bodies` (which bodies it applies to), `targets` (which target IDs it's relevant for), `nasa_basis` (text justification), `multipliers` (per-dimension weight multipliers — e.g. ISRU_WATER multiplies `D6_ice` weight ×2.0), and `gates` (hard pass/fail thresholds, e.g. ISRU_WATER requires `D6_ice >= 0.5` or the cell is dropped).

### 3.5 Evidence worksheet (`data/target_evidence.csv`) ✅ (structure) / ⬜ (content)
49 rows (one per target×dimension pair across all 9 targets). Columns: `target_id, dimension, rule, weight, where_to_check (NASA), what_to_confirm, value_found, source_url, checked_by, adjust_rule, adjust_weight`.

Intended workflow: a team member opens Moon Trek / Mars Trek / PDS for each row's suggested dataset, reads the actual value, fills `value_found` + `source_url` (+ optionally `adjust_rule`/`adjust_weight` if the real data disagrees with the draft rule), then runs `scripts/apply_evidence.py`, which stamps an `evidence` object onto each grounded rule in `targets.json` and applies any requested adjustments. Rows left blank stay "unverified" and the UI/backend report an honest `grounded/total` count (exposed via `/recommend`'s `evidence` field and shown in the frontend).

**Status: structure built and logic-tested (sandbox test: filled 1 row, ran script, confirmed `targets.json` updated and `/recommend` returned `{"grounded":1,"total":...}`, then reverted the test). The actual 49-row content has NOT been filled in by the team as of handoff.**

### 3.6 Known analogs (`data/known_analogs.json`) ✅ (structure) / ⚠️ (citations missing)
12 "positive" known analog sites (Atacama, Salar de Uyuni, Danakil, McMurdo Dry Valleys, Devon Island, Svalbard, Mars Desert Research Station/Utah, Mauna Kea, Askja/Iceland, Lanzarote lava tubes, Namib sand sea, Gobustan mud volcanoes) each tagged with which target(s) they're an analog for, plus 6 "negative" controls (Amazon, Congo, Borneo, Ganges plain, W. Europe farmland, US Midwest cropland) expected to score low on everything.

⚠️ Coordinates are approximate and **no individual literature citation has been attached per site yet**. The file itself contains a note: *"TEAM MUST ATTACH A CITATION per site before claiming it in the video/slides."* This has not been done.

---

## 4. Algorithm / Scoring Logic

### 4.1 `model/scoring_core.py` ✅ sandbox-tested
- `dim_similarity(percentile_array, rule)` → similarity 0–1 per dimension:
  - `high`: similarity = percentile
  - `low`: similarity = 1 − percentile
  - `band`: 1 inside [lo, hi], linearly decaying to 0 over a 0.5 distance outside the band
  - NaN (missing data) propagates as NaN, never silently defaults to 0.
- `score_grid(grid, target)` → for every cell: `S = 100 × Σ(w·s) / Σ(w with data)`, plus a `coverage = Σ(w with data) / Σ(w total)` column so low-data cells are flagged as less trustworthy rather than silently scored.
- `explain_cell(row, target)` → per-dimension breakdown for a single cell (percentile, rule, weight, similarity) — used for "why it matches" and the (planned) site detail bar chart.

### 4.2 `model/recommend.py` ✅ sandbox-tested
This is the heart of the pivoted design:
- `apply_purpose(target, purpose)` — multiplies each rule's weight by the purpose's multiplier for that dimension (same target, different emphasis depending on mission goal).
- `_gate_ok(row, gates)` — hard-fails any cell that doesn't meet a purpose's gate thresholds (e.g. "must have ice"). **Missing data on a gated dimension never silently passes — it's recorded as an "unverified" note rather than being treated as pass or fail.**
- `_components(points, eps)` — simple union-find spatial clustering so neighboring high-scoring cells get merged into one "region" instead of listing near-duplicate adjacent cells.
- `recommend(grid, target, purpose, dims_meta, min_coverage, top_regions, top_pct)` — orchestrates: scores the grid under the purpose-adjusted target → filters by `min_coverage` (default 0.4) and gates → clusters the top `top_pct` (default 15%) of passing cells into regions → for each region's best cell, builds a full explanation (`why_match` / `weak_points` / `missing_data`), a `confidence` label (high/medium/low from coverage + cluster size), and returns the top N regions ranked by best score.

Sandbox test confirmed: calling `/recommend?body=moon&purpose=ISRU_WATER&target=MOON_PSR&top=3` against a synthetic grid returned ranked regions with sensible-looking `why_match` reasons (dominated by D6_ice/D1_cold/D7_polar_light, as expected given ISRU_WATER's multipliers) and correctly rejected an invalid body/target combo with HTTP 422.

---

## 5. Backend API (`backend/main.py`) ✅ sandbox-tested

Loads `GRID`, `TARGETS`, `DIMENSIONS`, `PURPOSES`, and `STAGE2` (if `data/processed/stage2.json` exists) from disk at startup — **falls back to `data/sample/earth_grid_sample.csv` if `data/processed/earth_grid.csv` doesn't exist**, so the app always runs, but will silently be using placeholder data if the real file is missing. This fallback is convenient for development but is a real risk for the final submission (see §10).

| Endpoint | Purpose |
|---|---|
| `GET /health` | `{"ok": true, "cells": N, "targets": N}` |
| `GET /targets` | list all targets |
| `GET /dimensions` | list the 8 dimensions + sources |
| `GET /purposes?body=moon\|mars` | list purposes applicable to a body |
| `GET /score?target=ID&min_score=&limit=` | raw per-cell scores for one target (legacy/simple endpoint, used by the original v1 UI before the pivot) |
| `POST /score_custom` | score with user-supplied custom target rules |
| `GET /site?lat=&lon=&target=` | per-dimension breakdown for the nearest cell to a point |
| `GET /compare?lat=&lon=` | one cell's score against every target |
| **`GET /recommend?body=&purpose=&target=&min_coverage=&top=`** | **Main endpoint.** Returns ranked regions (see §4.2) plus `allowed_targets`, `target_info`, the purpose object, `n_cells_passed`, `weights_used`, a `stage2` block attached to each region if `data/processed/stage2.json` has data for that cell, and an `evidence: {grounded, total}` summary for the chosen target's rule-grounding coverage. |

---

## 6. Frontend (`frontend/src/App.tsx`) ✅ sandbox type-checked & built / ⚠️ not confirmed rendering by user yet

**Current (pivoted) UI is a 3-step wizard**, replacing the original simple "pick a target from a dropdown, see a heatmap" v1 UI:

1. **Step 1 — Body:** two buttons, Moon / Mars.
2. **Step 2 — Purpose:** clickable cards for each applicable mission purpose (name + the plain-language "question" framing, e.g. "We want to test digging up and processing water ice"), fetched from `/purposes?body=`.
3. **Step 3 — Reference site + results:** a dropdown of allowed targets for that body/purpose, target description, the purpose's NASA basis text, an evidence-coverage line (color-coded green if fully grounded, amber otherwise), then a ranked list of "Best Earth regions" (score, confidence badge, lat/lon, cell count). Clicking a region flies the Leaflet map to it and shows a detail panel: why-match reasons (with NASA source name per dimension), weak points, a Stage-2 SRTM terrain block (slope/relief/terrain class vs. what the target wants, with a match/partial/mismatch verdict), missing-data warnings, and any gate-related "unverified" notes.

⚠️ **Important distinction:** a browser screenshot the user shared mid-session (showing colored dots, a target dropdown, and a "Min score" slider, with real POWER-derived data and "483 cells shown") was from the **older, pre-pivot v1 UI** — before this 3-step wizard was built. **The new wizard UI has been build-tested (TypeScript compiles, Vite build succeeds) in the sandbox only. It has not yet been confirmed running correctly in the user's actual browser.**

---

## 7. Data Pipeline Status — THIS IS THE MOST CRITICAL SECTION

### 7.1 NASA POWER climatology (`scripts/fetch_power_grid.py`) 🟡
- ✅ Built and sandbox-tested (with a mocked fetch function, since the sandbox cannot reach NASA's servers).
- 🟡 **User actually ran this successfully against the real NASA POWER API** (no login required — it's an open REST API) and confirmed a working map with real data (colored dots, varying by target/slider) in the browser — **but this was before the global-grid extension and before the purpose/recommend pivot.**
- Computes real percentiles for **D1_cold, D2_aridity, D7_polar_light, D8_thermal_swing**, plus a **proxy** for **D6_ice** (share of months with mean temp < 0°C, derived from POWER's monthly T2M — explicitly labeled as a placeholder pending real snow/ice data).
- **D3_barren, D4_terrain, D5_rock are left empty** by this script — no data source for them yet at the time it was written.
- Mid-session, this script was extended: (a) grid changed from a limited latitude range to full global `-90..90`, (b) the D6_ice proxy was added. ⚠️ **Unverified: it is not confirmed whether the user re-ran this updated version** after being given it, or whether `data/processed/earth_grid.csv` on disk still reflects the earlier, narrower/pre-proxy run.
- Usage: `python scripts/fetch_power_grid.py` (default 5° step) or `python scripts/fetch_power_grid.py 2` for a finer 2° grid (slower). Caches raw API responses to `data/raw/power_cache.json` (safe to interrupt/resume).

### 7.2 MODIS/GPM monthly products (`scripts/download_earthdata_monthly.py`) 🟡
- ✅ Built, including two bug fixes made live during the session:
  1. **Version mismatch bug:** NSIDC's `MOD10CM` used version string `"61"` while the script originally only tried `"061"`, returning 0 results. Fixed to try `061` → `61` → no-version-filter in sequence.
  2. **Crash-on-empty-results bug:** calling `earthaccess.download()` with an empty list raised an unhandled `ValueError`. Fixed to print a clear message and `continue` instead of crashing.
- Targets 4 products:

| Short name | Version | Gives us | Approx size/file |
|---|---|---|---|
| MOD11C3 | 061 | LST day/night monthly, 0.05° → D1_cold, D8_thermal_swing | ~100 MB |
| MOD13C2 | 061 | NDVI monthly, 0.05° → D3_barren | ~100 MB |
| MOD10CM | 061→61 | Snow cover monthly, 0.05° → D6_ice (real, replacing the POWER proxy) | ~40 MB |
| GPM_3IMERGM | 07 | Precipitation monthly → D2_aridity | ~30 MB |

- 🟡 **User confirmed, via `dir` output, that all four product folders (`data/raw/MOD11C3`, `MOD13C2`, `MOD10CM`, `GPM_3IMERGM`) exist under `data/raw/`.** Exact file counts/sizes inside each were requested but **not fully confirmed in a single clean listing** — the user's last `dir` screenshot showed the folders present but the panel was cut off before file-level detail for all four.
- ⚠️ **Two Earthdata authorization issues hit during download**, both tied to app-approval, not code bugs:
  - `EulaNotAccepted` for GPM_3IMERGM (GES DISC) — resolved by having the user approve the "NASA GESDISC DATA ARCHIVE" app under Earthdata → Applications → Authorized Apps.
  - MOD10CM initially returned "0 files" (this turned out to be the version-string bug above, not an auth issue, and was fixed in code).
  - **Not explicitly re-confirmed:** whether an NSIDC-specific EULA/app-approval was also needed and completed (the user was told to approve it pre-emptively but no confirmation of that specific approval was reported back).
- Usage: `python scripts/download_earthdata_monthly.py <PRODUCT> --pick 1,7` (Jan+Jul only, fast) was used first to de-risk; the user was later told they have ~15 hours and should run the **full 12-month** version (no `--pick` flag) for a proper annual climatology — ⚠️ **unverified whether the full-year download has been run.**

### 7.3 Reading the downloaded files into the grid — ⬜ NOT STARTED
This is the single biggest open gap. `scripts/inspect_file.py` was built (✅ sandbox-tested against synthetic HDF5/netCDF files, confirmed it can enumerate variables/shapes/attributes) specifically so the team could run it against one real downloaded file per product and paste the output back, so the assistant could write the exact parser (knowing real variable names, scale factors, fill values, etc.) rather than guessing.

**This step was never completed before the migration to Claude Code.** No real MODIS/GPM file has been inspected, and **no code exists yet that reads MOD11C3/MOD13C2/MOD10CM/GPM_3IMERGM into `earth_grid.csv`.** This is the top-priority next task (see §11).

⚠️ **Known risk flagged but not resolved:** `pip install pyhdf` (needed to read the classic-HDF4 `.hdf` files used by MOD11C3/MOD13C2/MOD10CM) is known to frequently fail to build on very new Python versions, and the user's machine runs **Python 3.14** (unusually new as of this project). This was flagged to the user as "if this fails, tell me, we'll find another way (h5py-based reader, GDAL, or manual file attachment)" — **it has not yet been tested on the user's machine.**

### 7.4 Current best-guess state of `data/processed/earth_grid.csv`
⚠️ **Genuinely uncertain.** Possibilities, in order of likelihood based on the conversation:
1. Most likely: still the output of an earlier (possibly non-global, possibly pre-D6-proxy) run of `fetch_power_grid.py` — i.e., real POWER data for D1/D2/D7/D8, empty D3/D4/D5, and D6 either empty or proxy depending on which script version was last run.
2. Not yet updated to include MODIS/GPM-derived values (since no reader for those exists yet).

**Action for the new agent: do not assume this file's contents. Check its actual columns, null rates, and the script-version comment/log if any, and confirm with the user if unclear.**

---

## 8. Stage 2 — Terrain Verification (`scripts/stage2_srtm.py`) ✅ sandbox math-tested / ⬜ never run on real tiles

- Downloads NASA SRTMGL1 (30 m DEM) tiles only for the small set of top-candidate cells returned by `recommend()` across all purposes/targets (not the whole globe — deliberately cheap).
- Computes slope (via `np.gradient`), relief (P95−P5 elevation), and classifies `flat` (<5° mean slope) / `moderate` (5–15°) / `rugged` (>15°).
- Sandbox-tested the slope math directly: a synthetic flat tile correctly returned 0° mean slope; a synthetic tile with a 10 m/pixel ramp correctly returned ~19.7° (matches `arctan(10/30.9)`).
- SRTM coverage is 60°N to 56°S only — cells outside that range are explicitly marked `"covered": false` with a note, never faked.
- Needs a free Earthdata login (same account as §7.2). Results cached in `data/raw/srtm/` and written to `data/processed/stage2.json`.
- Usage: `python scripts/stage2_srtm.py` (interactive, asks y/n before downloading) or `--yes --top 3 --max 20` for non-interactive with limits.
- `backend/main.py` was updated to attach matching `stage2.json` entries to each region in `/recommend`'s response automatically (including a computed `terrain_match`: match/partial/mismatch vs. the target's `terrain_class`), and the frontend displays this.
- ⬜ **Never actually run against real SRTM tiles** — only the internal slope/relief math was unit-tested with synthetic elevation arrays.

---

## 9. Validation (`scripts/validate_known_analogs.py`) ✅ sandbox-run / ⚠️ results are currently meaningless

- Loads whichever grid exists (`data/processed/earth_grid.csv` if present, else the synthetic sample — and **says so explicitly in its own output**, including a `"PLACEHOLDER sample data - results are meaningless"` warning line when it detects it's using the sample).
- For each known analog site in `data/known_analogs.json`, finds the nearest grid cell and computes its **percentile rank** among all scored cells for the relevant target(s) — i.e., "this site scores better than X% of all land on Earth for this target."
- Computes a hit rate (top-10%, top-25%) and an **AUC** (probability a random known analog outranks a random non-analog control) as the headline validation metric.
- Writes `docs/VALIDATION.md` (human-readable table) and `data/processed/validation.csv` (raw numbers).
- **Only ever run once, against the synthetic sample grid, producing a report explicitly labeled as meaningless** (example output seen: AUC 0.78, median percentile 0.85 — on fake data, so these numbers mean nothing and must not be quoted anywhere).
- ⬜ **Has never been run against real data.** Must be re-run once `earth_grid.csv` contains real NASA-derived values.
- A later refinement discussed but **not yet implemented**: splitting known analogs into a "tuning" subset (used while adjusting target rules) and a held-out "test" subset (checked once, never used to tune) so the validation number is honest and not overfit.

---

## 10. Known Bugs, Limitations, and Unresolved Items (Consolidated)

1. ⚠️ **D3_barren, D4_terrain, D5_rock are currently empty** in the POWER-only grid. Real data for these depends on MOD13C2 (barren), the (unwritten) terrain pipeline/stage2, and EMIT (rock/mineral, not yet attempted at all).
2. ⚠️ **D6_ice is a proxy**, not real snow/ice data, until the MOD10CM reader exists.
3. ⚠️ **Target rules in `targets.json` are literature-based drafts, not verified against real NASA Moon/Mars data.** The grounding workflow (`target_evidence.csv` → `apply_evidence.py`) exists but is essentially unfilled.
4. ⚠️ **Known-analog site coordinates have no individual citations attached** — required before claiming them in the demo video or slides.
5. ⚠️ **Validation has only ever run on synthetic data** — the one existing `docs/VALIDATION.md` report is explicitly fake/placeholder and must not be used.
6. ⚠️ **`terrain_class` values on targets are the assistant's qualitative guesses**, flagged for verification against LOLA/MOLA.
7. ⬜ **No code exists yet to parse MOD11C3/MOD13C2/MOD10CM/GPM_3IMERGM files into the grid.** This is the single biggest remaining engineering task.
8. ⚠️ **`pyhdf` may fail to install on Python 3.14** (untested on the user's actual machine) — needed for HDF4 reading. Fallback options (h5py-based custom reader, GDAL, or manual file inspection via `inspect_file.py` output pasted into chat) were discussed but not needed yet because this step was never reached.
9. ⚠️ Two EulaNotAccepted / zero-result authorization issues were hit and fixed during downloads (§7.2) — **it is not 100% confirmed that every needed Earthdata "Authorized App" (LP DAAC, GES DISC, NSIDC) has been approved**, only that the ones that errored were fixed reactively.
10. ⚠️ **Backend silently falls back to the synthetic sample grid** if `data/processed/earth_grid.csv` doesn't exist. This is good for development resilience but dangerous for submission — a last-minute file-path mistake could result in a demo running on fake data without any obvious error.
11. ⚠️ **Live device-bridge connection between the claude.ai chat and the user's computer was attempted repeatedly and never succeeded** (`get_device_info` consistently returned "not connected"). This is *why* the whole project was exchanged file-by-file via chat attachments rather than edited directly, and is the explicit reason for this migration to Claude Code Desktop, which has direct local access.
12. ⚠️ **Deadline conflict, unresolved — must be verified from the official source, not assumed:**
    - Early in the project (before this session's later messages), research suggested the global Space Apps submission portal closes **Sunday Nov 15, 11:59 PM local time**.
    - Later in the session (Saturday ~19:36 local), the user stated **"we have around 15 hours left,"** which would imply a deadline around **Sunday ~10:30 AM local** — inconsistent with the 11:59 PM figure.
    - **Do not assume either number.** The team must check the official Space Apps team/challenge page for the actual local-event submission deadline before finalizing the timeline.
13. ⚠️ Project folder lives inside OneDrive — can slow syncing during large downloads; pausing OneDrive sync was recommended during big batch downloads.
14. ⚠️ **The frontend wizard UI (body→purpose→recommend, the current design) has not been visually confirmed working in the user's actual browser.** The one browser screenshot available is from the earlier, now-superseded simple dropdown+slider UI.
15. ℹ️ `scripts/power_fetch.py` and `scripts/earthdata_search.py` are early, now-superseded helper scripts (single-point test and connectivity-check only) — safe to ignore/delete, not part of the real pipeline anymore.

---

## 11. Next Steps, In Priority Order

1. **Verify what's actually on disk** right now (don't trust this document's guesses): check `data/raw/<product>/` file counts and sizes for all 4 MODIS/GPM products; check the actual current contents/columns/null-rates of `data/processed/earth_grid.csv`; check whether `data/processed/stage2.json` exists (it probably doesn't yet).
2. **Run `scripts/inspect_file.py`** against one real file from each of the 4 downloaded products to get exact variable names/shapes/scale factors/fill values. If `pyhdf` fails to install, report the exact error — do not skip this step silently.
3. **Write the real MODIS/GPM → `earth_grid.csv` reader** (this is the main missing piece): parse HDF4 (MOD11C3, MOD13C2, MOD10CM) and HDF5 (GPM_3IMERGM) files, apply scale/offset/fill-value cleaning, resample/aggregate the 0.05°–0.1° source grids onto the project's grid, convert to 0–1 percentiles per the data contract, and populate D1/D2/D3/D6/D8 for real (replacing the POWER-only values and the D6 proxy where coverage allows).
4. **Decide full-year vs. Jan/Jul-only** downloads: the user indicated there's enough time (~15 hrs) to do all 12 months for a proper annual climatology — confirm this has actually been run, or run it.
5. **Re-run `scripts/validate_data.py`** against the real, updated grid.
6. **Restart the backend and actually open the new wizard UI in a browser** to confirm the pivoted `/recommend`-based frontend genuinely works end-to-end with real data (this has never been visually confirmed).
7. **Fill in `data/target_evidence.csv`** — at minimum, all weight-3 rows for the 6 core targets — using Moon Trek / Mars Trek / PDS, then run `scripts/apply_evidence.py`.
8. **Run `scripts/stage2_srtm.py`** for real against the actual top candidate regions once real Earth data exists (so the candidates it picks are meaningful).
9. **Consider EMIT mineral data** for the top 5–10 regions (refining D5_rock/D3_barren) — optional/stretch, but it's one of the challenge's explicitly suggested datasets and currently entirely unused.
10. **Re-run `scripts/validate_known_analogs.py` against the real grid** and get genuine (not placeholder) numbers; consider the tuning/holdout split for honesty.
11. **Add individual citations** to every site in `data/known_analogs.json` before any claim based on it appears in the video or slides.
12. **UI polish**: weight-adjustment sliders, a proper site detail page with the per-dimension bar chart (data for this already exists via `explain_cell`/`/site`), a compare page, a methodology/sources page, and a NASA Worldview imagery panel for visual context on selected regions.
13. **Resolve the actual submission deadline** from the official source (see §10.12) before finalizing the remaining schedule.
14. **Deploy** frontend + backend (hosting choice not yet finalized in this conversation — Vercel/Netlify + Render/HF Spaces were mentioned in the original proposal docs as options, but not actually set up in this session).
15. **Record the demo** (30-second video with English subtitles, and/or ≤7 slides) and prepare submission text.
16. **Final end-to-end check** before submitting: confirm the live deployed app actually runs on real data, not the synthetic fallback.

---

## 12. Superseded / Historical Material (Context Only — Do Not Treat as Current Spec)

Before this session's architecture pivot, there was an earlier, broader proposal (documented in PDFs — `TerraTwin_Proposal_and_Workflow_v2.pdf` and six individual per-member PDFs — plus a Claude Docs artifact) describing:
- A full global scoring tool over ~300,000 Earth cells at 0.25° resolution, with DBSCAN-based "discovery" of novel analog sites and validation against known analogs, as a single continuous scoring/explore/discover app (no purpose-driven wizard).
- A 6-member role split: **Boy 1** = Earth data/AI (grid, heatmaps, discovery, Pakistani sites like Karakoram/Hingol/Khewra/Katpana); **Boy 2** = Moon/Mars data/AI (target profiles, `scoring_core.py`, validation); **Girl 1** = frontend shell/Explore map/Discover heatmap/weight sliders; **Girl 2** = frontend Site/Compare/Methodology pages + video/slides; **Girl 3** = backend FastAPI/schema/endpoints; **Girl 4** = backend/deploy/testing/submission.
- An hour-by-hour Saturday/Sunday timeline with specific checkpoint times, built around a (now possibly incorrect — see §10.12) assumed 9 PM Sunday internal target.

**This material is historical context, not the current spec.** The purpose-driven wizard design in this document (§1–§9) supersedes it. However:
- The **role-split idea is reasonable and could be reinstated** for the remaining work (e.g., re-assign §11's numbered tasks to specific people) — but as of this handoff, work has been proceeding as a **collective team effort without re-mapping new tasks to the original named roles.**
- Pakistani candidate sites (Karakoram, Hingol mud volcanoes, Khewra, Katpana) mentioned in the original proposal were **not carried forward** into `data/known_analogs.json` in this session's rebuild — if the team wants to keep that angle (a nice local-color hook for the demo), it should be re-added as additional positives in `known_analogs.json` with citations.

---

## 13. Setup / Run Instructions (Consolidated Command Reference)

**Backend:**
```bash
pip install -r backend/requirements.txt
python scripts/validate_data.py
uvicorn backend.main:app --reload --port 8000
```

**Frontend (separate terminal):**
```bash
cd frontend
npm install
npm run dev
```

**Real Earth data (NASA POWER, no login needed):**
```bash
python scripts/fetch_power_grid.py        # 5° step, global -90..90, ~10-15 min
python scripts/fetch_power_grid.py 2      # finer 2° step, slower
python scripts/validate_data.py
```

**MODIS/GPM downloads (needs free Earthdata login at urs.earthdata.nasa.gov):**
```bash
pip install earthaccess
python scripts/download_earthdata_monthly.py MOD11C3 --pick 1,7       # fast test, Jan+Jul only
python scripts/download_earthdata_monthly.py MOD11C3                  # full 12 months
python scripts/download_earthdata_monthly.py MOD13C2
python scripts/download_earthdata_monthly.py MOD10CM
python scripts/download_earthdata_monthly.py GPM_3IMERGM
```
If an `EulaNotAccepted` error appears, go to urs.earthdata.nasa.gov → Applications → Authorized Apps → Approve More Applications, and approve the relevant data center (LP DAAC / GES DISC / NSIDC).

**Inspect a downloaded file's structure:**
```bash
pip install pyhdf   # may fail on very new Python versions — report exact error if so
python scripts/inspect_file.py data/raw/MOD11C3/<filename>
```

**Terrain verification (needs the same Earthdata login):**
```bash
python scripts/stage2_srtm.py                     # interactive
python scripts/stage2_srtm.py --yes --top 3 --max 20   # non-interactive, limited
```

**Apply Moon/Mars evidence after filling the CSV:**
```bash
python scripts/apply_evidence.py
```

**Validation report:**
```bash
python scripts/validate_known_analogs.py
```

---

## 14. Summary for a New Agent Picking This Up

You are continuing a NASA Space Apps project called **ASTRANOVUS**. The architecture, data contract, scoring algorithm, and a purpose-driven recommendation API + wizard frontend are **built and internally tested**, but **real NASA Earth data integration is incomplete** (only NASA POWER climatology is confirmed working end-to-end; MODIS/GPM products are downloaded but have no parser yet), **Moon/Mars target rules are unverified drafts**, and **validation has only run on fake data**. The single most valuable next action is: inspect one real downloaded MODIS/GPM file, then write the real parser into `earth_grid.csv`. After that, work down the priority list in §11. Do not trust assumptions about current file contents — verify against the actual local filesystem first, since this handoff was written without direct access to it.
