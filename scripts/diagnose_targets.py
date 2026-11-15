"""Diagnose why weak targets rank the way they do, and how redundant / dominant the dimensions are.

    python scripts/diagnose_targets.py     # writes data/target_diagnostics.json

Reads the real grid and the committed target rules; changes nothing. Questions
  1. Which dimensions drive the top cells of each target, and how much of its rule weight is climate / terrain / surface /
     composition / ice (i.e. can the target's rules express its defining geology at all)?
  2. How correlated are the dimensions (Spearman over land cells)? Highly correlated dimensions double-count information.
  3. For each target, which dimension best explains the score across cells (rank correlation of dimension similarity with score)?
"""
import json
import pathlib
import sys

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from model.scoring_core import dim_similarity, score_grid  # noqa: E402

CATEGORY = {"D1_cold": "climate", "D2_aridity": "climate", "D7_polar_light": "climate", "D8_thermal_swing": "climate",
            "D4_terrain": "terrain", "D3_barren": "surface_exposure", "D5_rock": "composition_proxy", "D6_ice": "ice_proxy"}


def region_of(lat):
    if lat <= -60:
        return "Antarctica"
    if lat >= 66:
        return "Arctic"
    return "other"


def main():
    grid = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
    targets = {t["id"]: t for t in json.load(open(ROOT / "data/targets.json", encoding="utf-8"))}
    dims = [d for d in CATEGORY if d in grid.columns]
    corr = grid[dims].corr(method="spearman").round(2)
    out = {"dimension_spearman": corr.to_dict(), "targets": {}}
    for tid, t in targets.items():
        rules = {d: r for d, r in t["rules"].items() if r["weight"] > 0}
        wtot = sum(r["weight"] for r in rules.values())
        share = {}
        for d, r in rules.items():
            share[CATEGORY[d]] = round(share.get(CATEGORY[d], 0) + r["weight"] / wtot, 3)
        s = score_grid(grid, t)
        g = grid.assign(score=s.score, score_adj=s.score_adj, coverage=s.coverage).dropna(subset=["score"])
        sims = {d: pd.Series(dim_similarity(g[d].to_numpy(), r), index=g.index) for d, r in rules.items()}
        expl = {d: round(float(pd.concat([sims[d], g.score], axis=1).dropna().corr(method="spearman").iloc[0, 1]), 2) for d in rules}
        top = g.nlargest(50, "score_adj")
        topr = top.lat.map(region_of).value_counts().to_dict()
        out["targets"][tid] = {"weight_share_by_category": share, "rank_correlation_of_each_dimension_with_score": expl,
                               "top50_adjusted_by_region": topr, "top50_mean_coverage": round(float(top.coverage.mean()), 3),
                               "top50_mean_similarity": {d: round(float(sims[d].loc[top.index].mean()), 2) for d in rules}}
    json.dump(out, open(ROOT / "data/target_diagnostics.json", "w", encoding="utf-8"), indent=1)
    print("dimension Spearman (|r|>=0.5):")
    for i, a in enumerate(dims):
        for b in dims[i + 1:]:
            if abs(corr.loc[a, b]) >= 0.5:
                print(f"  {a} ~ {b}: {corr.loc[a, b]}")
    for tid, v in out["targets"].items():
        print(tid, "| weight share:", v["weight_share_by_category"], "| top50:", v["top50_adjusted_by_region"], "| score driver:", v["rank_correlation_of_each_dimension_with_score"])


if __name__ == "__main__":
    main()
