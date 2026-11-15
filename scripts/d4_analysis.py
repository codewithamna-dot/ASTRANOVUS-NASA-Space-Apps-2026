"""Why does removing D4 (terrain) improve validation? A diagnosis, not a tuning step.

    python scripts/d4_analysis.py      # writes data/d4_analysis.json

For the cohort A+B positives and the target-scoped controls it lists, per pair, the D4 similarity (0-1, from the target's
rule), the 1 km relief and slope of the grid cell, and whether the pair is a positive or a control. If D4 is physically
meaningful, positives should have systematically higher D4 similarity than controls; if its similarity is high for controls
and low for positives, the rule is mismatched to what the Earth cell measures (1 km relief over 280 km, not metre-scale slope).
"""
import json
import pathlib
import sys

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
from model.scoring_core import dim_similarity  # noqa: E402
from validate_known_analogs import nearest  # noqa: E402


def main():
    ds = json.load(open(ROOT / "data/analog_dataset_v3.json", encoding="utf-8"))
    grid = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
    feats = pd.read_csv(ROOT / "data/processed/earth_grid_features.csv").set_index("cell_id")
    targets = {t["id"]: t for t in json.load(open(ROOT / "data/targets.json", encoding="utf-8"))}
    rows = []

    def add(kind, sid, tid, lat, lon, hard):
        rule = targets[tid]["rules"].get("D4_terrain")
        if not rule or float(rule["weight"]) <= 0:
            return
        cell, d = nearest(grid, lat, lon)
        if d > 5:
            return
        sim = float(dim_similarity(np.array([cell["D4_terrain"]]), rule)[0]) if pd.notna(cell["D4_terrain"]) else None
        f = feats.loc[int(cell.cell_id)]
        rows.append(dict(kind=kind, site=sid, target=tid, hard=hard, d4_rule=rule["rule"], d4_percentile=None if pd.isna(cell["D4_terrain"]) else round(float(cell["D4_terrain"]), 3),
                         d4_similarity=None if sim is None else round(sim, 3), relief_1km_m=None if pd.isna(f.dem_relief_m) else round(float(f.dem_relief_m)),
                         slope_1km_deg=None if pd.isna(f.dem_slope_mean_deg) else round(float(f.dem_slope_mean_deg), 2)))

    for s in ds["sites"]:
        if s["cohort"] == "C_frozen_independent" or s["validation_eligibility"] == "ineligible":
            continue
        for p in s["pairs"]:
            add("positive", s["site_id"], p["target"], s["lat"], s["lon"], None)
    for c in ds["controls"]:
        if c["cohort"] == "C_frozen_independent":
            continue
        for t in (list(targets) if c["targets"] == "all" else c["targets"]):
            if t in targets:
                add("control", c["site_id"], t, c["lat"], c["lon"], c["hard"])
    df = pd.DataFrame(rows)
    summ = {}
    for t, g in df.groupby("target"):
        pos, ctl = g[g.kind == "positive"].d4_similarity.dropna(), g[g.kind == "control"].d4_similarity.dropna()
        summ[t] = {"rule": g.d4_rule.iloc[0], "n_pos": int(len(pos)), "n_ctrl": int(len(ctl)), "mean_sim_positives": round(float(pos.mean()), 3) if len(pos) else None,
                   "mean_sim_controls": round(float(ctl.mean()), 3) if len(ctl) else None}
    pos, ctl = df[df.kind == "positive"].d4_similarity.dropna(), df[df.kind == "control"].d4_similarity.dropna()
    out = {"pairs": df.to_dict("records"), "by_target": summ, "overall": {"mean_sim_positives": round(float(pos.mean()), 3), "mean_sim_controls": round(float(ctl.mean()), 3),
           "n_pos": int(len(pos)), "n_ctrl": int(len(ctl))},
           "reading": "If positives do not have higher D4 similarity than controls, the D4 rule does not separate analogs from non-analogs at this resolution; "
                      "the likely cause is scale mismatch (planetary rules describe metre-scale slope on smooth plains, Earth cells average 1 km relief over ~280 km, "
                      "which is dominated by mountains/plateaus). That is a measurement-resolution argument, not a validation-score argument."}
    json.dump(out, open(ROOT / "data/d4_analysis.json", "w", encoding="utf-8"), indent=1)
    print(out["overall"])
    print(json.dumps(summ, indent=0))
    print(df[df.kind == "positive"][["site", "target", "d4_rule", "d4_similarity", "relief_1km_m", "slope_1km_deg"]].to_string())


if __name__ == "__main__":
    main()
