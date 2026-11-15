export type BasemapStyleId = 'street' | 'satellite' | 'terrain';

export interface BasemapLayerConfig {
  id: BasemapStyleId;
  label: string;
  tileUrl: string;
  overlayUrl?: string;
  subdomains?: string[];
  maxZoom: number;
  attribution: string;
  backgroundColor: string;
}

export const BASEMAP_CONFIGS: Record<BasemapStyleId, BasemapLayerConfig> = {
  street: {
    id: 'street',
    label: 'Map',
    tileUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution: 'Tiles &copy; Esri, DeLorme, NAVTEQ, TomTom, USGS',
    backgroundColor: '#A9CBE8',
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    tileUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlayUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics',
    backgroundColor: '#0C2340',
  },
  terrain: {
    id: 'terrain',
    label: 'Terrain',
    tileUrl:
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution: 'Map data &copy; Esri, USGS, NOAA',
    backgroundColor: '#DCE8EF',
  },
};

export const BASEMAP_OPTIONS: BasemapLayerConfig[] = [
  BASEMAP_CONFIGS.street,
  BASEMAP_CONFIGS.satellite,
  BASEMAP_CONFIGS.terrain,
];

export function getMarkerStyle(
  score: number,
  isSelected: boolean,
  bodyTheme: 'Moon' | 'Mars'
): {
  radius: number;
  color: string;
  weight: number;
  fillColor: string;
  fillOpacity: number;
} {
  const highMatch = score >= 80;
  const fillColor = isSelected
    ? '#0B5ED7'
    : highMatch
    ? '#0EA5E9'
    : bodyTheme === 'Mars'
    ? '#F28B45'
    : '#475569';

  return {
    radius: isSelected ? 10 : 7.5,
    color: isSelected ? '#142B50' : '#FFFFFF',
    weight: isSelected ? 3 : 2,
    fillColor,
    fillOpacity: 0.96,
  };
}

export function formatCursorTelemetry(coords: { lat: number; lon: number } | null): string {
  if (!coords) return 'HOVER MAP FOR LAT / LON';
  return `LAT ${coords.lat.toFixed(2)}° · LON ${coords.lon.toFixed(2)}°`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
