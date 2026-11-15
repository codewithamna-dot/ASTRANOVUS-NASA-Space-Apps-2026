"""Mission / experiment layer on top of the existing scientific engine.

Nothing here scores anything itself. Scoring, gating and region clustering are done by
model.recommend.recommend() and model.scoring_core (unchanged). This module only
  1. maps user-facing experiments (data/experiments.json) onto the existing mission profiles
     in data/purposes.json (plus optional, clearly flagged draft multiplier overrides),
  2. reports honestly which dimensions the loaded Earth grid actually has, and
  3. enriches the engine's regions with per-dimension detail, labels and caveats for the UI.
"""
from __future__ import annotations

import json
import pathlib

import numpy as np
import pandas as pd
from fastapi import APIRouter, HTTPException

from model.recommend import apply_purpose, recommend as _recommend
from model.scoring_core import explain_cell

from .geo_labels import label_for

# Below this share of (purpose-weighted) target weight that has ANY data in the grid, we refuse
# to present a ranking by default. Documented in docs/DATA_CONTRACT.md section 7.
# Share of passing cells (best first) turned into regions. 60% (engine default is 15%) so one huge high-scoring
# area such as the Antarctic plateau cannot crowd every other candidate region out of the list.
TOP_PCT = 0.60
MIN_RESULT_COVERAGE = 0.5
# A dimension defined in fewer than this share of cells makes an experiment 'partial', never 'ready'.
SPARSE_DIM_COVERAGE = 0.5

# What we know about how each dimension is built (see scripts/fetch_power_grid.py).
# "missing" is never taken from this table - it is computed from the loaded grid.
_PROVENANCE: dict[str, tuple[str, str]] = {
    "D1_cold": ("derived", "NASA POWER T2M annual-mean 2 m air temperature, percentile-ranked (colder = higher). Air temperature, not land-surface temperature."),
    "D2_aridity": ("derived", "NASA POWER PRECTOTCORR annual precipitation, percentile-ranked (drier = higher)."),
    "D6_ice": ("proxy", "PROXY: MODIS MOD10CM snow-cover climatology (mean snow cover over observed months, percentile-ranked). Not a glacier, permafrost or subsurface-ice measurement."),
    "D7_polar_light": ("derived", "NASA POWER ALLSKY_SFC_SW_DWN seasonal swing in surface solar irradiance, percentile-ranked."),
    "D8_thermal_swing": ("derived", "NASA POWER T2M_MAX minus T2M_MIN annual air-temperature range, percentile-ranked."),
}

LIMITS_ON_EARTH = {
    "moon": [
        "Gravity: Earth is about 6x the Moon's surface gravity.",
        "Atmosphere: the Moon has essentially none; every Earth site has air, weather and humidity.",
        "Radiation: Earth's atmosphere and magnetic field shield sites from the radiation a lunar surface receives.",
        "Dust and regolith: Earth soils are weathered and moist; lunar regolith is sharp, dry and electrostatically charged.",
    ],
    "mars": [
        "Gravity: Earth is about 2.6x Mars' surface gravity.",
        "Atmosphere: Mars' surface pressure is about 6 mbar (roughly 0.6% of Earth's) and mostly CO2.",
        "Radiation: Mars' thin atmosphere gives far less UV and cosmic-ray shielding than Earth.",
        "Chemistry and biology: Earth sites are shaped by liquid water and life in ways Mars is not.",
    ],
}

DISCLAIMER = (
    "ASTRANOVUS scores are team-generated, purpose-specific similarity estimates computed from percentile "
    "ranks of public Earth-observation data. They are not official NASA ratings, landing-site "
    "certifications or proof that an Earth site reproduces lunar or Martian gravity, atmosphere or radiation."
)


def _py(o):
    """Recursively convert numpy/pandas scalars to plain Python so FastAPI can serialise them."""
    if isinstance(o, dict):
        return {str(k): _py(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_py(v) for v in o]
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.floating):
        return None if np.isnan(o) else float(o)
    if isinstance(o, float) and np.isnan(o):
        return None
    if isinstance(o, np.bool_):
        return bool(o)
    return o


