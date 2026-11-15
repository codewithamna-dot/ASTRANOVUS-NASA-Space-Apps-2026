# ASTRANOVUS API (FastAPI). Build from the repo root:  docker build -t astranovus-api .
# Run:  docker run -p 8000:8000 -e ASTRANOVUS_ENV=production -e ASTRANOVUS_CORS_ORIGINS=https://your-frontend.example astranovus-api
FROM python:3.12-slim
WORKDIR /app
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
COPY backend backend
COPY model model
COPY data/dimensions.json data/targets.json data/purposes.json data/experiments.json data/target_evidence_summary.json data/target_evidence.csv data/planetary_measurements.csv data/validation_summary.json data/target_readiness.json data/ranking_stability.json data/validation_v3_summary.json data/
COPY data/geo data/geo
COPY data/processed/earth_grid.csv data/processed/earth_grid_features.csv data/processed/earth_grid_metadata.json data/processed/stage2.json data/processed/
# No synthetic fallback in production: the API refuses to start without data/processed/earth_grid.csv.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
