import { Compass, Grid, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import earthBlueMarble from '../assets/textures/earth-blue-marble.jpg';
import type { GlobeTargetRef, MapSite } from '../types/astranovus';
import {
  buildGlobeArcs,
  buildGlobePoints,
  formatCoordPair,
  type GlobeAnalogPoint,
  interpolateGreatCircle,
  normalizeLongitude,
  projectLatLngToOrthographic,
} from '../utils/globeUtils';

interface CanvasEarthGlobeFallbackProps {
  sites: MapSite[];
  selectedTarget: GlobeTargetRef | undefined;
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onOpenProfile: (siteId: string) => void;
  heightClass?: string;
}

const DEG_TO_RAD = Math.PI / 180;

export function CanvasEarthGlobeFallback({
  sites,
  selectedTarget,
  selectedSiteId,
  onSelectSite,
  onOpenProfile,
  heightClass,
}: CanvasEarthGlobeFallbackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureDataRef = useRef<{ data: Uint8ClampedArray; w: number; h: number } | null>(null);
  const sphereCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStateRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startLat: number;
    startLng: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startLat: 18,
    startLng: 12,
  });

  const [textureReady, setTextureReady] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 680, height: 440 });
  const [autoRotate, setAutoRotate] = useState(false);
  const [showGraticules, setShowGraticules] = useState(false);
  const [hoveredSite, setHoveredSite] = useState<GlobeAnalogPoint | null>(null);
  const [pov, setPov] = useState<{ lat: number; lng: number; altitude: number }>({
    lat: 18,
    lng: 12,
    altitude: 1.88,
  });

  const bodyTheme = selectedTarget?.body ?? 'Mars';

  const pointsData = useMemo(
    () => buildGlobePoints(sites, selectedSiteId, bodyTheme),
    [sites, selectedSiteId, bodyTheme]
  );

  const arcsData = useMemo(
    () =>
      selectedTarget ? buildGlobeArcs(sites, selectedTarget.id, selectedTarget.body) : [],
    [sites, selectedTarget]
  );

  // Load bundled NASA Blue Marble equirectangular texture once into an offscreen pixel buffer
  useEffect(() => {
    let mounted = true;
    const img = new Image();
    img.src = earthBlueMarble;
    img.onload = () => {
      if (!mounted) return;
      const w = 720;
      const h = 360;
      const offscreen = document.createElement('canvas');
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        textureDataRef.current = { data: imgData.data, w, h };
        setTextureReady(true);
      }
    };
    return () => {
      mounted = false;
    };
  }, []);

  // Responsive container sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 120 && rect.height > 120) {
        setDimensions({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Re-center onto active analog when target or selected site changes
  useEffect(() => {
    const focus = sites.find((s) => s.id === selectedSiteId) ?? sites[0];
    if (!focus) return;
    setPov((prev) => ({
      lat: Number(Math.max(-75, Math.min(75, focus.lat)).toFixed(2)),
      lng: normalizeLongitude(focus.lon),
      altitude: prev.altitude || 1.88,
    }));
  }, [selectedSiteId, selectedTarget?.id, sites]);

  // Optional gentle auto-rotation
  useEffect(() => {
    if (!autoRotate) return;
    const timer = window.setInterval(() => {
      setPov((prev) => ({
        ...prev,
        lng: normalizeLongitude(prev.lng + 0.8),
      }));
    }, 50);
    return () => window.clearInterval(timer);
  }, [autoRotate]);

  // Render orthographic Blue Marble sphere + overlays onto 2D canvas
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = dimensions;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // 1. Deep orbital space backdrop
    ctx.fillStyle = '#060F20';
    ctx.fillRect(0, 0, width, height);

    // Deterministic starfield
    let seed = 9187;
    const nextRand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 160; i++) {
      const sx = nextRand() * width;
      const sy = nextRand() * height;
      const sr = 0.6 + nextRand() * 1.1;
      const alpha = 0.35 + nextRand() * 0.55;
      ctx.fillStyle = `rgba(220, 235, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    const cx = width * 0.5;
    const cy = height * 0.5;
    const baseRadius = Math.min(width, height) * 0.39;
    const scaleFactor = Math.max(0.75, Math.min(1.55, 2.05 / Math.max(1.2, pov.altitude)));
    const radius = baseRadius * scaleFactor;

    // 2. Atmospheric limb glow
    const glowColor = bodyTheme === 'Mars' ? 'rgba(242, 139, 69,' : 'rgba(75, 168, 255,';
    const halo = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.24);
    halo.addColorStop(0, `${glowColor} 0.32)`);
    halo.addColorStop(0.55, `${glowColor} 0.14)`);
    halo.addColorStop(1, `${glowColor} 0)`);
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.24, 0, Math.PI * 2);
    ctx.fill();

    // 3. Orthographic Blue Marble surface render into cached square buffer
    const tex = textureDataRef.current;
    if (tex && textureReady) {
      const size = 260;
      const half = size / 2;
      if (!sphereCanvasRef.current) {
        sphereCanvasRef.current = document.createElement('canvas');
        sphereCanvasRef.current.width = size;
        sphereCanvasRef.current.height = size;
      }
      const sCanvas = sphereCanvasRef.current;
      const sCtx = sCanvas.getContext('2d');
      if (sCtx) {
        const out = sCtx.createImageData(size, size);
        const buf = out.data;
        const phi0 = pov.lat * DEG_TO_RAD;
        const lam0 = pov.lng * DEG_TO_RAD;
        const sinPhi0 = Math.sin(phi0);
        const cosPhi0 = Math.cos(phi0);
        const invR = 1 / (half - 1);

        // Balanced sunlit illumination vector so continents stay bright with gentle 3D limb depth
        const lx = 0.42;
        const ly = -0.28;
        const lz = 0.86;

        for (let py = 0; py < size; py++) {
          const ny = (half - py) * invR;
          const ny2 = ny * ny;
          for (let px = 0; px < size; px++) {
            const nx = (px - half) * invR;
            const rho2 = nx * nx + ny2;
            const idx = (py * size + px) * 4;
            if (rho2 > 1) {
              buf[idx + 3] = 0;
              continue;
            }

            const nz = Math.sqrt(1 - rho2);
            const sinPhi = Math.max(-1, Math.min(1, nz * sinPhi0 + ny * cosPhi0));
            const phi = Math.asin(sinPhi);
            const lam = lam0 + Math.atan2(nx, nz * cosPhi0 - ny * sinPhi0);

            const latDeg = phi / DEG_TO_RAD;
            let lngDeg = (lam / DEG_TO_RAD) % 360;
            if (lngDeg > 180) lngDeg -= 360;
            if (lngDeg < -180) lngDeg += 360;

            const u = Math.max(0, Math.min(tex.w - 1, Math.floor(((lngDeg + 180) / 360) * tex.w)));
            const v = Math.max(0, Math.min(tex.h - 1, Math.floor(((90 - latDeg) / 180) * tex.h)));
            const tIdx = (v * tex.w + u) * 4;

            const dot = nx * lx + -ny * ly + nz * lz;
            const shade = 0.62 + 0.5 * Math.max(0, dot);
            const rim = Math.pow(1 - nz, 2.2) * 34;

            buf[idx] = Math.min(255, tex.data[tIdx] * shade + rim * 0.35);
            buf[idx + 1] = Math.min(255, tex.data[tIdx + 1] * shade + rim * 0.65);
            buf[idx + 2] = Math.min(255, tex.data[tIdx + 2] * shade + rim);
            buf[idx + 3] = 255;
          }
        }
        sCtx.putImageData(out, 0, 0);
        ctx.drawImage(sCanvas, cx - radius, cy - radius, radius * 2, radius * 2);
      }
    } else {
      const oceanGrad = ctx.createRadialGradient(
        cx - radius * 0.3,
        cy - radius * 0.3,
        radius * 0.1,
        cx,
        cy,
        radius
      );
      oceanGrad.addColorStop(0, '#1D5CA8');
      oceanGrad.addColorStop(1, '#09234A');
      ctx.fillStyle = oceanGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Clip overlays cleanly to globe sphere
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    // 4. Optional lat/lng graticule grid
    if (showGraticules) {
      ctx.strokeStyle = 'rgba(130, 198, 255, 0.24)';
      ctx.lineWidth = 0.85;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lng = -180; lng <= 180; lng += 6) {
          const p = projectLatLngToOrthographic(lat, lng, pov.lat, pov.lng, radius, cx, cy);
          if (p.z >= 0) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }
      for (let lng = -180; lng < 180; lng += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -90; lat <= 90; lat += 5) {
          const p = projectLatLngToOrthographic(lat, lng, pov.lat, pov.lng, radius, cx, cy);
          if (p.z >= 0) {
            if (!started) {
              ctx.moveTo(p.x, p.y);
              started = true;
            } else {
              ctx.lineTo(p.x, p.y);
            }
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }
    }

    // 5. Great-circle orbital arcs between #1 analog and peers
    arcsData.forEach((arc) => {
      const samples = interpolateGreatCircle(arc.startLat, arc.startLng, arc.endLat, arc.endLng, 28);
      ctx.beginPath();
      let started = false;
      samples.forEach((sample) => {
        const p = projectLatLngToOrthographic(
          sample.lat,
          sample.lng,
          pov.lat,
          pov.lng,
          radius,
          cx,
          cy
        );
        if (p.z >= 0) {
          if (!started) {
            ctx.moveTo(p.x, p.y);
            started = true;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        } else {
          started = false;
        }
      });
      ctx.strokeStyle = arc.color[0];
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.78;
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    ctx.restore();

    // 6. Analog coordinate markers & focus ring
    const sortedPoints = [...pointsData]
      .map((pt) => ({
        pt,
        proj: projectLatLngToOrthographic(pt.lat, pt.lng, pov.lat, pov.lng, radius, cx, cy),
      }))
      .filter((item) => item.proj.visible)
      .sort((a, b) => a.proj.z - b.proj.z);

    sortedPoints.forEach(({ pt, proj }) => {
      const pinR = pt.isSelected ? 6.5 : pt.isTopThree ? 5 : 3.5;

      if (pt.isSelected || pt.rank === 1) {
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, pinR + 6, 0, Math.PI * 2);
        ctx.strokeStyle = bodyTheme === 'Mars' ? 'rgba(242, 139, 69, 0.75)' : 'rgba(84, 185, 245, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(proj.x, proj.y, pinR, 0, Math.PI * 2);
      ctx.fillStyle = pt.color;
      ctx.fill();
      ctx.strokeStyle = '#060F20';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    });

    // Subtle crisp atmospheric rim highlight
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = bodyTheme === 'Mars' ? 'rgba(242, 139, 69, 0.45)' : 'rgba(84, 185, 245, 0.45)';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.restore();
  }, [arcsData, bodyTheme, dimensions, pointsData, pov, showGraticules, textureReady]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  const findNearestPointAt = useCallback(
    (clientX: number, clientY: number): GlobeAnalogPoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cx = rect.width * 0.5;
      const cy = rect.height * 0.5;
      const baseRadius = Math.min(rect.width, rect.height) * 0.39;
      const scaleFactor = Math.max(0.75, Math.min(1.55, 2.05 / Math.max(1.2, pov.altitude)));
      const radius = baseRadius * scaleFactor;

      let closest: GlobeAnalogPoint | null = null;
      let minDist = 18;
      for (const pt of pointsData) {
        const proj = projectLatLngToOrthographic(pt.lat, pt.lng, pov.lat, pov.lng, radius, cx, cy);
        if (!proj.visible) continue;
        const d = Math.hypot(proj.x - x, proj.y - y);
        if (d < minDist) {
          minDist = d;
          closest = pt;
        }
      }
      return closest;
    },
    [pointsData, pov]
  );

  const handleResetView = () => {
    const topSite = sites[0];
    setPov({
      lat: Number((topSite?.lat ?? 18).toFixed(2)),
      lng: normalizeLongitude(topSite?.lon ?? 12),
      altitude: 1.88,
    });
  };

  const activeSite = useMemo(() => {
    if (hoveredSite) return hoveredSite;
    return pointsData.find((p) => p.id === selectedSiteId) ?? pointsData[0] ?? null;
  }, [hoveredSite, pointsData, selectedSiteId]);

  return (
    <div
      ref={containerRef}
      data-testid="earth-analog-globe"
      data-render-mode="canvas-orthographic"
      data-lat={pov.lat}
      data-lng={pov.lng}
      data-target={selectedTarget?.id ?? ''}
      className={`relative w-full ${heightClass ?? 'h-[440px] lg:h-[490px]'} rounded-xl overflow-hidden bg-[#060F20] border border-[#1E3B68] select-none`}
      aria-label="Interactive Blue Marble Earth analog globe visualization"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          dragStateRef.current = {
            active: true,
            moved: false,
            startX: e.clientX,
            startY: e.clientY,
            startLat: pov.lat,
            startLng: pov.lng,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragStateRef.current.active) {
            const dx = e.clientX - dragStateRef.current.startX;
            const dy = e.clientY - dragStateRef.current.startY;
            if (Math.hypot(dx, dy) > 4) dragStateRef.current.moved = true;
            setPov((prev) => ({
              ...prev,
              lat: Number(
                Math.max(-78, Math.min(78, dragStateRef.current.startLat + dy * 0.35)).toFixed(2)
              ),
              lng: normalizeLongitude(dragStateRef.current.startLng - dx * 0.45),
            }));
          } else {
            setHoveredSite(findNearestPointAt(e.clientX, e.clientY));
          }
        }}
        onPointerUp={(e) => {
          const wasClick = dragStateRef.current.active && !dragStateRef.current.moved;
          dragStateRef.current.active = false;
          if (wasClick) {
            const hit = findNearestPointAt(e.clientX, e.clientY);
            if (hit) {
              onSelectSite(hit.id);
              setPov((prev) => ({
                ...prev,
                lat: Number(Math.max(-78, Math.min(78, hit.lat)).toFixed(2)),
                lng: normalizeLongitude(hit.lng),
              }));
            }
          }
        }}
        onPointerLeave={() => {
          dragStateRef.current.active = false;
          setHoveredSite(null);
        }}
      />

      {/* Top-Left Live Coordinates Telemetry HUD */}
      <div className="absolute top-3 left-3 z-10 bg-[#0B1B36]/90 border border-[#54B9F5]/35 rounded-lg px-3 py-2 text-[#FFFFFF] pointer-events-none space-y-0.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#54B9F5]">
          <Compass className="w-3 h-3" />
          <span>EARTH ORBITAL POV · {selectedTarget?.id ?? 'TARGET'}</span>
        </div>
        <div className="font-mono text-xs font-semibold tabular-nums">
          {formatCoordPair(pov.lat, pov.lng)} · ALT {pov.altitude.toFixed(2)} R⊕
        </div>
      </div>

      {/* Top-Right Compact Orbit & Grid Controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowGraticules((prev) => !prev)}
          aria-pressed={showGraticules}
          aria-label="Toggle coordinate graticule grid"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            showGraticules
              ? 'bg-[#0B5ED7] border-[#54B9F5]/50 text-[#FFFFFF]'
              : 'bg-[#0B1B36]/90 border-[#54B9F5]/35 text-[#FFFFFF] hover:border-[#54B9F5]'
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Grid</span>
        </button>

        <button
          type="button"
          onClick={() => setAutoRotate((prev) => !prev)}
          aria-pressed={autoRotate}
          aria-label={autoRotate ? 'Pause globe rotation' : 'Auto-rotate globe'}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
            autoRotate
              ? 'bg-[#0B5ED7] border-[#54B9F5]/50 text-[#FFFFFF]'
              : 'bg-[#0B1B36]/90 border-[#54B9F5]/35 text-[#FFFFFF] hover:border-[#54B9F5]'
          }`}
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{autoRotate ? 'Rotating' : 'Rotate'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetView}
          aria-label="Reset 3D globe camera"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#0B1B36]/90 border border-[#54B9F5]/35 text-[#FFFFFF] hover:border-[#54B9F5] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Left Active Analog Site Readout Card */}
      {activeSite && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm z-10 bg-[#0B1B36]/92 border border-[#54B9F5]/35 rounded-xl p-3 text-[#FFFFFF] flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-mono text-[#54B9F5] tabular-nums">
              Rank #{activeSite.rank} · {formatCoordPair(activeSite.lat, activeSite.lng)}
            </div>
            <div className="font-display font-bold text-xs sm:text-sm truncate">
              {activeSite.name}
            </div>
            <div className="text-[11px] text-[#C7D2E0]">
              {activeSite.country} ·{' '}
              <span className="font-mono font-semibold text-[#FFFFFF] tabular-nums">
                {activeSite.score.toFixed(1)}% match
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenProfile(activeSite.id)}
            className="px-2.5 py-1.5 rounded-lg bg-[#0B5ED7] hover:bg-[#094DB3] text-[#FFFFFF] text-[11px] font-semibold shrink-0 transition-colors"
          >
            Profile →
          </button>
        </div>
      )}
    </div>
  );
}
