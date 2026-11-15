"""Build the structured analog validation dataset v3 and FREEZE the independent evaluation cohort.

    python scripts/build_analog_dataset_v3.py   # writes data/analog_dataset_v3.json and data/analog_cohorts_v3_frozen.json

Cohorts
  A  historical/exploratory : v1 + v2 sites that existed before this phase (influenced development; kept for continuity)
  B  development/diagnostic : new sites usable to diagnose failures
  C  frozen independent     : new sites never used to select weights, thresholds or implementation
B/C assignment is made BEFORE any new site is scored, by the parity of sha256(site_id) (even -> C, odd -> B), so neither the
model nor the author chooses which site is held out. The membership list is hashed; the evaluation script refuses to run
if the file no longer matches its hash.

Honesty notes
  * Coordinates are approximate site centroids (general geographic knowledge) unless the coordinate_source says otherwise.
    The grid is 2.5 degrees (~280 km), so a few km of error is irrelevant, but nothing here is a surveyed position.
  * `verification_status`: primary_fetched = the supporting page/abstract was opened and read; search_summary = the source
    appeared only in search results (not yet verified by opening it); not_verified = no source examined.
  * A site NASA/ESA used for some test is NOT automatically an analog for every target. Each pair states its own relationship.
  * Control rationales are physical (what the location lacks for that target), written without looking at model output.
"""
import hashlib
import json
import pathlib
from datetime import datetime, timezone

ROOT = pathlib.Path(__file__).resolve().parents[1]
RET = "2026-11-16"

SRC = {
    "nasa_analogs": ("NASA Science - Planetary Analogs", "https://science.nasa.gov/solar-system/planetary-analogs/", "primary_fetched"),
    "nasa_analog_missions": ("NASA - Analog Missions", "https://www.nasa.gov/analog-missions/", "primary_fetched"),
    "allen_oehler": ("Allen & Oehler 2010, Mud Volcanoes - Analogs to Martian Cones and Domes (AGU abstract)", "https://ntrs.nasa.gov/citations/20100033209", "primary_fetched"),
    "sauro_2020": ("Sauro et al. 2020, Lava tubes on Earth, Moon and Mars: a review (Earth-Science Reviews)", "https://cris.unibo.it/retrieve/bf298592-3a07-4d19-8979-599f91ae8131/2020%2bSauro%2bet%2bal%2bESR%2bLava%2btubes.pdf", "search_summary"),
    "pangaea": ("ESA PANGAEA training programme (eoPortal)", "https://www.eoportal.org/other-space-activities/pangaea", "search_summary"),
    "qaidam_wang": ("Wang et al. 2016 review, Qaidam Basin as a Mars analogue (Earth-Science Reviews, as surfaced by search)", "https://hub.hku.hk/bitstream/10722/244904/1/content.pdf", "search_summary"),
    "qaidam_arxiv": ("Meng et al. 2024, Deep learning selection of analogues for Mars landing sites in the Qaidam Basin", "https://arxiv.org/abs/2501.08584", "primary_fetched"),
    "white_sands": ("White Sands gypsum dunes as an analog to sulfate-rich eolian outcrops at Meridiani Planum (Geology 2006, as surfaced by search)", "https://npshistory.com/publications/whsa/brochures/mars-2016.pdf", "search_summary"),
    "lava_tube_search": ("Lunar lava tube base construction / terrestrial test-site reviews (as surfaced by search; specific attribution unverified)", "https://katalog.lib.cas.cz/KNAV/EdsRecord/edsdoj,edsdoj.208af1acf1ee4e34a7022ce5d94f84ec", "search_summary"),
    "basalt": ("Basaltic terrains in Idaho and Hawai'i as planetary analogs for Mars geology and astrobiology (Astrobiology 2019, as surfaced by search)", "https://pmc.ncbi.nlm.nih.gov/articles/PMC6442300", "search_summary"),
    "hmp_marsinst": ("Mars Institute - Haughton-Mars Project (station coordinates 75 26 N, 89 52 W as reported by search)", "https://www.marsinstitute.no/hmp", "search_summary"),
}

