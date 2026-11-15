import { describe, expect, it } from 'vitest';
import type { Region } from '../types/astranovus';
import { buildRegionsCsv, regionsToMapSites, suitabilitySummary } from './mission';

// Test-only fixture (not data): shape of one engine region.
const region = {
  id: 'R1', rank: 1, lat: 10, lon: 20, best_cell: { lat: 10, lon: 20 }, n_cells: 3, best_score: 80.5, evidence_adjusted_score: 70.2, mean_score: 75,
  coverage: 0.6, confidence: 'medium', why_match: [], weak_points: [], missing_data: ['D3_barren'], notes: [],
  location_label: 'Test (10.0°N, 20.0°E)', region_name: 'Test', label_basis: 'approximate', applications: [], terrain: { state: 'not_checked' }, surface: null,
  dimensions: [
    { dimension: 'D1_cold', name: 'Cold', percentile: 0.9, rule: 'high', weight: 2, similarity: 0.9, data_status: 'derived', source: '' },
    { dimension: 'D3_barren', name: 'Barren ground', percentile: null, rule: 'high', weight: 3, similarity: null, data_status: 'missing', source: '' },
  ],
} as Region;

describe('mission utils', () => {
  it('keeps missing dimensions missing in the summary', () => {
    const s = suitabilitySummary(region);
    expect(s).toContain('Strong match on Cold');
    expect(s).toContain('Not yet assessed: Barren ground');
  });
  it('maps regions to map sites with coverage as a percentage', () => {
    const [site] = regionsToMapSites([region]);
    expect(site.overall_score).toBe(70.2);
    expect(site.data_coverage).toBeCloseTo(60);
  });
  it('exports CSV rows', () => {
    expect(buildRegionsCsv([region]).split('\n')).toHaveLength(2);
  });
});
