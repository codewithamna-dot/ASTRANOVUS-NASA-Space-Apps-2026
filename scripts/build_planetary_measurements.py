"""Build data/planetary_measurements.csv (+ .json): numerical Moon/Mars measurements with full provenance.

Every row was read from a NASA/USGS/UCLA page or abstract on 2026-11-15. `retrieval` says how:
  primary_fetched  - the quoted number was read from the cited page/abstract itself
  search_summary   - the number appeared only in a web-search result summary of the cited source; the primary page could
                     not be fetched, so it must be re-verified before being relied on
Nothing here was measured by ASTRANOVUS. `evidence_class`: observed (instrument value), derived (computed from instrument
data, e.g. illumination from LOLA topography or depth from shadow length), inferred (interpretation of data).
`scope`: site (the named feature), region (a broader area), body (generic body property, NOT a site measurement).
Run:  python scripts/build_planetary_measurements.py
"""
import csv
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[1]
RET = "2026-11-15"

U = {
    "diviner": "https://www.diviner.ucla.edu/science",
    "illum": "https://ntrs.nasa.gov/citations/20120010094",
    "shack_sci": "https://science.nasa.gov/resource/shackleton-craters-illuminated-rim-shadowed-interior/",
    "shack_svs": "https://svs.gsfc.nasa.gov/4716",
    "pits_nasa": "https://www.nasa.gov/solar-system/nasas-lro-finds-lunar-pits-harbor-comfortable-temperatures/",
    "pits_cave": "https://science.nasa.gov/solar-system/new-evidence-adds-to-findings-hinting-at-network-of-caves-on-moon/",
    "pit_marius": "https://lroc.im-ldi.com/images/202",
    "pit_tranq": "https://lroc.im-ldi.com/images/230",
    "pit_ingenii": "https://lroc.im-ldi.com/images/695",
    "slopes": "https://pubs.usgs.gov/publication/70223199",
    "moon_facts": "https://science.nasa.gov/moon/facts/",
    "mars_facts": "https://science.nasa.gov/mars/facts/",
    "jezero_sites": "https://marsnext.jpl.nasa.gov/landingsites/index.cfm",
    "jezero_kit": "https://www.jpl.nasa.gov/news/press_kits/mars_2020/launch/mission/landing_site/",
    "jezero_dtm": "https://astrogeology.usgs.gov/search/map/Mars/Mars2020/JEZ_hirise_soc_006_DTM_MOLAtopography_DeltaGeoid_1m_Eqc_latTs0_lon0_blend40",
    "meda": "https://science.nasa.gov/blog/daily-records-of-atmospheric-temperature-with-perseverance/",
    "arcadia_bramson": "https://arxiv.org/abs/1509.03210",
    "arcadia_hls2": "https://www.nasa.gov/wp-content/uploads/2015/06/hls2_newsletter_02-19_v19_tagged.pdf",
    "swim": "https://science.nasa.gov/resource/swim-map-shows-subsurface-water-ice-on-mars/",
    "mud_utopia": "https://science.nasa.gov/photojournal/candidate-mud-volcanoes-in-utopia-planitia/",
    "mud_acidalia": "https://ntrs.nasa.gov/citations/20100010305",
    "chloride": "https://www.nasa.gov/mission_pages/odyssey/odyssey-20080320.html",
    "chloride_themis": "https://themis.asu.edu/news/salt-deposits-found-martian-highlands",
    "mud_allen": "https://ntrs.nasa.gov/citations/20100033209",
    "jezero_stack": "https://doi.org/10.1007/s11214-020-00739-x",
}

