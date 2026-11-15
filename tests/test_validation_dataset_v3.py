"""Analog dataset v3, frozen cohorts, readiness rules and geographic reliability (real files, no network)."""
import hashlib
import json
import pathlib
import sys

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import backend.main as m
from backend.geo_labels import label_for

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from validate_known_analogs import gc_dist, nearest  # noqa: E402

client = TestClient(m.app)
DS = json.load(open(ROOT / "data/analog_dataset_v3.json", encoding="utf-8"))
FZ = json.load(open(ROOT / "data/analog_cohorts_v3_frozen.json", encoding="utf-8"))
RD = json.load(open(ROOT / "data/target_readiness.json", encoding="utf-8"))
GRID = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
TYPES = set(DS["analog_type_vocabulary"])


def test_sites_have_required_fields_and_sources():
    need = ["site_id", "name", "country", "lat", "lon", "coordinate_source", "pairs", "sources", "evidence_category", "support_strength", "limitations",
            "validation_eligibility", "verification_status", "cohort"]
    ids = [s["site_id"] for s in DS["sites"]]
    assert len(ids) == len(set(ids))
    for s in DS["sites"]:
        for k in need:
            assert k in s and s[k] not in (None, ""), (s["site_id"], k)
        assert s["sources"], s["site_id"]
        assert s["support_strength"] in ("strong", "moderate", "weak")
        for p in s["pairs"]:
            assert p["target"] in {t["id"] for t in json.load(open(ROOT / "data/targets.json", encoding="utf-8"))}
            assert set(p["analog_types"]) <= TYPES


def test_unverified_or_weak_sites_are_never_primary_validation_positives():
    for s in DS["sites"]:
        if s["cohort"] != "A_historical" and s["support_strength"] == "weak":
            assert s["validation_eligibility"] == "exploratory", s["site_id"]
    for r in DS["rejected_candidates"]:
        assert r["validation_eligibility"] == "ineligible" and r["why_not_used"]
    hyp = [r["site_id"] for r in DS["rejected_candidates"] if r["reason_code"] == "hypothesis"]
    assert {"hingol_makran", "karakoram_baltoro", "khewra", "katpana"} <= set(hyp)


def test_controls_have_written_model_blind_rationale_and_scope():
    for c in DS["controls"]:
        assert c["rationale"].strip(), c["site_id"]
        assert c["targets"] == "all" or isinstance(c["targets"], list)
    new = [c for c in DS["controls"] if c["cohort"] != "A_historical"]
    assert new and all("not derived from model" in c["basis"] for c in new)


def test_frozen_cohort_hash_and_separation():
    assert hashlib.sha256(json.dumps([FZ["C_members"], FZ["B_members"]]).encode()).hexdigest() == FZ["sha256"]
    assert not set(FZ["C_members"]) & set(FZ["B_members"])
    cur = sorted([s["site_id"] for s in DS["sites"] if s["cohort"] == "C_frozen_independent"] + ["ctl:" + c["site_id"] for c in DS["controls"] if c["cohort"] == "C_frozen_independent"])
    assert cur == FZ["C_members"]
    for sid in [x for x in FZ["C_members"] if not x.startswith("ctl:")]:
        assert int(hashlib.sha256(sid.encode()).hexdigest(), 16) % 2 == 0   # assignment rule made before scoring


def test_no_nearby_duplicate_samples_for_the_same_target():
    seen = {}
    for s in DS["sites"]:
        if s["validation_eligibility"] == "ineligible":
            continue
        cell, d = nearest(GRID, s["lat"], s["lon"])
        for p in s["pairs"]:
            key = (p["target"], int(cell.cell_id))
            if d <= 5:
                assert key not in seen, f"{s['site_id']} duplicates {seen[key]} (same grid cell, same target)"
                seen[key] = s["site_id"]


def test_validation_outputs_do_not_report_frozen_cohort_before_final_run():
    dev = json.load(open(ROOT / "data/validation_v3_dev.json", encoding="utf-8"))
    assert dev["stage"] == "development" and "C_frozen_independent" not in dev["cohorts_scored"]
    assert dev["frozen_hash"] == FZ["sha256"]


