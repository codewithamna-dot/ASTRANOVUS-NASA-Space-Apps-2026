"""How often do the top-ranked recommendations change? (real API code path, 25 experiment-target pairs)

    python scripts/ranking_stability.py     # writes data/ranking_stability.json

Perturbations (each compared with the unperturbed top-5 regions)
  weights   : 100 draws of multiplicative dimension weights exp(N(0, 0.3)), clipped to the API's 0-3 range
  proxies   : D5, D6, D7 (composition / snow / light proxies) switched off
  missing   : 20 draws in which each dimension is blanked in a random 20% of cells (missing-data pattern)
  smoothness: how much the best cell's score differs from its neighbours (is "which cell" arbitrary?)
Reported: mean Jaccard of the top-5 best-cell sets, share of draws whose #1 region stays within 5 degrees of the original #1.
Measurement uncertainty of the inputs is NOT propagated: the Earth layers are percentile ranks of gridded products with no
per-cell uncertainty available; only weight, proxy, missing-data and resolution uncertainty are quantified here.
"""
import json
import pathlib
import sys

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
from validate_known_analogs import gc_dist  # noqa: E402

RNG = np.random.default_rng(20261116)
DIMS = ["D1_cold", "D2_aridity", "D3_barren", "D4_terrain", "D5_rock", "D6_ice", "D7_polar_light", "D8_thermal_swing"]


def endpoints(grid):
    from backend import main as app, mission_api
    router = mission_api.create_router(grid, app.TARGETS, app.DIMENSIONS, app.PURPOSES, app.ROOT, app.GRID_IS_SAMPLE, "earth_grid.csv")
    return {r.path: r.endpoint for r in router.routes}


def top(ep, exp, tid, weights=None):
    r = ep["/mission/recommend"](experiment=exp, target=tid, min_coverage=0.4, top=5, allow_unverified=False, weights=weights)
    return [(g["lat"], g["lon"]) for g in r["regions"]]


def jac(a, b):
    a, b = set(a), set(b)
    return len(a & b) / len(a | b) if a | b else 1.0


def same_top(a, b):
    return bool(a and b and float(gc_dist(a[0][0], a[0][1], b[0][0], b[0][1])) < 5.0)


def main():
    from backend import main as app
    ep = endpoints(app.GRID)
    exps = ep["/experiments"]()["experiments"]
    pairs = [(e["id"], t["id"]) for e in exps for t in e["allowed_targets"]]
    out = {"pairs": {}, "summary": {}}
    for exp, tid in pairs:
        base = top(ep, exp, tid)
        rec = {}
        j, st = [], []
        for _ in range(100):
            w = ",".join(f"{d}:{min(3.0, float(np.exp(RNG.normal(0, 0.3)))):.3f}" for d in DIMS)
            t = top(ep, exp, tid, w)
            j.append(jac(base, t))
            st.append(same_top(base, t))
        rec["weights"] = {"mean_jaccard_top5": round(float(np.mean(j)), 3), "top1_stays_within_5deg": round(float(np.mean(st)), 3)}
        t = top(ep, exp, tid, "D5_rock:0,D6_ice:0,D7_polar_light:0")
        rec["proxies_off"] = {"jaccard_top5": round(jac(base, t), 3), "top1_within_5deg": same_top(base, t)}
        j, st = [], []
        for _ in range(20):
            g = app.GRID.copy()
            for d in DIMS:
                if d in g.columns:
                    g.loc[RNG.random(len(g)) < 0.2, d] = np.nan
            epm = endpoints(g)
            t = top(epm, exp, tid)
            j.append(jac(base, t))
            st.append(same_top(base, t))
        rec["missing_20pct"] = {"mean_jaccard_top5": round(float(np.mean(j)), 3), "top1_stays_within_5deg": round(float(np.mean(st)), 3)}
        out["pairs"][f"{exp}/{tid}"] = rec
    keys = {"weights": ("mean_jaccard_top5", "top1_stays_within_5deg"), "missing_20pct": ("mean_jaccard_top5", "top1_stays_within_5deg")}
    for k, (a, b) in keys.items():
        out["summary"][k] = {a: round(float(np.mean([v[k][a] for v in out["pairs"].values()])), 3), b: round(float(np.mean([v[k][b] for v in out["pairs"].values()])), 3),
                             "worst_top1_stability": round(float(np.min([v[k][b] for v in out["pairs"].values()])), 3)}
    out["summary"]["proxies_off"] = {"mean_jaccard_top5": round(float(np.mean([v["proxies_off"]["jaccard_top5"] for v in out["pairs"].values()])), 3),
                                     "top1_unchanged_share": round(float(np.mean([v["proxies_off"]["top1_within_5deg"] for v in out["pairs"].values()])), 3)}
    json.dump(out, open(ROOT / "data/ranking_stability.json", "w", encoding="utf-8"), indent=1)
    print(json.dumps(out["summary"], indent=1))
    worst = sorted(out["pairs"].items(), key=lambda kv: kv[1]["weights"]["top1_stays_within_5deg"])[:5]
    print("least stable #1 under weight noise:", [(k, v["weights"]["top1_stays_within_5deg"]) for k, v in worst])


if __name__ == "__main__":
    main()
