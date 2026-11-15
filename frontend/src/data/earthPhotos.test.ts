import { describe, expect, it } from 'vitest';
import type { Region } from '../types/astranovus';
import { EARTH_PHOTOS, pickRegionPhoto } from './earthPhotos';
import { REFERENCE_SITES } from './referenceSites';

const region = (lat: number, label: string, aridity: number | null = null): Pick<Region, 'lat' | 'lon' | 'location_label' | 'region_name' | 'country' | 'dimensions'> => ({
  lat,
  lon: 0,
  location_label: label,
  region_name: null,
  country: null,
  dimensions: aridity === null ? [] : ([{ dimension: 'D2_aridity', percentile: aridity }] as unknown as Region['dimensions']),
});

describe('Earth photographs', () => {
  it('every photo carries an author, a licence and a source page', () => {
    for (const p of Object.values(EARTH_PHOTOS)) {
      expect(p.credit.author.length).toBeGreaterThan(2);
      expect(p.credit.license).toMatch(/public domain|CC BY/i);
      expect(p.credit.page).toMatch(/^https:\/\/commons\.wikimedia\.org\//);
      expect(p.limitation.length).toBeGreaterThan(10);
    }
  });

  it('region photos are chosen from coarse location only and never claim to be the exact site', () => {
    expect(pickRegionPhoto(region(-78.75, 'Antarctica (78.8°S, 43.8°E)')).id).toBe('antarctic_dry_valley');
    expect(pickRegionPhoto(region(76.25, 'Canadian Arctic, Canada')).id).toBe('arctic_polar_desert');
    expect(pickRegionPhoto(region(33.75, 'Iranian Plateau, Iran', 0.9)).id).toBe('death_valley');
    expect(pickRegionPhoto(region(18.75, 'Sahara Desert, Niger')).id).toBe('gobi_dunes');
  });
});

describe('Reference sites', () => {
  it('hypotheses are labelled as such and carry no targets or source claims', () => {
    const hyp = REFERENCE_SITES.filter((s) => s.kind === 'hypothesis');
    expect(hyp.length).toBe(4);
    for (const h of hyp) {
      expect(h.targets).toEqual([]);
      expect(h.source).toBe('');
    }
  });

  it('documented sites come from the analog dataset and have coordinates', () => {
    const doc = REFERENCE_SITES.filter((s) => s.kind === 'documented');
    expect(doc.length).toBeGreaterThanOrEqual(10);
    for (const d of doc) {
      expect(Math.abs(d.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(d.lon)).toBeLessThanOrEqual(180);
    }
  });
});
