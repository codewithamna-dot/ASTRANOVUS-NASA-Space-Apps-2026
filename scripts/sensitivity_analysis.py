"""Ablation and sensitivity analysis of the ASTRANOVUS scoring (reads real data, changes nothing).

    python scripts/sensitivity_analysis.py        # writes data/sensitivity_summary.json

Questions answered
  1. Does any single dimension or proxy (D5, D6, D7) control the validation result? (drop-one ablations)
  2. How stable are scores and the validation metrics under plausible weight uncertainty? (300 log-normal weight draws)
  3. Is the score biased by data coverage? (score vs coverage; coverage of the top decile)
  4. How much do mission profiles, gates and the minimum-coverage threshold change what the API recommends?
Nothing here tunes the model; it only measures how much each ingredient matters.
"""
import copy
import json
import pathlib
import sys

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from model.scoring_core import score_grid  # noqa: E402

RNG = np.random.default_rng(20261116)


def load():
    grid = pd.read_csv(ROOT / "data/processed/earth_grid.csv")
    targets = {t["id"]: t for t in json.load(open(ROOT / "data/targets.json", encoding="utf-8"))}
    val = pd.read_csv(ROOT / "data/validation_results.csv")
    return grid, targets, val


def pct_of(scored, cell_id):
    if cell_id not in scored.index:
        return np.nan
    v = scored.loc[cell_id, "score"]
    return float((scored.score < v).mean() + 0.5 * (scored.score == v).mean())


def auc(pos, neg):
    pos, neg = np.asarray(pos, float), np.asarray(neg, float)
    pos, neg = pos[~np.isnan(pos)], neg[~np.isnan(neg)]
    if not len(pos) or not len(neg):
        return None
    return float(np.mean([(p > n) + 0.5 * (p == n) for p in pos for n in neg]))


def evaluate(grid, targets, val):
    """Median percentile of in-grid positives and AUC vs hard controls under the given target rules."""
    sc = {t: score_grid(grid, tg).dropna(subset=["score"]).set_index("cell_id") for t, tg in targets.items()}
    v = val[val.in_grid & val.kind.isin(["positive", "control"])].copy()
    v["pct"] = [pct_of(sc[r.target], r.cell_id) for r in v.itertuples()]
    pos, hard = v[v.kind == "positive"], v[(v.kind == "control") & (v.ctype == "hard")]
    ah = []
    for t in pos.target.unique():
        a = auc(pos[pos.target == t].pct, hard[hard.target == t].pct)
        if a is not None:
            ah.append(a)
    return {"median_percentile": round(float(np.nanmedian(pos.pct)), 3), "mean_auc_vs_hard_by_target": round(float(np.mean(ah)), 3) if ah else None,
            "n_pairs": int(pos.pct.notna().sum())}, sc


def variant(targets, drop=None, equal=False, noise=None):
    out = copy.deepcopy(targets)
    for t in out.values():
        for dim, r in t["rules"].items():
            if drop and dim in drop:
                r["weight"] = 0
            elif equal and r["weight"] > 0:
                r["weight"] = 1
            elif noise is not None and r["weight"] > 0:
                r["weight"] = r["weight"] * float(np.exp(RNG.normal(0, noise)))
    return out


