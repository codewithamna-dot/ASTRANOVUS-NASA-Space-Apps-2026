# Deployment (prepared, nothing published)

**Recommended:** frontend on **Vercel** (static Vite build) and backend on **Render** (Docker web service). The API is small (pandas + 3,435-row grid),
so Render's free/starter tier is enough. Nothing has been deployed; connecting accounts is up to you.

## Backend (Render)
1. Push the repo to GitHub (your decision), then in Render choose *Blueprint* → `render.yaml` (or *New Web Service → Docker*, path `./Dockerfile`).
2. Set `ASTRANOVUS_CORS_ORIGINS` to your frontend origin (comma-separated for several).
3. Health check: `GET /health` returns `data_source` and `is_synthetic_sample`. The container refuses to start if `earth_grid.csv` is absent (no synthetic fallback).
4. Verify: `GET /data_status` must show `is_synthetic_sample: false`.

## Frontend (Vercel)
1. Project root `frontend/`; `vercel.json` is included. Environment variable: `VITE_API_URL=https://<your-render-service>.onrender.com`.
2. Build `npm run build`, output `dist`.

## Files that must be tracked for the API
`data/processed/earth_grid.csv`, `earth_grid_metadata.json`, `data/*.json`, `data/target_evidence_summary.json`, `data/validation_summary.json`
(the `.gitignore` now un-ignores the small processed outputs; `data/raw` stays ignored).

## Final pre-submission check
Open the deployed app → Methodology page: build date, MODIS/GPM months and validation numbers must appear; no red synthetic-data banner.