TYPES = ["geological", "climatic_environmental", "terrain_rover_mobility", "ice_resource", "operational", "astrobiology_science"]

# ---- cohort A (pre-existing positives; targets/coords come from data/known_analogs.json) --------------------------
A_META = {
    "atacama": dict(country="Chile", types=["climatic_environmental", "astrobiology_science"], strength="strong", src=["nasa_analogs"], lim="NASA page states soil sampling for Mars-relevant dryness; says nothing about chloride deposits or Jezero geology specifically."),
    "devon_haughton": dict(country="Canada (Nunavut)", types=["ice_resource", "operational", "geological"], strength="strong", src=["hmp_marsinst"], lim="Impact-crater + polar desert; ice-rich permafrost but not Arcadia-style buried ice plains."),
    "lava_beds": dict(country="USA (California)", types=["geological"], strength="strong", src=["nasa_analogs"], lim="NASA page: mapping and detecting lava tubes; the subsurface property itself is invisible to a surface model."),
    "kilauea": dict(country="USA (Hawaii)", types=["geological", "operational"], strength="moderate", src=["nasa_analog_missions"], lim="NASA: timing of geologist/astronaut tasks in volcanic terrain similar to the lunar surface; not a lava-tube analog statement."),
    "iceland": dict(country="Iceland", types=["geological"], strength="moderate", src=["lava_tube_search"], lim="Geological style analog (Apollo-era training); no verified source in this project for lava tubes specifically."),
    "death_valley": dict(country="USA", types=["terrain_rover_mobility"], strength="weak", src=["nasa_analogs"], lim="NASA page: drone testing for Martian sands and skies. Evaporite geology is general knowledge, not from that page."),
    "colorado_desert": dict(country="USA/Mexico", types=["climatic_environmental"], strength="weak", src=[], lim="Original v1 label; no specific source retained."),
    "mcmurdo_dry_valleys": dict(country="Antarctica", types=["ice_resource", "climatic_environmental"], strength="strong", src=[], lim="Ground ice under dry permafrost is widely published as a Phoenix-site analog (search summary of Planetary & Space Science 2013 and others); this cell is mostly ice-sheet at 2.5 deg."),
    "svalbard": dict(country="Norway", types=["astrobiology_science"], strength="moderate", src=[], lim="Astrobiology field site (AMASE); relation to Jezero geology is thematic."),
    "craters_of_the_moon": dict(country="USA (Idaho)", types=["geological", "astrobiology_science"], strength="moderate", src=["basalt"], lim="BASALT: Mars basalt geology/astrobiology and operations. Its v2 mapping to Moon targets was our own mapping."),
    "mdrs_utah": dict(country="USA (Utah)", types=["operational"], strength="moderate", src=[], lim="Mars Desert Research Station: operational analog; geology is sedimentary desert."),
}

