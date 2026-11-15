"""Regression tests for the scientific data-integrity audit, frontend/backend consistency and the baseline/evaluation outputs."""
import json
import pathlib
import sys

import pandas as pd
import pytest
from fastapi.testclient import TestClient

import backend.main as m
from backend import mission_api
from model import scoring_core

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import integrity_audit  # noqa: E402

client = TestClient(m.app)
AUDIT = integrity_audit.run()


@pytest.mark.parametrize("check", ["grid_ranges", "physical_ranges", "fill_contamination", "orientation", "dimension_direction", "dates", "proxy_labels", "reasons"])
def test_integrity_check_passes(check):
    assert AUDIT[check]["ok"], AUDIT[check]


def test_d5_missing_reason_never_calls_a_vegetated_cell_snow_covered():
    feat = pd.read_csv(ROOT / "data/processed/earth_grid_features.csv")
    grid = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
    miss = grid.set_index("cell_id").D5_rock.isna()
    f = feat.set_index("cell_id")
    bad = f[(f.ndvi_peak > 0.2) & miss & f.D5_missing_reason.fillna("").str.startswith("snow")]
    assert bad.empty
    assert not (f.D5_missing_reason == "snow/ice-covered: the composition proxy only applies to bare ground").any()
    # every missing D5 value still has a stored reason (never silently empty)
    assert f.loc[miss, "D5_missing_reason"].fillna("").str.len().min() > 0


def test_relabel_script_changed_only_the_reason_column():
    arch = ROOT / "data/processed/archive/earth_grid_features_before_d5_relabel.csv"
    if not arch.exists():
        pytest.skip("archive copy not present")
    old, new = pd.read_csv(arch), pd.read_csv(ROOT / "data/processed/earth_grid_features.csv")
    cols = [c for c in old.columns if c != "D5_missing_reason"]
    assert old[cols].equals(new[cols])


def test_backend_dimension_descriptions_match_the_real_build():
    assert "POWER mean air temperature below 0" not in mission_api._PROVENANCE["D6_ice"][1]
    assert "MODIS" in mission_api._PROVENANCE["D6_ice"][1]
    meta = json.load(open(ROOT / "data/processed/earth_grid_metadata.json", encoding="utf-8"))
    assert "MODIS" in meta["dimensions"]["D6_ice"]["source"] and "MOD10CM" in meta["dimensions"]["D6_ice"]["source"]


def test_frontend_methodology_matches_the_engine():
    txt = (ROOT / "frontend/src/pages/MethodologyPage.tsx").read_text(encoding="utf-8")
    assert "evidence-adjusted score" in txt and "coverage × raw + (1 − coverage) × 50" in txt
    assert scoring_core.NEUTRAL_SCORE == 50.0
    assert "exposed" in txt and "not a NASA-certified" in txt
    assert f"top {int(mission_api.TOP_PCT * 100)}%" in txt
    for stale in ("top 15% of passing", "Rock (D5) has no data yet", "temperature-based proxy", "v0 team drafts", "handful of NASA-documented"):
        assert stale not in txt, stale
    assert "ValidationV3" in txt and "fetchValidationV3" in txt


def test_scoring_doc_matches_code_constants():
    doc = (ROOT / "docs/SCORING_METHODOLOGY.md").read_text(encoding="utf-8")
    assert "x 50" in doc and "top 60%" in doc and f"{mission_api.MIN_RESULT_COVERAGE:.0%}" in doc.replace("under 50%", "50%")


def test_validation_v3_endpoint_and_summary_are_consistent():
    r = client.get("/validation/v3").json()
    assert r["available"] and r["adopted_variant"] == "adjusted_50_exposed_surface"
    ds = json.load(open(ROOT / "data/analog_dataset_v3.json", encoding="utf-8"))
    assert r["dataset"]["controls"] == len(ds["controls"])
    ids = {v["id"] for v in r["variants"]}
    assert {"baseline_aridity_only", "baseline_dry_and_barren", "raw", "adjusted_50"} <= ids
    for v in r["variants"]:
        assert v["frozen_C"]["reliable"] is False        # three sites: never presented as reliable
    assert any("dry-and-barren baseline" in s for s in r["statements"])


