"""Validate the scoring engine against known Earth analog sites using the REAL processed grid.

    python scripts/validate_known_analogs.py

For every (analog, target) pair the whole grid is scored with model.scoring_core.score_grid (target default weights;
no mission profile, no tuning) and the percentile rank of the analog's nearest grid cell among all scored cells is
reported. Controls are poor analogs by construction: EASY (humid lowlands) and HARD (cold-but-forested,
dry-but-vegetated). AUC = probability that a random positive outranks a random control for the same target.

Honest-evaluation rules:
  * No rule, weight or target was tuned on these sites. Target-profile edits in this project were made only on
    retrieved-source evidence (docs/TARGET_EVIDENCE.md), never on these results.
  * Positives are split deterministically (hash of site id) into `tuning` / `heldout`; headline metrics use `heldout`.
  * 95% bootstrap intervals (fixed seed) and sample sizes are reported; with few sites they are wide.
  * Weak results are diagnosed per dimension (which dimensions are low, which are missing and why).
  * Refuses to run on the synthetic sample grid.
Writes docs/VALIDATION.md, data/validation_results.csv, data/validation_summary.json.
"""
import hashlib
import json
import pathlib
import sys

import numpy as np
import pandas as pd

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from model.scoring_core import explain_cell, score_grid  # noqa: E402

GRID_PATH = ROOT / "data/processed/earth_grid.csv"
MAX_DIST_DEG = 5.0
RNG = np.random.default_rng(20261115)


def gc_dist(lat, lon, lat0, lon0):
    """Great-circle distance in degrees (handles the date line and the poles)."""
    p1, p2 = np.radians(lat), np.radians(lat0)
    c = np.sin(p1) * np.sin(p2) + np.cos(p1) * np.cos(p2) * np.cos(np.radians(lon - lon0))
    return np.degrees(np.arccos(np.clip(c, -1, 1)))


def nearest(grid, lat, lon):
    d = gc_dist(grid.lat.to_numpy(), grid.lon.to_numpy(), lat, lon)
    i = int(np.argmin(d))
    return grid.iloc[i], float(d[i])


def auc(pos, neg):
    if not len(pos) or not len(neg):
        return None
    return float(np.mean([(p > n) + 0.5 * (p == n) for p in pos for n in neg]))


def boot_ci(vals, fn, n=2000, groups=None):
    """Percentile bootstrap. With `groups` the resampling unit is the SITE (pairs of one site move together), which
    respects the dependence between targets scored at the same location."""
    vals = np.asarray(vals, dtype=float)
    if len(vals) < 3:
        return None
    if groups is None:
        stats = [fn(RNG.choice(vals, len(vals), replace=True)) for _ in range(n)]
    else:
        groups = np.asarray(groups)
        uniq = np.unique(groups)
        if len(uniq) < 3:
            return None
        stats = []
        for _ in range(n):
            pick = RNG.choice(uniq, len(uniq), replace=True)
            stats.append(fn(np.concatenate([vals[groups == g] for g in pick])))
    return [round(float(np.percentile(stats, 2.5)), 3), round(float(np.percentile(stats, 97.5)), 3)]


