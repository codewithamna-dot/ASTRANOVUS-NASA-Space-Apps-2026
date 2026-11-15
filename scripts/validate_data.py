"""Run before every push:  python scripts/validate_data.py  -> must print OK"""
import json, sys, pathlib
import pandas as pd
root = pathlib.Path(__file__).resolve().parents[1]
DIMS = [d["id"] for d in json.load(open(root / "data/dimensions.json"))]
errs = []
real = root / "data/processed/earth_grid.csv"
gp = real if real.exists() else root / "data/sample/earth_grid_sample.csv"
g = pd.read_csv(gp)
for c in ["cell_id", "lat", "lon"] + DIMS:
    if c not in g.columns: errs.append(f"grid missing column {c}")
if not errs:
    if g.cell_id.duplicated().any(): errs.append("duplicate cell_id")
    if not g.lat.between(-90, 90).all(): errs.append("lat out of range")
    if not g.lon.between(-180, 180).all(): errs.append("lon out of range")
    for d in DIMS:
        v = g[d].dropna()
        if not v.between(0, 1).all(): errs.append(f"{d} has values outside 0-1")
        if g[d].isna().mean() > 0.5: print(f"WARNING: {d} is >50% empty (ok until stage-2 data is added)")
T = json.load(open(root / "data/targets.json")); ids = set()
for t in T:
    if t["id"] in ids: errs.append(f"duplicate target {t['id']}")
    ids.add(t["id"])
    for k in ("id", "body", "name", "rules"):
        if k not in t: errs.append(f"{t.get('id')} missing {k}")
    for dim, r in t.get("rules", {}).items():
        if dim not in DIMS: errs.append(f"{t['id']}: unknown dimension {dim}")
        if r.get("rule") not in ("high", "low", "band"): errs.append(f"{t['id']}.{dim}: bad rule")
        if not 0 <= r.get("weight", -1) <= 3: errs.append(f"{t['id']}.{dim}: weight not 0-3")
        if r.get("rule") == "band" and not ("lo" in r and "hi" in r and r["lo"] < r["hi"]): errs.append(f"{t['id']}.{dim}: bad band")
print(f"grid: {gp.name} ({len(g)} cells) | targets: {len(T)}")
print("OK" if not errs else "FAILED:\n - " + "\n - ".join(errs)); sys.exit(1 if errs else 0)