def main():
    grid, targets, val = load()
    base, base_sc = evaluate(grid, targets, val)
    res = {"baseline": base, "ablations": {}, "weight_noise": {}, "coverage_bias": {}, "profile_effects": {}}

    names = {"D1_cold": "D1 cold", "D2_aridity": "D2 aridity", "D3_barren": "D3 barren", "D4_terrain": "D4 terrain", "D5_rock": "D5 composition proxy",
             "D6_ice": "D6 snow proxy", "D7_polar_light": "D7 light proxy", "D8_thermal_swing": "D8 thermal swing"}
    for d, nm in names.items():
        r, _ = evaluate(grid, variant(targets, drop={d}), val)
        res["ablations"][f"drop {nm}"] = r
    for label, drop in [("drop all proxies (D5, D6, D7)", {"D5_rock", "D6_ice", "D7_polar_light"})]:
        r, _ = evaluate(grid, variant(targets, drop=drop), val)
        res["ablations"][label] = r
    r, _ = evaluate(grid, variant(targets, equal=True), val)
    res["ablations"]["equal weights (all active rules = 1)"] = r

    # weight noise: 300 draws (log-normal sigma 0.3) -> stability of metrics and of the cell ranking itself
    meds, aucs, rhos = [], [], []
    for _ in range(300):
        tg = variant(targets, noise=0.3)
        r, sc = evaluate(grid, tg, val)
        meds.append(r["median_percentile"])
        if r["mean_auc_vs_hard_by_target"] is not None:
            aucs.append(r["mean_auc_vs_hard_by_target"])
        rho = [pd.concat([base_sc[t].score, sc[t].score], axis=1).dropna().corr(method="spearman").iloc[0, 1] for t in targets]
        rhos.append(float(np.mean(rho)))
    q = lambda a: [round(float(np.percentile(a, 2.5)), 3), round(float(np.percentile(a, 97.5)), 3)]
    res["weight_noise"] = {"draws": 300, "log_normal_sigma": 0.3, "median_percentile_95pct_range": q(meds), "auc_hard_95pct_range": q(aucs),
                           "cell_score_rank_correlation_with_baseline_95pct_range": q(rhos),
                           "reading": "ranges are over plausible weight uncertainty; a rank correlation near 1 means the cell ranking is stable"}

    # coverage bias
    cb = {}
    for t, s in base_sc.items():
        s = s.dropna(subset=["score"])
        top = s[s.score >= s.score.quantile(0.9)]
        cb[t] = {"spearman_score_vs_coverage": round(float(s[["score", "coverage"]].corr(method="spearman").iloc[0, 1]), 3),
                 "mean_coverage_all": round(float(s.coverage.mean()), 3), "mean_coverage_top10pct": round(float(top.coverage.mean()), 3)}
    res["coverage_bias"] = cb

    # profile / gate / min-coverage effects on API recommendations
    from backend import mission_api, main
    router = mission_api.create_router(main.GRID, main.TARGETS, main.DIMENSIONS, main.PURPOSES, main.ROOT, main.GRID_IS_SAMPLE, "earth_grid.csv")
    ep = {r.path: r.endpoint for r in router.routes}
    exps = ep["/experiments"]()["experiments"]

    def top_cells(exp, tid, **kw):
        r = ep["/mission/recommend"](experiment=exp, target=tid, min_coverage=kw.get("min_coverage", 0.4), top=5, allow_unverified=kw.get("allow_unverified", False), weights=None)
        return {(g["lat"], g["lon"]) for g in r["regions"]}

    def jac(a, b):
        return len(a & b) / len(a | b) if a | b else 1.0

    from model.recommend import recommend
    eff = {"gates_removed_jaccard": [], "min_cov_0.2_jaccard": [], "min_cov_0.6_jaccard": [], "no_multipliers_jaccard": []}
    for e in exps:
        for t in e["allowed_targets"]:
            b = top_cells(e["id"], t["id"])
            eff["gates_removed_jaccard"].append(jac(b, top_cells(e["id"], t["id"], allow_unverified=True)))
            eff["min_cov_0.2_jaccard"].append(jac(b, top_cells(e["id"], t["id"], min_coverage=0.2)))
            eff["min_cov_0.6_jaccard"].append(jac(b, top_cells(e["id"], t["id"], min_coverage=0.6)))
            neutral = {"id": "NEUTRAL", "multipliers": {}, "gates": []}
            out = recommend(main.GRID, main.TARGETS[t["id"]], neutral, main.DIMENSIONS, min_coverage=0.4, top_regions=5, top_pct=0.6)
            eff["no_multipliers_jaccard"].append(jac(b, {(g["best_cell"]["lat"], g["best_cell"]["lon"]) for g in out.get("regions", [])}))
    res["profile_effects"] = {k: {"mean_jaccard_of_top5_regions_vs_default": round(float(np.mean(v)), 3), "min": round(float(np.min(v)), 3), "pairs": len(v)} for k, v in eff.items()}
    res["profile_effects"]["reading"] = ("Jaccard 1.0 = identical top-5 regions; low values mean the ingredient (gates, minimum coverage, mission multipliers) materially changes what is recommended. "
                                         "'no_multipliers' compares the experiment profile against the bare reference-site rules.")
    json.dump(res, open(ROOT / "data/sensitivity_summary.json", "w", encoding="utf-8"), indent=1)
    print(json.dumps({k: res[k] for k in ("baseline", "ablations", "weight_noise", "profile_effects")}, indent=1))
    print({t: v["spearman_score_vs_coverage"] for t, v in cb.items()})


if __name__ == "__main__":
    main()
