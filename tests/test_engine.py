"""Unit tests for the explainable scoring/recommendation engine (synthetic mini-grids; test fixtures only)."""
import numpy as np
import pandas as pd

from model.recommend import apply_purpose, recommend
from model.scoring_core import dim_similarity, explain_cell, score_grid


def grid(rows):
    return pd.DataFrame(rows)


def test_similarity_rules():
    p = np.array([0.0, 0.5, 1.0])
    assert list(dim_similarity(p, {"rule": "high"})) == [0.0, 0.5, 1.0]
    assert list(dim_similarity(p, {"rule": "low"})) == [1.0, 0.5, 0.0]
    band = dim_similarity(p, {"rule": "band", "lo": 0.4, "hi": 0.6})
    assert band[1] == 1.0 and abs(band[0] - 0.2) < 1e-9 and abs(band[2] - 0.2) < 1e-9


def test_missing_is_nan_not_zero_and_excluded_from_score():
    g = grid({"cell_id": [1], "lat": [0.0], "lon": [0.0], "D1_cold": [1.0], "D2_aridity": [np.nan]})
    t = {"rules": {"D1_cold": {"rule": "high", "weight": 2}, "D2_aridity": {"rule": "high", "weight": 2}}}
    s = score_grid(g, t).iloc[0]
    assert s.score == 100.0           # NaN dimension ignored, not counted as 0
    assert s.coverage == 0.5          # but coverage reveals half the weight had no data
    row = explain_cell(g.iloc[0], t)
    assert [r["similarity"] for r in row] == [1.0, None]


def test_purpose_multipliers_change_weights_and_result():
    t = {"id": "T", "rules": {"D1_cold": {"rule": "high", "weight": 1}, "D2_aridity": {"rule": "high", "weight": 1}}}
    eff = apply_purpose(t, {"multipliers": {"D1_cold": 3.0}})
    assert eff["rules"]["D1_cold"]["weight"] == 3.0 and eff["rules"]["D2_aridity"]["weight"] == 1
    g = grid({"cell_id": [1, 2], "lat": [0.0, 5.0], "lon": [0.0, 0.0], "D1_cold": [1.0, 0.0], "D2_aridity": [0.0, 1.0]})
    base = score_grid(g, t).set_index("cell_id").score
    mult = score_grid(g, eff).set_index("cell_id").score
    assert base[1] == base[2] == 50.0
    assert mult[1] > mult[2]


def test_gates_drop_failing_cells_and_flag_unverified():
    rows = []
    for i, (cold, ice) in enumerate([(0.9, 0.9), (0.95, 0.1), (0.8, np.nan)]):
        rows.append({"cell_id": i, "lat": float(i * 30), "lon": 0.0, "D1_cold": cold, "D6_ice": ice})  # far apart: separate regions
    g = grid(rows)
    t = {"id": "T", "rules": {"D1_cold": {"rule": "high", "weight": 1}}}
    pu = {"gates": [{"dim": "D6_ice", "op": ">=", "value": 0.5, "why": "needs ice"}]}
    dims = [{"id": "D1_cold", "earth_source": "x"}]
    out = recommend(g, t, pu, dims, min_coverage=0.0, top_regions=5, top_pct=1.0)
    ids = {(r["best_cell"]["lat"]) for r in out["regions"]}
    assert 30.0 not in ids                      # cell 1 fails the ice gate and is dropped
    unverified = [r for r in out["regions"] if r["notes"]]
    assert unverified and "unverified" in unverified[0]["notes"][0]   # missing gate data is flagged, never silent


def test_neighbouring_cells_merge_into_one_region():
    rows = [{"cell_id": i, "lat": 0.0, "lon": float(i * 5), "D1_cold": 1.0} for i in range(3)]
    rows.append({"cell_id": 9, "lat": 60.0, "lon": 120.0, "D1_cold": 1.0})
    t = {"id": "T", "rules": {"D1_cold": {"rule": "high", "weight": 1}}}
    out = recommend(grid(rows), t, {}, [{"id": "D1_cold", "earth_source": "x"}], min_coverage=0.0, top_pct=1.0)
    assert sorted(r["n_cells"] for r in out["regions"]) == [1, 3]


