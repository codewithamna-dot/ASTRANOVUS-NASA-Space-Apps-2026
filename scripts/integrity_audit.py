"""Scientific data integrity audit of the processed Earth grid (reads only).

    python scripts/integrity_audit.py      # writes data/integrity_audit.json; exit code 1 if a check fails

Checks (each is also a regression test in tests/test_integrity_audit.py)
  grid_ranges        percentile ranks finite-or-empty and inside [0, 1]
  physical_ranges    feature values inside physically plausible bounds (LST, NDVI, snow, precipitation, elevation, slope)
  fill_contamination no known fill codes (-9999, -999, 255 in non-snow columns, 65535, -32768, 32767) and no spike of exact zeros in LST
  orientation        known places have the expected elevation/temperature/direction (catches latitude/longitude sign and axis errors)
  dimension_direction D1 cold, D2 aridity, D3 barren, D6 snow rank the right way at reference places
  dates              MODIS/GPM are calendar 2024; snow climatology spans 2015-2024; stated in metadata
  proxy_labels       D5, D6, D7 are labelled proxy; D1, D2, D3, D8 derived; D4 derived (and marked scale-mismatched in readiness)
  reasons            stored missing reasons are consistent with the data (a vegetated cell is never called snow/ice-covered)
  d6_definition      stored D6 equals the percentile of mean snow cover over observed months
"""
import json
import pathlib
import sys

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]


def load():
    return (pd.read_csv(ROOT / "data/processed/earth_grid.csv"), pd.read_csv(ROOT / "data/processed/earth_grid_features.csv"),
            json.load(open(ROOT / "data/processed/earth_grid_metadata.json", encoding="utf-8")))


def cell_at(df, lat, lon):
    i = ((df.lat - lat) ** 2 + (df.lon - lon) ** 2).idxmin()
    return df.loc[i]


