import antarcticDryValley from '../assets/earth/antarctic_dry_valley.jpg';
import arcticPolarDesert from '../assets/earth/arctic_polar_desert.jpg';
import atacama from '../assets/earth/atacama.jpg';
import deathValley from '../assets/earth/death_valley.jpg';
import gobiDunes from '../assets/earth/gobi_dunes.jpg';
import hawaiiKilauea from '../assets/earth/hawaii_kilauea.jpg';
import icelandAskja from '../assets/earth/iceland_askja.jpg';
import karakoram from '../assets/earth/karakoram.jpg';
import lavaTube from '../assets/earth/lava_tube.jpg';
import tibetanPlateau from '../assets/earth/tibetan_plateau.jpg';
import type { Region } from '../types/astranovus';

export interface EarthPhoto {
  id: string;
  src: string;
  /** What the photograph actually shows. */
  title: string;
  /** Environment type and the Moon/Mars study it relates to. */
  type: string;
  relevance: string;
  /** Why the environment qualifies as an analog (short) and its limitation. */
  eligibility: string;
  limitation: string;
  /** `site`: the picture shows this documented analog place. `representative`: same environment type, not necessarily the place. */
  match: 'site' | 'representative';
  credit: { author: string; license: string; page: string };
}

const wc = (f: string) => `https://commons.wikimedia.org/wiki/File:${f}`;

export const EARTH_PHOTOS: Record<string, EarthPhoto> = {
  antarctic_dry_valley: {
    id: 'antarctic_dry_valley', src: antarcticDryValley, title: 'Wright Valley, McMurdo Dry Valleys, Antarctica', type: 'Cold hyper-arid desert',
    relevance: 'Mars ice and cold-desert studies', eligibility: 'Ice-cemented ground under dry permafrost; published as an analog for Mars polar plains.',
    limitation: 'Ice-free valleys are far smaller than a 2.5° grid cell.', match: 'site',
    credit: { author: 'David Saul', license: 'Public domain', page: wc('Wright_Valley_From_Bull_Pass.jpg') },
  },
  arctic_polar_desert: {
    id: 'arctic_polar_desert', src: arcticPolarDesert, title: 'Patterned ground, Devon Island, Canadian Arctic', type: 'Polar desert with ground ice',
    relevance: 'Mars ice, rover and crew-operations studies', eligibility: 'Devon Island hosts NASA-linked Mars analog research (Haughton impact crater region).',
    limitation: 'Arctic permafrost is not the same as Martian buried ice plains.', match: 'site',
    credit: { author: 'Anthonares', license: 'CC BY-SA 3.0', page: wc('Patterned_ground_devon_island.jpg') },
  },
  iceland_askja: {
    id: 'iceland_askja', src: icelandAskja, title: 'Drekagil gorge near Askja, Iceland', type: 'Basaltic volcanic highland',
    relevance: 'Lunar and Martian volcanic-terrain geology', eligibility: 'Basalt terrain used for Apollo-era geological training and rover tests.',
    limitation: 'Wet, cold climate; a geological-style analog only.', match: 'site',
    credit: { author: 'Pjt56', license: 'CC BY-SA 4.0', page: wc('Drekagil-pjt2.jpg') },
  },
  hawaii_kilauea: {
    id: 'hawaii_kilauea', src: hawaiiKilauea, title: 'Kīlauea summit eruption, Hawaiʻi (2025)', type: 'Active basaltic volcano',
    relevance: 'Lunar-style volcanic terrain, lava-tube regions', eligibility: 'NASA lists Kīlauea as a planetary analog for field work in volcanic terrain.',
    limitation: 'Island site: outside the 2.5° land grid used for scoring.', match: 'site',
    credit: { author: 'USGS / K. Lynn', license: 'Public domain', page: wc('Episode_4_of_Kilauea%27s_December_2024_eruption_2025-01-16.jpg') },
  },
  atacama: {
    id: 'atacama', src: atacama, title: 'Atacama Desert, Chile', type: 'Hyper-arid desert',
    relevance: 'Mars dryness, life-detection and chloride studies', eligibility: 'NASA lists the Atacama as an analog for Mars-like dry conditions.',
    limitation: 'Photo is representative; no Martian chloride deposits are verified here.', match: 'representative',
    credit: { author: 'Frodosleveland', license: 'CC BY-SA 4.0', page: wc('AtacamaDesertByFrode.jpg') },
  },
  death_valley: {
    id: 'death_valley', src: deathValley, title: 'Badwater Basin, Death Valley, USA', type: 'Arid salt-flat basin',
    relevance: 'Evaporite, dust and rover tests', eligibility: 'NASA uses Death Valley for Mars-relevant sand and drone tests; salt basin geology is a typical evaporite analog.',
    limitation: 'Much warmer than Mars; support for chloride analogy is general, not site-specific.', match: 'site',
    credit: { author: 'HappyJake', license: 'CC BY 3.0', page: wc('Badwater_Basin_from_Dante%27s_View_Overlook.JPG') },
  },
  lava_tube: {
    id: 'lava_tube', src: lavaTube, title: 'Lava tube, Lava Beds National Monument, USA', type: 'Basaltic lava tube',
    relevance: 'Lunar and Martian lava-tube studies', eligibility: 'NASA lists Lava Beds for mapping and detecting lava tubes for shelter on the Moon and Mars.',
    limitation: 'Tubes are metre-scale and invisible to the surface model, so a high score never confirms one.', match: 'site',
    credit: { author: 'Leonard G.', license: 'Public domain', page: wc('IlluminatedLavaTubeAtLBNMi-C0070.JPG') },
  },
  karakoram: {
    id: 'karakoram', src: karakoram, title: 'Baltoro Glacier, Karakoram, Pakistan', type: 'High mountain glacial valley',
    relevance: 'Team research hypothesis (cold, rugged terrain)', eligibility: 'Proposed by the team as a Pakistani analog candidate.',
    limitation: 'No verified analog literature yet; never scored as a validated analog.', match: 'site',
    credit: { author: 'Thsulemani', license: 'CC BY-SA 3.0', page: wc('Baltoro_Glacier,_Pakistan.jpg') },
  },
  gobi_dunes: {
    id: 'gobi_dunes', src: gobiDunes, title: 'Khongoryn Els dunes, Gobi Desert, Mongolia', type: 'Cold-desert dune field',
    relevance: 'Martian dune and rover-mobility studies', eligibility: 'Large active dunes with sparse vegetation; representative of dune-field terrain.',
    limitation: 'Representative only; Martian dunes are basaltic, these are not.', match: 'representative',
    credit: { author: 'Zoharby', license: 'CC BY-SA 3.0', page: wc('Khongoryn_Els_sand_dunes.jpg') },
  },
  tibetan_plateau: {
    id: 'tibetan_plateau', src: tibetanPlateau, title: 'Qinghai-Tibet Plateau from orbit (NASA)', type: 'High-altitude cold desert plateau',
    relevance: 'Mars evaporite and aeolian studies (Qaidam Basin)', eligibility: 'The Qaidam Basin on the plateau’s northeastern edge is published as a Mars analog.',
    limitation: 'Satellite view of the wider plateau, not the Qaidam site itself.', match: 'representative',
    credit: { author: 'Jesse Allen, NASA Earth Observatory', license: 'Public domain', page: wc('Jewel-Toned_Lakes_of_the_Qinghai-Tibet_Plateau.jpg') },
  },
};

