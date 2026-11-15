import type { GlobeTargetRef, MapSite, TargetId } from '../types/astranovus';

export interface GlobeAnalogPoint {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lng: number;
  score: number;
  coverage: number;
  role: string;
  classification: string;
  isTopThree: boolean;
  isSelected: boolean;
  rank: number;
  color: string;
  altitude: number;
  radius: number;
  targetId: TargetId;
  body: 'Moon' | 'Mars';
}

export interface GlobeArcLink {
  id: string;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  label: string;
  color: [string, string];
}

export interface GlobeRingPulse {
  lat: number;
  lng: number;
  maxRadius: number;
  propagationSpeed: number;
  repeatPeriod: number;
}

export interface GlobeTargetLabel {
  id: string;
  lat: number;
  lng: number;
  text: string;
  color: string;
  size: number;
}

export function buildGlobePoints(
  sites: MapSite[],
  selectedSiteId: string | null,
  body: 'Moon' | 'Mars',
  targetId: TargetId = ''
): GlobeAnalogPoint[] {
  return sites.map((site, index) => {
    const isTopThree = index < 3;
    const isSelected = site.id === selectedSiteId;
    const highMatch = site.overall_score >= 78;

    const color = isSelected
      ? '#FFFFFF'
      : highMatch
      ? body === 'Mars'
        ? '#F28B45'
        : '#54B9F5'
      : body === 'Mars'
      ? '#FCA96D'
      : '#0B5ED7';

    const altitude = isSelected
      ? 0.11
      : Number((0.025 + (site.overall_score / 100) * 0.06).toFixed(3));

    const radius = isSelected ? 0.85 : isTopThree ? 0.68 : 0.45;

    return {
      id: site.id,
      name: site.name,
      country: site.country,
      region: site.region,
      lat: site.lat,
      lng: site.lon,
      score: site.overall_score,
      coverage: site.data_coverage,
      role: site.role,
      classification: site.classification,
      isTopThree,
      isSelected,
      rank: index + 1,
      color,
      altitude,
      radius,
      targetId,
      body,
    };
  });
}

export function buildGlobeArcs(
  sites: MapSite[],
  targetId: TargetId,
  body: 'Moon' | 'Mars'
): GlobeArcLink[] {
  if (sites.length < 2) return [];
  const anchor = sites[0];
  const primaryHex = body === 'Mars' ? '#F28B45' : '#54B9F5';
  const secondaryHex = '#0B5ED7';

  return sites.slice(1, 5).map((peer) => ({
    id: `${targetId}:${anchor.id}->${peer.id}`,
    startLat: anchor.lat,
    startLng: anchor.lon,
    endLat: peer.lat,
    endLng: peer.lon,
    label: `${anchor.name} ↔ ${peer.name} (${peer.overall_score.toFixed(1)}%)`,
    color: [primaryHex, secondaryHex],
  }));
}

export function buildGlobeRings(
  sites: MapSite[],
  selectedSiteId: string | null
): GlobeRingPulse[] {
  const focus = sites.find((s) => s.id === selectedSiteId) ?? sites[0];
  if (!focus) return [];

  const rings: GlobeRingPulse[] = [
    {
      lat: focus.lat,
      lng: focus.lon,
      maxRadius: 6.8,
      propagationSpeed: 2.2,
      repeatPeriod: 1400,
    },
  ];

  if (sites[0] && sites[0].id !== focus.id) {
    rings.push({
      lat: sites[0].lat,
      lng: sites[0].lon,
      maxRadius: 4.8,
      propagationSpeed: 1.8,
      repeatPeriod: 1800,
    });
  }

  return rings;
}

function compactSiteName(name: string): string {
  const base = name.split(' (')[0].trim();
  if (base.length <= 20) return base;
  return `${base.slice(0, 18).trim()}…`;
}