# ---- new candidates ----------------------------------------------------------------------------------------------
# id, name, country, lat, lon, coord_source, extent_km, characteristics, [(target, types, relationship, purposes)], src keys, strength,
# limitations, eligibility, reason
NEW = [
    ("gobustan_azerbaijan", "Gobustan / Caspian mud-volcano province", "Azerbaijan", 40.1, 49.4, "approximate centroid", 100,
     "Largest onshore concentration of mud volcanoes; sparse vegetation; semi-arid.",
     [("MARS_MUDVOLC", ["geological"], "Earth region studied as morphologic and sedimentary analog of Martian cones/domes in Acidalia", ["MARS_GEOLOGY_SAMPLING", "MARS_ASTROBIOLOGY"])],
     ["allen_oehler"], "strong", "Authors name Gulf of Cadiz submarine volcanoes as the closest morphologic analogs; land climate (semi-arid, warm) is unlike Acidalia. Match is geological, not climatic.",
     "eligible", ""),
    ("lanzarote_corona", "Corona lava tube, Lanzarote", "Spain (Canary Islands)", 29.05, -13.43, "approximate centroid", 10,
     "Basaltic volcanic island; ~8 km lava tube mapped in 3D; hyperarid maritime climate.",
     [("MOON_LAVATUBE", ["geological", "operational"], "Used by ESA PANGAEA/CAVES for planetary cave and lava-tube training and mapping", ["MOON_HABITAT_OPS"])],
     ["pangaea", "sauro_2020"], "strong", "Surface model sees basaltic climate only; tube geometry is invisible at 2.5 deg. Earth tubes are far narrower than lunar ones (Sauro et al.).",
     "eligible", ""),
    ("qaidam_dalangtan", "Dalangtan playa, Qaidam Basin", "China", 38.3, 91.3, "approximate centroid", 150,
     "High-altitude hyperarid evaporite basin: salt lakes, playas, sulfate/chloride-type salts, 20,000 km2 yardang fields.",
     [("MARS_CHLORIDE", ["geological", "climatic_environmental"], "Evaporite assemblages and polygonal salt crusts compared with Martian salt deposits", ["MARS_GEOLOGY_SAMPLING", "MARS_ASTROBIOLOGY"]),
      ("MARS_AEOLIAN", ["geological", "terrain_rover_mobility"], "Yardang fields compared with Medusae Fossae-type wind erosion (yardangs are not dunes: partial relationship)", ["MARS_ROVER_MOBILITY"])],
     ["qaidam_wang", "qaidam_arxiv"], "strong", "Altitude 2.7-3 km makes air temperature low relative to latitude. Yardangs are an erosional, not depositional, aeolian landform; the AEOLIAN pair is weaker than the CHLORIDE pair.",
     "eligible", ""),
    ("white_sands_nm", "White Sands gypsum dune field", "USA (New Mexico)", 32.8, -106.3, "approximate centroid", 40,
     "Gypsum dunes fed by seasonal evaporation of Lake Lucero; arid.",
     [("MARS_AEOLIAN", ["geological"], "Analog to sulfate-rich eolian outcrops at Meridiani Planum", ["MARS_GEOLOGY_SAMPLING"])],
     ["white_sands"], "strong", "Gypsum (sulfate) dunes, not basaltic dunes; Martian dark dunes are basaltic. Climate warmer than Mars.",
     "eligible", ""),
    ("jingpo_lake", "Jingpo Lake volcanic field", "China", 43.9, 128.9, "approximate centroid", 80,
     "Basaltic lava field with tubes and pit craters; humid-continental forested climate.",
     [("MOON_LAVATUBE", ["geological"], "Proposed in a review as terrestrial analog for the Marius Hills region", ["MOON_HABITAT_OPS"]),
      ("MOON_MARE", ["geological"], "same proposal; mare relation indirect", ["MOON_GEO_FIELDWORK"])],
     ["lava_tube_search"], "weak", "Attribution of the proposal not verified by opening the paper; forested climate unlike the Moon. Kept as exploratory.",
     "exploratory", "support not verified by primary source; humid forested climate"),
    ("jeju_manjanggul", "Manjanggul lava tube, Jeju", "South Korea", 33.53, 126.77, "approximate centroid", 10,
     "Basaltic island, well-known lava tube; humid subtropical climate.",
     [("MOON_LAVATUBE", ["geological"], "Cited as a well-known Asian lava-tube example; a review notes it lacks the full surface-to-subsurface sequence for rille formation", ["MOON_HABITAT_OPS"])],
     ["lava_tube_search"], "weak", "Source states a limitation; humid climate. Kept as exploratory.", "exploratory", "source notes the analogy is incomplete; not verified by primary source"),
    ("black_point_flow", "Black Point lava flow, San Francisco Volcanic Field", "USA (Arizona)", 35.6, -111.5, "approximate centroid", 20,
     "Basaltic cinder/lava terrain, semi-arid high desert.",
     [("MOON_MARE", ["terrain_rover_mobility"], "NASA page caption: used to test a lunar electric rover", ["MOON_ROVER_MOBILITY"])],
     ["nasa_analogs"], "weak", "Support is an image caption, not a stated analog objective. Exploratory.", "exploratory", "image caption only"),
]