def main():
    if not GRID_PATH.exists():
        sys.exit("earth_grid.csv missing: refusing to validate on synthetic data.")
    grid = pd.read_csv(GRID_PATH)
    meta = json.load(open(ROOT / "data/processed/earth_grid_metadata.json", encoding="utf-8"))
    targets = {t["id"]: t for t in json.load(open(ROOT / "data/targets.json", encoding="utf-8"))}
    ka = json.load(open(ROOT / "data/known_analogs.json", encoding="utf-8"))
    feats = pd.read_csv(ROOT / "data/processed/earth_grid_features.csv").set_index("cell_id")

    scored = {tid: score_grid(grid, t).dropna(subset=["score"]).set_index("cell_id") for tid, t in targets.items()}

    def pct_rank(tid, cell_id):
        s = scored[tid]
        if cell_id not in s.index:
            return None, None, None
        v = s.loc[cell_id, "score"]
        return float((s.score < v).mean() + 0.5 * (s.score == v).mean()), float(v), float(s.loc[cell_id, "coverage"])

    def pct_rank_adj(tid, cell_id):
        s = scored[tid]
        if cell_id not in s.index:
            return None
        v = s.loc[cell_id, "score_adj"]
        return float((s.score_adj < v).mean() + 0.5 * (s.score_adj == v).mean())

    split = {p["id"]: ("heldout_v2" if p.get("cohort") == "v2_prospective" else ("heldout" if int(hashlib.sha256(p["id"].encode()).hexdigest(), 16) % 2 == 0 else "tuning")) for p in ka["positives"]}
    rows = []

    def add(kind, ctype, sp, name, sid, tid, lat, lon):
        cell, dist = nearest(grid, lat, lon)
        r, v, cov = pct_rank(tid, int(cell.cell_id))
        radj = pct_rank_adj(tid, int(cell.cell_id))
        rows.append({"percentile_adj": radj, "kind": kind, "ctype": ctype, "split": sp, "site_id": sid, "site": name, "target": tid, "cell_id": int(cell.cell_id),
                     "cell_lat": cell.lat, "cell_lon": cell.lon, "dist_deg": round(dist, 2), "score": v, "percentile": r,
                     "coverage": cov, "in_grid": dist <= MAX_DIST_DEG})

    for p in ka["positives"]:
        for tid in p["targets"]:
            add("positive", "", split[p["id"]], p["name"], p["id"], tid, p["lat"], p["lon"])
    tids = sorted({t for p in ka["positives"] for t in p["targets"]})
    for c in ka["controls"]:
        for tid in c.get("targets", tids):
            add("control", "hard" if c.get("hard") else "easy", "control", c["name"], c["id"], tid, c["lat"], c["lon"])
    for h in ka["hypotheses_pakistan"]["sites"]:
        for tid in h["targets"]:
            add("hypothesis", "", "n/a", h["name"], h["id"], tid, h["lat"], h["lon"])
    df = pd.DataFrame(rows)
    df.to_csv(ROOT / "data/validation_results.csv", index=False)

    ok = df[df.in_grid & df.percentile.notna()]
    pos, ctrl = ok[ok.kind == "positive"], ok[ok.kind == "control"]

    def stats(sub):
        if sub.empty:
            return None
        c = ctrl[ctrl.target.isin(sub.target.unique())]
        ch = c[c.ctype == "hard"]
        pv = sub.percentile.to_numpy()
        a_all, a_hard = auc(pv, c.percentile.to_numpy()), auc(pv, ch.percentile.to_numpy())
        return {"n_pairs": int(len(sub)), "n_sites": int(sub.site_id.nunique()),
                "median_percentile": round(float(np.median(pv)), 3), "median_ci95": boot_ci(pv, np.median, groups=sub.site_id.to_numpy()),
                "median_ci95_unit": "site (cluster bootstrap)", "top10pct_hit_rate": round(float((pv >= 0.9).mean()), 3),
                "top25_hit_rate": round(float((pv >= 0.75).mean()), 3), "top50_hit_rate": round(float((pv >= 0.5).mean()), 3),
                "auc_vs_all_controls": None if a_all is None else round(a_all, 3),
                "auc_vs_hard_controls": None if a_hard is None else round(a_hard, 3),
                "controls_median_percentile": round(float(c.percentile.median()), 3) if len(c) else None,
                "hard_controls_median_percentile": round(float(ch.percentile.median()), 3) if len(ch) else None}

    held, tune, allp = stats(pos[pos.split == "heldout"]), stats(pos[pos.split == "tuning"]), stats(pos)
    heldv2 = stats(pos[pos.split == "heldout_v2"])
    by_target = {t: stats(pos[pos.target == t]) for t in sorted(pos.target.unique())}
    by_complete = {"coverage>=0.9": stats(pos[pos.coverage >= 0.9]), "coverage<0.9": stats(pos[pos.coverage < 0.9])}

    diag = []
    for r in pos[pos.percentile < 0.6].itertuples():
        t = targets[r.target]
        row = grid.loc[grid.cell_id == r.cell_id].iloc[0]
        dims = [{"dimension": d["dimension"], "similarity": d["similarity"], "weight": d["weight"]} for d in explain_cell(row, t) if d["weight"] > 0]
        fr = feats.loc[r.cell_id]
        miss = {d["dimension"]: (fr.get(f"{d['dimension'].split('_')[0]}_missing_reason") or "") for d in dims if d["similarity"] is None}
        diag.append({"site": r.site, "target": r.target, "percentile": round(r.percentile, 2), "coverage": round(r.coverage, 2), "dims": dims, "missing": miss})

    # same evaluation when sites are ranked by the evidence-adjusted score used by the API (reported, not used to choose it)
    okp = ok.copy()
    posa = okp[okp.kind == "positive"]
    hardc = okp[(okp.kind == "control") & (okp.ctype == "hard")]
    aucs_adj = [auc(posa[posa.target == t].percentile_adj.dropna().to_numpy(), hardc[hardc.target == t].percentile_adj.dropna().to_numpy()) for t in posa.target.unique()]
    aucs_raw = [auc(posa[posa.target == t].percentile.dropna().to_numpy(), hardc[hardc.target == t].percentile.dropna().to_numpy()) for t in posa.target.unique()]
    adjusted_basis = {"median_percentile_raw": round(float(posa.percentile.median()), 3), "median_percentile_adjusted": round(float(posa.percentile_adj.median()), 3),
                      "mean_auc_hard_by_target_raw": round(float(np.nanmean([a for a in aucs_raw if a is not None])), 3),
                      "mean_auc_hard_by_target_adjusted": round(float(np.nanmean([a for a in aucs_adj if a is not None])), 3),
                      "note": "The adjusted score was adopted because of a documented coverage bias (score vs coverage rank correlation down to -0.7 for polar targets), not because of these numbers."}
    summary = {"adjusted_basis": adjusted_basis, "grid_built_utc": meta["built_utc"], "grid_cells": meta["grid"]["cells"], "grid_step_deg": meta["grid"]["step_deg"],
               "heldout": held, "heldout_v2": heldv2, "tuning": tune, "all": allp, "by_target": by_target, "by_completeness": by_complete, "diagnostics": diag,
               "cohorts": ka["_meta"].get("cohorts"), "n_controls": int(ctrl.site_id.nunique()), "n_control_pairs": int(len(ctrl)),
               "temporal_coverage": meta["temporal_coverage"]["MODIS_GPM_months"],
               "dimensions_missing": [d for d, v in meta["coverage_by_dimension"].items() if v == 0],
               "dimensions_proxy": [d for d, v in meta["dimensions"].items() if v["status"] == "proxy"],
               "rows": json.loads(df[df.kind != "hypothesis"].to_json(orient="records")),
               "hypotheses": json.loads(df[df.kind == "hypothesis"].to_json(orient="records")),
               "note": "Small sample; intervals are wide. Sites farther than 5 degrees from any land cell (e.g. Kilauea) are excluded."}
    json.dump(summary, open(ROOT / "data/validation_summary.json", "w", encoding="utf-8"), indent=1)

    L = ["# ASTRANOVUS validation against known Earth analogs\n",
         f"*Generated by `scripts/validate_known_analogs.py` on the REAL processed grid (built {meta['built_utc']}). Not synthetic.*\n",
         "## Dataset and method\n",
         f"- Grid: {meta['grid']['cells']} cells at {meta['grid']['step_deg']} deg; dimensions with data: {', '.join(d for d, v in meta['coverage_by_dimension'].items() if v > 0)}.",
         f"- Proxy dimensions: {', '.join(summary['dimensions_proxy'])}. D5 (composition proxy) exists only for bare-ground cells ({meta['coverage_by_dimension']['D5_rock']:.0%} of cells).",
         f"- MODIS/GPM time span: {meta['temporal_coverage']['span']}.",
         "- Each site is scored at its nearest grid cell with generic target weights (no mission profile, no gates). Cells are 2.5 degrees (~280 km): they cannot represent a single site.",
         "- Metric: percentile of the cell's score among all scored cells for the mapped target; AUC against easy and hard controls for the same targets (hard controls are scoped to the targets they are meant to be negatives for); 95% cluster-bootstrap intervals (resampling SITES, seeded); top-25% and top-10% hit rates.",
         "- **Leakage disclosure:** the v1 held-out sites were visible in earlier diagnostics during development, so they are not pristine. Cohort v2 sites were added afterwards and scored for the first time by this run; they are reported separately and were never used for any rule change. Even so, the sample is tiny.",
         "- No rule or weight was tuned on these sites. Positives are split by a hash of their id into `tuning` and `heldout`; the headline uses `heldout`.",
         "- The target mapping (which Moon/Mars reference a site should resemble) is an ASTRANOVUS judgement; control sites are poor analogs by construction (no citation).\n",
         "## Summary\n",
         "| subset | sites | pairs | median percentile (95% CI) | top-25% hits | AUC vs all controls | AUC vs hard controls | controls median | hard controls median |",
         "|---|---|---|---|---|---|---|---|---|"]
    for nm, s in [("**held-out v1**", held), ("**prospective v2 (scored once)**", heldv2), ("tuning", tune), ("all positives", allp)] + [(f"target {t}", v) for t, v in by_target.items()] + [(f"data {k}", v) for k, v in by_complete.items()]:
        if s:
            L.append(f"| {nm} | {s['n_sites']} | {s['n_pairs']} | {s['median_percentile']} {s['median_ci95'] or ''} | {s['top25_hit_rate']} | {s['auc_vs_all_controls']} | {s['auc_vs_hard_controls']} | {s['controls_median_percentile']} | {s['hard_controls_median_percentile']} |")
    L.append(f"\nRanked by the evidence-adjusted score instead of the raw similarity: median percentile {adjusted_basis['median_percentile_raw']} -> {adjusted_basis['median_percentile_adjusted']}, mean AUC vs hard controls by target {adjusted_basis['mean_auc_hard_by_target_raw']} -> {adjusted_basis['mean_auc_hard_by_target_adjusted']}. {adjusted_basis['note']}")
    L.append("\nWith so few sites the intervals are wide: treat these as indicative, not as proof of accuracy.\n")
    L.append("## Per-site results\n")
    L.append("| kind | split | site | target | nearest cell | dist (deg) | score | coverage | percentile |")
    L.append("|---|---|---|---|---|---|---|---|---|")

    def f2(x, n=2):
        return "n/a" if x is None or pd.isna(x) else f"{x:.{n}f}"

    for r in df.sort_values(["kind", "ctype", "site", "target"]).itertuples():
        L.append(f"| {r.kind}{' (' + r.ctype + ')' if r.ctype else ''} | {r.split} | {r.site} | {r.target} | {r.cell_lat},{r.cell_lon} | {r.dist_deg} | {f2(r.score, 1)} | {f2(r.coverage)} | {f2(r.percentile)} |")
    L.append("\n## Why do some known analogs rank weakly?\n")
    if not diag:
        L.append("All positives are above the 0.6 percentile.")
    for d in diag:
        low = [f"{x['dimension']} {x['similarity']:.2f}" for x in d["dims"] if x["similarity"] is not None and x["similarity"] < 0.5]
        L.append(f"- **{d['site']} -> {d['target']}** (percentile {d['percentile']}, coverage {d['coverage']}): low dimensions: {', '.join(low) or 'none below 0.5'}; missing: {'; '.join(f'{k} ({v})' for k, v in d['missing'].items()) or 'none'}.")
    L.append("\nCommon causes: (1) a 2.5 degree cell averages the site with its surroundings (ocean, forest, ice cap); (2) volcanic and lava-tube analogs are defined by composition and structure that the bare-ground-only D5 proxy and 1 km terrain barely capture; (3) vegetated or glaciated cells have D3/D5 undefined by design. These are limits of the data, not reasons to adjust weights.\n")
    L.append("## Pakistani hypotheses (NOT validation)\n")
    L.append("Coordinates were checked against general geography only; no NASA analog citation was retrieved and the cells are far too coarse to resolve them.\n")
    for r in df[df.kind == "hypothesis"].itertuples():
        L.append(f"- {r.site} -> {r.target}: nearest cell {r.cell_lat},{r.cell_lon}, score {f2(r.score, 1)}, percentile {f2(r.percentile)}")
    (ROOT / "docs/VALIDATION.md").write_text("\n".join(L) + "\n", encoding="utf-8")
    print(json.dumps({"heldout": held, "tuning": tune, "all": allp}, indent=1))
    print(f"{len(diag)} weak positives diagnosed")


if __name__ == "__main__":
    main()