# id, target, location, lat, lon, quantity, value, units, resolution, period, uncertainty, instrument/method,
# dataset/publication, url key, extraction, class, scope, retrieval, note
R = [
    ("M01", "MOON_PSR", "south polar permanently shadowed regions", "", "", "minimum surface temperature", "25", "K", "n/s", "LRO Diviner mapping", "n/s",
     "LRO Diviner (infrared radiometer)", "Diviner science page (UCLA)", "diviner", "quoted: temperatures in permanently shadowed craters 'can fall as low as 25K'", "observed", "region", "primary_fetched",
     "Extreme minimum, not a typical value; not tied to one crater."),
    ("M02", "MOON_PSR", "lunar south pole (to 80 deg S)", -90, "", "total permanently shadowed area (south)", "16055", "km2", "240 m DEM", "simulated over several 18.6-year precession cycles, 6 h steps", "n/s",
     "LOLA topography + illumination model", "Mazarico et al., LOLA illumination (NTRS 20120010094)", "illum", "quoted from abstract (north: 12,866 km2)", "derived", "region", "primary_fetched", "Model product: depends on DEM resolution."),
    ("M03", "MOON_PSR", "Shackleton crater", "", "", "crater width", "21", "km", "n/s", "n/a", "n/s", "LOLA DEM (visualization)", "NASA SVS 4716", "shack_svs", "quoted: '21 kilometers wide'", "derived", "site", "primary_fetched", "Page gives no resolution or uncertainty."),
    ("M04", "MOON_PSR", "Shackleton crater", "", "", "crater depth", "4", "km", "n/s", "n/a", "n/s", "LOLA DEM (visualization)", "NASA SVS 4716", "shack_svs", "quoted: '4 km deep'", "derived", "site", "primary_fetched", "Page gives no floor diameter or wall slope; those remain manual items."),
    ("M05", "MOON_PSR", "Shackleton crater floor", "", "", "illumination state of the floor", "perpetual shadow", "", "n/s", "n/a", "n/s", "LOLA DEM (visualization)", "NASA SVS 4716", "shack_svs", "quoted: 'Shackleton's floor is in perpetual shadow'", "derived", "site", "primary_fetched", "Qualitative; supports retiring the D7 light rule for this target."),
    ("M06", "MOON_SP_RIDGE", "location near the Shackleton rim", "", "", "continuous sunlit period per year", "240", "days", "240 m DEM", "simulated over several 18.6-year cycles", "n/s", "LOLA topography + illumination model",
     "Mazarico et al. (NTRS 20120010094)", "illum", "quoted: 'sunlit continuously for 240 days' each year", "derived", "site", "primary_fetched", "Exact rim coordinates not in the abstract: manual item."),
    ("M07", "MOON_SP_RIDGE", "location near the Shackleton rim", "", "", "longest continuous darkness", "1.5", "days", "240 m DEM", "same simulation", "n/s", "LOLA topography + illumination model",
     "Mazarico et al. (NTRS 20120010094)", "illum", "quoted: 'longest continuous period in total darkness is about 1.5 days'", "derived", "site", "primary_fetched", ""),
    ("M08", "MOON_SP_RIDGE", "three points on the Shackleton rim", "", "", "collective sunlit fraction of the year", ">90", "percent", "n/s", "per year (axial tilt effect)", "n/s", "illumination analysis (image credit NASA/GSFC/ASU)",
     "NASA Science image page", "shack_sci", "quoted: 'collectively sunlit for more than 90% of the year'", "derived", "site", "primary_fetched", "Collective illumination of three points, not of one point."),
    ("M09", "MOON_LAVATUBE", "Mare Tranquillitatis pit", "", "", "pit depth", "~100", "m", "shadow measurement", "single LROC observation geometry", "n/s", "LROC NAC shadow length", "LROC image page / NASA LRO article", "pit_tranq",
     "shadow of 55 m at 26.5 deg incidence gives depth 'a bit over 100 meters'; NASA: roughly 100 m deep", "derived", "site", "search_summary", "Shadow-based: depends on illumination geometry."),
    ("M10", "MOON_LAVATUBE", "Mare Tranquillitatis pit", "", "", "pit diameter", "~100", "m", "LROC NAC", "n/s", "n/s", "LROC NAC", "LROC image page", "pit_tranq", "reported ~100 m", "observed", "site", "search_summary", ""),
    ("M11", "MOON_LAVATUBE", "Marius Hills pit", "", "", "pit depth (conflicting values)", "40 (LROC update) vs 34 (NASA article) vs 80-88 (Kaguya)", "m", "LROC NAC / Kaguya", "different illumination", "values disagree", "shadow measurement", "LROC image 202 and NASA articles", "pit_marius",
     "reported values listed side by side, not averaged", "derived", "site", "search_summary", "Do NOT quote a single depth."),
    ("M12", "MOON_LAVATUBE", "Mare Ingenii pit", "", "", "pit depth / width", "~70 / ~120-130", "m", "LROC NAC", "shadow measurement", "n/s", "LROC NAC shadow length", "LROC image page 695", "pit_ingenii", "reported ~70 m deep, 120-130 m wide", "derived", "site", "search_summary", "Cave beneath it unconfirmed."),
    ("M13", "MOON_LAVATUBE", "Mare Tranquillitatis pit (shaded floor)", "", "", "shaded-area temperature", "17 (63 F)", "C", "n/s", "stays steady through the lunar day", "n/s", "LRO Diviner + thermal modelling", "NASA article on lunar pits", "pits_nasa", "quoted: shaded locations 'hover around a comfortable 63 F (about 17 C)'", "derived", "site", "primary_fetched", "Model-assisted, not a direct in-situ value."),
    ("M14", "MOON_LAVATUBE", "Mare Tranquillitatis pit", "", "", "possible cave extent from radar", ">200", "ft", "Mini-RF re-analysis", "2010 data", "extent unknown", "LRO Mini-RF radar", "NASA Science article", "pits_cave", "re-analysis found evidence of a cave extending more than 200 feet from the pit base", "inferred", "site", "primary_fetched", "Inference; not a confirmed lava tube."),
    ("M15", "MOON_MARE", "lunar maria (LROC NAC stereo DTMs)", "", "", "median slope", "3.5", "degrees", "15 m baseline", "31 mare DTMs", "n/s", "LROC NAC stereo topography", "USGS publication 70223199", "slopes", "reported median; highlands 9.1 degrees from 81 DTMs", "derived", "region", "search_summary", "Baseline-dependent; mapped targets may be biased."),
    ("M16", "MOON_MARE", "lunar equator", 0, "", "noon / night surface temperature", "~385-400 / ~95-100", "K", "n/s", "equatorial noon and midnight", "n/s", "LRO Diviner", "Diviner science page (UCLA)", "diviner", "reported ranges from Diviner summaries", "observed", "region", "search_summary", "Equatorial value, not a polar one."),
    ("M17", "MOON_PSR", "Moon (generic)", "", "", "surface temperature extremes", "127 / -173", "C", "n/a", "full sun / night", "n/s", "NASA Moon fact page", "NASA Science Moon facts", "moon_facts", "quoted", "observed", "body", "primary_fetched", "Generic Moon property, not a PSR measurement."),
    ("J01", "MARS_JEZERO", "Jezero crater (landing-site listing)", 18.3628, 77.5945, "reference point and elevation", "-2656", "m (MOLA geoid)", "n/s", "n/a", "n/s", "MOLA topography (planetocentric, +E)", "NASA/JPL Mars landing-site listing", "jezero_sites",
     "reported as about 77.5945 E, 18.3628 N, elevation -2656 m", "derived", "site", "search_summary", "Primary page not fetchable (certificate mismatch): re-verify. This is a landing-site reference point, not a crater average."),
    ("J02", "MARS_JEZERO", "Jezero crater", "", "", "crater diameter", "45", "km", "n/a", "n/a", "n/s", "orbital imaging", "JPL Mars 2020 press kit", "jezero_kit", "reported: 45 kilometers across", "observed", "site", "search_summary", "Delta and lake interpretations are scientific interpretations."),
    ("J03", "MARS_JEZERO", "Jezero HiRISE terrain mosaic", "18.31 to 18.67", "77.22 to 77.58", "bounds of the 1 m HiRISE DTM (MOLA-referenced)", "bounds", "deg", "1 m DTM", "n/s", "n/s", "HiRISE stereo DTM", "USGS Astropedia product", "jezero_dtm", "bounds reported in the product listing", "derived", "region", "search_summary",
     "Use this product for local slope/elevation extraction (manual or via Astropedia download)."),
    ("J04", "MARS_JEZERO", "Jezero crater floor (Perseverance)", "", "", "surface temperature range on sampled sols", "-83 to +5", "C", "rover radiometer", "example sols", "TIRS channel accuracy +-0.75 K (separate study)", "MEDA thermal infrared sensor", "NASA Science blog", "meda",
     "quoted: surface about -83 C before dawn to about 5 C at noon", "observed", "site", "primary_fetched", "Sample sols, not seasonal statistics."),
    ("A01", "MARS_ICE", "Arcadia Planitia region", "36 to 56", "-176 to -132", "region extent used in a mapping study", "36-56 N, 132-176 W", "deg", "n/s", "n/a", "n/s", "regional mapping", "SWIM-related literature (as reported)", "swim", "region quoted in a search summary of NASA/PSI sources", "inferred", "region", "search_summary", "Re-verify against the primary SWIM paper."),
    ("A02", "MARS_ICE", "Arcadia Planitia", "", "", "excess water-ice volume", "~1e4", "km3", "n/s", "n/a", "n/s", "terrace depths in simple craters + radar sounding reflection", "Bramson et al. 2015 (arXiv:1509.03210)", "arcadia_bramson", "quoted from abstract: 'excess water ice ~10^4 km^3'; 'a widespread, decameters-thick layer'", "inferred", "region", "primary_fetched", "Ice thickness is 'decameters', no single value in the abstract."),
    ("A03", "MARS_ICE", "Arcadia Planitia", "", "", "ice-rich deposit thickness (preliminary map)", "15-60", "m", "SHARAD ~15 m vertical (free space)", "n/s", "preliminary", "SHARAD radar interpretation", "NASA Human Landing Sites newsletter", "arcadia_hls2", "reported preliminary map", "inferred", "region", "search_summary", "Radar cannot resolve the uppermost 15-20 m, so shallow ice can be missed."),
    ("A04", "MARS_ICE", "northern mid-latitudes", "", "", "shallow ice depth range", "0-5", "m", "n/s", "n/a", "n/s", "SWIM composite of orbital datasets", "SWIM (NASA/PSI)", "swim", "reported: shallow ice (0-5 m) extending equatorward to ~30 N in places", "inferred", "region", "primary_fetched", "Consistency score, not a direct drilling result."),
    ("A05", "MARS_ICE", "Mars (generic)", "", "", "surface temperature range", "-153 to +20", "C", "n/a", "extremes", "n/s", "NASA Mars fact page", "NASA Science Mars facts", "mars_facts", "quoted", "observed", "body", "primary_fetched", "Generic Mars property, not an Arcadia value."),
    ("U01", "MARS_MUDVOLC", "Utopia Planitia candidate mounds", "", "", "image scale", "0.304", "m/pixel", "HiRISE 30.4 cm/pixel (objects ~91 cm resolved)", "n/s", "n/a", "HiRISE (MRO)", "NASA photojournal", "mud_utopia", "quoted", "observed", "site", "primary_fetched",
     "Page gives no coordinates or feature sizes; interpretation stated as 'candidate' with lava as a competing explanation."),
    ("U02", "MARS_MUDVOLC", "Acidalia Planitia high-albedo mounds", "", "", "mound abundance", "'enormous numbers' (no count in abstract)", "", "CTX/HiRISE/CRISM", "n/s", "n/a", "CTX, HiRISE, CRISM + regional mapping", "NTRS 20100010305 abstract", "mud_acidalia", "quoted", "inferred", "region", "primary_fetched",
     "Origin interpreted variously as pseudocraters, cinder cones, tuff cones, pingos, ice-disintegration features or mud volcanoes."),
    ("C01", "MARS_CHLORIDE", "southern highlands", "", "", "number of candidate chloride deposits (THEMIS)", "~200", "deposits", "THEMIS", "2008 study", "n/s", "THEMIS spectral analysis", "NASA Odyssey release (2008)", "chloride", "reported ~200 sites; 1-25 km2 each; ~3.5-3.9 billion years", "inferred", "region", "search_summary", "Each deposit is far smaller than a 2.5 degree Earth cell."),
]