def test_final_evaluation_records_provenance_and_paired_baselines():
    fin = json.load(open(ROOT / "data/validation_v3_final.json", encoding="utf-8"))
    p = fin["provenance"]
    assert len(p["git_commit"]) >= 7 and p["targets_json_sha256_16"] and p["dataset_sha256_16"]
    assert fin["stage"] == "final" and "C_frozen_independent" in fin["cohorts_scored"]
    for k in ("baseline_aridity_only", "baseline_dry_and_barren", "baseline_dry_barren_flat", "raw", "equal_adjusted_50"):
        assert k in fin["comparisons_vs_adopted"] and fin["comparisons_vs_adopted"][k]["A+B"]["n_pairs"] >= 10
    # the weights file used for the reported run is the committed one: nothing was tuned after the freeze
    base = json.load(open(ROOT / "data/processed/baseline_2026-11-16/targets.json", encoding="utf-8"))
    cur = json.load(open(ROOT / "data/targets.json", encoding="utf-8"))
    assert {t["id"]: t["rules"] for t in base} == {t["id"]: t["rules"] for t in cur}


def test_failure_cases_file_lists_known_failures():
    fc = json.load(open(ROOT / "data/failure_cases.json", encoding="utf-8"))
    names = {(r["site"], r["target"]) for r in fc["low_ranked_or_unrankable"]}
    assert ("gobustan_azerbaijan", "MARS_MUDVOLC") in names and ("kilauea", "MOON_LAVATUBE") in names
    doc = (ROOT / "docs/FAILURE_CASE_ANALYSIS.md").read_text(encoding="utf-8")
    for site, _ in names:
        assert site.split("_")[0].lower() in doc.lower() or site in doc.lower(), site


def test_every_experiment_maps_to_a_compatible_target_and_known_sources():
    meta = json.load(open(ROOT / "data/experiments.json", encoding="utf-8"))
    sources = meta["_meta"]["sources"]
    targets = {t["id"]: t for t in json.load(open(ROOT / "data/targets.json", encoding="utf-8"))}
    purposes = {p["id"]: p for p in json.load(open(ROOT / "data/purposes.json", encoding="utf-8"))}
    for e in meta["experiments"]:
        pu = purposes[e["purpose_id"]]
        allowed = [t for t in pu["targets"] if t in targets and targets[t]["body"] == e["body"]]
        assert allowed, e["id"]
        assert e.get("default_target", allowed[0]) in allowed, e["id"]
        assert e["nasa_documented"]["level"] in ("direct", "related", "indirect", "proposed")
        assert all(s in sources for s in e["nasa_documented"]["sources"])
        for g in pu.get("gates", []):
            assert g["dim"] in {"D1_cold", "D2_aridity", "D3_barren", "D4_terrain", "D5_rock", "D6_ice", "D7_polar_light", "D8_thermal_swing"}


def test_d6_is_mean_snow_cover_and_change_is_documented_and_archived():
    assert AUDIT["d6_definition"]["ok"]
    meta = json.load(open(ROOT / "data/processed/earth_grid_metadata.json", encoding="utf-8"))
    assert "mean of the monthly snow cover" in meta["dimensions"]["D6_ice"]["source"]
    arch = ROOT / "data/processed/archive/pre_d6_mean"
    assert (arch / "earth_grid.csv").exists() and (arch / "validation_v3_final.json").exists()
    old, new = pd.read_csv(arch / "earth_grid.csv"), pd.read_csv(ROOT / "data/processed/earth_grid.csv")
    cols = [c for c in old.columns if c != "D6_ice"]
    assert old[cols].equals(new[cols])                      # only D6 changed
    cmp_ = json.load(open(ROOT / "data/d6_metric_comparison.json", encoding="utf-8"))["candidates"]
    assert cmp_["mean"]["distinct_values"] > cmp_["peak"]["distinct_values"] and cmp_["mean"]["missing_month_bound_spearman"] > 0.95
    o, n = json.load(open(arch / "validation_v3_final.json")), json.load(open(ROOT / "data/validation_v3_final.json"))
    assert all(o["variants"][v]["C"] == n["variants"][v]["C"] for v in n["variants"])   # frozen cohort untouched by the change


def test_baseline_finding_is_stated_in_docs_and_frontend():
    for rel in ("docs/SCIENTIFIC_VALIDATION_REPORT.md", "docs/PROJECT_STATUS.md", "docs/SCORING_METHODOLOGY.md", "frontend/src/components/SuitabilityPanel.tsx", "frontend/src/pages/MethodologyPage.tsx"):
        t = (ROOT / rel).read_text(encoding="utf-8").lower()
        assert "dry-and-barren" in t or "dry + barren" in t or "dry and barren" in t, rel