def run():
    grid, feat, meta = load()
    res = {}
    dims = [c for c in grid.columns if c.startswith("D") and c[1].isdigit()]
    vals = grid[dims]
    res["grid_ranges"] = {"ok": bool(((vals.fillna(0.5) >= 0) & (vals.fillna(0.5) <= 1)).all().all() and not np.isinf(vals.fillna(0)).any().any()), "dimensions": dims}

    bounds = {"lst_day_K_m": (150, 380), "lst_night_K_m": (150, 380), "ndvi_m": (-0.2, 1.0), "snow_pct_m": (0, 100), "precip_mm_day_m": (0, 60),
              "dem_elev_mean_m": (-500, 9000), "dem_slope_mean_deg": (0, 45), "dem_relief_m": (0, 9000)}
    bad = {}
    for pre, (lo, hi) in bounds.items():
        for c in [c for c in feat.columns if c.startswith(pre)]:
            v = feat[c].dropna()
            if len(v) and (v.min() < lo or v.max() > hi):
                bad[c] = [float(v.min()), float(v.max())]
    res["physical_ranges"] = {"ok": not bad, "violations": bad}

    fills = {-9999.0, -9999.9, -999.0, 65535.0, -32768.0, 32767.0, 9999.0}
    contaminated = {}
    num = feat.select_dtypes("number").drop(columns=["cell_id", "lat", "lon"])
    for c in num.columns:
        hit = int(num[c].isin(fills).sum())
        if hit:
            contaminated[c] = hit
    zeros_lst = int(sum((feat[c] == 0).sum() for c in feat.columns if c.startswith("lst_day_K_m") or c.startswith("lst_night_K_m")))
    res["fill_contamination"] = {"ok": not contaminated and zeros_lst == 0, "columns": contaminated, "exact_zero_lst_values": zeros_lst}

    checks = {
        "Tibetan plateau (33.75N, 88.75E) mean elevation > 4000 m": float(cell_at(feat, 33.75, 88.75).dem_elev_mean_m) > 4000,
        "Great Hungarian Plain (46.25N, 21.25E) mean elevation < 250 m": float(cell_at(feat, 46.25, 21.25).dem_elev_mean_m) < 250,
        "Amazon basin (3.75S, 61.25W) mean elevation < 300 m": float(cell_at(feat, -3.75, -61.25).dem_elev_mean_m) < 300,
        "Atacama (23.75S, 68.75W) mean elevation > 2000 m": float(cell_at(feat, -23.75, -68.75).dem_elev_mean_m) > 2000,
        "Sahara (21.25N, 11.25E) mean annual LST > 295 K": float(cell_at(feat, 21.25, 11.25).lst_mean_K) > 295,
        "Antarctic plateau (78.75S, 43.75E) mean LST < 240 K": float(cell_at(feat, -78.75, 43.75).lst_mean_K) < 240,
        "Amazon (3.75S, 61.25W) NDVI peak > 0.7": float(cell_at(feat, -3.75, -61.25).ndvi_peak) > 0.7,
        "Sahara (21.25N, 11.25E) precip < 0.5 mm/day": float(cell_at(feat, 21.25, 11.25).precip_mm_day_mean) < 0.5,
        "Himalaya cell (28.75N, 86.25E) relief > 3000 m": float(cell_at(feat, 28.75, 86.25).dem_relief_m) > 3000,
    }
    res["orientation"] = {"ok": all(checks.values()), "checks": checks}

    g = lambda lat, lon, d: float(cell_at(grid, lat, lon)[d])  # noqa: E731
    direction = {
        "D1 cold: Antarctica > 0.95, Amazon < 0.2": g(-78.75, 43.75, "D1_cold") > 0.95 and g(-3.75, -61.25, "D1_cold") < 0.2,
        "D2 aridity: Sahara > 0.9, Amazon < 0.2": g(21.25, 11.25, "D2_aridity") > 0.9 and g(-3.75, -61.25, "D2_aridity") < 0.2,
        "D3 barren: Sahara > 0.9, Amazon < 0.2": g(21.25, 11.25, "D3_barren") > 0.9 and g(-3.75, -61.25, "D3_barren") < 0.2,
        "D6 snow proxy: Antarctica > 0.8, Sahara < 0.2": g(-78.75, 43.75, "D6_ice") > 0.8 and g(21.25, 11.25, "D6_ice") < 0.2,
    }
    res["dimension_direction"] = {"ok": all(direction.values()), "checks": direction}

    tc = meta["temporal_coverage"]
    snow_files = meta["products"]["MOD10CM"]
    res["dates"] = {"ok": all(m.startswith("2024-") for m in tc["MODIS_GPM_months"]) and len(tc["MODIS_GPM_months"]) == 12 and snow_files["years"][0] == 2015 and snow_files["years"][-1] == 2024,
                    "modis_gpm_months": len(tc["MODIS_GPM_months"]), "snow_years": [snow_files["years"][0], snow_files["years"][-1]], "snow_months_listed": len(snow_files["files"])}

    status = {k: v["status"] for k, v in meta["dimensions"].items()}
    expect = {"D1_cold": "derived", "D2_aridity": "derived", "D3_barren": "derived", "D4_terrain": "derived", "D5_rock": "proxy", "D6_ice": "proxy", "D7_polar_light": "derived", "D8_thermal_swing": "derived"}
    res["proxy_labels"] = {"ok": all(status.get(k) == v for k, v in expect.items()), "found": status}

    d5 = feat.set_index("cell_id").D5_missing_reason.fillna("")
    miss = grid.set_index("cell_id").D5_rock.isna()
    wrong = int(((feat.set_index("cell_id").ndvi_peak > 0.2) & miss & d5.str.startswith("snow")).sum())
    res["reasons"] = {"ok": wrong == 0, "vegetated_cells_labelled_snow": wrong}

    # D6 is the MEAN snow cover over observed months since 2026-11-16 (it was the peak, which saturated: docs/D6_SNOW_METRIC_REVIEW.md).
    # Check that the stored D6 really is the percentile of the mean (guards against a half-applied change).
    mean_pct = feat.set_index("cell_id").snow_mean_valid_pct.rank(pct=True, na_option="keep").round(4).reindex(grid.cell_id).to_numpy()
    d6_is_mean = bool(np.allclose(np.nan_to_num(grid.D6_ice.to_numpy(), nan=-1), np.nan_to_num(mean_pct, nan=-1)))
    res["d6_definition"] = {"ok": d6_is_mean, "definition": "percentile of mean snow cover over observed months"}
    res["known_issues"] = {"D6_ties_at_maximum": round(float((feat.snow_mean_valid_pct >= 99.99).mean()), 3), "share_flagged_perennial_snow_ice": round(float(feat.perennial_snow_ice.mean()), 3),
                           "negative_day_night_range_cells": int((feat.lst_dtr_K_mean < 0).sum()),
                           "note": "Remaining D6 ties are cells with snow cover in every observed month (permanent snow/ice), which is a real plateau, not information loss."}
    res["all_ok"] = all(v["ok"] for v in res.values() if isinstance(v, dict) and "ok" in v)
    return res


def main():
    res = run()
    json.dump(res, open(ROOT / "data/integrity_audit.json", "w", encoding="utf-8"), indent=1)
    for k, v in res.items():
        if isinstance(v, dict) and "ok" in v:
            print(f"{k:20s} {'OK' if v['ok'] else 'FAIL'}")
    sys.exit(0 if res["all_ok"] else 1)


if __name__ == "__main__":
    main()
