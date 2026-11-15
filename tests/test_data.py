"""Tests on the real processed grid and its provenance (no network)."""
import json
import pathlib

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
G = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
F = pd.read_csv(ROOT / "data/processed/earth_grid_features.csv")
M = json.load(open(ROOT / "data/processed/earth_grid_metadata.json", encoding="utf-8"))


def near(df, lat, lon):
    return df.iloc[((df.lat - lat) ** 2 + (df.lon - lon) ** 2).idxmin()]


def test_contract_ranges_and_unique_ids():
    assert G.cell_id.is_unique and G.lat.between(-90, 90).all() and G.lon.between(-180, 180).all()
    for d in [c for c in G.columns if c.startswith("D")]:
        v = G[d].dropna()
        assert v.between(0, 1).all()


def test_metadata_matches_grid_coverage():
    for d, cov in M["coverage_by_dimension"].items():
        assert abs(G[d].notna().mean() - cov) < 1e-3
        assert (M["dimensions"][d]["status"] == "missing") == (cov == 0)


def test_every_missing_value_has_a_reason():
    for d in ("D3", "D4", "D5", "D6", "D8"):
        col = {"D3": "D3_barren", "D4": "D4_terrain", "D5": "D5_rock", "D6": "D6_ice", "D8": "D8_thermal_swing"}[d]
        miss = G[col].isna()
        assert (F.loc[miss, f"{d}_missing_reason"].fillna("") != "").all()
        assert (F.loc[~miss, f"{d}_missing_reason"].fillna("") == "").all()


def test_d5_is_bare_ground_only_and_directionally_sane():
    has = G.D5_rock.notna()
    assert has.sum() > 200
    assert (F.loc[has, "snow_peak_pct"].fillna(0) < 50).all()        # never computed over snow/ice
    assert F.loc[has, "aster_valid_frac"].min() >= 0.3                # enough bare, land, non-gap-filled ASTER pixels
    rub = near(G, 21.25, 51.25).D5_rock      # Rub' al Khali: quartz-rich sand sea (large silicate contrast)
    harrat = near(G, 23.75, 38.75).D5_rock   # Harrat Rahat: basalt field (flat emissivity)
    assert rub < harrat
    assert near(F, 21.25, 51.25).aster_silica_contrast > near(F, 23.75, 38.75).aster_silica_contrast


def test_aster_and_modis_composition_indices_agree():
    cc = M["cross_checks"]
    k = [v for key, v in cc.items() if key.startswith("D5")][0]
    assert k["spearman"] > 0.8 and k["n"] > 100


def test_physical_sanity_of_terrain_and_ice():
    assert near(G, -3, -62).D4_terrain < 0.1 < 0.8 < near(G, -23.75, -68.75).D4_terrain      # Amazon flat, Andes rough
    assert F.loc[F.perennial_snow_ice == 1, "snow_mean_valid_pct"].min() >= 50
    ant = F[F.lat < -60]
    assert (ant.dem_source.dropna() == "NSIDC-0422").all()                                     # Antarctic terrain from its own DEM only


def test_two_independent_sources_agree():
    cc = M["cross_checks"]
    assert min(v["spearman"] for k, v in cc.items() if k.startswith(("D1", "D2"))) > 0.85