# ---- rejected / ineligible candidates (kept for transparency) --------------------------------------------------------
REJECTED = [
    ("namib_dunes", "Namib sand dunes", "Namibia", "NASA page links them to Titan dunes, not Moon/Mars.", "no_moon_mars_target"),
    ("meteor_crater", "Meteor Crater", "USA (Arizona)", "Impact-crater morphology is not among the modelled targets.", "no_matching_target"),
    ("ries_crater", "Nordlinger Ries", "Germany", "Impact crater used in ESA PANGAEA; no matching target.", "no_matching_target"),
    ("bletterbach", "Bletterbach canyon (Dolomites)", "Italy", "Sedimentary geology training; no matching target.", "no_matching_target"),
    ("nw_greenland", "Northwest Greenland", "Greenland", "Seismometer tests for icy worlds (Europa named), not Moon/Mars.", "other_body"),
    ("axel_heiberg", "Axel Heiberg Island cold springs", "Canada", "Perennial saline springs in permafrost (spring-deposit and aquifer analog); no target models spring deposits.", "no_matching_target"),
    ("dallol", "Dallol / Danakil Depression", "Ethiopia", "Only a non-peer-reviewed web article was found.", "insufficient_support"),
    ("berca_romania", "Berca mud volcanoes", "Romania", "Only a tourism-oriented source found for the mud-volcano relation.", "insufficient_support"),
    ("rio_tinto", "Rio Tinto", "Spain", "Acidic iron-rich analog; no source examined for a modelled target.", "not_verified"),
    ("deception_island", "Deception Island", "Antarctica", "Astrobiology analog paper found; no clean match to a modelled target.", "no_matching_target"),
    ("askja", "Askja", "Iceland", "Apollo-era geological training; same 2.5 degree region as the v1 Iceland site and the speaker (a trained geologist) cautions that no good lunar analogs exist.", "duplicate_region"),
    ("mauna_ulu_kilauea_iki", "Mauna Ulu / Kilauea Iki (BASALT Hawaii)", "USA (Hawaii)", "Same 2.5 degree cell as v1 Kilauea; not counted as an independent sample.", "duplicate_region"),
    ("lambahraun", "Lambahraun lava field", "Iceland", "NASA rover test site; same region as v1 Iceland.", "duplicate_region"),
    ("hingol_makran", "Hingol / Makran coast", "Pakistan", "Mud volcanoes reported there by low-quality sources; no analog literature verified. Team hypothesis only.", "hypothesis"),
    ("karakoram_baltoro", "Karakoram / Baltoro", "Pakistan", "Team hypothesis; no analog literature verified.", "hypothesis"),
    ("khewra", "Khewra salt range", "Pakistan", "Team hypothesis (evaporites); no analog literature verified.", "hypothesis"),
    ("katpana", "Katpana cold desert", "Pakistan", "Team hypothesis; no analog literature verified.", "hypothesis"),
]