def _terrain(e):
    """SRTM stage-2 verification for a region's best cell (None-safe, never fabricated)."""
    if e is None:
        return {"state": "not_checked", "note": "SRTM terrain was only computed for the top candidate regions; this region has not been checked."}
    if not e.get("covered"):
        return {"state": "outside_coverage", "note": "Outside SRTM coverage (60N to 56S): terrain NOT verified."}
    keys = ("terrain_class", "slope_mean_deg", "slope_p95_deg", "relief_m", "roughness_std_m", "elevation_mean_m", "note")
    return {"state": "verified_local", **{k: e.get(k) for k in keys}}


def _surface(f):
    """Coarse per-cell surface context from the features file (never a substitute for the 30 m terrain check)."""
    if f is None:
        return None
    def num(x, nd=1):
        return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), nd)
    return {
        "perennial_snow_ice": bool(f.perennial_snow_ice) if num(f.perennial_snow_ice) is not None else None,
        "snow_mean_valid_pct": num(f.snow_mean_valid_pct),
        "elevation_mean_m": num(f.dem_elev_mean_m, 0),
        "relief_1km_m": num(f.dem_relief_m, 0),
        "slope_1km_deg": num(f.dem_slope_mean_deg, 2),
        "dem_source": f.dem_source if isinstance(f.dem_source, str) and f.dem_source else None,
    }


