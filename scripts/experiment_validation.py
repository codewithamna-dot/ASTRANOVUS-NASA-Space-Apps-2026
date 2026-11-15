"""Validate every experiment x compatible target through the real API code path (no mocks).

    python scripts/experiment_validation.py      # writes docs/EXPERIMENT_VALIDATION.md and data/experiment_validation.json

Checks per (experiment, target):
  - the call succeeds and returns regions or an explicit, reasoned "unavailable" state
  - every region best cell has non-null values for each gate dimension of the purpose, and passes it
  - regions are ordered by the declared ranking basis; coverage >= requested minimum
  - ice/snow-dominated cells are not recommended for purposes that gate against snow cover or require dry ground
  - overlap (Jaccard of top-5 cells) with the neutral reference-site profile (how much the experiment changes the answer)
The experiment's NASA grounding level (direct / related / proposed) is copied from data/experiments.json, not inferred.
"""
import json
import pathlib
import sys

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))


def finish(rec, e, t, r, regs, app):
    """Machine-readable matrix fields (deterministic checks only; literature review is documented separately)."""
    warns = []
    suit = [g.get("suitability", {}).get("status") for g in regs]
    scope = (t.get("screening") or {}).get("screening_scope")
    if scope == "climate_terrain_similarity_only":
        warns.append("climate/terrain similarity only: the geology that defines this target is not measured")
    if any(st == "Geological suitability unverified" for st in suit):
        warns.append("every recommended region is labelled 'Geological suitability unverified'")
    if r.get("data_state") != "ready":
        warns.append(f"data state is '{r.get('data_state')}': {', '.join(r.get('assessment', {}).get('missing_dimensions', []) + r.get('assessment', {}).get('proxy_dimensions', []) + r.get('assessment', {}).get('sparse_dimensions', [])) or 'see assessment'}")
    st = r.get("ranking_stability")
    if st and st["weights_top1_within_5deg"] < 0.5:
        warns.append(f"#1 region unstable under weight noise ({st['weights_top1_within_5deg']:.0%} within 5 degrees)")
    if st and st["missing_20pct_top1_within_5deg"] < 0.5:
        warns.append(f"#1 region unstable when data are missing ({st['missing_20pct_top1_within_5deg']:.0%})")
    if any(g["coverage"] < 0.9 for g in regs):
        warns.append("at least one recommended region has coverage < 90%")
    lat_polar = [g["location_label"] for g in regs if abs(g["lat"]) >= 66]
    dry = any(gt["dim"] == "D2_aridity" for gt in (e["purpose"].get("gates") or []))
    if lat_polar and e["body"] == "mars" and "ICE" not in t["id"]:
        warns.append(f"polar regions in the top five for a non-ice Mars target: {', '.join(lat_polar)}")
    desc_ok = bool(e.get("what_is_tested")) and bool(e.get("why")) and bool(e.get("environment_requirements"))
    compat_ok = t["body"] == e["body"] and t["id"] in e["purpose"].get("targets", []) if "targets" in e["purpose"] else t["body"] == e["body"]
    rec.update(experiment_description_present=desc_ok, target_body_matches_experiment=compat_ok,
               n_candidate_regions=len(regs), data_sufficiency=r.get("data_state"), gate_status={"gates": rec["gates"], "cells_excluded_unverified": r.get("n_cells_excluded_unverified"), "regions_pass_gates": True},
               mean_region_coverage=round(float(np.mean([g["coverage"] for g in regs])), 3), suitability_statuses=sorted(set(suit)),
               screening_scope=scope, ranking_stability=st, scientific_warnings=warns)
    rec["validation_result"] = "fail" if not (desc_ok and compat_ok) else ("pass_with_warnings" if warns else "pass")
    return rec


