"""API integration tests against the REAL processed grid (no network, no server needed)."""
import pytest
from fastapi.testclient import TestClient

import backend.main as m

client = TestClient(m.app)


def test_health_reports_real_grid():
    h = client.get("/health").json()
    assert h["ok"] and h["is_synthetic_sample"] is False and h["cells"] > 100


def test_data_status_matches_grid():
    ds = client.get("/data_status").json()
    by = {d["id"]: d for d in ds["dimensions"]}
    for d, status in by.items():
        has = m.GRID[d].notna().any()
        assert (status["status"] != "missing") == bool(has)
    assert by["D6_ice"]["status"] == "proxy"          # snow cover is a proxy, never labelled as measured ice
    assert by["D5_rock"]["status"] == "proxy" and by["D5_rock"]["cell_coverage"] < 0.2   # bare-ground emissivity proxy only
    assert by["D4_terrain"]["status"] == "derived" and by["D4_terrain"]["cell_coverage"] > 0.9


def test_experiments_only_offer_compatible_targets():
    ex = client.get("/experiments").json()["experiments"]
    assert len(ex) == 12
    for e in ex:
        allowed = set(m.PURPOSES[e["purpose_id"]]["targets"])
        assert e["allowed_targets"] and all(t["id"] in allowed and t["body"] == e["body"] for t in e["allowed_targets"])
        assert e["nasa_documented"]["sources"] and all(s["url"].startswith("https://") for s in e["nasa_documented"]["sources"])


def test_recommend_uses_engine_and_target_changes_results():
    a = client.get("/mission/recommend", params={"experiment": "MARS_GEOLOGY_SAMPLING", "target": "MARS_JEZERO", "top": 5}).json()
    b = client.get("/mission/recommend", params={"experiment": "MARS_GEOLOGY_SAMPLING", "target": "MARS_CHLORIDE", "top": 5}).json()
    assert a["regions"] and b["regions"]
    assert [r["best_score"] for r in a["regions"]] != [r["best_score"] for r in b["regions"]]
    for r in a["regions"]:
        assert 0 <= r["best_score"] <= 100 and 0 <= r["coverage"] <= 1
    ice = client.get("/mission/recommend", params={"experiment": "MOON_WATER_ICE", "target": "MOON_PSR", "top": 5}).json()
    nulls = [d for r in ice["regions"] for d in r["dimensions"] if d["similarity"] is None]
    assert nulls and all(d["percentile"] is None and d["data_status"] == "missing" and d["missing_reason"] for d in nulls)   # null + reason, never zero


def test_experiment_changes_results_for_same_target():
    x = client.get("/mission/recommend", params={"experiment": "MOON_ROVER_MOBILITY", "target": "MOON_SP_RIDGE", "allow_unverified": True}).json()
    y = client.get("/mission/recommend", params={"experiment": "MOON_POWER_THERMAL", "target": "MOON_SP_RIDGE", "allow_unverified": True}).json()
    assert x["weights_used"] != y["weights_used"]


def test_invalid_requests():
    assert client.get("/mission/recommend", params={"experiment": "NOPE"}).status_code == 404
    assert client.get("/mission/recommend", params={"experiment": "MOON_WATER_ICE", "target": "MARS_ICE"}).status_code == 422


def test_existing_endpoints_still_work():
    assert client.get("/targets").status_code == 200
    assert client.get("/score", params={"target": "MARS_ICE", "limit": 5}).status_code == 200
    assert client.get("/compare", params={"lat": 20, "lon": 10}).status_code == 200
    assert client.get("/recommend", params={"body": "moon", "purpose": "ISRU_WATER"}).status_code == 200


def test_custom_weights_change_result_and_validate():
    base = client.get("/mission/recommend", params={"experiment": "MARS_GEOLOGY_SAMPLING", "target": "MARS_JEZERO", "top": 3}).json()
    tuned = client.get("/mission/recommend", params={"experiment": "MARS_GEOLOGY_SAMPLING", "target": "MARS_JEZERO", "top": 3,
                                                    "weights": "D2_aridity:0,D8_thermal_swing:3"}).json()
    assert tuned["custom_weights"] == {"D2_aridity": 0.0, "D8_thermal_swing": 3.0}
    assert tuned["weights_used"] != base["weights_used"]
    assert client.get("/mission/recommend", params={"experiment": "MARS_GEOLOGY_SAMPLING", "weights": "D2_aridity:9"}).status_code == 422
    assert client.get("/mission/recommend", params={"experiment": "MARS_GEOLOGY_SAMPLING", "weights": "nonsense"}).status_code == 422


def test_region_points_are_real_grid_cells_with_country_labels():
    res = client.get("/mission/recommend", params={"experiment": "MARS_GEOLOGY_SAMPLING", "target": "MARS_JEZERO", "top": 10}).json()
    cells = {(round(r.lat, 4), round(r.lon, 4)) for r in m.GRID.itertuples()}
    for r in res["regions"]:
        assert (round(r["lat"], 4), round(r["lon"], 4)) in cells                     # marker = an actual grid cell
        assert r["lat"] == r["best_cell"]["lat"] and r["lon"] == r["best_cell"]["lon"]
        assert r["country"] or "Open land" in r["location_label"]


def test_strict_gating_excludes_cells_without_gate_data():
    res = client.get("/mission/recommend", params={"experiment": "MARS_ROVER_MOBILITY", "target": "MARS_AEOLIAN", "top": 10}).json()
    assert res["n_cells_excluded_unverified"] > 0
    barren = {(r.lat, r.lon): r.D3_barren for r in m.GRID.itertuples()}
    for r in res["regions"]:
        v = barren[(r["lat"], r["lon"])]
        assert v == v and v >= 0.4                                                  # gate D3 >= 0.4 verified, not missing
    prov = client.get("/mission/recommend", params={"experiment": "MARS_ROVER_MOBILITY", "target": "MARS_AEOLIAN", "allow_unverified": True}).json()
    assert prov["n_cells_excluded_unverified"] == 0


def test_every_experiment_target_pair_returns_valid_json():
    for e in client.get("/experiments").json()["experiments"]:
        for t in e["allowed_targets"]:
            r = client.get("/mission/recommend", params={"experiment": e["id"], "target": t["id"], "top": 3}).json()
            assert r["data_state"] in ("ready", "partial", "unavailable")
            for g in r["regions"]:
                assert 0 <= g["best_score"] <= 100 and g["confidence"] in ("high", "medium", "low")
                assert 0 <= g["coverage"] <= 1


def test_site_endpoint_handles_the_date_line():
    a = client.get("/site", params={"lat": 65.0, "lon": 179.9, "target": "MARS_ICE"}).json()
    b = client.get("/site", params={"lat": 65.0, "lon": -179.9, "target": "MARS_ICE"}).json()
    assert abs(((a["lon"] - b["lon"] + 180) % 360) - 180) <= 2.6                   # neighbouring cells across +-180


def test_invalid_numeric_parameters_rejected():
    assert client.get("/mission/recommend", params={"experiment": "MOON_WATER_ICE", "top": "x"}).status_code == 422
    assert client.get("/site", params={"lat": "a", "lon": 1, "target": "MARS_ICE"}).status_code == 422


def test_sparse_dimensions_never_make_an_experiment_ready():
    ex = client.get("/experiments").json()["experiments"]
    for e in ex:
        for t in e["allowed_targets"]:
            rd = t["readiness"]
            if rd["sparse_dimensions"] or rd["missing_dimensions"] or rd["proxy_dimensions"]:
                assert rd["state"] != "ready"
