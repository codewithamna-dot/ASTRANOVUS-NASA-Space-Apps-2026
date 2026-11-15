"""Purpose-aware recommendation: body -> purpose -> best Earth REGIONS with reasons, caveats, NASA evidence."""
from __future__ import annotations
import numpy as np, pandas as pd
from model.scoring_core import score_grid, dim_similarity


def apply_purpose(target: dict, purpose: dict) -> dict:
    """Same target, weights multiplied by the purpose (what matters most for THIS mission goal)."""
    t = {**target, "rules": {}}
    for dim, r in target["rules"].items():
        r2 = dict(r); r2["weight"] = r["weight"] * purpose.get("multipliers", {}).get(dim, 1.0)
        t["rules"][dim] = r2
    return t


def _gate_ok(row, gates):
    """Returns (passes, unverified_notes). Missing data never silently passes: it is flagged."""
    notes = []
    for g in gates:
        v = row.get(g["dim"], np.nan)
        if pd.isna(v):
            notes.append(f"unverified: {g['dim']} has no data yet ({g['why']})"); continue
        ok = v >= g["value"] if g["op"] == ">=" else v <= g["value"]
        if not ok: return False, notes
    return True, notes


def _components(pts: np.ndarray, eps: float) -> list[int]:
    n = len(pts); parent = list(range(n))
    def find(a):
        while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
        return a
    for i in range(n):
        d = np.hypot(pts[:, 0] - pts[i, 0], (pts[:, 1] - pts[i, 1]) * np.cos(np.radians(pts[i, 0])))
        for j in np.where(d <= eps)[0]:
            if j > i: parent[find(j)] = find(i)
    return [find(i) for i in range(n)]


def _peak_regions(pts: np.ndarray, radius_deg: float) -> list[int]:
    """Peak-seeded regions. `pts` rows are (lat, lon) sorted best-score first. Each unassigned cell, taken in score
    order, becomes a region seed and claims every still-unassigned cell within `radius_deg` (great-circle). This keeps
    regions bounded: a continent-sized plateau of high scores becomes several distinct regions instead of one blob."""
    lat, lon = np.radians(pts[:, 0]), np.radians(pts[:, 1])
    label = np.full(len(pts), -1)
    for i in range(len(pts)):
        if label[i] >= 0:
            continue
        cosd = np.sin(lat[i]) * np.sin(lat) + np.cos(lat[i]) * np.cos(lat) * np.cos(lon - lon[i])
        d = np.degrees(np.arccos(np.clip(cosd, -1, 1)))
        label[(label < 0) & (d <= radius_deg)] = i
    return label.tolist()


def recommend(grid, target, purpose, dims_meta, min_coverage=0.4, top_regions=10, top_pct=0.15, region_radius_deg=15.0, rank_by="score"):
    t = apply_purpose(target, purpose)
    sc = score_grid(grid, t).dropna(subset=["score"])
    sc = sc[sc.coverage >= min_coverage]
    g = grid.set_index("cell_id")
    keep, notes_by = [], {}
    for r in sc.itertuples():
        ok, notes = _gate_ok(g.loc[r.cell_id], purpose.get("gates", []))
        if ok: keep.append(r.cell_id); notes_by[r.cell_id] = notes
    sc = sc[sc.cell_id.isin(keep)]
    if sc.empty: return {"regions": [], "n_cells_passed": 0}
    col = "score_adj" if rank_by == "adjusted" else "score"     # ranking basis (default keeps the original behaviour)
    cut = sc[col].quantile(1 - top_pct)
    top = sc[sc[col] >= cut].sort_values(col, ascending=False, kind="stable").reset_index(drop=True)
    top["comp"] = _peak_regions(top[["lat", "lon"]].to_numpy(), region_radius_deg)
    src = {d["id"]: d["earth_source"] for d in dims_meta}
    regions = []
    for _, grp in top.groupby("comp"):
        best = grp.loc[grp[col].idxmax()]; row = g.loc[best.cell_id]
        rows = []
        for dim, rule in t["rules"].items():
            p = row.get(dim, np.nan)
            if pd.isna(p) or rule["weight"] <= 0: continue
            s = float(dim_similarity(np.array([p]), rule)[0])
            rows.append({"dimension": dim, "percentile": round(float(p), 3), "rule": rule["rule"],
                         "weight": round(rule["weight"], 2), "similarity": round(s, 3), "source": src.get(dim, "")})
        rows.sort(key=lambda x: -x["similarity"] * x["weight"])
        missing = [d for d, r in t["rules"].items() if pd.isna(row.get(d, np.nan)) and r["weight"] > 0]
        conf = "high" if best.coverage >= 0.85 and len(grp) >= 3 else "medium" if best.coverage >= 0.6 else "low"
        regions.append({
            "lat": round(float(grp.lat.mean()), 2), "lon": round(float(grp.lon.mean()), 2),
            "best_cell": {"lat": float(best.lat), "lon": float(best.lon)},
            "n_cells": int(len(grp)), "best_score": float(best.score), "evidence_adjusted_score": float(best.score_adj), "mean_score": round(float(grp.score.mean()), 2),
            "coverage": float(best.coverage), "confidence": conf,
            "why_match": [r for r in rows if r["similarity"] >= 0.7][:3],
            "weak_points": [r for r in rows if r["similarity"] < 0.5][:3],
            "missing_data": missing, "notes": notes_by.get(int(best.cell_id), []),
        })
    regions.sort(key=lambda r: (-(r["evidence_adjusted_score"] if rank_by == "adjusted" else r["best_score"]), -r["n_cells"]))
    for i, r in enumerate(regions[:top_regions], 1): r["rank"] = i
    return {"regions": regions[:top_regions], "n_cells_passed": int(len(sc)),
            "target": target["id"], "ranking_basis": "evidence-adjusted score" if rank_by == "adjusted" else "raw similarity score", "weights_used": {d: round(r["weight"], 2) for d, r in t["rules"].items()}}
