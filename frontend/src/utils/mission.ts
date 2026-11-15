import type {
  Body,
  BodyLabel,
  DataState,
  DataStatusKind,
  DocLevel,
  MapSite,
  Region,
  RegionDimension,
} from '../types/astranovus';

/** Score used for ranking: evidence-adjusted (missing dimensions count as chance-level) when the API provides it. */
export const rankScore = (r: Region): number => r.evidence_adjusted_score ?? r.best_score;

export const bodyLabel = (b: Body): BodyLabel => (b === 'mars' ? 'Mars' : 'Moon');

export const BODY_ACCENT: Record<Body, string> = { moon: '#0B5ED7', mars: '#F28B45' };

/** Short dimension names for compact chips (full names come from /data_status). */
export const SHORT_DIM: Record<string, string> = {
  D1_cold: 'Cold',
  D2_aridity: 'Dryness',
  D3_barren: 'Barren ground',
  D4_terrain: 'Terrain',
  D5_rock: 'Rock composition (proxy)',
  D6_ice: 'Ice (proxy)',
  D7_polar_light: 'Light extremes',
  D8_thermal_swing: 'Day-night swing',
};

export const dimLabel = (id: string): string => SHORT_DIM[id] ?? id;

export const STATUS_LABEL: Record<DataStatusKind, string> = {
  derived: 'Derived estimate',
  proxy: 'Proxy',
  missing: 'No data yet',
};

export const STATUS_STYLE: Record<DataStatusKind, string> = {
  derived: 'bg-[#EAF7EE] text-[#177A3C] border-[#177A3C]/25',
  proxy: 'bg-[#FFF4E5] text-[#A15C00] border-[#A15C00]/30',
  missing: 'bg-[#FDECEC] text-[#B42318] border-[#B42318]/25',
};

export const DATA_STATE_LABEL: Record<DataState, string> = {
  ready: 'All criteria have data',
  partial: 'Partial data',
  unavailable: 'Data unavailable',
};

export const DATA_STATE_STYLE: Record<DataState, string> = {
  ready: 'bg-[#EAF7EE] text-[#177A3C] border-[#177A3C]/25',
  partial: 'bg-[#FFF4E5] text-[#A15C00] border-[#A15C00]/30',
  unavailable: 'bg-[#FDECEC] text-[#B42318] border-[#B42318]/25',
};

export const DOC_LEVEL_LABEL: Record<DocLevel, string> = {
  direct: 'NASA-documented activity',
  related: 'Related NASA activity',
  indirect: 'ASTRANOVUS proposal (general NASA context)',
};

export const DOC_LEVEL_STYLE: Record<DocLevel, string> = {
  direct: 'bg-[#E8F0FE] text-[#0B5ED7] border-[#0B5ED7]/25',
  related: 'bg-[#EDF3FA] text-[#142B50] border-[#142B50]/20',
  indirect: 'bg-[#F4F4F6] text-[#68788F] border-[#68788F]/25',
};

export const pct = (x: number | null | undefined, digits = 0): string =>
  x === null || x === undefined ? 'n/a' : `${(x * 100).toFixed(digits)}%`;

export const formatCoords = (lat: number, lon: number): string =>
  `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;

/** Convert engine regions to the lean shape the globe / Leaflet components consume. */
export function regionsToMapSites(regions: Region[]): MapSite[] {
  return regions.map((r) => ({
    id: r.id,
    name: r.location_label.split(' (')[0],
    country: formatCoords(r.lat, r.lon),
    region: r.location_label,
    lat: r.lat,
    lon: r.lon,
    role: 'recommended region',
    classification: r.label_basis,
    overall_score: rankScore(r),
    data_coverage: r.coverage * 100,
  }));
}

export function dimsWithData(dims: RegionDimension[]): RegionDimension[] {
  return dims.filter((d) => d.similarity !== null);
}

/** Plain-language suitability sentence built only from numbers the backend returned. */
export function suitabilitySummary(r: Region): string {
  const have = dimsWithData(r.dimensions);
  const strong = have.filter((d) => (d.similarity ?? 0) >= 0.7).map((d) => d.name);
  const weak = have.filter((d) => (d.similarity ?? 0) < 0.5).map((d) => d.name);
  const missing = r.dimensions.filter((d) => d.similarity === null).map((d) => d.name);
  const parts: string[] = [];
  parts.push(strong.length ? `Strong match on ${strong.join(', ')}.` : 'No dimension reaches a strong (70%+) match.');
  if (weak.length) parts.push(`Weak on ${weak.join(', ')}.`);
  if (missing.length) parts.push(`Not yet assessed: ${missing.join(', ')}.`);
  return parts.join(' ');
}

export function buildRegionsCsv(regions: Region[]): string {
  const esc = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const head = ['Rank', 'Location', 'Lat', 'Lon', 'Evidence-adjusted score (0-100)', 'Raw similarity (0-100)', 'Coverage', 'Confidence', 'Cells', 'Missing dimensions'];
  const rows = regions.map((r) =>
    [r.rank, r.location_label, r.lat, r.lon, rankScore(r), r.best_score, r.coverage, r.confidence, r.n_cells, r.missing_data.join('; ')]
      .map(esc)
      .join(',')
  );
  return [head.join(','), ...rows].join('\n');
}