# ---- controls: id, name, lat, lon, targets, hard?, kind, rationale (physical, model-blind) -------------------------
CONTROLS_NEW = [
    ("deccan_traps", "Deccan Traps", 19.0, 75.0, ["MOON_LAVATUBE", "MOON_MARE"], True, "basaltic terrain with incompatible climate",
     "Flood basalts, but monsoon climate, deep weathered regolith and agriculture: surface does not resemble fresh lunar basalt and tubes are not accessible."),
    ("parana_basalts", "Parana basalts", -25.5, -52.0, ["MOON_LAVATUBE", "MOON_MARE"], True, "basaltic terrain with incompatible climate",
     "Flood basalts under humid subtropical forest and farmland."),
    ("siberian_traps", "Siberian Traps", 66.0, 95.0, ["MOON_LAVATUBE", "MOON_MARE"], True, "cold basaltic terrain with boreal forest",
     "Basalt province but covered by taiga and permafrost soils; vegetation and thick cover hide any fresh volcanic surface."),
    ("libyan_sand_sea", "Libyan Sand Sea", 26.0, 25.0, ["MOON_LAVATUBE"], True, "dry but geologically unsuitable",
     "Hyperarid, but a sand sea over sedimentary rock: no basalt and no lava tubes."),
    ("east_antarctic_plateau", "East Antarctic plateau interior", -80.0, 100.0, ["MARS_MUDVOLC", "MARS_JEZERO", "MARS_AEOLIAN"], True, "ice-covered, no exposed geology",
     "Kilometres of ice cover the bedrock: no exposed sediments, deltas or dunes to compare, and not a mobility surface comparable to bare ground."),
    ("fennoscandian_shield", "Fennoscandian shield", 67.5, 25.0, ["MARS_MUDVOLC", "MARS_JEZERO"], True, "cold but vegetated crystalline basement",
     "Boreal forest on Precambrian crystalline rock: no sedimentary basin, no fluid-driven sedimentary volcanism, vegetated."),
    ("sahel_savanna", "Sahel savanna", 14.0, 5.0, ["MARS_AEOLIAN", "MARS_CHLORIDE"], True, "dry season but vegetated",
     "Seasonally dry but grass/shrub covered with a summer rainy season; dunes are stabilised, no playa evaporites over most of the area."),
    ("mongolian_steppe", "Mongolian steppe", 47.0, 105.0, ["MARS_AEOLIAN", "MARS_CHLORIDE"], True, "cold semi-arid grassland",
     "Continuous grass cover and soils; not an active dune or evaporite environment."),
    ("greenland_interior", "Greenland ice sheet interior", 72.0, -40.0, ["MARS_ICE", "MARS_MUDVOLC"], True, "ice sheet, not regolith-buried ground ice",
     "Glacier ice, not ice buried under regolith; drilling, mobility and ice-regolith mixing differ from the Arcadia style plains."),
    ("canadian_shield_forest", "Canadian Shield boreal forest", 52.0, -85.0, ["MARS_MUDVOLC", "MARS_JEZERO"], True, "cold vegetated crystalline terrain",
     "Boreal forest and wetlands over crystalline rock."),
]


def parity(site_id):
    return int(hashlib.sha256(site_id.encode()).hexdigest(), 16) % 2