def create_router(grid: pd.DataFrame, targets: dict, dimensions: list, purposes: dict,
                  root: pathlib.Path, grid_is_sample: bool, grid_name: str) -> APIRouter:
    router = APIRouter()
    meta = json.load(open(root / "data/experiments.json", encoding="utf-8"))
    sources = meta["_meta"]["sources"]
    experiments = {e["id"]: e for e in meta["experiments"]}
    dim_meta = {d["id"]: d for d in dimensions}
    ev_path = root / "data/target_evidence_summary.json"
    evidence = json.load(open(ev_path, encoding="utf-8")) if ev_path.exists() else {"targets": {}}
    rd_path = root / "data/target_readiness.json"
    rd_all = json.load(open(rd_path, encoding="utf-8")) if rd_path.exists() else {"targets": {}, "_dimension_categories": {}}
    readiness = rd_all.get("targets", {})
    dim_cats = rd_all.get("_dimension_categories", {})
    st_path = root / "data/ranking_stability.json"
    stability = json.load(open(st_path, encoding="utf-8"))["pairs"] if st_path.exists() else {}
    feat_path = root / "data/processed/earth_grid_features.csv"
    feats = {}
    if feat_path.exists() and not grid_is_sample:
        fdf = pd.read_csv(feat_path)
        feats = {(float(r.lat), float(r.lon)): r for r in fdf.itertuples(index=False)}
    s2_path = root / "data/processed/stage2.json"
    stage2 = {}
    if s2_path.exists():
        for e in json.load(open(s2_path, encoding="utf-8")):
            stage2[(e["lat"], e["lon"])] = e
    meta_path = root / "data/processed/earth_grid_metadata.json"
    grid_meta = None
    if meta_path.exists() and not grid_is_sample:
        grid_meta = json.load(open(meta_path, encoding="utf-8"))

    def dim_kind(did: str) -> tuple[str, str, str]:
        """(status, provenance, temporal) from the build metadata when present, else the static table."""
        gm = (grid_meta or {}).get("dimensions", {}).get(did)
        if gm and gm.get("status") != "missing":
            return gm["status"], gm["source"], gm.get("temporal", "")
        if did in _PROVENANCE:
            return _PROVENANCE[did][0], _PROVENANCE[did][1], ""
        return "derived", f"Populated in the loaded grid; intended source per dimensions.json: {dim_meta.get(did, {}).get('earth_source', 'n/a')} (verify pipeline).", ""

    # ---- data status -------------------------------------------------------------------
    def dim_has_data(dim: str) -> bool:
        return dim in grid.columns and bool(grid[dim].notna().any())

    def data_status() -> dict:
        lats = np.sort(grid.lat.unique())
        step = float(np.min(np.diff(lats))) if len(lats) > 1 else None
        dims = []
        for d in dimensions:
            did = d["id"]
            frac = float(grid[did].notna().mean()) if did in grid.columns else 0.0
            if frac == 0.0:
                status = "missing"
                prov = f"No data in the loaded grid yet. Intended source: {d.get('earth_source', 'n/a')}."
                temporal = ""
            else:
                status, prov, temporal = dim_kind(did)
            dims.append({"id": did, "name": d["name"], "description": d.get("description", ""),
                         "status": status, "cell_coverage": round(frac, 3), "provenance": prov, "temporal": temporal,
                         "intended_earth_source": d.get("earth_source", ""),
                         "planetary_source": d.get("target_source", "")})
        return {
            "grid": {"file": grid_name, "is_synthetic_sample": grid_is_sample, "cells": int(len(grid)),
                     "step_deg": step,
                     "lat_range": [float(grid.lat.min()), float(grid.lat.max())]},
            "dimensions": dims,
            "n_dimensions_with_data": sum(1 for x in dims if x["status"] != "missing"),
            "n_dimensions": len(dims),
            "values_are": "percentile ranks (0-1) among the loaded land cells, not raw physical units",
            "build": ({"built_utc": grid_meta["built_utc"], "temporal_coverage": grid_meta["temporal_coverage"],
                       "products": {k: v.get("version", v.get("source")) for k, v in grid_meta["products"].items()},
                       "cross_checks": grid_meta.get("cross_checks", {})} if grid_meta else None),
            "disclaimer": DISCLAIMER,
        }

    # ---- experiment -> engine inputs ---------------------------------------------------
    def parse_weights(raw: str | None) -> dict:
        """'D1_cold:1.5,D2_aridity:0' -> {dim: factor}. Factors 0-3 multiply the profile's weights (user tuning)."""
        out: dict = {}
        if not raw:
            return out
        for part in raw.split(","):
            try:
                k, v = part.split(":")
                v = float(v)
            except ValueError:
                raise HTTPException(422, f"bad weights entry {part!r}; use DIM:factor,DIM:factor")
            if k not in dim_meta or not 0 <= v <= 3:
                raise HTTPException(422, f"weight {part!r}: unknown dimension or factor outside 0-3")
            out[k] = v
        return out

    def effective_purpose(exp: dict, custom: dict | None = None) -> dict:
        pu = purposes[exp["purpose_id"]]
        mult = dict(pu.get("multipliers", {}))
        for dim, m in exp.get("multiplier_overrides", {}).items():
            mult[dim] = mult.get(dim, 1.0) * m
        for dim, m in (custom or {}).items():
            mult[dim] = mult.get(dim, 1.0) * m
        gates = list(pu.get("gates", [])) + list(exp.get("extra_gates", []))
        return {**pu, "multipliers": mult, "gates": gates}

    def allowed_target_ids(exp: dict) -> list[str]:
        pu = purposes[exp["purpose_id"]]
        return [t for t in pu["targets"] if t in targets and targets[t]["body"] == exp["body"]]

    def assess(exp: dict, target: dict, custom: dict | None = None) -> dict:
        pu = effective_purpose(exp, custom)
        eff = apply_purpose(target, pu)
        total = have = 0.0
        missing, proxies = [], []
        for dim, r in eff["rules"].items():
            w = float(r["weight"])
            if w <= 0:
                continue
            total += w
            if dim_has_data(dim):
                have += w
                if dim_kind(dim)[0] == "proxy":
                    proxies.append(dim)
            else:
                missing.append(dim)
        sparse = [d for d, r in eff["rules"].items() if float(r["weight"]) > 0 and dim_has_data(d) and float(grid[d].notna().mean()) < SPARSE_DIM_COVERAGE]
        gate_missing = [g for g in pu.get("gates", []) if not dim_has_data(g["dim"])]
        max_cov = (have / total) if total else 0.0
        if gate_missing or max_cov < MIN_RESULT_COVERAGE:
            state = "unavailable"
        elif missing or proxies or sparse:
            state = "partial"
        else:
            state = "ready"
        notes = []
        for g in gate_missing:
            notes.append(f"Required check not possible yet: {dim_meta.get(g['dim'], {}).get('name', g['dim'])} has no data ({g['why']}).")
        if not gate_missing and max_cov < MIN_RESULT_COVERAGE:
            notes.append(f"Only {max_cov:.0%} of this mission/site's weighted criteria have data (minimum {MIN_RESULT_COVERAGE:.0%}).")
        for d in proxies:
            notes.append(f"{dim_meta.get(d, {}).get('name', d)} is a proxy, not a direct measurement.")
        for d in sparse:
            notes.append(f"{dim_meta.get(d, {}).get('name', d)} is defined in only {float(grid[d].notna().mean()):.0%} of cells; elsewhere it is excluded from the score.")
        return {"state": state, "max_coverage": round(max_cov, 3),
                "missing_dimensions": missing, "proxy_dimensions": proxies, "sparse_dimensions": sparse,
                "gate_dimensions_missing": [g["dim"] for g in gate_missing], "notes": notes}

    def suitability(tid: str, dims: list[dict], coverage: float) -> dict:
        """Scientific suitability labels reusing the dimension-level explanations. No independent score is invented:
        category similarity is the weighted mean of the existing dimension similarities that belong to it."""
        rd = readiness.get(tid, {})
        cats = {}
        for cat, members in dim_cats.items():
            rows = [d for d in dims if d["dimension"] in members]
            if not rows:
                continue
            have = [d for d in rows if d["similarity"] is not None]
            wsum = sum(float(d["weight"]) for d in have)
            cats[cat] = {"similarity": round(sum(float(d["weight"]) * float(d["similarity"]) for d in have) / wsum, 3) if wsum else None,
                         "dimensions": [d["dimension"] for d in rows], "data_available": f"{len(have)}/{len(rows)}",
                         "basis": "proxy" if any(d["data_status"] == "proxy" for d in have) else ("measured_or_derived" if have else "missing")}
        supported, partial = [], []
        for d in dims:
            if d["similarity"] is None:
                partial.append(f"{d['name']}: no data for this cell ({d.get('missing_reason') or 'missing'}).")
            elif d["data_status"] == "proxy":
                partial.append(f"{d['name']}: similarity {d['similarity']:.2f}, but this dimension is a proxy ({d['source'][:90]}).")
            elif d["similarity"] >= 0.7:
                supported.append(f"{d['name']}: similarity {d['similarity']:.2f} ({d['data_status']}, {d['source'][:80]}).")
            else:
                partial.append(f"{d['name']}: similarity only {d['similarity']:.2f}.")
        unsupported = [f"{x['property']} ({x['status'].replace('_', ' ')}): {x['note']}" for x in rd.get("defining_properties", [])
                       if x["status"] in ("not_measured", "not_reproducible_on_earth")]
        unsupported += [f"Missing evidence: {m}." for m in rd.get("critical_missing", [])]
        proxy_active = any(d["data_status"] == "proxy" for d in dims if d["similarity"] is not None)
        if coverage < MIN_RESULT_COVERAGE:
            status, basis = "Insufficient data", f"only {coverage:.0%} of the weighted criteria have data for this cell"
        elif rd.get("geology_defined"):
            status, basis = "Geological suitability unverified", "this target is defined by geology the model cannot measure; the match is climate/terrain/surface similarity"
        elif rd.get("screening_scope") != "full_environmental_screen" or coverage < 0.9 or proxy_active:
            status, basis = "Partial environmental match", "some defining properties rely on proxies, are not reproducible on Earth, or have incomplete coverage"
        else:
            status, basis = "Supported by available evidence", "all criteria have data and none is a proxy"
        return {"status": status, "status_basis": basis, "screening_scope": rd.get("screening_scope"), "categories": cats,
                "supported": supported, "partially_supported": partial, "unsupported": unsupported}

    def evidence_tier(r: dict, terrain: dict) -> dict:
        """Global screening candidate -> locally supported region -> (never automatic) field-testing location."""
        if terrain.get("state") == "verified_local":
            return {"tier": "locally_supported_region", "label": "Locally supported region (30 m terrain checked)",
                    "note": "30 m SRTM terrain was computed for the best cell. This is still a region, not a surveyed test site."}
        return {"tier": "global_screening_candidate", "label": "Global screening candidate",
                "note": "Ranked from a 2.5 degree (about 280 km) cell only. A field-testing location needs local imagery, geology, access and permission."}

    def target_card(t: dict, exp: dict) -> dict:
        card = {k: v for k, v in t.items() if k != "rules"}
        card["rules"] = t["rules"]
        card["is_draft"] = "draft" in str(t.get("_note", "")).lower()
        card["evidence"] = evidence["targets"].get(t["id"], {"grounded": 0, "total": len(t["rules"])})
        card["readiness"] = assess(exp, t)
        card["screening"] = readiness.get(t["id"])
        return card

    def resolve_sources(exp: dict) -> list[dict]:
        return [{"id": sid, **sources[sid]} for sid in exp["nasa_documented"]["sources"]]

    def experiment_view(exp: dict) -> dict:
        pu = effective_purpose(exp)
        allowed = allowed_target_ids(exp)
        out = {k: v for k, v in exp.items()}
        out["nasa_documented"] = {**exp["nasa_documented"], "sources": resolve_sources(exp)}
        out["purpose"] = {"id": pu["id"], "name": pu["name"], "question": pu["question"],
                          "nasa_basis": pu["nasa_basis"], "multipliers": pu["multipliers"], "gates": pu["gates"]}
        out["allowed_targets"] = [target_card(targets[t], exp) for t in allowed]
        out["default_target"] = allowed[0] if allowed else None
        out["key_dimensions"] = sorted(pu["multipliers"], key=lambda d: -pu["multipliers"][d])
        return out

    # ---- endpoints ---------------------------------------------------------------------
    @router.get("/experiments")
    def list_experiments(body: str | None = None):
        items = [experiment_view(e) for e in experiments.values() if body is None or e["body"] == body]
        info = meta["_meta"]
        return _py({"notice": info["notice"], "classification": info["classification"],
                    "sources_verified_on": info["sources_verified_on"], "experiments": items})

    @router.get("/evidence/{target_id}")
    def target_evidence_detail(target_id: str):
        """Machine-readable evidence for one reference site: per-rule evidence status + numerical measurements with provenance."""
        if target_id not in targets:
            raise HTTPException(404, f"unknown target {target_id}")
        import csv
        rules, meas = [], []
        p1 = root / "data/target_evidence.csv"
        p2 = root / "data/planetary_measurements.csv"
        if p1.exists():
            rules = [r for r in csv.DictReader(open(p1, encoding="utf-8")) if r["target_id"] == target_id]
        if p2.exists():
            meas = [r for r in csv.DictReader(open(p2, encoding="utf-8")) if r["target_id"] == target_id]
        return {"target_id": target_id, "rules": rules, "measurements": meas,
                "counts": {"measurements_site": sum(1 for m in meas if m["scope"] == "site"), "measurements_region": sum(1 for m in meas if m["scope"] == "region"),
                           "measurements_body_generic": sum(1 for m in meas if m["scope"] == "body"), "rules_supported": sum(1 for r in rules if r["status"] == "supported"),
                           "rules_retired": sum(1 for r in rules if r["status"] == "retired"), "rules_unverified": sum(1 for r in rules if r["status"] == "unverified")},
                "note": "Values are quoted from the cited sources; ASTRANOVUS did not measure them. 'search_summary' retrieval means the primary page could not be fetched: re-verify before relying on it."}

    @router.get("/validation")
    def get_validation():
        p = root / "data/validation_summary.json"
        if not p.exists():
            return {"available": False, "note": "Validation has not been run on the real grid (python scripts/validate_known_analogs.py)."}
        return {"available": True, **json.load(open(p, encoding="utf-8"))}

    @router.get("/validation/v3")
    def get_validation_v3():
        p = root / "data/validation_v3_summary.json"
        if not p.exists():
            return {"available": False, "note": "v3 validation summary not built (python scripts/validate_v3.py --final; python scripts/build_validation_v3_summary.py)."}
        return json.load(open(p, encoding="utf-8"))

    @router.get("/data_status")
    def get_data_status():
        return _py(data_status())

    @router.get("/mission/recommend")
    def mission_recommend(experiment: str, target: str | None = None, min_coverage: float = 0.4,
                          top: int = 10, allow_unverified: bool = False, weights: str | None = None):
        if experiment not in experiments:
            raise HTTPException(404, f"unknown experiment {experiment}")
        exp = experiments[experiment]
        allowed = allowed_target_ids(exp)
        if not allowed:
            raise HTTPException(422, f"experiment {experiment} has no compatible {exp['body']} targets")
        tid = target or allowed[0]
        if tid not in allowed:
            raise HTTPException(422, f"target {tid} not valid for this experiment; use one of {allowed}")
        t = targets[tid]
        custom = parse_weights(weights)
        pu = effective_purpose(exp, custom)
        eff = apply_purpose(t, pu)
        assessment = assess(exp, t, custom)
        status = data_status()
        status_by_id = {d["id"]: d for d in status["dimensions"]}

        base = {
            "experiment": {k: v for k, v in experiment_view(exp).items() if k != "allowed_targets"},
            "target_info": target_card(t, exp),
            "allowed_targets": [target_card(targets[x], exp) for x in allowed],
            "assessment": assessment,
            "data_state": assessment["state"],
            "provisional": False,
            "custom_weights": custom,
            "grid": status["grid"],
            "dimension_status": status["dimensions"],
            "limits_on_earth": LIMITS_ON_EARTH[exp["body"]] + exp.get("cannot_reproduce", []),
            "disclaimer": DISCLAIMER,
        }

        if assessment["state"] == "unavailable" and not allow_unverified:
            return _py({**base, "regions": [], "n_cells_passed": 0, "weights_used": {}})

        # Strict gating: a cell whose required (gate) dimension has no data cannot be shown as a verified match.
        # They are excluded unless the user explicitly asks for the provisional view.
        gate_dims = [g["dim"] for g in pu.get("gates", []) if g["dim"] in grid.columns]
        if readiness.get(tid, {}).get("requires_exposed_surface") and "D3_barren" in grid.columns and "D3_barren" not in gate_dims:
            gate_dims.append("D3_barren")   # an ice/snow/water-covered cell is not exposed ground (see data/target_readiness.json)
        unverified_mask = grid[gate_dims].isna().any(axis=1) if gate_dims else pd.Series(False, index=grid.index)
        run_grid = grid if allow_unverified else grid[~unverified_mask]
        base["n_cells_excluded_unverified"] = 0 if allow_unverified else int(unverified_mask.sum())
        out = _recommend(run_grid, t, pu, dimensions, min_coverage=min_coverage, top_regions=top, top_pct=TOP_PCT, rank_by="adjusted")
        base["provisional"] = assessment["state"] == "unavailable"
        regions = []
        for r in out.get("regions", []):
            lat, lon = r["best_cell"]["lat"], r["best_cell"]["lon"]
            hit = grid[(grid.lat == lat) & (grid.lon == lon)]
            dims = []
            if len(hit):
                for row in explain_cell(hit.iloc[0], eff):
                    if float(row["weight"]) <= 0:
                        continue
                    st = status_by_id.get(row["dimension"], {})
                    frow = feats.get((lat, lon))
                    reason = None
                    if row["percentile"] is None and frow is not None:
                        reason = getattr(frow, f"{row['dimension'].split('_')[0]}_missing_reason", None) or None
                    dims.append({**row, "missing_reason": reason,
                                 "name": dim_meta.get(row["dimension"], {}).get("name", row["dimension"]),
                                 "data_status": "missing" if row["percentile"] is None else st.get("status", "derived"),
                                 "temporal": st.get("temporal", ""),
                                 "source": st.get("provenance", "")})
            # The engine's lat/lon is the CENTROID of the merged cells, which can lie far from the best cell for wide
            # belts. Show the best cell (the place the score, terrain check and label all refer to); keep the centroid.
            lab = label_for(lat, lon)
            regions.append({**r, "centroid": {"lat": r["lat"], "lon": r["lon"]}, "lat": lat, "lon": lon,
                            "id": f"R{r['rank']}", "location_label": lab["label"],
                            "region_name": lab["region_name"], "country": lab["country"], "label_basis": lab["basis"],
                            "dimensions": dims, "applications": exp["applications"],
                            "terrain": _terrain(stage2.get((lat, lon))),
                            "surface": _surface(feats.get((lat, lon)))})
            regions[-1]["suitability"] = suitability(tid, dims, float(r["coverage"]))
            regions[-1]["evidence_tier"] = evidence_tier(r, regions[-1]["terrain"])
        base["ranking_basis"] = out.get("ranking_basis", "evidence-adjusted score")
        sp = stability.get(f"{experiment}/{tid}") if not custom and not allow_unverified else None
        base["ranking_stability"] = None if sp is None else {
            "weights_top1_within_5deg": sp["weights"]["top1_stays_within_5deg"], "weights_mean_jaccard_top5": sp["weights"]["mean_jaccard_top5"],
            "missing_20pct_top1_within_5deg": sp["missing_20pct"]["top1_stays_within_5deg"], "missing_20pct_mean_jaccard_top5": sp["missing_20pct"]["mean_jaccard_top5"],
            "note": "Precomputed (scripts/ranking_stability.py) for the default weights: how often the #1 region stays within 5 degrees when dimension weights are perturbed (sigma 0.3) or 20% of cells lose a dimension."}
        base["regions"] = regions
        base["n_cells_passed"] = out.get("n_cells_passed", 0)
        base["weights_used"] = out.get("weights_used", {})
        return _py(base)

    return router