# ----------------------------------------------------------------------------------------------------------------
# Verification round 2026-11-16: the original pages of the 12 `search_summary` rows were opened again. Rows that were
# confirmed are upgraded and their text corrected to what the page literally says; rows whose page could not be opened
# (HTTP 403/404, certificate error, unreadable PDF) stay `search_summary` and are NOT treated as verified.
# Corrections that CHANGE earlier content are listed in CORRECTION_LOG and in docs/PLANETARY_EVIDENCE_REPORT.md.
# ----------------------------------------------------------------------------------------------------------------
VER = "2026-11-16"
UPDATES = {
    "M09": dict(value="a bit over 100", extraction_method="page text: shadow 55 m at 26.5 deg incidence; scientists estimate depth 'a bit over 100 meters' (independent check: 55/tan(26.5deg) = ~110 m)",
                spatial_resolution="NAC M126710873R, 400 m wide image", retrieval="primary_fetched", notes="Shadow-based; depth from the surrounding plain is larger (no figure given). Page gives no coordinates."),
    "M10": dict(value="100-115", extraction_method="page text: width 'ranges from 100 to 115 meters across the sharp precipice'", retrieval="primary_fetched",
                notes="Corrected from '~100 m' to the range stated on the page."),
    "M11": dict(quantity="pit diameter and depth (2017 update)", value="58 x 49 diameter; 40 depth (original caption: ~65 diameter)", units="m", location="Marius Hills pit",
                extraction_method="page text: original caption 'about 65 meters in diameter'; 2017 update 58 x 49 m and depth 40 m", retrieval="primary_fetched",
                uncertainty="n/s", notes="The page does not state an earlier depth. Other published depths (34 m, 80-88 m) are kept separately in M11b and are NOT verified."),
    "M12": dict(quantity="pit width", value="~130", units="m", location="Mare Ingenii pit (35.95 S, 166.06 E)", lat=-35.95, lon=166.06,
                extraction_method="page text: 'about 130 m in diameter'; probably a partially collapsed lava tube, not confirmed", retrieval="primary_fetched",
                notes="Corrected: the page states no depth. The earlier '~70 m deep, 120-130 m wide' entry could not be confirmed and was withdrawn (see M12b)."),
    "M16": dict(value="~400 / <100", extraction_method="page text: equatorial noon 'almost 400K'; night 'below 100K'", retrieval="primary_fetched",
                notes="Equatorial value, not a polar one. Earlier range '385-400 / 95-100 K' was a search paraphrase and is replaced by the page text."),
    "J02": dict(lat=18, lon=77, value="45", extraction_method="page text: '28-mile-wide (45-kilometer)' crater on the western edge of Isidis Planitia 'at about 18 degrees latitude, 77 degrees longitude'",
                retrieval="primary_fetched", notes="Delta and lake are described as what mission scientists 'believe' (interpretation). Hemisphere letters not given on the page; 77 E is the established value."),
    "A01": dict(location="northern mid-latitudes mapped by SWIM", lat="0 to 60", lon="", quantity="latitude range of the SWIM mapping", value="0 to 60 N", units="deg",
                extraction_method="page text: 'mapped the area from the equator to 60 degrees north latitude'; MRO, 2001 Mars Odyssey and Mars Global Surveyor data", retrieval="primary_fetched",
                notes="Replaces the earlier '36-56 N, 132-176 W' Arcadia box, which could not be confirmed on the page and is withdrawn. The page states no ice depth."),
    "C01": dict(value="~200", source_url=U["chloride_themis"], dataset_or_publication="Osterloo et al. 2008, Science 319:1651 (doi:10.1126/science.1150690); THEMIS team release",
                extraction_method="page text: 'about 200 individual places' in the southern hemisphere (caption: 'more than 200 such features')", retrieval="primary_fetched",
                observation_period="THEMIS imagery; deposits mostly middle to late Noachian (3.9-3.5 Ga)", notes="Counts are of candidate deposits from spectral analysis. Each deposit is far smaller than a 2.5 degree Earth cell."),
}
STILL_UNVERIFIED = {
    "M15": "USGS page returned HTTP 403; value is from a search summary only.",
    "J01": "JPL MarsNext page fails a certificate check. The JPL press kit gives only 'about 18 degrees latitude, 77 degrees longitude' (consistent, not the same precision); the -2656 m elevation is unconfirmed.",
    "J03": "USGS Astropedia page returned HTTP 403; DTM bounds unconfirmed.",
    "A03": "NASA newsletter PDF has no extractable text in this environment; the 15-60 m figure is unconfirmed.",
}
NEW = [
    ("M11b", "MOON_LAVATUBE", "Marius Hills pit", "", "", "other published depths", "34 (NASA article) vs 80-88 (Kaguya)", "m", "n/s", "n/s", "values disagree", "n/s",
     "NASA articles / Kaguya (as reported in search summaries)", "pit_marius", "listed from search summaries; not found on the LROC page", "derived", "site", "search_summary", "UNVERIFIED. Do not quote; conflicts with the 40 m LROC value."),
    ("M12b", "MOON_LAVATUBE", "Mare Ingenii pit", "", "", "pit depth", "not stated", "", "not applicable", "not applicable", "not applicable", "none (no depth stated)", "LROC image page 695", "pit_ingenii",
     "page states no depth; an earlier '~70 m' entry was withdrawn", "derived", "site", "primary_fetched", "Documents the withdrawal of an unverified value."),
    ("M18", "MOON_SP_RIDGE", "south-polar crater rims with continuous sunlight (generic)", "", "", "steady surface temperature on continuously lit rims", "~220", "K", "n/s", "LRO Diviner mapping", "n/s",
     "LRO Diviner (infrared radiometer)", "Diviner science page (UCLA)", "diviner", "page text: rims in continuous sunlight stay near 'around 220K'", "observed", "region", "primary_fetched",
     "Generic polar-rim statement, not a measurement at one named ridge."),
    ("C02", "MARS_CHLORIDE", "southern highlands deposits", "", "", "deposit area", "1 to 25", "km2", "THEMIS", "n/s", "n/s", "THEMIS spectral analysis",
     "THEMIS team release on Osterloo et al. 2008", "chloride_themis", "page text: 'about one square kilometer to about 25 square kilometers'", "inferred", "region", "primary_fetched",
     "Roughly 4 orders of magnitude smaller than a 2.5 degree Earth cell."),
    ("U03", "MARS_MUDVOLC", "southern Acidalia Planitia", "", "", "cones and domes interpreted as mud-volcano analogs", ">18,000 identified (est. ~40,000)", "features", "n/s", "n/s", "mapping-based estimate",
     "orbital image mapping (as summarised in the abstract)", "Allen & Oehler 2010, AGU Fall Meeting abstract (NTRS 20100033209)", "mud_allen",
     "abstract text: over 18,000 features identified in selected regions; estimated ~40,000 across the area", "inferred", "region", "primary_fetched",
     "Morphological resemblance only; origin remains debated (see U02)."),
    ("U04", "MARS_MUDVOLC", "Azerbaijan (Earth)", "", "", "Earth reference for Martian mud volcanoes", "largest onshore concentration", "", "n/a", "n/a", "n/a",
     "field and sample study (as summarised in the abstract)", "Allen & Oehler 2010 (NTRS 20100033209)", "mud_allen",
     "abstract text: 'The largest concentration of onshore features is in Azerbaijan, near the western edge of the Caspian Sea'", "inferred", "region", "primary_fetched",
     "Names the Earth analog region; the closest morphologic analogs named are submarine (Gulf of Cadiz), which a land grid cannot test."),
]
R = R + NEW
CORRECTION_LOG = [
    "M10: diameter '~100 m' -> '100-115 m' (page text).",
    "M11: single mixed entry split; only the 40 m depth / 58x49 m diameter (LROC 2017 update) is verified; 34 m and 80-88 m moved to unverified M11b.",
    "M12: '~70 m deep' withdrawn (page states no depth); width ~130 m and coordinates 35.95 S 166.06 E added.",
    "M16: '385-400 / 95-100 K' replaced by the page statement 'almost 400 K' / 'below 100 K'.",
    "A01: Arcadia box '36-56 N, 132-176 W' withdrawn (not on cited page); replaced by the verified SWIM latitude range 0-60 N.",
]


