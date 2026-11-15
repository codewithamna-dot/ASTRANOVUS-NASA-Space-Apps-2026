"""Generate data/target_evidence.csv and data/target_evidence_summary.json from data/targets.json.

One row per rule. `status` = supported only when a RETRIEVED source states something consistent with the rule's direction.
`evidence_type`: observed (instrument measurement quoted by the source), literature (published interpretation),
derived (ASTRANOVUS reasoning stated explicitly), none. Quantities are quoted exactly as the sources give them
(retrieved 2026-11-15); nothing is invented. Weight-0 rules are reported as `retired` with the reason.
    python scripts/build_target_evidence.py
"""
import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
S = {
    "diviner_sci": "https://www.diviner.ucla.edu/science",
    "diviner_ice": "https://www.diviner.ucla.edu/single-post/diviner-data-used-to-map-the-stability-of-ices-at-the-lunar-poles",
    "lro_2009": "https://www3.nasa.gov/home/hqnews/2009/sep/HQ_09-215_LRO_First_Light.html",
    "artemis": "https://www.nasa.gov/news-release/nasa-identifies-candidate-regions-for-landing-next-americans-on-moon/",
    "lroc_shackleton": "https://lroc.im-ldi.com/images/1105",
    "svs_shackleton": "https://svs.gsfc.nasa.gov/4716",
    "pits": "https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/",
    "pits_cave": "https://science.nasa.gov/solar-system/new-evidence-adds-to-findings-hinting-at-network-of-caves-on-moon/",
    "sample_report": "https://lunarscience.arc.nasa.gov/lssw/downloads/LSSW_Samples_Report.pdf",
    "mare_basalt": "https://ntrs.nasa.gov/api/citations/20090037107/downloads/20090037107.pdf",
    "slopes_usgs": "https://pubs.usgs.gov/publication/70223199",
    "swim": "https://science.nasa.gov/resource/swim-map-shows-subsurface-water-ice-on-mars/",
    "swim_psi": "https://swim.psi.edu/",
    "arcadia_ice": "https://pubs.usgs.gov/publication/70137247",
    "jezero_kit": "https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/landing_site/",
    "jezero_lake": "https://www.jpl.nasa.gov/news/nasas-perseverance-rover-deciphers-ancient-history-of-martian-lake/",
    "jezero_olivine": "https://ntrs.nasa.gov/citations/20220012767",
    "meda": "https://science.nasa.gov/blog/daily-records-of-atmospheric-temperature-with-perseverance/",
    "chloride": "https://www.nasa.gov/mission_pages/odyssey/odyssey-20080320.html",
    "mud_utopia": "https://science.nasa.gov/photojournal/candidate-mud-volcanoes-in-utopia-planitia/",
    "mud_acidalia": "https://ntrs.nasa.gov/citations/20100010305",
    "moon_facts": "https://science.nasa.gov/moon/facts/",
    "mars_facts": "https://science.nasa.gov/mars/facts/",
    "dunes_usgs": "https://pubs.usgs.gov/publication/70192467",
}

