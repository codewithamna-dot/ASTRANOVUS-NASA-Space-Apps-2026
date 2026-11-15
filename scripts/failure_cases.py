"""Facts for the failure-case analysis: every documented analog pair that ranks below the median under the adopted model.

    python scripts/failure_cases.py     # writes data/failure_cases.json

Runs after development choices are final and is used ONLY to explain results, never to change the model. For each low-ranked pair it
records the numbers needed to say why: percentile and coverage, per-dimension similarity, missing dimensions with their stored reason,
cell relief/elevation/distance, support strength and source verification, and the target readiness scope. The reasons themselves
(target mapping, geology, resolution, source quality) are written in docs/FAILURE_CASE_ANALYSIS.md.
"""
import json
import pathlib
import sys

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "scripts"))
from model.scoring_core import explain_cell  # noqa: E402
from validate_known_analogs import nearest  # noqa: E402
from validate_v3 import MAX_DIST, PAIR_EXPLORATORY, pct, pool_for  # noqa: E402


def main():
    ds = json.load(open(ROOT / "data/analog_dataset_v3.json", encoding="utf-8"))
    grid = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
    feats = pd.read_csv(ROOT / "data/processed/earth_grid_features.csv").set_index("cell_id")
    targets = {t["id"]: t for t in json.load(open(ROOT / "data/targets.json", encoding="utf-8"))}
    readiness = json.load(open(ROOT / "data/target_readiness.json", encoding="utf-8"))
    pools = {t: pool_for(grid, tg, "score_adj", True, readiness) for t, tg in targets.items()}
    out = []
    for s in ds["sites"]:
        if s["validation_eligibility"] == "ineligible":
            continue
        cell, dist = nearest(grid, s["lat"], s["lon"])
        for p in s["pairs"]:
            tid = p["target"]
            exploratory = s["validation_eligibility"] == "exploratory" or (s["site_id"], tid) in PAIR_EXPLORATORY
            rec = dict(site=s["site_id"], name=s["name"], cohort=s["cohort"], target=tid, exploratory=exploratory, strength=s["support_strength"],
                       verification=s["verification_status"], dist_deg=round(dist, 2), in_grid=bool(dist <= MAX_DIST[s["cohort"]]),
                       screening_scope=readiness["targets"][tid]["screening_scope"])
            if not rec["in_grid"]:
                rec.update(percentile=None, reason_code="outside_land_grid", note="island/coastal site: nearest land cell too far")
                out.append(rec)
                continue
            cid = int(cell.cell_id)
            pc = pct(pools[tid], "score_adj", cid, None)
            if pc is None:
                f = feats.loc[cid]
                rec.update(percentile=None, reason_code="unrankable_exposed_surface_rule", note=str(f.get("D3_missing_reason")))
                out.append(rec)
                continue
            row = grid[grid.cell_id == cid].iloc[0]
            dims = explain_cell(row, targets[tid])
            f = feats.loc[cid]
            rec.update(percentile=round(pc, 3), coverage=round(float(pools[tid].loc[cid, "coverage"]), 3), cell=[float(row.lat), float(row.lon)],
                       relief_1km_m=None if pd.isna(f.dem_relief_m) else round(float(f.dem_relief_m)), elevation_m=None if pd.isna(f.dem_elev_mean_m) else round(float(f.dem_elev_mean_m)),
                       dimensions=[{"dimension": d["dimension"], "weight": d["weight"], "similarity": None if d["similarity"] is None else round(float(d["similarity"]), 2)} for d in dims if float(d["weight"]) > 0],
                       missing={d["dimension"]: str(f.get(d["dimension"].split("_")[0] + "_missing_reason")) for d in dims if d["similarity"] is None and float(d["weight"]) > 0})
            out.append(rec)
    low = [r for r in out if r.get("percentile") is None or r["percentile"] < 0.5]
    json.dump({"all_pairs": out, "low_ranked_or_unrankable": low, "note": "explains results; not used to tune anything"}, open(ROOT / "data/failure_cases.json", "w", encoding="utf-8"), indent=1)
    for r in sorted(low, key=lambda x: (x.get("percentile") is None, x.get("percentile") or 0)):
        print(r["site"], r["target"], r["cohort"][:1], "expl" if r["exploratory"] else "prim", r.get("percentile"), "cov", r.get("coverage"), "dist", r["dist_deg"], "relief", r.get("relief_1km_m"), "| miss", r.get("missing"), r.get("reason_code", ""),
              [(d["dimension"][:2], d["similarity"]) for d in r.get("dimensions", [])])


if __name__ == "__main__":
    main()
