"""Compare candidate definitions of D6 (snow-cover dimension) on existing verified MODIS data. Read-only.

    python scripts/d6_metric_comparison.py     # writes data/d6_metric_comparison.json

Candidates (all from the 2015-2024 MOD10CM monthly climatology already stored in earth_grid_features.csv)
  peak        maximum monthly snow cover                      (the dimension as built before 2026-11-16)
  mean        mean snow cover over observed months
  persistence share of observed months with snow cover >= 50 %
  minimum     minimum monthly snow cover (perennial cover)
Criteria (chosen BEFORE looking at benchmark scores, none uses the analog benchmark)
  1. saturation / ties: how many cells share the single maximum value (information loss for a percentile-ranked dimension)
  2. missing-data sensitivity: polar-night months are unobserved; bound the metric by filling them with 0 and with 100 and measure
     how much the cell ordering changes (Spearman between the two bounds; high = robust to the missing months)
  3. physical ordering: reference cells ordered by expected snow persistence (ice sheets > polar desert > seasonal-snow taiga > mountains >
     temperate > desert); count violations
  4. discrimination among EXPOSED-GROUND cells (the only cells the ground-defined ice targets can use after the exposed-surface rule)
  5. recommendation behaviour: change in the top-5 regions of every experiment-target pair that uses D6, through the real API code path
The frozen cohort is not used. The benchmark has only two D6-dependent development pairs and is reported for information only.
"""
import json
import pathlib
import sys

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))

REFS = [("Antarctic plateau", -78.75, 43.75, 6), ("Greenland interior", 71.25, -41.25, 6), ("Canadian polar desert (Devon area)", 76.25, -91.25, 5),
        ("Siberian taiga", 61.25, 101.25, 4), ("Tibetan plateau", 33.75, 88.75, 3), ("Alps", 46.25, 8.75, 2), ("Sahara", 21.25, 11.25, 0)]


def pct(s):
    r = s.rank(method="average", na_option="keep")
    return (r - 0.5) / s.notna().sum()


def candidates(feat):
    S = feat[[f"snow_pct_m{m:02d}" for m in range(1, 13)]]
    v = S.notna().sum(axis=1)
    ok = v >= 6
    return {"peak": feat.snow_peak_pct, "mean": S.mean(axis=1), "persistence": (S >= 50).sum(axis=1).where(ok) / v.where(ok), "minimum": S.min(axis=1).where(ok)}, S, v


def main():
    grid = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
    feat = pd.read_csv(ROOT / "data/processed/earth_grid_features.csv")
    cands, S, valid = candidates(feat)
    exposed = grid.D3_barren.notna().to_numpy()
    out = {"cells": len(feat), "cells_with_fewer_than_12_observed_months": int((valid < 12).sum()), "cells_with_fewer_than_6": int((valid < 6).sum()), "candidates": {}}
    pcts = {k: pct(s) for k, s in cands.items()}
    lat_ok = (valid < 12)
    # missing-month bounds for mean and persistence
    lo = S.fillna(0)
    hi = S.fillna(100)
    bounds = {"mean": (lo.mean(axis=1), hi.mean(axis=1)), "persistence": ((lo >= 50).mean(axis=1), (hi >= 50).mean(axis=1)), "peak": (lo.max(axis=1), hi.max(axis=1)), "minimum": (lo.min(axis=1), hi.min(axis=1))}
    for k, s in cands.items():
        p = pcts[k]
        a, b = bounds[k]
        bound_rho = float(pd.concat([pct(a), pct(b)], axis=1).corr(method="spearman").iloc[0, 1])
        refvals = []
        for name, la, lo_, expected in REFS:
            i = ((feat.lat - la) ** 2 + (feat.lon - lo_) ** 2).idxmin()
            refvals.append((name, expected, float(p.iloc[i]) if pd.notna(p.iloc[i]) else None))
        vio = 0
        for x in range(len(refvals)):
            for y in range(x + 1, len(refvals)):
                if refvals[x][2] is not None and refvals[y][2] is not None and refvals[x][1] > refvals[y][1] and refvals[x][2] < refvals[y][2] - 1e-9:
                    vio += 1
        ex = s[exposed & s.notna().to_numpy()]
        out["candidates"][k] = {
            "coverage": round(float(s.notna().mean()), 3), "share_tied_at_maximum": round(float((s >= s.max() - 1e-9).mean()), 3), "distinct_values": int(s.round(2).nunique()),
            "share_of_cells_at_zero": round(float((s <= 1e-9).mean()), 3),
            "spearman_vs_peak": round(float(pd.concat([p, pcts["peak"]], axis=1).dropna().corr(method="spearman").iloc[0, 1]), 3),
            "missing_month_bound_spearman": round(bound_rho, 3),
            "reference_order_violations": vio, "reference_percentiles": {n: v for n, _, v in refvals},
            "exposed_ground_cells": {"n": int(len(ex)), "distinct_values": int(ex.round(2).nunique()), "share_at_zero": round(float((ex <= 1e-9).mean()), 3), "share_at_maximum": round(float((ex >= s.max() - 1e-9).mean()), 3),
                                     "interquartile_range_of_percentile": round(float(pcts[k][exposed].quantile(0.75) - pcts[k][exposed].quantile(0.25)), 3)}}

    # recommendation behaviour through the real API code path
    from backend import main as app, mission_api

    def endpoints(g):
        router = mission_api.create_router(g, app.TARGETS, app.DIMENSIONS, app.PURPOSES, app.ROOT, app.GRID_IS_SAMPLE, "earth_grid.csv")
        return {r.path: r.endpoint for r in router.routes}

    def top(ep, exp, tid):
        r = ep["/mission/recommend"](experiment=exp, target=tid, min_coverage=0.4, top=5, allow_unverified=False, weights=None)
        return [(g["lat"], g["lon"]) for g in r["regions"]], [g["location_label"] for g in r["regions"][:3]]

    base_ep = endpoints(app.GRID)
    exps = base_ep["/experiments"]()["experiments"]
    uses = []
    for e in exps:
        gate_d6 = any(g["dim"] == "D6_ice" for g in e["purpose"]["gates"])
        for t in e["allowed_targets"]:
            if gate_d6 or float(t["rules"].get("D6_ice", {}).get("weight", 0)) > 0:
                uses.append((e["id"], t["id"]))
    out["pairs_using_D6"] = [f"{a}/{b}" for a, b in uses]
    out["recommendation_change"] = {}
    for k in ("mean", "persistence", "minimum"):
        g = app.GRID.copy()
        g["D6_ice"] = pcts[k].reindex(range(len(g))).to_numpy() if False else pcts[k].to_numpy()
        ep = endpoints(g)
        res = {}
        for exp, tid in uses:
            a, la = top(base_ep, exp, tid)
            b, lb = top(ep, exp, tid)
            res[f"{exp}/{tid}"] = {"jaccard_top5": round(len(set(a) & set(b)) / len(set(a) | set(b)), 2) if set(a) | set(b) else 1.0, "current_top3": la, "alternative_top3": lb}
        out["recommendation_change"][k] = res
    json.dump(out, open(ROOT / "data/d6_metric_comparison.json", "w", encoding="utf-8"), indent=1, default=str)
    for k, v in out["candidates"].items():
        print(k, {a: v[a] for a in ("coverage", "share_tied_at_maximum", "distinct_values", "missing_month_bound_spearman", "reference_order_violations")}, v["exposed_ground_cells"])
    for k, res in out["recommendation_change"].items():
        print(k, {p: r["jaccard_top5"] for p, r in res.items()})


if __name__ == "__main__":
    main()