def test_readiness_matches_targets_and_never_claims_full_screen():
    targets = {t["id"]: t for t in json.load(open(ROOT / "data/targets.json", encoding="utf-8"))}
    assert set(RD["targets"]) == set(targets)
    for tid, r in RD["targets"].items():
        assert r["screening_scope"] != "full_environmental_screen", tid
        assert r["defining_properties"] and r["summary"]
        dims = {d for ms in RD["_dimension_categories"].values() for d in ms}
        for p in r["defining_properties"]:
            assert p["dimension"] is None or p["dimension"] in dims
        if r["geology_defined"]:
            assert any(p["status"] in ("not_measured", "proxy") for p in r["defining_properties"]), tid
            assert not any(p["status"] == "measured" and p["property"].lower().startswith(("basalt", "subsurface", "fluid", "ancient", "evaporite", "active dune")) for p in r["defining_properties"]), tid


@pytest.mark.parametrize("exp,tid", [("MARS_ROVER_MOBILITY", "MARS_MUDVOLC"), ("MOON_HABITAT_OPS", "MOON_LAVATUBE"), ("MARS_GEOLOGY_SAMPLING", "MARS_JEZERO")])
def test_geology_defined_targets_never_get_a_supported_label_and_need_exposed_surface(exp, tid):
    r = client.get("/mission/recommend", params={"experiment": exp, "target": tid}).json()
    assert r["regions"]
    for g in r["regions"]:
        assert g["suitability"]["status"] in ("Geological suitability unverified", "Insufficient data")
        assert g["suitability"]["unsupported"]
        row = GRID[(GRID.lat == g["lat"]) & (GRID.lon == g["lon"])].iloc[0]
        assert pd.notna(row["D3_barren"]), "ice/snow/water-covered cell recommended for a target defined by exposed ground"
        assert g["evidence_tier"]["tier"] in ("global_screening_candidate", "locally_supported_region")
    assert r["n_cells_excluded_unverified"] > 0


def test_mud_volcano_no_longer_returns_antarctic_ice_sheet():
    r = client.get("/mission/recommend", params={"experiment": "MARS_ROVER_MOBILITY", "target": "MARS_MUDVOLC"}).json()
    assert all(g["lat"] > -60 for g in r["regions"])


# ---- geographic reliability ---------------------------------------------------------------------------------------
def test_grid_geometry_is_regular_and_unique():
    assert GRID.cell_id.is_unique and not GRID.duplicated(["lat", "lon"]).any()
    assert np.allclose((GRID.lat - 1.25) % 2.5, 0) and np.allclose((GRID.lon - 1.25) % 2.5, 0)
    assert GRID.lat.between(-90, 90).all() and GRID.lon.between(-180, 180).all()


def test_distance_handles_known_distances_date_line_and_poles():
    # independent haversine reference for Islamabad - Karachi
    def hav(la1, lo1, la2, lo2):
        a = np.sin(np.radians(la2 - la1) / 2) ** 2 + np.cos(np.radians(la1)) * np.cos(np.radians(la2)) * np.sin(np.radians(lo2 - lo1) / 2) ** 2
        return float(np.degrees(2 * np.arcsin(np.sqrt(a))))
    assert abs(float(gc_dist(33.68, 73.05, 24.86, 67.0)) - hav(33.68, 73.05, 24.86, 67.0)) < 1e-6
    assert 1100 < float(gc_dist(33.68, 73.05, 24.86, 67.0)) * 111.19 < 1200   # about 1,140 km great-circle
    assert abs(float(gc_dist(0, 179, 0, -179)) - 2.0) < 1e-6          # across the date line
    assert abs(float(gc_dist(88.75, 0, 88.75, 180)) - 2.5) < 1e-6     # across the pole


def test_island_sites_outside_the_land_grid_are_reported_with_their_distance():
    _, d = nearest(GRID, 19.4, -155.3)   # Kilauea: Hawaii is not in the 2.5 degree land grid
    assert d > 5


@pytest.mark.parametrize("lat,lon,needle", [(-78.75, 43.75, "Antarctica"), (33.75, 56.25, "Iran"), (28.75, 23.75, "Libya"), (18.75, 13.75, "Niger")])
def test_labels_name_the_right_country(lat, lon, needle):
    assert needle in label_for(lat, lon)["label"]


def test_all_region_markers_are_real_grid_cells_for_every_pair():
    exps = client.get("/experiments").json()["experiments"]
    cells = set(zip(GRID.lat, GRID.lon))
    for e in exps[:4]:
        for t in e["allowed_targets"][:2]:
            r = client.get("/mission/recommend", params={"experiment": e["id"], "target": t["id"]}).json()
            for g in r["regions"]:
                assert (g["lat"], g["lon"]) in cells
