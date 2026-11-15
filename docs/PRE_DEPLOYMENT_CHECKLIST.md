# Pre-deployment checklist (nothing has been deployed)

## Technical (done and verifiable locally)
- [x] `python scripts/validate_data.py` prints OK
- [x] `.venv-data/Scripts/python -m pytest -q tests` (engine, API, real-data provenance)
- [x] `cd frontend && npm run lint && npm test && npm run build`
- [x] The API refuses to start without `data/processed/earth_grid.csv` (no synthetic fallback)
- [x] `ASTRANOVUS_ENV=production` refuses wildcard CORS; set `ASTRANOVUS_CORS_ORIGINS` to the frontend origin
- [x] Container file set simulated locally (backend, model, data JSONs, data/geo, processed grid, features, metadata, stage2): the API starts and answers in production mode
- [ ] `docker build` on a machine with Docker (Docker is not available in this environment)

## Needs you
- [ ] Push `astranovus/full-integration` to GitHub (your decision)
- [ ] Create the Render service from `render.yaml` and set `ASTRANOVUS_CORS_ORIGINS`
- [ ] Create the Vercel project (root `frontend/`) and set `VITE_API_URL` to the Render URL
- [ ] After deploying, open the site: the Methodology page must show the build date, the 12 months of 2024 and the validation numbers; there must be no red synthetic-data banner
- [ ] Check the official Space Apps deadline and format yourself
- [ ] Decide on the larger downloads listed in `docs/PROJECT_STATUS.md`

## Hosting recommendation
Frontend on Vercel (static Vite build). Backend on Render (Docker web service, starter tier; the API holds a 3,435-row table in memory).