def test_wide_plateau_is_split_into_bounded_regions():
    # 14 adjacent cells in a row spanning 65 degrees, all scoring the same: must not collapse into one blob
    rows = [{"cell_id": i, "lat": 0.0, "lon": float(i * 5), "D1_cold": 1.0} for i in range(14)]
    t = {"id": "T", "rules": {"D1_cold": {"rule": "high", "weight": 1}}}
    out = recommend(grid(rows), t, {}, [{"id": "D1_cold", "earth_source": "x"}], min_coverage=0.0, top_pct=1.0, top_regions=20)
    assert len(out["regions"]) >= 3
    assert max(r["n_cells"] for r in out["regions"]) <= 7   # radius 15 deg on a 5 deg grid


def test_confidence_reflects_coverage_and_region_size():
    # cell with full coverage in a 3-cell region -> high; cell with 50% coverage alone -> low
    rows = [{"cell_id": i, "lat": 0.0, "lon": float(i * 5), "D1_cold": 1.0, "D2_aridity": 1.0} for i in range(3)]
    rows.append({"cell_id": 9, "lat": 60.0, "lon": 120.0, "D1_cold": 1.0, "D2_aridity": np.nan})
    t = {"id": "T", "rules": {"D1_cold": {"rule": "high", "weight": 1}, "D2_aridity": {"rule": "high", "weight": 1}}}
    out = recommend(grid(rows), t, {}, [{"id": "D1_cold", "earth_source": "x"}, {"id": "D2_aridity", "earth_source": "x"}], min_coverage=0.0, top_pct=1.0)
    by_n = {r["n_cells"]: r for r in out["regions"]}
    assert by_n[3]["confidence"] == "high" and by_n[1]["confidence"] == "low"


def test_regions_merge_across_the_date_line():
    rows = [{"cell_id": 0, "lat": 0.0, "lon": 178.0, "D1_cold": 1.0}, {"cell_id": 1, "lat": 0.0, "lon": -178.0, "D1_cold": 1.0}]
    t = {"id": "T", "rules": {"D1_cold": {"rule": "high", "weight": 1}}}
    out = recommend(grid(rows), t, {}, [{"id": "D1_cold", "earth_source": "x"}], min_coverage=0.0, top_pct=1.0)
    assert len(out["regions"]) == 1 and out["regions"][0]["n_cells"] == 2


def test_missing_dimension_never_penalises_score():
    g = grid({"cell_id": [1, 2], "lat": [0.0, 30.0], "lon": [0.0, 0.0], "D1_cold": [0.8, 0.8], "D3_barren": [np.nan, 0.8]})
    t = {"rules": {"D1_cold": {"rule": "high", "weight": 1}, "D3_barren": {"rule": "high", "weight": 1}}}
    s = score_grid(g, t).set_index("cell_id")
    assert s.score[1] == s.score[2] == 80.0 and s.coverage[1] == 0.5 and s.coverage[2] == 1.0


def test_adjusted_score_penalises_missing_evidence_and_changes_ranking():
    # same raw similarity, but cell 2 has half its weight unobserved: adjusted score must rank it below cell 1
    g = grid({"cell_id": [1, 2], "lat": [0.0, 40.0], "lon": [0.0, 0.0], "D1_cold": [0.9, 0.9], "D2_aridity": [0.9, np.nan]})
    t = {"id": "T", "rules": {"D1_cold": {"rule": "high", "weight": 1}, "D2_aridity": {"rule": "high", "weight": 1}}}
    s = score_grid(g, t).set_index("cell_id")
    assert s.score[1] == s.score[2] == 90.0
    assert s.score_adj[1] == 90.0 and s.score_adj[2] == 70.0           # 0.5*90 + 0.5*50
    out = recommend(g, t, {}, [{"id": "D1_cold", "earth_source": "x"}, {"id": "D2_aridity", "earth_source": "x"}], min_coverage=0.0, top_pct=1.0, rank_by="adjusted")
    assert out["regions"][0]["best_cell"]["lat"] == 0.0 and out["ranking_basis"] == "evidence-adjusted score"
    assert out["regions"][0]["evidence_adjusted_score"] >= out["regions"][1]["evidence_adjusted_score"]
