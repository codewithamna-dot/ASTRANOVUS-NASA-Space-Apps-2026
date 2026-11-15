"""Makes a SYNTHETIC placeholder Earth grid (5 deg) so frontend/backend can start immediately.
Values are fake-but-plausible (latitude trends + noise). Boy 1 replaces with real data."""
import numpy as np, pandas as pd, pathlib
rng = np.random.default_rng(42)
lats = np.arange(-60, 85, 5.0); lons = np.arange(-175, 180, 5.0)
LA, LO = np.meshgrid(lats, lons, indexing="ij")
lat = LA.ravel(); lon = LO.ravel()
n = len(lat); a = np.abs(lat) / 90
def clip(x): return np.clip(x, 0, 1)
desert = np.exp(-((np.abs(lat) - 25) / 8) ** 2)           # subtropical deserts
df = pd.DataFrame({
  "cell_id": np.arange(n), "lat": lat, "lon": lon,
  "D1_cold": clip(a ** 1.5 + rng.normal(0, .08, n)),
  "D2_aridity": clip(.2 + .7 * desert + rng.normal(0, .1, n)),
  "D3_barren": clip(.15 + .6 * desert + .3 * a ** 3 + rng.normal(0, .1, n)),
  "D4_terrain": clip(rng.beta(2, 3, n)),
  "D5_rock": clip(.3 + .4 * desert + rng.normal(0, .2, n)),
  "D6_ice": clip(a ** 4 * 1.2 + rng.normal(0, .05, n)),
  "D7_polar_light": clip(a ** 1.2 + rng.normal(0, .05, n)),
  "D8_thermal_swing": clip(.2 + .7 * desert + rng.normal(0, .1, n)),
})
df.loc[rng.random(n) < .03, "D6_ice"] = np.nan            # a few missing values on purpose
p = pathlib.Path(__file__).resolve().parents[1] / "data/sample/earth_grid_sample.csv"
df.round(4).to_csv(p, index=False); print("wrote", p, len(df), "cells")
