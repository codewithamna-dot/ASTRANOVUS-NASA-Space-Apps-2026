"""Documented, reproducible change of D6 from peak to mean annual snow cover (2026-11-16). No raw data are read or modified.

    python scripts/rebuild_d6.py

Why: see docs/D6_SNOW_METRIC_REVIEW.md and data/d6_metric_comparison.json. Peak monthly snow cover saturates (a cell snow-covered in any
winter month of any year gets the same value as a permanent ice sheet); the mean over observed months keeps duration and extent, is the most
robust to unobserved polar-night months among the non-saturating candidates, and orders reference places physically.

What this script does (and nothing else)
  1. archives the previous grid, its metadata and every evaluation output that depends on D6 under data/processed/archive/pre_d6_mean/
  2. recomputes ONLY the D6_ice column of data/processed/earth_grid.csv as the percentile rank (same pct() as build_earth_grid.py) of
     snow_mean_valid_pct from data/processed/earth_grid_features.csv
  3. updates the D6 description in data/processed/earth_grid_metadata.json
  4. verifies every other grid column is bit-identical
scripts/build_earth_grid.py was changed identically, so a full rebuild gives the same values.
"""
import json
import pathlib
import shutil

import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
ARCH = ROOT / "data/processed/archive/pre_d6_mean"
KEEP = ["data/processed/earth_grid.csv", "data/processed/earth_grid_metadata.json", "data/validation_v3_dev.json", "data/validation_v3_final.json", "data/validation_v3_summary.json",
        "data/ranking_stability.json", "data/experiment_validation.json", "data/failure_cases.json", "data/integrity_audit.json", "data/sensitivity_summary.json", "data/validation_summary.json"]
NEW_TEXT = ("MODIS MOD10CM v061 snow cover extent, mean of the monthly snow cover over all observed months of the 2015-2024 climatology (percentile-ranked). "
            "A snow-cover duration/extent proxy; NOT glacier presence, permafrost, ground ice or subsurface water ice. Polar-night months are unobserved and excluded from the mean "
            "(bounding them as 0 or 100 changes the cell ordering very little, Spearman 0.99). A separate perennial_snow_ice flag (snow >= 50 % in every observed month, >= 6 months) is stored in "
            "earth_grid_features.csv and is not part of the score. Until 2026-11-16 D6 was the PEAK monthly snow cover, which saturated.")


def pct(series):
    return series.rank(pct=True, na_option="keep").round(4)


def main():
    meta_p = ROOT / "data/processed/earth_grid_metadata.json"
    meta = json.load(open(meta_p, encoding="utf-8"))
    if "mean of the monthly snow cover" in meta["dimensions"]["D6_ice"]["source"]:
        print("D6 already uses mean snow cover; nothing to do")
        return
    ARCH.mkdir(parents=True, exist_ok=True)
    for rel in KEEP:
        src = ROOT / rel
        if src.exists():
            shutil.copy2(src, ARCH / src.name)
    grid_p = ROOT / "data/processed/earth_grid.csv"
    grid = pd.read_csv(grid_p)
    feat = pd.read_csv(ROOT / "data/processed/earth_grid_features.csv").set_index("cell_id")
    new = pct(feat.loc[grid.cell_id, "snow_mean_valid_pct"]).to_numpy()
    out = grid.copy()
    out["D6_ice"] = new
    other = [c for c in grid.columns if c != "D6_ice"]
    assert out[other].equals(grid[other]), "a non-D6 column changed"
    out.to_csv(grid_p, index=False)
    meta["dimensions"]["D6_ice"]["source"] = NEW_TEXT
    meta["coverage_by_dimension"]["D6_ice"] = round(float(out.D6_ice.notna().mean()), 3)
    json.dump(meta, open(meta_p, "w", encoding="utf-8"), indent=1)
    chg = float((out.D6_ice.fillna(-1) != grid.D6_ice.fillna(-1)).mean())
    print(f"D6 recomputed from mean snow cover; {chg:.1%} of cells changed value; archive: {ARCH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