const has = (s: string, re: RegExp) => re.test(s);

/** Representative photograph for a recommended grid region, chosen only from its coarse location and climate. Never shown as the exact site. */
export function pickRegionPhoto(r: Pick<Region, 'lat' | 'lon' | 'location_label' | 'region_name' | 'country' | 'dimensions'>): EarthPhoto {
  const text = `${r.location_label} ${r.region_name ?? ''} ${r.country ?? ''}`;
  const dim = (id: string) => r.dimensions.find((d) => d.dimension === id)?.percentile ?? null;
  if (r.lat <= -60) return EARTH_PHOTOS.antarctic_dry_valley;
  if (r.lat >= 66) return EARTH_PHOTOS.arctic_polar_desert;
  if (has(text, /Iceland/i)) return EARTH_PHOTOS.iceland_askja;
  if (has(text, /Hawai/i)) return EARTH_PHOTOS.hawaii_kilauea;
  if (has(text, /Karakoram|Himalaya|Pamir|Alps|Caucasus|Kashmir/i)) return EARTH_PHOTOS.karakoram;
  if (has(text, /Tibet|Qinghai|Qaidam|Xinjiang|Taklamakan/i)) return EARTH_PHOTOS.tibetan_plateau;
  if (has(text, /Gobi|Mongolia|Karakum|Kyzylkum|Uzbekistan|Kazakh|Turkmen/i)) return EARTH_PHOTOS.gobi_dunes;
  if (has(text, /Atacama|Chile|Peru|Patagonia|Argentina|Bolivia/i)) return EARTH_PHOTOS.atacama;
  if (has(text, /Sahara|Libya|Niger|Chad|Algeria|Egypt|Sudan|Arabian|Yemen|Oman|Saudi|Namib|Sahel/i)) return EARTH_PHOTOS.gobi_dunes;
  if ((dim('D2_aridity') ?? 0) >= 0.7) return EARTH_PHOTOS.death_valley;
  return EARTH_PHOTOS.karakoram;
}
