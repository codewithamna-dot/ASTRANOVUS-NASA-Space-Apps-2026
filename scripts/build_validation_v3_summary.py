"""Compact, deterministic summary of the v3 evaluation for the API and the Methodology page.

    python scripts/build_validation_v3_summary.py   # writes data/validation_v3_summary.json

Reads data/validation_v3_final.json (run `python scripts/validate_v3.py --final` first), data/analog_dataset_v3.json,
data/ranking_stability.json and data/experiment_validation.json. Adds nothing new: it only selects and renames.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
ADOPTED = "adjusted_50_exposed_surface"
SHOW = [("raw", "Raw weighted similarity"), ("adjusted_50", "Evidence-adjusted"), ("equal_adjusted_50", "Equal weights, evidence-adjusted"),
        (ADOPTED, "Adopted: evidence-adjusted + exposed-surface rule"), ("baseline_aridity_only", "Baseline: aridity only"),
        ("baseline_dry_and_barren", "Baseline: dry + barren (no target rules)"), ("baseline_dry_barren_flat", "Baseline: dry + barren + flat")]
ABL = [("exposed_adj_drop_D1_cold", "without D1 cold"), ("exposed_adj_drop_D2_aridity", "without D2 aridity"), ("exposed_adj_drop_D3_barren", "without D3 barren"),
       ("exposed_adj_drop_D4_terrain", "without D4 terrain"), ("exposed_adj_drop_D5_rock", "without D5 composition proxy"), ("exposed_adj_drop_D6_ice", "without D6 snow proxy"),
       ("exposed_adj_drop_D8_thermal_swing", "without D8 thermal swing"), ("exposed_adj_drop_proxies_D5_D6_D7", "without D5, D6, D7")]


def pick(m):
    keys = ("n_pairs", "n_sites", "median_percentile", "median_ci95_site_cluster", "top10_hit", "top25_hit", "auc_vs_all_controls_by_target", "auc_vs_hard_controls_by_target", "reliable")
    return {k: m.get(k) for k in keys}


def main():
    fin = json.load(open(ROOT / "data/validation_v3_final.json", encoding="utf-8"))
    ds = json.load(open(ROOT / "data/analog_dataset_v3.json", encoding="utf-8"))
    stab = json.load(open(ROOT / "data/ranking_stability.json", encoding="utf-8"))["summary"]
    ev = json.load(open(ROOT / "data/experiment_validation.json", encoding="utf-8"))["rows"]
    sites = [s for s in ds["sites"] if s["validation_eligibility"] != "ineligible"]
    out = {
        "available": True,
        "provenance": fin["provenance"],
        "adopted_variant": ADOPTED,
        "dataset": {"positive_sites": len(sites), "eligible_sites": sum(1 for s in sites if s["validation_eligibility"] in ("eligible", "eligible_historical")),
                    "exploratory_sites": sum(1 for s in sites if s["validation_eligibility"] == "exploratory"), "rejected_candidates": len(ds["rejected_candidates"]),
                    "controls": len(ds["controls"]), "hard_controls": sum(1 for c in ds["controls"] if c["hard"]),
                    "cohorts": {k: sum(1 for s in sites if s["cohort"] == k) for k in ("A_historical", "B_development", "C_frozen_independent")}},
        "variants": [{"id": k, "label": lab, "dev_A+B": pick(fin["variants"][k]["A+B"]), "frozen_C": pick(fin["variants"][k]["C"])} for k, lab in SHOW],
        "ablations": [{"id": k, "label": lab, "dev_A+B": pick(fin["variants"][k]["A+B"])} for k, lab in ABL],
        "paired_differences_adopted_minus_other": fin["comparisons_vs_adopted"],
        "frozen_pairs": fin["frozen_pairs"][ADOPTED],
        "random_reference": fin["random_reference"],
        "ranking_stability": stab,
        "experiment_matrix": {"pairs": len(ev), "pass": sum(1 for r in ev if r["validation_result"] == "pass"), "pass_with_warnings": sum(1 for r in ev if r["validation_result"] == "pass_with_warnings"),
                              "fail": sum(1 for r in ev if r["validation_result"] == "fail")},
        "statements": [
            "The frozen cohort (3 primary pairs from 3 sites) is scored once and is too small for a confirmatory claim.",
            "A simple dry-and-barren baseline performs as well as the full model on this benchmark: no advantage of the target-specific rules is demonstrated.",
            "Single-cell rankings are unstable; read results as broad regions.",
            "Lava-tube, mare, mud-volcano, Jezero, chloride and dune targets are climate/terrain similarity only (geology is not measured).",
        ],
    }
    json.dump(out, open(ROOT / "data/validation_v3_summary.json", "w", encoding="utf-8"), indent=1)
    print("written;", out["dataset"], out["experiment_matrix"])


if __name__ == "__main__":
    main()
