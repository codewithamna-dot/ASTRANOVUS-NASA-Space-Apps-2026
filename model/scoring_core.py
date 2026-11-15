"""ASTRANOVUS scoring core. Pure functions, no I/O. See docs/DATA_CONTRACT.md section 4."""
from __future__ import annotations
import numpy as np
import pandas as pd

NEUTRAL_SCORE = 50.0   # chance-level similarity used for missing evidence in the adjusted score
DIMS = ["D1_cold", "D2_aridity", "D3_barren", "D4_terrain",
        "D5_rock", "D6_ice", "D7_polar_light", "D8_thermal_swing"]


def dim_similarity(p: np.ndarray, rule: dict) -> np.ndarray:
    """Similarity 0-1 for one dimension. NaN in -> NaN out (= no data)."""
    kind = rule["rule"]
    if kind == "high":
        return p
    if kind == "low":
        return 1.0 - p
    if kind == "band":
        lo, hi = rule["lo"], rule["hi"]
        dist = np.where(p < lo, lo - p, np.where(p > hi, p - hi, 0.0))
        return np.clip(1.0 - dist / 0.5, 0.0, 1.0)
    raise ValueError(f"unknown rule {kind!r}")


def score_grid(grid: pd.DataFrame, target: dict) -> pd.DataFrame:
    """Score every row of `grid` against `target`.
    Returns DataFrame[cell_id, lat, lon, score (0-100), coverage (0-1)]."""
    num = np.zeros(len(grid))
    den_have = np.zeros(len(grid))
    den_all = 0.0
    for dim, rule in target["rules"].items():
        w = float(rule["weight"])
        if w <= 0 or dim not in grid.columns:
            continue
        den_all += w
        s = dim_similarity(grid[dim].to_numpy(dtype=float), rule)
        have = ~np.isnan(s)
        num += np.where(have, w * np.nan_to_num(s), 0.0)
        den_have += np.where(have, w, 0.0)
    with np.errstate(invalid="ignore", divide="ignore"):
        score = np.where(den_have > 0, 100.0 * num / den_have, np.nan)
        cov = den_have / den_all if den_all > 0 else np.zeros(len(grid))
    out = grid[["cell_id", "lat", "lon"]].copy()
    out["score"] = np.round(score, 2)
    out["coverage"] = np.round(cov, 3)
    # Evidence-adjusted score: a dimension without data carries no evidence, so it is treated as chance-level (50) in
    # proportion to the weight that is missing. This stops cells with MISSING dimensions from out-ranking cells that were
    # actually checked on more criteria (documented coverage bias in docs/SCIENTIFIC_VALIDATION_REPORT.md).
    with np.errstate(invalid="ignore"):
        out["score_adj"] = np.round(np.where(np.isnan(score), np.nan, cov * score + (1.0 - cov) * NEUTRAL_SCORE), 2)
    return out


def explain_cell(row: pd.Series, target: dict) -> list[dict]:
    """Per-dimension breakdown for one cell (for the Site page / bar chart)."""
    rows = []
    for dim, rule in target["rules"].items():
        p = row.get(dim, np.nan)
        s = float(dim_similarity(np.array([p], dtype=float), rule)[0]) if pd.notna(p) else None
        rows.append({"dimension": dim, "percentile": None if pd.isna(p) else round(float(p), 3),
                     "rule": rule["rule"], "weight": rule["weight"],
                     "similarity": None if s is None else round(s, 3)})
    return rows
