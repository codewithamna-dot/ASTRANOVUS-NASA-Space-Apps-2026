# Moon / Mars reference-site evidence

Generated from `scripts/build_target_evidence.py` into `data/target_evidence.csv` (one row per rule, with `status`, `evidence_type`, quoted `value_found`, `source_url`) and
`data/target_evidence_summary.json`. Sources were retrieved on 2026-11-15. Numbers are quoted from the sources; ASTRANOVUS measured none of them.
`evidence_type`: **observed** (instrument measurement quoted by the source), **literature** (published interpretation), none.

| Target | active rules with a retrieved source | retired rules |
|---|---|---|
| MOON_SP_RIDGE | 4 / 6 | 1 |
| MOON_PSR | 5 / 5 | 1 |
| MOON_LAVATUBE | 4 / 5 | 0 |
| MARS_ICE | 4 / 6 | 0 |
| MARS_JEZERO | 5 / 6 | 0 |
| MARS_MUDVOLC | 3 / 4 | 1 |
| MARS_CHLORIDE | 1 / 4 | 0 |
| MARS_AEOLIAN | 1 / 4 | 1 |
| MOON_MARE | 5 / 5 | 0 |

Generic body properties (dryness, barren regolith, cold) come from NASA Moon/Mars fact pages and are flagged "not site-specific" in the CSV.

## Observed numbers retrieved (with sources in the CSV)
* Lunar PSR temperatures as low as ~25 K, 40-110 K range for water-ice trapping (LRO Diviner); equatorial surface ~385-400 K at noon and ~95-100 K at night.
* Shackleton crater: ~21 km wide, ~4 km deep, ~30 degree walls, 6.6 km floor, most of the interior in permanent shadow; rim peaks sunlit ~80-90 % of each orbit.
* Mare slopes ~3.5 degree vs highland ~9.1 degree median (LROC NAC stereo, 15 m baseline). Lunar pit interior in the Mare Tranquillitatis stays ~17 C all day.
* Jezero: ~45 km crater; MEDA surface temperature from ~-83 C before dawn to ~+5 C at noon; floor is igneous (Maaz basalt, Seitah olivine cumulate) with a sedimentary fan above.
* SWIM: shallow ice (0-5 m) to ~30 N in places; ~200 THEMIS chloride deposits of 1-25 km2.

## Profile changes made this round (all evidence-backed, none to improve validation)
| Rule | Change | Reason |
|---|---|---|
| MOON_PSR D7 light (was 2) | set to 0 | a PSR has no direct sunlight, an Earth seasonal-insolation proxy cannot represent it |
| MOON_SP_RIDGE D5 rock (was 2) | set to 0 | D5 is now a mafic-composition proxy; NASA sample-science planning describes the south-polar sites as feldspathic highlands with SPA breccias |
| MARS_MUDVOLC D5 (was 2) | set to 0 | a bare-ground composition proxy cannot represent fine sediment |
| MARS_AEOLIAN D5 (was 2) | set to 0 | Martian dune sand is basaltic, so a "low mafic" Earth rule would point the wrong way |
The LAVATUBE thermal-swing rule was kept: the rule describes the surface above the tubes (large swing) while pit interiors are stable (~17 C), and the description now says so.
The previous targets file is archived in `data/processed/archive/targets_before_evidence_review.json`.

## Still unverified
Band limits (for example terrain 0.3-0.7, cold 0.5-0.9), all weights, and quantitative LOLA/MOLA/Diviner statistics for the specific sites. The exact values to retrieve, and where, are in `docs/MANUAL_EVIDENCE_NEEDED.md`.
