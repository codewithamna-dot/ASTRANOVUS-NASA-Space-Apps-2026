# NASA Space Apps 2026 — submission material (DRAFT, not submitted)

> Nothing has been submitted. **Deadline not verified:** the official site could not be fetched from this environment (certificate error), and the
> proposal (Sun 15 Nov, 11:59 PM local) and the handoff ("~15 hours left" on Saturday evening) disagree. Check the official team/challenge page for the exact local-event
> and global deadlines, the demo limit (the proposal says a video up to 30 s or up to 7 slides) and any live-pitch time before relying on these notes.

## Project overview
**ASTRANOVUS** (Team Astravant, Islamabad). Challenge: *Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars.*

## Problem
Teams that test rovers, drills or instruments need Earth sites that resemble a specific lunar or Martian environment, but "best analog" depends on what is being tested,
and analog choices are rarely accompanied by transparent data coverage and limits.

## Solution
Pick Moon/Mars → pick an experiment (12 scenarios, each labelled NASA-documented / related / ASTRANOVUS proposal, with NASA links) → pick a compatible reference site →
an explainable Python engine ranks Earth regions with reasons, per-dimension NASA datasets, weak/missing data, confidence, and what Earth cannot reproduce.

## NASA data used
MODIS Terra MOD11C3 / MOD13C2 / MOD10CM (collection 061), GPM IMERG V07B, NASA POWER climatology; reference-site evidence from NASA/LRO Diviner, NASA Artemis, NASA/PSI SWIM, NASA/JPL Perseverance. NASA SRTMGL1 (v003) tiles for the top candidate regions (local terrain check only).

## Differentiators
Purpose-driven recommendations; data-unavailable states instead of invented results; proxies and partial-season data labelled; held-out validation against NASA-documented analog sites; no opaque model.

## Limitations (say these out loud)
2.5 degree grid (~280 km cells): candidate areas, not test sites; MODIS/GPM cover one year (2024); rock composition is an ASTER-based bare-ground proxy covering 13% of cells; terrain is 1 km relief (30 m only for top regions); ice is a snow-cover proxy; reference-site rules are drafts with partial evidence (32 of 49 rows supported, real LOLA/MOLA/Diviner values pending); results are not verified ground-test sites; not an official NASA tool.

## AI usage disclosure (suggested wording)
"Code, documentation and parts of the data pipeline were developed with the assistance of Claude (Anthropic). Data sources, scientific choices and all results were reviewed by the team. The recommendation engine is a transparent rule-and-weight model, not a generative or black-box AI system."

## Demo scenarios (real model outputs from the final grid)
**Moon - water-ice prospecting, reference site "Permanently shadowed crater floor"** (data state: partial; ice is a snow-cover proxy); each marker is a 2.5 degree cell, regions bounded to 15 degrees:
1. Antarctica (78.8°S, 43.8°E): score 90.43, coverage 82 %, medium confidence; outside SRTM coverage (30 m terrain not verified)
2. Antarctica (76.2°S, 123.8°E): score 88.29, coverage 82 %, medium confidence; outside SRTM coverage (30 m terrain not verified)
3. Antarctica (81.2°S, 101.2°W): score 78.0, coverage 82 %, medium confidence; outside SRTM coverage (30 m terrain not verified)
4. Greenland (71.2°N, 36.2°W): score 77.72, coverage 82 %, medium confidence; outside SRTM coverage (30 m terrain not verified)
5. Canadian Arctic, Canada (76.2°N, 121.2°W): score 76.56, coverage 100 %, high confidence; outside SRTM coverage (30 m terrain not verified)

**Mars - geological sampling, reference site "Jezero crater delta"** (data state: partial; rock composition is a bare-ground proxy; terrain is 1 km relief); each marker is a 2.5 degree cell, regions bounded to 15 degrees:
1. Taklamakan Desert, China (36.2°N, 86.2°E): score 90.73, coverage 76 %, medium confidence; SRTM 30 m check: moderate, mean slope 7.93 deg
2. Iranian Plateau, Iran (33.8°N, 56.2°E): score 90.65, coverage 100 %, high confidence; SRTM 30 m check: flat, mean slope 4.88 deg
3. Sahara Desert, Egypt (26.2°N, 33.8°E): score 90.53, coverage 100 %, high confidence; SRTM 30 m check: moderate, mean slope 9.38 deg
4. Atacama Desert, Chile (23.8°S, 68.8°W): score 87.49, coverage 100 %, high confidence; SRTM 30 m check: flat, mean slope 4.39 deg
5. Gobi Desert, Mongolia (43.8°N, 106.2°E): score 86.62, coverage 76 %, medium confidence; 30 m terrain check not run

Re-run before recording: numbers change if the grid or profiles change. Validation: see `docs/VALIDATION.md` (small sample, wide intervals).

## Pitch narrative (≈3 min)
1. "Where on Earth should we test for the Moon or Mars?" depends on *what* you test. 2. Walk the wizard (Moon → water ice → shadowed crater). 3. Show the map, the top region's
reasons, datasets and **missing data**. 4. Compare two regions. 5. Methodology page: honest limits and validation. 6. "Next: full-year MODIS, SRTM terrain, EMIT geology, grounded LOLA/MOLA/Diviner values."

## Checklist
[ ] verify deadline/format officially · [ ] confirm GitHub link + AI disclosure · [ ] deploy and run final real-data check · [ ] record 30 s video / ≤7 slides · [ ] submit yourself