# (target, dimension) -> (status, evidence_type, value_found, [source keys], note)
E = {
    ("MOON_PSR", "D1_cold"): ("supported", "observed", "Diviner: PSR temperatures as low as ~25 K; 40-110 K cited for water-ice trapping; early LRO release ~33 K (-400 F)", ["diviner_sci", "lro_2009"], "Direction supported."),
    ("MOON_PSR", "D6_ice"): ("supported", "observed", "Large increase in water-ice-like features at <110 K; cold-trapping area for water ice ~17,000 km2 (Diviner-based study)", ["diviner_ice", "diviner_sci"], "Direction supported. Earth proxy is snow cover, not ground ice."),
    ("MOON_PSR", "D7_polar_light"): ("retired", "observed", "Shackleton: most of the interior is in permanent shadow; rim peaks ~80-90% sunlit per orbit (LROC)", ["lroc_shackleton"], "Rule retired (weight 0): a PSR has no direct sunlight, so an Earth seasonal-insolation-swing proxy is invalid for it."),
    ("MOON_PSR", "D4_terrain"): ("supported", "observed", "Shackleton: ~21 km wide, ~4 km deep; ~30 degree walls leading to a 6.6 km diameter floor (NASA SVS / LROC)", ["svs_shackleton", "lroc_shackleton"], "Floor is comparatively flat, walls are steep; partial support for a 'low roughness' floor rule. No LOLA slope value for the floor itself: manual Moon Trek check requested."),
    ("MOON_SP_RIDGE", "D7_polar_light"): ("supported", "observed", "Rim peaks ~80-90% sunlit per lunar orbit (LROC); NASA: all 13 candidate regions contain sites with continuous sunlight for 6.5 days", ["lroc_shackleton", "artemis"], "Direction supported. Earth latitude is only a proxy for illumination."),
    ("MOON_SP_RIDGE", "D5_rock"): ("retired", "literature", "NASA sample-science planning: south-polar candidate sites are feldspathic highlands mixed with South Pole-Aitken breccias, far from basaltic surfaces", ["sample_report"], "Rule retired (weight 0): a mafic-composition proxy contradicts a feldspathic highland setting. Planning-level statement, not a sample measurement."),
    ("MOON_SP_RIDGE", "D4_terrain"): ("supported", "observed", "Shackleton walls ~30 degrees (SVS/LROC); a NASA-linked study uses <15 degrees as the mobility slope limit", ["svs_shackleton", "lroc_shackleton"], "Rugged-terrain direction supported qualitatively; ridge-specific LOLA statistics not retrieved (manual check requested)."),
    ("MOON_SP_RIDGE", "D1_cold"): ("unverified", "none", "", [], "The ridge is sunlit; cold applies to neighbouring PSRs. No ridge value retrieved."),
    ("MOON_LAVATUBE", "D5_rock"): ("supported", "literature", "Lunar maria are basaltic lava flows (NASA NTRS); pits occur in the maria (NASA/LRO); 16 of >200 known pits probably collapsed lava tubes", ["mare_basalt", "pits", "pits_cave"], "Mafic direction supported."),
    ("MOON_LAVATUBE", "D8_thermal_swing"): ("supported", "observed", "Diviner equatorial surface: ~385-400 K at noon, ~95-100 K at night; pit interior shade stays near 17 C (63 F) all day", ["diviner_sci", "pits"], "The rule applies to the SURFACE above the tubes (large swing). Pit interiors are thermally stable, which is the reason to study them; Earth cannot reproduce either value."),
    ("MOON_LAVATUBE", "D4_terrain"): ("unverified", "none", "Mare Tranquillitatis pit ~100 m deep (NASA); not a regional roughness statistic", ["pits"], "Band 0.3-0.7 is a team draft; no regional LOLA statistic retrieved."),
    ("MOON_MARE", "D5_rock"): ("supported", "literature", "Lunar maria are basaltic lava flows (NASA NTRS)", ["mare_basalt"], "Mafic direction supported."),
    ("MOON_MARE", "D8_thermal_swing"): ("supported", "observed", "Diviner equatorial surface: ~385-400 K at noon, ~95-100 K at night", ["diviner_sci"], "Direction supported."),
    ("MOON_MARE", "D4_terrain"): ("supported", "observed", "LROC NAC stereo: median slopes ~3.5 degrees on maria vs ~9.1 degrees in highlands (15 m baseline)", ["slopes_usgs"], "Low-roughness direction supported (baseline-dependent)."),
    ("MARS_ICE", "D6_ice"): ("supported", "literature", "SWIM: shallow ice (0-5 m) mapped equatorward to ~30N in places; Arcadia plains and Deuteronilus Mensae match the most ice criteria", ["swim", "swim_psi"], "Direction supported."),
    ("MARS_ICE", "D4_terrain"): ("supported", "literature", "SWIM: broad plains of Arcadia match the greatest number of ice criteria; USGS: extensive excess ice in Arcadia, >=6000 km3 likely beneath un-cratered regions", ["swim", "arcadia_ice"], "Low-relief plains supported qualitatively; no MOLA slope value retrieved."),
    ("MARS_JEZERO", "D5_rock"): ("supported", "literature", "Crater floor is igneous: Maaz basaltic lava/pyroclastic unit and Seitah olivine cumulate; upper fan sandstones match aqueously altered basalt", ["jezero_olivine", "jezero_lake"], "Mafic direction supported."),
    ("MARS_JEZERO", "D8_thermal_swing"): ("supported", "observed", "MEDA: surface ~-83 C before dawn to ~+5 C at noon (~88 K diurnal range); air -83 to -23 C", ["meda"], "Large diurnal swing supported; example sols, not seasonal statistics."),
    ("MARS_JEZERO", "D2_aridity"): ("supported", "literature", "NASA: Jezero once held a lake and delta before Mars dried up; present surface is dry", ["jezero_kit"], "Direction supported."),
    ("MARS_JEZERO", "D1_cold"): ("supported", "observed", "MEDA surface temperatures -83 C to +5 C on sampled sols", ["meda"], "Cold-to-moderate band plausible; the 0.5-0.9 percentile band is a team draft."),
    ("MARS_JEZERO", "D4_terrain"): ("supported", "literature", "~45 km impact crater with a delta whose steep scarps Perseverance imaged", ["jezero_kit", "jezero_lake"], "Non-flat terrain supported qualitatively; band limits are a team draft."),
    ("MARS_MUDVOLC", "D4_terrain"): ("supported", "literature", "Tens of thousands of high-albedo mounds across southern Acidalia; candidate mud volcanoes in Utopia (origin still debated: pseudocraters, cinder cones, pingos or mud volcanoes)", ["mud_acidalia", "mud_utopia"], "Low-relief basin setting only weakly supported; origin is a hypothesis."),
    ("MARS_MUDVOLC", "D5_rock"): ("retired", "none", "", [], "Rule retired (weight 0): a bare-ground composition proxy cannot represent fine sediment."),
    ("MARS_CHLORIDE", "D2_aridity"): ("supported", "literature", "NASA/THEMIS: ~200 chloride deposits in the southern highlands, each ~1-25 km2, ~3.5-3.9 billion years old", ["chloride"], "Evaporite setting supports dry-environment direction. Deposits are far smaller than a 2.5 degree cell: not resolvable at this grid scale."),
    ("MARS_AEOLIAN", "D5_rock"): ("retired", "literature", "Martian dune sand is basaltic (olivine, pyroxene, plagioclase)", ["dunes_usgs"], "Rule retired (weight 0): a 'low mafic' Earth rule would reward quartz-rich sand, the opposite of Mars dune composition."),
}

