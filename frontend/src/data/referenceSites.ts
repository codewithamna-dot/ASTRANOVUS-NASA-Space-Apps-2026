// Generated from data/analog_dataset_v3.json (documented analog sites) plus team research hypotheses. Coordinates are approximate.
// These are literature-documented or hypothesised Earth analog places, shown for context. They are NOT outputs of the scoring engine.
export type ReferenceKind = 'documented' | 'incomplete' | 'hypothesis';
export interface ReferenceSite { id: string; name: string; country: string; lat: number; lon: number; kind: ReferenceKind; targets: string[]; support: string; source: string; note: string }
export const REFERENCE_SITES: ReferenceSite[] = [
  {
    "id": "atacama",
    "name": "Atacama Desert, Chile",
    "country": "Chile",
    "lat": -24.0,
    "lon": -69.5,
    "kind": "documented",
    "targets": [
      "MARS_CHLORIDE",
      "MARS_JEZERO"
    ],
    "support": "strong",
    "source": "https://science.nasa.gov/solar-system/planetary-analogs/",
    "note": "NASA page states soil sampling for Mars-relevant dryness; says nothing about chloride deposits or Jezero geology specifically"
  },
  {
    "id": "devon_haughton",
    "name": "Devon Island / Haughton crater, Canada",
    "country": "Canada (Nunavut)",
    "lat": 75.4,
    "lon": -89.8,
    "kind": "documented",
    "targets": [
      "MARS_ICE"
    ],
    "support": "strong",
    "source": "https://www.marsinstitute.no/hmp",
    "note": "Impact-crater + polar desert; ice-rich permafrost but not Arcadia-style buried ice plains"
  },
  {
    "id": "lava_beds",
    "name": "Lava Beds National Monument, USA",
    "country": "USA (California)",
    "lat": 41.7,
    "lon": -121.5,
    "kind": "documented",
    "targets": [
      "MOON_LAVATUBE"
    ],
    "support": "strong",
    "source": "https://science.nasa.gov/solar-system/planetary-analogs/",
    "note": "NASA page: mapping and detecting lava tubes; the subsurface property itself is invisible to a surface model"
  },
  {
    "id": "kilauea",
    "name": "Kilauea volcano, Hawaii, USA",
    "country": "USA (Hawaii)",
    "lat": 19.4,
    "lon": -155.3,
    "kind": "documented",
    "targets": [
      "MOON_LAVATUBE"
    ],
    "support": "moderate",
    "source": "https://www.nasa.gov/analog-missions/",
    "note": "NASA: timing of geologist/astronaut tasks in volcanic terrain similar to the lunar surface; not a lava-tube analog statement"
  },
  {
    "id": "iceland",
    "name": "Icelandic volcanic fields",
    "country": "Iceland",
    "lat": 64.9,
    "lon": -17.5,
    "kind": "documented",
    "targets": [
      "MOON_LAVATUBE"
    ],
    "support": "moderate",
    "source": "https://katalog.lib.cas.cz/KNAV/EdsRecord/edsdoj,edsdoj.208af1acf1ee4e34a7022ce5d94f84ec",
    "note": "Geological style analog (Apollo-era training); no verified source in this project for lava tubes specifically"
  },
  {
    "id": "death_valley",
    "name": "Death Valley, USA",
    "country": "USA",
    "lat": 36.5,
    "lon": -117.1,
    "kind": "documented",
    "targets": [
      "MARS_CHLORIDE",
      "MARS_JEZERO"
    ],
    "support": "weak",
    "source": "https://science.nasa.gov/solar-system/planetary-analogs/",
    "note": "NASA page: drone testing for Martian sands and skies"
  },
  {
    "id": "colorado_desert",
    "name": "Colorado Desert, California, USA",
    "country": "USA/Mexico",
    "lat": 33.0,
    "lon": -115.8,
    "kind": "documented",
    "targets": [
      "MARS_JEZERO",
      "MOON_MARE"
    ],
    "support": "weak",
    "source": "https://www.nasa.gov/solar-system/moon/nasa-testing-advanced-capabilities-for-moon-mars-rovers/",
    "note": "Original v1 label; no specific source retained"
  },
  {
    "id": "mcmurdo_dry_valleys",
    "name": "McMurdo Dry Valleys, Antarctica",
    "country": "Antarctica",
    "lat": -77.5,
    "lon": 162.5,
    "kind": "documented",
    "targets": [
      "MARS_ICE"
    ],
    "support": "strong",
    "source": "https://ntrs.nasa.gov/citations/20100003844",
    "note": "Ground ice under dry permafrost is widely published as a Phoenix-site analog (search summary of Planetary & Space Science 2013 and others); this cell "
  },
  {
    "id": "svalbard",
    "name": "Svalbard, Norway (AMASE)",
    "country": "Norway",
    "lat": 78.2,
    "lon": 15.6,
    "kind": "documented",
    "targets": [
      "MARS_JEZERO"
    ],
    "support": "moderate",
    "source": "https://science.gsfc.nasa.gov/solarsystem/projects/247",
    "note": "Astrobiology field site (AMASE); relation to Jezero geology is thematic"
  },
  {
    "id": "craters_of_the_moon",
    "name": "Craters of the Moon National Monument, Idaho, USA",
    "country": "USA (Idaho)",
    "lat": 43.2,
    "lon": -113.5,
    "kind": "documented",
    "targets": [
      "MOON_LAVATUBE",
      "MOON_MARE"
    ],
    "support": "moderate",
    "source": "https://pmc.ncbi.nlm.nih.gov/articles/PMC6442300",
    "note": "BASALT: Mars basalt geology/astrobiology and operations"
  },
  {
    "id": "mdrs_utah",
    "name": "Mars Desert Research Station area (San Rafael Swell), Utah, USA",
    "country": "USA (Utah)",
    "lat": 38.4,
    "lon": -110.8,
    "kind": "documented",
    "targets": [
      "MARS_JEZERO"
    ],
    "support": "moderate",
    "source": "https://ntrs.nasa.gov/citations/20110014304",
    "note": "Mars Desert Research Station: operational analog; geology is sedimentary desert"
  },
  {
    "id": "gobustan_azerbaijan",
    "name": "Gobustan / Caspian mud-volcano province",
    "country": "Azerbaijan",
    "lat": 40.1,
    "lon": 49.4,
    "kind": "documented",
    "targets": [
      "MARS_MUDVOLC"
    ],
    "support": "strong",
    "source": "https://ntrs.nasa.gov/citations/20100033209",
    "note": "Authors name Gulf of Cadiz submarine volcanoes as the closest morphologic analogs; land climate (semi-arid, warm) is unlike Acidalia"
  },
  {
    "id": "lanzarote_corona",
    "name": "Corona lava tube, Lanzarote",
    "country": "Spain (Canary Islands)",
    "lat": 29.05,
    "lon": -13.43,
    "kind": "documented",
    "targets": [
      "MOON_LAVATUBE"
    ],
    "support": "strong",
    "source": "https://www.eoportal.org/other-space-activities/pangaea",
    "note": "Surface model sees basaltic climate only; tube geometry is invisible at 2.5 deg"
  },
  {
    "id": "qaidam_dalangtan",
    "name": "Dalangtan playa, Qaidam Basin",
    "country": "China",
    "lat": 38.3,
    "lon": 91.3,
    "kind": "documented",
    "targets": [
      "MARS_AEOLIAN",
      "MARS_CHLORIDE"
    ],
    "support": "strong",
    "source": "https://hub.hku.hk/bitstream/10722/244904/1/content.pdf",
    "note": "Altitude 2.7-3 km makes air temperature low relative to latitude"
  },
  {
    "id": "white_sands_nm",
    "name": "White Sands gypsum dune field",
    "country": "USA (New Mexico)",
    "lat": 32.8,
    "lon": -106.3,
    "kind": "documented",
    "targets": [
      "MARS_AEOLIAN"
    ],
    "support": "strong",
    "source": "https://npshistory.com/publications/whsa/brochures/mars-2016.pdf",
    "note": "Gypsum (sulfate) dunes, not basaltic dunes; Martian dark dunes are basaltic"
  },
  {
    "id": "jingpo_lake",
    "name": "Jingpo Lake volcanic field",
    "country": "China",
    "lat": 43.9,
    "lon": 128.9,
    "kind": "incomplete",
    "targets": [
      "MOON_LAVATUBE",
      "MOON_MARE"
    ],
    "support": "weak",
    "source": "https://katalog.lib.cas.cz/KNAV/EdsRecord/edsdoj,edsdoj.208af1acf1ee4e34a7022ce5d94f84ec",
    "note": "Attribution of the proposal not verified by opening the paper; forested climate unlike the Moon"
  },
  {
    "id": "jeju_manjanggul",
    "name": "Manjanggul lava tube, Jeju",
    "country": "South Korea",
    "lat": 33.53,
    "lon": 126.77,
    "kind": "incomplete",
    "targets": [
      "MOON_LAVATUBE"
    ],
    "support": "weak",
    "source": "https://katalog.lib.cas.cz/KNAV/EdsRecord/edsdoj,edsdoj.208af1acf1ee4e34a7022ce5d94f84ec",
    "note": "Source states a limitation; humid climate"
  },
  {
    "id": "black_point_flow",
    "name": "Black Point lava flow, San Francisco Volcanic Field",
    "country": "USA (Arizona)",
    "lat": 35.6,
    "lon": -111.5,
    "kind": "incomplete",
    "targets": [
      "MOON_MARE"
    ],
    "support": "weak",
    "source": "https://science.nasa.gov/solar-system/planetary-analogs/",
    "note": "Support is an image caption, not a stated analog objective"
  },
  {
    "id": "hingol_makran",
    "name": "Hingol / Makran coast",
    "country": "Pakistan",
    "lat": 25.5,
    "lon": 65.5,
    "kind": "hypothesis",
    "targets": [],
    "support": "none",
    "source": "",
    "note": "Mud volcanoes reported there by low-quality sources; no analog literature verified"
  },
  {
    "id": "karakoram_baltoro",
    "name": "Karakoram / Baltoro",
    "country": "Pakistan",
    "lat": 35.7,
    "lon": 76.4,
    "kind": "hypothesis",
    "targets": [],
    "support": "none",
    "source": "",
    "note": "Team hypothesis; no analog literature verified."
  },
  {
    "id": "khewra",
    "name": "Khewra salt range",
    "country": "Pakistan",
    "lat": 32.65,
    "lon": 72.0,
    "kind": "hypothesis",
    "targets": [],
    "support": "none",
    "source": "",
    "note": "Team hypothesis (evaporites); no analog literature verified."
  },
  {
    "id": "katpana",
    "name": "Katpana cold desert",
    "country": "Pakistan",
    "lat": 35.2,
    "lon": 75.6,
    "kind": "hypothesis",
    "targets": [],
    "support": "none",
    "source": "",
    "note": "Team hypothesis; no analog literature verified."
  }
];
