"""Documented, reproducible correction of the stored D5 missing-reason text (no data values change).

    python scripts/relabel_missing_reasons.py

Problem found in the integrity audit: for D5 (composition proxy) the stored reason said "snow/ice-covered" for cells that are
vegetated and only seasonally snowy (for example northeast China), because the snow test was applied before the vegetation test.
scripts/build_earth_grid.py now tests vegetation first and words the snow case precisely. This script applies the same logic to the
existing features file so that the processed data match the builder WITHOUT a multi-hour rebuild. It only rewrites the
D5_missing_reason column of data/processed/earth_grid_features.csv (a backup copy is kept under data/processed/archive/), and
checks that every other column is bit-identical. A full rebuild with build_earth_grid.py gives the same text.
"""
import pathlib
import shutil

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
VEG = "vegetated: the composition proxy only applies to bare ground"
SNOW = "snow cover reaches 50% or more in at least one month (climatology): the composition proxy is not computed for snow-affected cells"
OLD_SNOW = "snow/ice-covered: the composition proxy only applies to bare ground"


def main():
    fp = ROOT / "data/processed/earth_grid_features.csv"
    grid = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
    feat = pd.read_csv(fp)
    if (feat["D5_missing_reason"] == SNOW).any() or not (feat["D5_missing_reason"] == OLD_SNOW).any():
        print("nothing to do (already relabelled)")
        return
    arch = ROOT / "data/processed/archive"
    arch.mkdir(exist_ok=True)
    shutil.copy2(fp, arch / "earth_grid_features_before_d5_relabel.csv")
    d5_missing = grid.set_index("cell_id")["D5_rock"].reindex(feat["cell_id"]).isna().to_numpy()
    snowy = (feat["snow_peak_pct"].fillna(0) >= 50).to_numpy()
    veg = (feat["ndvi_peak"] > 0.2).to_numpy()
    new = feat["D5_missing_reason"].copy().astype(object)
    redo = d5_missing & (feat["D5_missing_reason"] == OLD_SNOW).to_numpy()
    new[redo & veg] = VEG
    new[redo & ~veg & snowy] = SNOW
    changed = int((new != feat["D5_missing_reason"]).sum())
    out = feat.copy()
    out["D5_missing_reason"] = new
    other = [c for c in feat.columns if c != "D5_missing_reason"]
    assert out[other].equals(feat[other]), "a non-reason column changed"
    out.to_csv(fp, index=False)
    print(f"relabelled {changed} D5 reasons; all other columns identical; backup in {arch.name}/")


if __name__ == "__main__":
    main()