# Generic body properties (NASA fact pages). Site-specific values are NOT implied.
_MOON_DRY = ("supported", "literature", "NASA: the Moon has only a very thin, tenuous exosphere (not a real atmosphere), so there is no weather, rain or humidity", ["moon_facts"], "Generic Moon property, not site-specific. Supports 'dry' direction.")
_MOON_BARREN = ("supported", "literature", "NASA: the surface is covered by charcoal-gray, powdery dust and rocky debris (lunar regolith); no vegetation", ["moon_facts"], "Generic Moon property, not site-specific. Supports 'barren' direction.")
_MARS_DRY = ("supported", "literature", "NASA: the Martian atmosphere is too thin for liquid water to exist for long on the surface", ["mars_facts"], "Generic Mars property, not site-specific. Supports 'dry' direction.")
_MARS_COLD = ("supported", "literature", "NASA: Mars surface temperatures range from about -153 C to +20 C", ["mars_facts"], "Generic Mars property, not site-specific. Supports the 'cold' direction qualitatively.")
for _t in ("MOON_PSR", "MOON_SP_RIDGE", "MOON_LAVATUBE", "MOON_MARE"):
    E.setdefault((_t, "D2_aridity"), _MOON_DRY)
    E.setdefault((_t, "D3_barren"), _MOON_BARREN)
for _t in ("MARS_ICE", "MARS_MUDVOLC", "MARS_AEOLIAN", "MARS_CHLORIDE"):
    E.setdefault((_t, "D2_aridity"), _MARS_DRY)
for _t in ("MARS_ICE", "MARS_MUDVOLC"):
    E.setdefault((_t, "D1_cold"), _MARS_COLD)

WHERE = {
    "D1_cold": "Moon: LRO Diviner (diviner.ucla.edu); Mars: MGS/MRO thermal data via Mars Trek",
    "D2_aridity": "Literature / orbital hydrology context",
    "D3_barren": "Orbital imagery (LROC QuickMap / Mars Trek CTX)",
    "D4_terrain": "Moon: LRO LOLA via Moon Trek; Mars: MGS MOLA via Mars Trek",
    "D5_rock": "Moon: LROC/Kaguya mare units; Mars: CRISM / USGS geologic maps",
    "D6_ice": "Moon: Diviner cold traps / LAMP; Mars: SWIM (swim.psi.edu)",
    "D7_polar_light": "Moon: LOLA illumination maps; Mars: seasonal insolation (literature)",
    "D8_thermal_swing": "Moon: Diviner day/night temperatures; Mars: thermal inertia / TES / MEDA",
}


def main():
    targets = json.load(open(ROOT / "data/targets.json", encoding="utf-8"))
    rows, summary = [], {}
    for t in targets:
        active = grounded = retired = 0
        for dim, rule in t["rules"].items():
            ev = E.get((t["id"], dim))
            if rule["weight"] <= 0:
                status, typ, value, keys, note = ev if ev and ev[0] == "retired" else ("retired", "none", "", [], rule.get("_reason", "weight 0"))
                retired += 1
            else:
                status, typ, value, keys, note = ev if ev and ev[0] != "retired" else ("unverified", "none", "", [], "No retrieved source yet.")
                active += 1
                grounded += status == "supported"
            rows.append({"target_id": t["id"], "dimension": dim, "rule": rule["rule"], "weight": rule["weight"], "where_to_check": WHERE[dim],
                         "status": status, "evidence_type": typ, "value_found": value,
                         "source_url": " | ".join(S[k] for k in keys), "checked_on": "2026-11-15" if keys else "", "notes": note})
        summary[t["id"]] = {"grounded": grounded, "total": active, "retired": retired, "status": t.get("status")}
    with open(ROOT / "data/target_evidence.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    json.dump({"rows": len(rows), "supported_rows": sum(r["status"] == "supported" for r in rows),
               "retired_rows": sum(r["status"] == "retired" for r in rows), "targets": summary,
               "note": "'supported' = a retrieved source is consistent with the rule direction; 'total' counts active (weight > 0) rules only. Numbers are quoted from sources, not measured by ASTRANOVUS."},
              open(ROOT / "data/target_evidence_summary.json", "w", encoding="utf-8"), indent=2)
    print({k: f"{v['grounded']}/{v['total']} (+{v['retired']} retired)" for k, v in summary.items()})


if __name__ == "__main__":
    main()