# evidence quality system, kept separate from data coverage and from the recommendation score
def quality(row):
    if row["verification_status"] != "verified_primary":
        return "unverified"
    if row["scope"] == "body":
        return "generic_property"
    if row["evidence_class"] == "inferred":
        return "supported_inference"
    if row["id"] in ("M02", "M06", "M07", "M08", "M13"):
        return "published_model"
    if row["evidence_class"] == "derived":
        return "derived_measurement"
    return "primary_measured"


COLS = ["id", "target_id", "location", "lat", "lon", "quantity", "value", "units", "spatial_resolution", "observation_period", "uncertainty",
        "instrument_or_method", "dataset_or_publication", "source_url", "extraction_method", "evidence_class", "scope", "retrieval", "retrieved_on", "verification_status", "evidence_quality", "notes"]


def main():
    rows = []
    for r in R:
        (i, t, loc, lat, lon, q, val, un, res, per, unc, ins, ds, uk, ex, cl, sc, ret, note) = r
        row = dict(zip(COLS, [i, t, loc, lat, lon, q, val, un, res, per, unc, ins, ds, U.get(uk, uk), ex, cl, sc, ret, RET, "", "", note]))
        if i in UPDATES:
            row.update(UPDATES[i])
            row["retrieved_on"] = VER
        row["verification_status"] = "verified_primary" if row["retrieval"] == "primary_fetched" else "unverified_search_summary"
        if i in STILL_UNVERIFIED:
            row["notes"] = (row["notes"] + " STILL UNVERIFIED: " + STILL_UNVERIFIED[i]).strip()
        row["evidence_quality"] = quality(row)
        rows.append(row)
    with open(ROOT / "data/planetary_measurements.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        w.writerows(rows)
    json.dump(rows, open(ROOT / "data/planetary_measurements.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    from collections import Counter
    from collections import Counter as _C
    print("quality:", dict(_C(r["evidence_quality"] for r in rows)))
    print(len(rows), "rows;", dict(Counter(r["scope"] for r in rows)), dict(Counter(r["retrieval"] for r in rows)))


if __name__ == "__main__":
    main()
