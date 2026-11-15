# Analog validation dataset v3

Source of truth: `data/analog_dataset_v3.json` (built by `scripts/build_analog_dataset_v3.py`); frozen membership: `data/analog_cohorts_v3_frozen.json`.
Earlier files (`data/known_analogs.json`, baseline copies in `data/processed/baseline_2026-11-16/`) are untouched.

## Fields stored for every site
site id, name, country, latitude/longitude, coordinate source, approximate extent, environmental characteristics, target(s), testing purposes, analog types
(geological, climatic/environmental, terrain/rover mobility, ice/resource, operational, astrobiology/science), relationship statement, sources (label, URL, retrieval:
`primary_fetched` or `search_summary`), evidence category, support strength, limitations, validation eligibility with reason, verification status, cohort.
Controls store: target scope, hard flag, kind, a written physical rationale, and the basis ("physical reasoning written before scoring; not derived from model predictions").

## Honest provenance notes
- **Coordinates** are approximate site centroids from general geographic knowledge, not taken from the cited papers (only the Haughton station position came from a source, and that came from a search summary). The grid is 2.5 degrees, so this does not matter for scoring, but they are not surveyed positions.
- **Sources:** only two supporting pages were opened and read in full for new sites: Allen and Oehler 2010 (NASA NTRS 20100033209; Azerbaijan is "the largest concentration of onshore features") and the NASA Planetary Analogs page (no coordinates). The Qaidam arXiv abstract was read but names no sub-site. All other support came from search results and is marked `search_summary`; those papers still need to be opened and checked (`docs/MANUAL_EVIDENCE_NEEDED.md`).
- A site used by NASA/ESA for some test is not treated as a universal analog: each pair states its own relationship (for example Black Point flow: a lunar-rover test mentioned in an image caption only, so exploratory).

## Accepted new sites
| Site | Target(s) | Types | Strength | Eligibility | Cohort |
|---|---|---|---|---|---|
| Gobustan / Caspian mud-volcano province, Azerbaijan | MARS_MUDVOLC | geological | strong (primary: NTRS abstract) | eligible | C frozen |
| Corona lava tube, Lanzarote, Spain | MOON_LAVATUBE | geological, operational | strong (search summary) | eligible | B development |
| Dalangtan playa, Qaidam Basin, China | MARS_CHLORIDE; MARS_AEOLIAN (yardangs: partial, scored exploratory) | geological, climatic, terrain | strong (search summary + arXiv abstract) | eligible | C frozen |
| White Sands gypsum dunes, USA | MARS_AEOLIAN | geological | strong (search summary) | eligible | C frozen |
| Jingpo Lake volcanic field, China | MOON_LAVATUBE, MOON_MARE | geological | weak (attribution not verified) | exploratory | B development |
| Manjanggul lava tube, Jeju, South Korea | MOON_LAVATUBE | geological | weak (source states the analogy is incomplete) | exploratory | C frozen |
| Black Point lava flow, Arizona, USA | MOON_MARE | terrain/rover mobility | weak (image caption) | exploratory | B development |

Historical cohort A (11 sites, 14 in-grid pairs) retains its earlier mapping; each now carries a support strength and limitation note (for example Death Valley -> chloride is weak: the NASA page mentions drone testing, not evaporites).

## Rejected candidates (17), with reasons
Namib dunes (Titan only), Meteor Crater and Ries crater and Bletterbach (impact/sedimentary training, no modelled target), NW Greenland (icy worlds), Axel Heiberg springs (spring-deposit analog, no matching target), Dallol (only a non-peer-reviewed article found), Berca mud volcanoes (tourism source only), Rio Tinto (no source examined), Deception Island (no clean target), Askja and Lambahraun (same region as the historical Iceland site; a trained Apollo geologist cautioned that no good lunar analogs exist), Mauna Ulu/Kilauea Iki (same cell as Kilauea), and the four Pakistani hypotheses (Hingol/Makran, Karakoram/Baltoro, Khewra, Katpana: reported in low-quality sources or by the team only, no analog literature verified).

## Controls (25 sites, 19 hard)
Earlier 15 plus 10 new hard controls, each scoped to the targets for which it is a negative:
Deccan Traps, Parana basalts, Siberian Traps (basalt with incompatible climate or forest cover; MOON_LAVATUBE, MOON_MARE); Libyan Sand Sea (dry but no basalt; MOON_LAVATUBE); East Antarctic plateau (ice-covered, no exposed geology; MARS_MUDVOLC, MARS_JEZERO, MARS_AEOLIAN); Fennoscandian shield and Canadian Shield boreal forest (cold vegetated crystalline terrain; MARS_MUDVOLC, MARS_JEZERO); Sahel savanna and Mongolian steppe (vegetated; MARS_AEOLIAN, MARS_CHLORIDE); Greenland ice sheet interior (glacier ice, not regolith-buried ground ice; MARS_ICE, MARS_MUDVOLC). The full rationale for each is in the JSON.
No control was chosen from model output. There are no experiment-specific controls (no source labels sites as unsuitable for a given experiment).

## Cohorts and leakage controls
A historical (influenced development) / B development (3 sites) / C frozen independent (4 sites). B/C assignment = parity of sha256(site id), made before any new site was scored. `validate_v3.py` refuses to run if the frozen membership hash changes; without `--final` it never scores cohort C. Nearby duplicates (same target, same 2.5 degree cell) are rejected by a test. Because the new sites are few (7), cohort C holds 3 primary pairs from 3 sites: its results are reported but flagged unreliable.
