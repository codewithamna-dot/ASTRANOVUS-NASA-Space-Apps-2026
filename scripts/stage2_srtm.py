"""Stage 2: SRTM terrain verification for the TOP recommended regions only (never the whole globe).

Default is a DRY RUN: it lists the 1-degree SRTMGL1 tiles that would be needed and their approximate download size.
Nothing is downloaded until you pass --download (needs your stored Earthdata login; ~25 MB per tile).

    python scripts/stage2_srtm.py                       # dry run, prints tile list
    .venv-data/Scripts/python scripts/stage2_srtm.py --download --max-tiles 12

Outputs (only with --download): data/processed/stage2.json  with per-region elevation, mean/p95 slope, relief (P95-P5),
roughness (std of elevation) and a terrain class. SRTM covers 60N-56S only; cells outside are written with
covered=false and are NEVER presented as verified.
Terrain class (documented thresholds): flat <5 deg mean slope, moderate 5-15, rugged >15.
"""
import argparse
import json
import pathlib
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

PIXEL_M = 30.9  # SRTMGL1 spacing in metres (1 arc-second), as used by the slope maths below


def slope_degrees(dem: np.ndarray, pixel_m: float = PIXEL_M) -> np.ndarray:
    """Slope in degrees from a DEM (metres) using central differences (np.gradient)."""
    dzdy, dzdx = np.gradient(dem.astype(float), pixel_m)
    return np.degrees(np.arctan(np.hypot(dzdx, dzdy)))


def terrain_stats(dem: np.ndarray) -> dict:
    valid = dem[np.isfinite(dem)]
    sl = slope_degrees(np.where(np.isfinite(dem), dem, np.nanmean(valid)))
    mean_slope = float(np.mean(sl))
    cls = "flat" if mean_slope < 5 else "moderate" if mean_slope <= 15 else "rugged"
    return {"elevation_mean_m": round(float(valid.mean()), 1), "slope_mean_deg": round(mean_slope, 2),
            "slope_p95_deg": round(float(np.percentile(sl, 95)), 2),
            "relief_m": round(float(np.percentile(valid, 95) - np.percentile(valid, 5)), 1),
            "roughness_std_m": round(float(valid.std()), 1), "terrain_class": cls}


def tile_name(lat: float, lon: float) -> str:
    la, lo = int(np.floor(lat)), int(np.floor(lon))
    return f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"


def candidate_regions(top: int):
    """Top regions exactly as the API returns them (strict gating, 15-degree regions) for every experiment x site."""
    import backend.main as m
    from backend import mission_api
    router = mission_api.create_router(m.GRID, m.TARGETS, m.DIMENSIONS, m.PURPOSES, m.ROOT, m.GRID_IS_SAMPLE, "earth_grid.csv")
    ep = {r.path: r.endpoint for r in router.routes}
    exps = ep["/experiments"]()["experiments"]
    seen = {}
    for e in exps:
        for t in e["allowed_targets"]:
            res = ep["/mission/recommend"](experiment=e["id"], target=t["id"], min_coverage=0.4, top=top, allow_unverified=False, weights=None)
            for r in res["regions"]:
                seen[(r["lat"], r["lon"])] = r
    return list(seen)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--download", action="store_true")
    ap.add_argument("--top", type=int, default=3)
    ap.add_argument("--max-tiles", type=int, default=12)
    a = ap.parse_args()
    cells = candidate_regions(a.top)
    plan = []
    for lat, lon in cells:
        covered = -56 <= lat <= 60
        plan.append({"lat": lat, "lon": lon, "covered": covered, "tile": tile_name(lat, lon) if covered else None})
    tiles = sorted({p["tile"] for p in plan if p["tile"]})
    print(f"{len(cells)} candidate cells, {len(tiles)} SRTM tiles needed (~{25 * len(tiles)} MB):", tiles)
    print("outside SRTM coverage (stay unverified):", [(p["lat"], p["lon"]) for p in plan if not p["covered"]])
    if not a.download:
        print("DRY RUN only. Re-run with --download to fetch tiles (uses your Earthdata login).")
        return
    if len(tiles) > a.max_tiles:
        sys.exit(f"{len(tiles)} tiles exceeds --max-tiles {a.max_tiles}; raise it deliberately.")
    import earthaccess
    import zipfile
    import io
    earthaccess.login(persist=True)  # prompts once in YOUR terminal, then stores credentials in ~/.netrc
    out_dir = ROOT / "data/raw/srtm"
    out_dir.mkdir(parents=True, exist_ok=True)
    results = []
    for p in plan:
        rec = dict(p)
        if p["covered"]:
            res = earthaccess.search_data(short_name="SRTMGL1", version="003", point=(p["lon"], p["lat"]), count=1)
            files = earthaccess.download(res, str(out_dir)) if res else []
            hgt = next((f for f in files if str(f).endswith(".zip")), None)
            if hgt:
                with zipfile.ZipFile(hgt) as z:
                    raw = z.read(z.namelist()[0])
                n = int(np.sqrt(len(raw) // 2))
                dem = np.frombuffer(raw, dtype=">i2").reshape(n, n).astype(float)
                dem[dem == -32768] = np.nan
                rec.update(terrain_stats(dem))
                rec["note"] = "statistics over the whole 1x1 degree SRTM tile containing the cell centre (not the 5 degree cell)"
            else:
                rec["covered"] = False
                rec["note"] = "SRTM granule not found"
        results.append(rec)
    json.dump(results, open(ROOT / "data/processed/stage2.json", "w"), indent=1)
    print("wrote data/processed/stage2.json")


if __name__ == "__main__":
    main()