def main():
    ka = json.load(open(ROOT / "data/known_analogs.json", encoding="utf-8"))
    sites = []
    for p in ka["positives"]:
        m = A_META[p["id"]]
        sites.append(dict(
            site_id=p["id"], name=p["name"], country=m["country"], lat=p["lat"], lon=p["lon"], coordinate_source="from data/known_analogs.json (approximate centroid)",
            approx_extent_km=None, environmental_characteristics="see known_analogs.json citation", cohort="A_historical",
            pairs=[dict(target=t, analog_types=m["types"], relationship=p["citation"]["text"], purposes=[]) for t in p["targets"]],
            sources=[dict(label=SRC[k][0], url=SRC[k][1], retrieval=SRC[k][2]) for k in m["src"]] or [dict(label=p["citation"]["text"], url=(p["citation"].get("urls") or [""])[0], retrieval="not_verified")],
            evidence_category="documented_analog_site", support_strength=m["strength"], limitations=m["lim"], validation_eligibility="eligible_historical",
            eligibility_reason="used during development; not independent", verification_status="primary_fetched" if any(SRC[k][2] == "primary_fetched" for k in m["src"]) else "search_summary_or_unverified",
            role="positive"))
    for (sid, name, country, lat, lon, csrc, ext, env, pairs, srcs, strength, lim, elig, reason) in NEW:
        cohort = "C_frozen_independent" if parity(sid) == 0 else "B_development"
        sites.append(dict(
            site_id=sid, name=name, country=country, lat=lat, lon=lon, coordinate_source=csrc + " (general geographic knowledge, not from the cited paper)" if sid != "devon_haughton" else csrc,
            approx_extent_km=ext, environmental_characteristics=env, cohort=cohort,
            pairs=[dict(target=t, analog_types=ty, relationship=rel, purposes=pu) for (t, ty, rel, pu) in pairs],
            sources=[dict(label=SRC[k][0], url=SRC[k][1], retrieval=SRC[k][2]) for k in srcs], evidence_category="literature_supported_analog",
            support_strength=strength, limitations=lim, validation_eligibility=elig, eligibility_reason=reason,
            verification_status="primary_fetched" if any(SRC[k][2] == "primary_fetched" for k in srcs) else "search_summary", role="positive"))
    rejected = [dict(site_id=i, name=n, country=c, why_not_used=w, reason_code=rc, validation_eligibility="ineligible") for (i, n, c, w, rc) in REJECTED]

    controls = []
    for c in ka["controls"]:
        controls.append(dict(site_id=c["id"], name=c["name"], lat=c["lat"], lon=c["lon"], targets=c.get("targets", "all"), hard=bool(c.get("hard")),
                             control_kind="historical", rationale=c.get("why", ""), basis="author reasoning (v1), not model output", cohort="A_historical"))
    for (cid, name, lat, lon, tg, hard, kind, why) in CONTROLS_NEW:
        controls.append(dict(site_id=cid, name=name, lat=lat, lon=lon, targets=tg, hard=hard, control_kind=kind, rationale=why,
                             basis="physical reasoning written before scoring; not derived from model predictions",
                             cohort="C_frozen_independent" if parity(cid) == 0 else "B_development"))

    out = dict(built_utc=datetime.now(timezone.utc).isoformat(timespec="seconds"), retrieved_on=RET, analog_type_vocabulary=TYPES,
               cohort_definitions={"A_historical": "existed before this phase; influenced development", "B_development": "new; may be used to diagnose failures",
                                   "C_frozen_independent": "new; frozen before any new-site scoring; never used to select or tune anything"},
               assignment_rule="parity of sha256(site_id): even -> C, odd -> B (made before scoring)", sites=sites, controls=controls, rejected_candidates=rejected)
    json.dump(out, open(ROOT / "data/analog_dataset_v3.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)

    def members(coh):
        return sorted([s["site_id"] for s in sites if s["cohort"] == coh] + ["ctl:" + c["site_id"] for c in controls if c["cohort"] == coh])
    frozen = {"frozen_utc": datetime.now(timezone.utc).isoformat(timespec="seconds"), "rule": out["assignment_rule"],
              "C_members": members("C_frozen_independent"), "B_members": members("B_development")}
    frozen["sha256"] = hashlib.sha256(json.dumps([frozen["C_members"], frozen["B_members"]]).encode()).hexdigest()
    frozen["protocol"] = ("Candidate scoring variants are selected using cohorts A+B and physical reasoning only. Cohort C is scored once per candidate for "
                          "disclosure, never used to choose among candidates, and the membership above must not change after this file is written.")
    json.dump(frozen, open(ROOT / "data/analog_cohorts_v3_frozen.json", "w", encoding="utf-8"), indent=1)
    from collections import Counter
    print("positive sites:", Counter(s["cohort"] for s in sites), "| controls:", Counter(c["cohort"] for c in controls), "| rejected:", len(rejected))
    print("C:", frozen["C_members"])
    print("B:", frozen["B_members"])


if __name__ == "__main__":
    main()
