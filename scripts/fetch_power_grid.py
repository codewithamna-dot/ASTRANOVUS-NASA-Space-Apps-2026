"""Build data/processed/earth_grid.csv from NASA POWER climatology (no login needed).

Usage (from repo root):
    pip install requests pandas numpy global-land-mask
    python scripts/fetch_power_grid.py            # 5-degree grid, ~1000 land points, ~10 min
    python scripts/fetch_power_grid.py 2          # finer 2-degree grid (~6000 points, ~1 hr) - later
Safe to stop and re-run: results are cached in data/raw/power_cache.json.

Fills D1_cold, D2_aridity, D7_polar_light, D8_thermal_swing.
D6_ice = proxy (share of months below 0 C). D3/D4/D5 stay EMPTY (no data) until the stage-2 SRTM / EMIT work.
"""
import json, sys, time, pathlib
from concurrent.futures import ThreadPoolExecutor
import numpy as np, pandas as pd, requests
from global_land_mask import globe

ROOT = pathlib.Path(__file__).resolve().parents[1]
CACHE = ROOT / "data/raw/power_cache.json"
ARCHIVE = ROOT / "data/processed/archive"   # POWER-only grids are written here; earth_grid.csv is built by scripts/build_earth_grid.py
URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
PARAMS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,ALLSKY_SFC_SW_DWN"
MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"]


def fetch_point(lat, lon, tries=6):
    for i in range(tries):
        try:
            r = requests.get(URL, params={"parameters": PARAMS, "community": "RE", "latitude": lat,
                                          "longitude": lon, "format": "JSON"}, timeout=60)
            r.raise_for_status()
            return r.json()["properties"]["parameter"]
        except Exception:
            time.sleep(3 * (i + 1))
    return None


def clean(v):
    return np.nan if v is None or v <= -990 else float(v)


def features(par):
    """Raw physical features from one POWER response (None if unusable)."""
    try:
        t = clean(par["T2M"]["ANN"]); p = clean(par["PRECTOTCORR"]["ANN"])
        tmax = clean(par["T2M_MAX"]["ANN"]); tmin = clean(par["T2M_MIN"]["ANN"])
        sw = np.array([clean(par["ALLSKY_SFC_SW_DWN"][m]) for m in MONTHS])
    except Exception:
        return None
    tm = np.array([clean(par["T2M"][m]) for m in MONTHS])
    cold_months = float(np.mean(tm < 0)) if not np.isnan(tm).all() else np.nan   # proxy for snow / ground ice
    swing_light = (np.nanmax(sw) - np.nanmin(sw)) / (np.nanmax(sw) + 0.05) if not np.isnan(sw).all() else np.nan
    return {"temp": t, "precip": p, "dtr": tmax - tmin, "light_swing": swing_light, "cold_months": cold_months}


def pct(series, invert=False):
    """Percentile rank 0-1 among valid cells (NaN stays NaN). invert: low raw value -> high percentile."""
    s = -series if invert else series
    return s.rank(pct=True, na_option="keep").round(4)


def build_grid(step, fetch=fetch_point, workers=3):
    lats = np.arange(-90 + step / 2, 90, step); lons = np.arange(-180 + step / 2, 180, step)
    pts = [(float(a), float(o)) for a in lats for o in lons if globe.is_land(a, o)]
    print(f"{len(pts)} land points at {step} deg")
    cache = json.load(open(CACHE)) if CACHE.exists() else {}
    todo = [p for p in pts if f"{p[0]},{p[1]}" not in cache]
    def work(p):
        return p, fetch(*p)
    done = 0
    with ThreadPoolExecutor(workers) as ex:
        for p, par in ex.map(work, todo):
            if par is not None:
                cache[f"{p[0]},{p[1]}"] = par
            done += 1
            if done % 50 == 0:
                CACHE.parent.mkdir(parents=True, exist_ok=True); json.dump(cache, open(CACHE, "w"))
                print(f"  {done}/{len(todo)}")
    CACHE.parent.mkdir(parents=True, exist_ok=True); json.dump(cache, open(CACHE, "w"))
    rows = []
    for (a, o) in pts:
        par = cache.get(f"{a},{o}")
        f = features(par) if par else None
        rows.append({"lat": a, "lon": o, **(f or {"temp": np.nan, "precip": np.nan, "dtr": np.nan, "light_swing": np.nan, "cold_months": np.nan})})
    df = pd.DataFrame(rows).dropna(subset=["temp", "precip", "dtr", "light_swing"], how="all").reset_index(drop=True)
    out = pd.DataFrame({"cell_id": np.arange(len(df)), "lat": df.lat, "lon": df.lon})
    out["D1_cold"] = pct(df.temp, invert=True)
    out["D2_aridity"] = pct(df.precip, invert=True)
    out["D6_ice"] = pct(df.cold_months)   # PROXY: months below 0 C. Replace with MODIS MOD10CM snow later
    for d in ["D3_barren", "D4_terrain", "D5_rock"]:
        out[d] = np.nan
    out["D7_polar_light"] = pct(df.light_swing)
    out["D8_thermal_swing"] = pct(df.dtr)
    return out[["cell_id", "lat", "lon", "D1_cold", "D2_aridity", "D3_barren", "D4_terrain",
                "D5_rock", "D6_ice", "D7_polar_light", "D8_thermal_swing"]]


if __name__ == "__main__":
    step = float(sys.argv[1]) if len(sys.argv) > 1 else 5.0
    g = build_grid(step)
    ARCHIVE.mkdir(parents=True, exist_ok=True)
    out = ARCHIVE / (f"earth_grid_power_only_{step:g}deg.csv")
    g.to_csv(out, index=False)
    print("wrote", out, len(g), "cells. Now run: .venv-data/Scripts/python scripts/build_earth_grid.py", f"{step:g}")
