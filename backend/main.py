"""FastAPI backend. Run from repo root:  uvicorn backend.main:app --reload --port 8000"""
import json, os, pathlib
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from model.scoring_core import score_grid, explain_cell
from model.recommend import recommend as _recommend

ROOT = pathlib.Path(__file__).resolve().parents[1]
real = ROOT / "data/processed/earth_grid.csv"
GRID_IS_SAMPLE = not real.exists()   # exposed via /health so the UI can warn about synthetic data
if GRID_IS_SAMPLE and os.environ.get("ASTRANOVUS_ALLOW_SAMPLE") != "1":
    # Production safety: never silently serve the synthetic placeholder grid.
    raise RuntimeError(
        "data/processed/earth_grid.csv is missing. Build it (scripts/build_earth_grid.py) or, for local UI "
        "development only, set ASTRANOVUS_ALLOW_SAMPLE=1 to use the SYNTHETIC sample grid.")
GRID = pd.read_csv(real if real.exists() else ROOT / "data/sample/earth_grid_sample.csv")
TARGETS = {t["id"]: t for t in json.load(open(ROOT / "data/targets.json"))}
DIMENSIONS = json.load(open(ROOT / "data/dimensions.json"))
PURPOSES = {p["id"]: p for p in json.load(open(ROOT / "data/purposes.json"))}

app = FastAPI(title="ASTRANOVUS API")
_origins = [o.strip() for o in os.environ.get("ASTRANOVUS_CORS_ORIGINS", "*").split(",") if o.strip()]
if os.environ.get("ASTRANOVUS_ENV") == "production" and "*" in _origins:
    raise RuntimeError("ASTRANOVUS_ENV=production requires ASTRANOVUS_CORS_ORIGINS to list the frontend origin(s), not '*'.")
app.add_middleware(CORSMiddleware, allow_origins=_origins, allow_methods=["GET", "POST"], allow_headers=["*"])


def _target(tid):
    if tid not in TARGETS: raise HTTPException(404, f"unknown target {tid}")
    return TARGETS[tid]


def _clean(df):
    return json.loads(df.replace({np.nan: None}).to_json(orient="records"))


@app.get("/health")
def health(): return {"ok": True, "cells": len(GRID), "targets": len(TARGETS),
                      "data_source": "SYNTHETIC SAMPLE (placeholder)" if GRID_IS_SAMPLE else "data/processed/earth_grid.csv",
                      "is_synthetic_sample": GRID_IS_SAMPLE}

@app.get("/targets")
def targets(): return list(TARGETS.values())

@app.get("/dimensions")
def dimensions(): return DIMENSIONS

@app.get("/score")
def score(target: str, min_score: float = 0, limit: int = 5000):
    s = score_grid(GRID, _target(target)).dropna(subset=["score"])
    s = s[s.score >= min_score].sort_values("score", ascending=False).head(limit)
    return _clean(s)

@app.post("/score_custom")
def score_custom(body: dict, min_score: float = 0, limit: int = 5000):
    t = body.get("target")
    if not t or "rules" not in t: raise HTTPException(422, "body must be {'target': {'rules': {...}}}")
    s = score_grid(GRID, t).dropna(subset=["score"])
    s = s[s.score >= min_score].sort_values("score", ascending=False).head(limit)
    return _clean(s)

def _nearest(lat, lon):
    dlon = (GRID.lon - lon + 180) % 360 - 180      # wrap across the date line
    i = ((GRID.lat - lat) ** 2 + (dlon * np.cos(np.radians(lat))) ** 2).idxmin()
    return GRID.loc[i]

@app.get("/site")
def site(lat: float, lon: float, target: str):
    t = _target(target); row = _nearest(lat, lon)
    sc = score_grid(GRID.loc[[row.name]], t).iloc[0]
    return {"cell_id": int(row.cell_id), "lat": float(row.lat), "lon": float(row.lon),
            "score": None if pd.isna(sc.score) else float(sc.score), "coverage": float(sc.coverage),
            "breakdown": explain_cell(row, t)}

@app.get("/compare")
def compare(lat: float, lon: float):
    row = _nearest(lat, lon); out = []
    for t in TARGETS.values():
        sc = score_grid(GRID.loc[[row.name]], t).iloc[0]
        out.append({"target": t["id"], "name": t["name"], "score": None if pd.isna(sc.score) else float(sc.score)})
    return {"cell_id": int(row.cell_id), "lat": float(row.lat), "lon": float(row.lon), "scores": out}


@app.get("/purposes")
def purposes(body: str | None = None):
    return [p for p in PURPOSES.values() if body is None or body in p["bodies"]]

@app.get("/recommend")
def recommend(body: str, purpose: str, target: str | None = None, min_coverage: float = 0.4, top: int = 10):
    """Main endpoint: body (moon|mars) + purpose id -> best Earth regions with reasons."""
    if purpose not in PURPOSES: raise HTTPException(404, f"unknown purpose {purpose}")
    pu = PURPOSES[purpose]
    allowed = [t for t in pu["targets"] if t in TARGETS and TARGETS[t]["body"] == body]
    if not allowed: raise HTTPException(422, f"purpose {purpose} has no {body} targets")
    tid = target or allowed[0]
    if tid not in allowed: raise HTTPException(422, f"target {tid} not valid for this body/purpose; use one of {allowed}")
    out = _recommend(GRID, TARGETS[tid], pu, DIMENSIONS, min_coverage=min_coverage, top_regions=top)
    out.update({"body": body, "purpose": pu, "allowed_targets": [TARGETS[t] for t in allowed], "target_info": TARGETS[tid]})
    return out


# --- Mission / experiment layer (additive; uses the same engine, see backend/mission_api.py) ---
from backend.mission_api import create_router  # noqa: E402

app.include_router(create_router(
    GRID, TARGETS, DIMENSIONS, PURPOSES, ROOT, GRID_IS_SAMPLE,
    "earth_grid_sample.csv (SYNTHETIC)" if GRID_IS_SAMPLE else "earth_grid.csv"))
