# ASTRANOVUS — NASA Space Apps 2026 (Team Astravant)

**Challenge:** *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars.*

ASTRANOVUS is an independent research prototype (not an official NASA tool, rating or landing-site certification).
You choose **Moon or Mars → an experiment you want to test → a compatible planetary reference site**, and an explainable
Python engine ranks the Earth regions that best fit that purpose, showing the NASA data behind every number, what is
missing, and what Earth cannot reproduce.

## Architecture
```
NASA POWER + MODIS (MOD11C3, MOD13C2, MOD10CM) + GPM IMERG  --scripts/build_earth_grid.py-->  data/processed/earth_grid.csv (+ features, metadata)
data/targets.json (reference sites) + data/purposes.json (mission profiles) + data/experiments.json (12 scenarios)
                         |
        model/scoring_core.py + model/recommend.py   (explainable weighted similarity, gates, regions)
                         |
        backend/main.py (+ backend/mission_api.py)   FastAPI
                         |
        frontend/ (React + Vite + TypeScript + Tailwind + Leaflet + globe)
```
No scoring happens in the browser.

## Run locally
```bash
# one-time: isolated data/backend environment (Python 3.12)
py -3.12 -m venv .venv-data
.venv-data/Scripts/pip install -r requirements-data.txt -r backend/requirements.txt

# backend (terminal 1)
.venv-data/Scripts/python -m uvicorn backend.main:app --port 8000

# frontend (terminal 2)
cd frontend && npm install && npm run dev        # http://localhost:5173
```
The API refuses to start without `data/processed/earth_grid.csv` (no silent synthetic fallback). For UI-only work with the
synthetic sample set `ASTRANOVUS_ALLOW_SAMPLE=1`; the UI then shows a red warning banner.

## Rebuild the Earth grid from the downloaded NASA files
```bash
.venv-data/Scripts/python scripts/build_earth_grid.py        # reads data/raw/*, never modifies it; backs up the old grid
python scripts/validate_data.py
python scripts/build_target_evidence.py
python scripts/validate_known_analogs.py                     # writes docs/VALIDATION.md
python scripts/sensitivity_analysis.py                        # writes data/sensitivity_summary.json
python scripts/experiment_validation.py                       # writes docs/EXPERIMENT_VALIDATION.md
python scripts/build_planetary_measurements.py                # writes data/planetary_measurements.csv/.json
python scripts/build_analog_dataset_v3.py                     # writes data/analog_dataset_v3.json and the frozen cohort file
python scripts/validate_v3.py                                 # development stage; add --final to score the frozen cohort once
python scripts/diagnose_targets.py; python scripts/d4_analysis.py; python scripts/ranking_stability.py
```

## Environment variables
| Variable | Where | Purpose |
|---|---|---|
| `ASTRANOVUS_ENV=production` | API | refuses wildcard CORS |
| `ASTRANOVUS_CORS_ORIGINS` | API | comma-separated frontend origins |
| `ASTRANOVUS_ALLOW_SAMPLE=1` | API | local UI work only: allow the SYNTHETIC sample grid (red banner) |
| `VITE_API_URL` | frontend build | API base URL (default `/api`, proxied to localhost:8000 in dev) |

## Tests
```bash
.venv-data/Scripts/python -m pytest -q tests    # engine + API (real grid)
cd frontend && npm run lint && npm test && npm run build
```

## Honest status
* Real NASA-derived grid: 3,435 land cells at 2.5 degrees (about 280 km) incl. Antarctica. D1 cold, D2 aridity, D7 light (NASA POWER, annual); D3 barren (MODIS NDVI), D6 ice **proxy** (MODIS snow cover), D8 thermal swing (MODIS land-surface temperature), D5 rock-composition **proxy** (NASA ASTER emissivity, bare ground only, 13% of cells) - MODIS vegetation/temperature and GPM are calendar year 2024 (one year); MODIS snow is a 2015-2024 climatology.
* D4 terrain: NASA SRTMGL30 (~1 km) plus the NSIDC Antarctic 1 km DEM, whole-cell relief only; a separate 30 m SRTM check exists for top candidate regions.
* Moon/Mars reference-site rules are team drafts; `docs/TARGET_EVIDENCE.md` shows which rules have retrieved sources (32 of 49 rows) and which were retired. Real Moon Trek / Mars Trek values still needed: `docs/MANUAL_EVIDENCE_NEEDED.md`.
* Results are candidate **areas** (2.5 degree cells), not verified ground-test sites. See `docs/PROJECT_STATUS.md` for everything blocked or pending.

## Docs
`docs/METHODOLOGY.md` · `docs/DATA_CONTRACT.md` · `docs/DATA_SOURCES.md` · `docs/TARGET_EVIDENCE.md` · `docs/VALIDATION.md` · `docs/SCIENTIFIC_VALIDATION_REPORT.md` · `docs/PLANETARY_EVIDENCE_REPORT.md` · `docs/EXPERIMENT_VALIDATION.md` · `docs/SCIENTIFIC_VALIDATION_REPORT_V3.md` · `docs/ANALOG_DATASET_V3.md` ·
`docs/PROJECT_STATUS.md` · `docs/SOLUTION.md` · `docs/MANUAL_EVIDENCE_NEEDED.md` · `docs/PRE_DEPLOYMENT_CHECKLIST.md` · `docs/DEPLOYMENT.md` · `docs/SUBMISSION.md` · `docs/PROJECT_HANDOFF.md` (history)

## Rules
Never change a column/field name without telling everyone. `scripts/validate_data.py` must pass before every push.
All data are attributed to NASA/NSIDC/LP DAAC/GES DISC products listed in `docs/METHODOLOGY.md`.