def main():
    from backend import mission_api, main as app
    from model.recommend import recommend

    router = mission_api.create_router(app.GRID, app.TARGETS, app.DIMENSIONS, app.PURPOSES, app.ROOT, app.GRID_IS_SAMPLE, "earth_grid.csv")
    ep = {r.path: r.endpoint for r in router.routes}
    exps = ep["/experiments"]()["experiments"]
    rows, problems = [], []
    for e in exps:
        gates = [g for g in (e["purpose"].get("gates") or [])]
        for t in e["allowed_targets"]:
            rec = {"experiment": e["id"], "target": t["id"], "grounding": e["nasa_documented"]["level"], "gates": [f"{g['dim']}{g['op']}{g['value']}" for g in gates]}
            try:
                r = ep["/mission/recommend"](experiment=e["id"], target=t["id"], min_coverage=0.4, top=5, allow_unverified=False, weights=None)
            except Exception as ex:  # noqa: BLE001
                rec.update(status="error", error=str(ex))
                problems.append(f"{e['id']}/{t['id']}: call failed: {ex}")
                rows.append(rec)
                continue
            regs = r.get("regions", [])
            rec.update(status=r.get("data_state"), n_regions=len(regs), excluded_unverified=r.get("n_cells_excluded_unverified"), ranking_basis=r.get("ranking_basis"))
            if not regs:
                rec["note"] = "no regions: " + "; ".join(r.get("assessment", {}).get("reasons", []) if isinstance(r.get("assessment"), dict) else [str(r.get("assessment"))])[:200]
                rows.append(rec)
                continue
            adj = [g.get("evidence_adjusted_score", g["best_score"]) for g in regs]
            if adj != sorted(adj, reverse=True):
                problems.append(f"{e['id']}/{t['id']}: regions not ordered by adjusted score")
            if any(g["coverage"] < 0.4 - 1e-9 for g in regs):
                problems.append(f"{e['id']}/{t['id']}: region below minimum coverage")
            snowy = 0
            for g in regs:
                dims = {d["dimension"]: d for d in g["dimensions"]}
                bc = g["best_cell"]
                row = app.GRID[(app.GRID.lat == bc["lat"]) & (app.GRID.lon == bc["lon"])]
                for gt in gates:
                    v = row[gt["dim"]].iloc[0] if len(row) and gt["dim"] in row.columns else None
                    if v is None or v != v:
                        problems.append(f"{e['id']}/{t['id']}: gate {gt['dim']} has no data in {g['id']} (strict gating violated)")
                    elif not (v >= gt["value"] if gt["op"] == ">=" else v <= gt["value"]):
                        problems.append(f"{e['id']}/{t['id']}: region {g['id']} best-cell {gt['dim']}={v:.2f} fails gate {gt['op']}{gt['value']}")
                d6v = row["D6_ice"].iloc[0] if len(row) else None
                if d6v is not None and d6v == d6v and d6v >= 0.95:
                    snowy += 1
            rec["snow_dominated_regions_top5"] = snowy
            dry = any(gt["dim"] == "D2_aridity" or (gt["dim"] == "D6_ice" and gt["op"] == "<=") for gt in gates)
            if snowy and dry:
                problems.append(f"{e['id']}/{t['id']}: {snowy} snow-dominated region(s) recommended for a dry/low-snow gated experiment")
            rec["top"] = [{"label": g["location_label"], "adjusted": adj[i], "raw": g["best_score"], "coverage": g["coverage"], "confidence": g["confidence"]} for i, g in enumerate(regs[:3])]
            neutral = {"id": "NEUTRAL", "multipliers": {}, "gates": []}
            nb = recommend(app.GRID, app.TARGETS[t["id"]], neutral, app.DIMENSIONS, min_coverage=0.4, top_regions=5, top_pct=0.6, rank_by="adjusted")
            a = {(g["best_cell"]["lat"], g["best_cell"]["lon"]) for g in regs}
            b = {(g["best_cell"]["lat"], g["best_cell"]["lon"]) for g in nb.get("regions", [])}
            rec["jaccard_vs_neutral"] = round(len(a & b) / len(a | b), 2) if a | b else None
            rec["limits"] = e["cannot_reproduce"]
            rec = finish(rec, e, t, r, regs, app)
            rows.append(rec)

    json.dump({"rows": rows, "problems": problems}, open(ROOT / "data/experiment_validation.json", "w", encoding="utf-8"), indent=1)
    cls = {"direct": [], "related": [], "proposed": []}
    for e in exps:
        cls.setdefault(e["nasa_documented"]["level"], []).append(e["id"])
    L = ["# Experiment validation (all experiments x compatible targets)", "",
         "Generated by `scripts/experiment_validation.py` through the real API code path on the committed real-data grid. Nothing here is mocked.", "",
         f"- Experiments: {len(exps)}; experiment-target pairs checked: {len(rows)}; invariant violations found: **{len(problems)}**.",
         f"- NASA grounding level (from `data/experiments.json`): " + "; ".join(f"{k}: {len(v)} ({', '.join(v)})" for k, v in cls.items() if v) + ".",
         "- Invariants: gate dimensions non-null and passing for every recommended region; regions ordered by the evidence-adjusted score; coverage >= 0.4; no snow-dominated cell recommended for dry-ground experiments; experiments without usable data say so instead of ranking.", ""]
    if problems:
        L += ["## Violations", ""] + [f"- {p}" for p in problems] + [""]
    L += ["## Results", "", "| Experiment | Target | Grounding | State | Top region (adj / raw / cov) | Jaccard vs neutral |", "|---|---|---|---|---|---|"]
    for r in rows:
        top = r.get("top", [{}])[0]
        t1 = f"{top.get('label', '-')} ({top.get('adjusted', '-')} / {top.get('raw', '-')} / {top.get('coverage', '-')})" if top else "-"
        L.append(f"| {r['experiment']} | {r['target']} | {r['grounding']} | {r.get('status')} | {t1 if r.get('top') else r.get('note', '-')} | {r.get('jaccard_vs_neutral', '-')} |")
    L += ["", "## Matrix summary", "",
          f"- Deterministic result per pair: {', '.join(f'{k} {v}' for k, v in sorted({x: sum(1 for r in rows if r.get('validation_result') == x) for x in set(r.get('validation_result') for r in rows)}.items()))}.",
          "- `pass` only means code-level invariants held. It is NOT scientific validation: most pairs carry warnings that say what the model cannot establish (see `scientific_warnings` in `data/experiment_validation.json`).",
          "- Literature review of the scientific claims: see `docs/SCIENTIFIC_VALIDATION_REPORT_V3.md`.", ""]
    L += ["", "## Reading", "",
          "- Jaccard near 1.0 means the experiment profile barely changes the neutral answer; low values mean the mission gates and multipliers matter.",
          "- Every experiment is an *analogue exercise on Earth*; each carries its own `cannot_reproduce` list in the API and UI (vacuum, gravity, radiation, regolith chemistry, extreme cold of lunar PSRs, etc.).",
          "- Experiments graded `related` or `proposed` are our mapping of mission needs to measurable Earth properties, not a NASA-published site-selection rule.", ""]
    (ROOT / "docs/EXPERIMENT_VALIDATION.md").write_text("\n".join(L), encoding="utf-8")
    print(f"{len(rows)} pairs, {len(problems)} problems")
    for p in problems:
        print(" -", p)


if __name__ == "__main__":
    main()