export function buildGlobeLabels(
  sites: MapSite[],
  selectedTarget: GlobeTargetRef | undefined,
  selectedSiteId: string | null
): GlobeTargetLabel[] {
  const body = selectedTarget?.body ?? 'Mars';
  const accent = body === 'Mars' ? '#FFD7B5' : '#C2E5FF';
  const focusedId = selectedSiteId ?? sites[0]?.id ?? null;

  return sites
    .slice(0, 5)
    .map((site, idx) => ({ site, rank: idx + 1 }))
    .filter(({ site }) => site.id !== focusedId)
    .slice(0, 4)
    .map(({ site, rank }) => ({
      id: site.id,
      lat: site.lat,
      lng: site.lon,
      text: `#${rank} ${compactSiteName(site.name)} · ${site.overall_score.toFixed(0)}%`,
      color: accent,
      size: 0.95,
    }));
}

export function formatCoordPair(lat: number, lng: number): string {
  const latHem = lat >= 0 ? 'N' : 'S';
  const lngHem = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}° ${latHem}, ${Math.abs(lng).toFixed(2)}° ${lngHem}`;
}

export function normalizeLongitude(lng: number): number {
  let normalized = ((lng + 180) % 360 + 360) % 360 - 180;
  if (Object.is(normalized, -0)) normalized = 0;
  return Number(normalized.toFixed(2));
}

export interface OrthographicProjection {
  x: number;
  y: number;
  z: number;
  visible: boolean;
}

const DEG_TO_RAD = Math.PI / 180;

export function projectLatLngToOrthographic(
  lat: number,
  lng: number,
  centerLat: number,
  centerLng: number,
  radius: number,
  cx: number,
  cy: number
): OrthographicProjection {
  const phi = lat * DEG_TO_RAD;
  const lambda = lng * DEG_TO_RAD;
  const phi0 = centerLat * DEG_TO_RAD;
  const lambda0 = centerLng * DEG_TO_RAD;
  const dLambda = lambda - lambda0;

  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);
  const cosPhi0 = Math.cos(phi0);
  const sinPhi0 = Math.sin(phi0);
  const cosDLambda = Math.cos(dLambda);

  const z = sinPhi0 * sinPhi + cosPhi0 * cosPhi * cosDLambda;
  const x = cx + radius * cosPhi * Math.sin(dLambda);
  const y = cy - radius * (cosPhi0 * sinPhi - sinPhi0 * cosPhi * cosDLambda);

  return {
    x,
    y,
    z,
    visible: z >= -0.02,
  };
}

export function interpolateGreatCircle(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
  steps: number
): Array<{ lat: number; lng: number }> {
  const phi1 = startLat * DEG_TO_RAD;
  const lam1 = startLng * DEG_TO_RAD;
  const phi2 = endLat * DEG_TO_RAD;
  const lam2 = endLng * DEG_TO_RAD;

  const x1 = Math.cos(phi1) * Math.cos(lam1);
  const y1 = Math.cos(phi1) * Math.sin(lam1);
  const z1 = Math.sin(phi1);

  const x2 = Math.cos(phi2) * Math.cos(lam2);
  const y2 = Math.cos(phi2) * Math.sin(lam2);
  const z2 = Math.sin(phi2);

  const dot = Math.max(-1, Math.min(1, x1 * x2 + y1 * y2 + z1 * z2));
  const omega = Math.acos(dot);
  const points: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    let x: number;
    let y: number;
    let z: number;

    if (omega < 1e-4) {
      x = x1 + (x2 - x1) * t;
      y = y1 + (y2 - y1) * t;
      z = z1 + (z2 - z1) * t;
    } else {
      const sinOmega = Math.sin(omega);
      const a = Math.sin((1 - t) * omega) / sinOmega;
      const b = Math.sin(t * omega) / sinOmega;
      x = a * x1 + b * x2;
      y = a * y1 + b * y2;
      z = a * z1 + b * z2;
    }

    const len = Math.hypot(x, y, z) || 1;
    const lat = Math.asin(z / len) / DEG_TO_RAD;
    const lng = Math.atan2(y / len, x / len) / DEG_TO_RAD;
    points.push({ lat, lng });
  }

  return points;
}

