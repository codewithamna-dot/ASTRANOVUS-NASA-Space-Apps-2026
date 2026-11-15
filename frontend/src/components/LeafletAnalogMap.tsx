import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Globe, Layers, Minus, Plus, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReferenceSite } from '../data/referenceSites';
import type { HeatmapPoint } from '../types/astranovus';
import {
  BASEMAP_CONFIGS,
  BASEMAP_OPTIONS,
  type BasemapStyleId,
  escapeHtml,
  formatCursorTelemetry,
} from '../utils/leafletMapUtils';

export interface MapMarkerItem {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  score: number;
  coverage: number;
  role: string;
  published?: boolean;
  rank?: number;
  /** Real values from the API, shown in the popup. */
  status?: string;
  explanation?: string;
}

interface LeafletAnalogMapProps {
  markers: MapMarkerItem[];
  selectedId: string | null;
  onSelectMarker: (id: string) => void;
  onOpenProfile?: (id: string) => void;
  heatmapPoints?: HeatmapPoint[];
  heatmapOpacity?: number;
  /** Literature-documented analog sites and research hypotheses, drawn as a separate, clearly labelled layer (not model output). */
  referenceSites?: ReferenceSite[];
  /** If set, the selected marker is drawn with its true grid-cell footprint (degrees) to show spatial uncertainty. */
  cellSizeDeg?: number;
  bodyTheme: 'Moon' | 'Mars';
  heightClass?: string;
}

export function LeafletAnalogMap({
  markers,
  selectedId,
  onSelectMarker,
  onOpenProfile,
  heatmapPoints = [],
  heatmapOpacity = 0.65,
  referenceSites = [],
  cellSizeDeg,
  bodyTheme,
  heightClass = 'h-[480px]',
}: LeafletAnalogMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const basemapLayerRef = useRef<L.LayerGroup | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const solarZonesLayerRef = useRef<L.LayerGroup | null>(null);
  const footprintLayerRef = useRef<L.LayerGroup | null>(null);
  const refLayerRef = useRef<L.LayerGroup | null>(null);
  const prevSelectedRef = useRef<string | null>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());

  const [cursorCoords, setCursorCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [showSolarZones, setShowSolarZones] = useState<boolean>(false);
  const [basemapStyle, setBasemapStyle] = useState<BasemapStyleId>('street');
  const [showRef, setShowRef] = useState<boolean>(true);
  const [legendOpen, setLegendOpen] = useState<boolean>(false);

  const onSelectRef = useRef(onSelectMarker);
  const onOpenProfileRef = useRef(onOpenProfile);
  onSelectRef.current = onSelectMarker;
  onOpenProfileRef.current = onOpenProfile;

  // Initialize real Leaflet tile map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [16, 8],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);
    L.control.scale({ position: 'bottomright', imperial: false, maxWidth: 110 }).addTo(map);

    basemapLayerRef.current = L.layerGroup().addTo(map);
    solarZonesLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);
    footprintLayerRef.current = L.layerGroup().addTo(map);
    refLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    map.on('mousemove', (ev: L.LeafletMouseEvent) => {
      const wrapped = ev.latlng.wrap();
      setCursorCoords({
        lat: Number(wrapped.lat.toFixed(2)),
        lon: Number(wrapped.lng.toFixed(2)),
      });
    });

    map.on('mouseout', () => {
      setCursorCoords(null);
    });

    const rafId = requestAnimationFrame(() => {
      map.invalidateSize({ animate: false });
    });
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Swap real Leaflet tile layers when basemap style changes
  useEffect(() => {
    const basemapLayer = basemapLayerRef.current;
    if (!basemapLayer) return;
    basemapLayer.clearLayers();

    const cfg = BASEMAP_CONFIGS[basemapStyle];
    const tileOptions: L.TileLayerOptions = {
      maxZoom: cfg.maxZoom,
      attribution: cfg.attribution,
      detectRetina: false,
    };
    if (cfg.subdomains) {
      tileOptions.subdomains = cfg.subdomains;
    }

    L.tileLayer(cfg.tileUrl, tileOptions).addTo(basemapLayer);

    if (cfg.overlayUrl) {
      L.tileLayer(cfg.overlayUrl, {
        maxZoom: cfg.maxZoom,
        opacity: 0.9,
      }).addTo(basemapLayer);
    }
  }, [basemapStyle]);

  // Render optional Solar / Latitude Zone bands (Polar |lat| >= 66.5 and Mid-Latitude 30-60 ice zones)
  useEffect(() => {
    const zoneLayer = solarZonesLayerRef.current;
    if (!zoneLayer) return;
    zoneLayer.clearLayers();

    if (!showSolarZones) return;

    const bands: Array<{ bounds: L.LatLngBoundsExpression; color: string; label: string }> = [
      {
        bounds: [
          [66.5, -180],
          [85, 180],
        ],
        color: '#0EA5E9',
        label: 'Arctic Polar Illumination Zone (|lat| >= 66.5 deg)',
      },
      {
        bounds: [
          [-85, -180],
          [-66.5, 180],
        ],
        color: '#0EA5E9',
        label: 'Antarctic Polar Illumination Zone (|lat| >= 66.5 deg)',
      },
      {
        bounds: [
          [30, -180],
          [60, 180],
        ],
        color: '#F28B45',
        label: 'Northern Mid-Latitude Ice / Arid Belt (30-60 N)',
      },
      {
        bounds: [
          [-60, -180],
          [-30, 180],
        ],
        color: '#F28B45',
        label: 'Southern Mid-Latitude Ice / Arid Belt (30-60 S)',
      },
    ];

    for (const band of bands) {
      L.rectangle(band.bounds, {
        color: band.color,
        weight: 1.2,
        dashArray: '4 4',
        fillColor: band.color,
        fillOpacity: 0.14,
        interactive: false,
      }).addTo(zoneLayer);
    }
  }, [showSolarZones]);

  // Render heatmap intensity layer when points or opacity change
  useEffect(() => {
    const heatLayer = heatmapLayerRef.current;
    if (!heatLayer) return;
    heatLayer.clearLayers();

    if (heatmapPoints.length === 0) return;

    for (const pt of heatmapPoints) {
      const color =
        bodyTheme === 'Mars'
          ? pt.intensity > 0.72
            ? '#F28B45'
            : pt.intensity > 0.55
            ? '#0EA5E9'
            : '#0B5ED7'
          : pt.intensity > 0.72
          ? '#0B5ED7'
          : pt.intensity > 0.55
          ? '#0EA5E9'
          : '#60A5FA';

      L.circle([pt.lat, pt.lon], {
        radius: 260_000 * (0.65 + pt.intensity * 0.6),
        stroke: false,
        fillColor: color,
        fillOpacity: Math.max(0.08, Math.min(0.88, pt.intensity * heatmapOpacity * 0.62)),
        interactive: false,
      }).addTo(heatLayer);
    }
  }, [heatmapPoints, heatmapOpacity, bodyTheme]);

  // Ranked, numbered markers for the model-recommended grid regions; the map flies to a newly selected region.
  useEffect(() => {
    const layer = markersLayerRef.current;
    if (!layer) return;
    const reopenId = selectedId && prevSelectedRef.current === selectedId && markerByIdRef.current.get(selectedId)?.isPopupOpen() ? selectedId : null;
    layer.clearLayers();
    markerByIdRef.current = new Map();
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    for (const m of markers) {
      const isSelected = m.id === selectedId;
      const fill = m.role === 'hypothesis' ? '#A15C00' : m.role === 'analog' ? '#142B50' : m.score >= 80 ? '#0EA5E9' : bodyTheme === 'Mars' ? '#F28B45' : '#475569';
      const glyph = m.rank ?? (m.role === 'analog' ? 'A' : m.role === 'hypothesis' ? 'H' : '');
      const size = isSelected ? 36 : 28;
      const icon = L.divIcon({
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
        html: `<div class="${isSelected ? 'an-pulse' : ''}" style="width:${size}px;height:${size}px;border-radius:50%;background:${fill};border:${isSelected ? 3 : 2}px solid ${isSelected ? '#142B50' : '#FFFFFF'};box-shadow:0 2px 8px rgba(20,43,80,.45);color:#FFFFFF;font:700 ${isSelected ? 13 : 11}px Montserrat,sans-serif;display:flex;align-items:center;justify-content:center;">${glyph}</div>`,
      });
      const marker = L.marker([m.lat, m.lon], { icon, title: m.name, keyboard: true, zIndexOffset: isSelected ? 1000 : 0 });

      marker.bindTooltip(`${m.rank ? `#${m.rank} ` : ''}${m.name} · score ${m.score.toFixed(1)}`, { direction: 'top', offset: [0, -size / 2] });

      const fmtC = `${Math.abs(m.lat).toFixed(2)}°${m.lat >= 0 ? 'N' : 'S'}, ${Math.abs(m.lon).toFixed(2)}°${m.lon >= 0 ? 'E' : 'W'}`;
      const stat = m.status ?? '';
      const statCol = /Supported/.test(stat) ? ['#EAF7EE', '#177A3C'] : /Insufficient/.test(stat) ? ['#FDECEC', '#B42318'] : /Geolog/.test(stat) ? ['#FFF4E5', '#A15C00'] : ['#EAF2FF', '#0B5ED7'];
      const popupEl = document.createElement('div');
      popupEl.style.cssText = 'font-family:Inter,system-ui,sans-serif;width:100%;';
      popupEl.innerHTML = `
        <div style="background:linear-gradient(135deg,${fill},#142B50);color:#fff;padding:10px 14px;border-radius:12px 12px 0 0;">
          <div style="font-size:10px;opacity:.85;">${m.rank ? `Rank #${m.rank} · ` : ''}${escapeHtml(m.country)}</div>
          <div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:14px;line-height:1.25;margin-top:1px;">${escapeHtml(m.name)}</div>
        </div>
        <div style="padding:10px 14px 12px;">
          <div style="font-family:JetBrains Mono,monospace;font-size:11px;color:#68788F;margin-bottom:8px;">${fmtC}</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">
            <div style="background:#EDF3FA;border-radius:8px;padding:6px 8px;"><div style="font-size:10px;color:#68788F;">Similarity score</div><div style="font-family:JetBrains Mono,monospace;font-weight:700;font-size:16px;color:#0B5ED7;">${m.score.toFixed(1)}</div></div>
            <div style="background:#EDF3FA;border-radius:8px;padding:6px 8px;"><div style="font-size:10px;color:#68788F;">Data coverage</div><div style="font-family:JetBrains Mono,monospace;font-weight:700;font-size:16px;color:#142B50;">${Math.round(m.coverage)}%</div></div>
          </div>
          ${stat ? `<div style="display:inline-block;font-size:10px;font-weight:700;padding:3px 8px;border-radius:999px;background:${statCol[0]};color:${statCol[1]};margin-bottom:6px;">${escapeHtml(stat)}</div>` : ''}
          ${m.explanation ? `<div style="font-size:11px;color:#142B50;line-height:1.4;margin-bottom:6px;">${escapeHtml(m.explanation)}</div>` : ''}
          <div style="font-size:10px;color:#68788F;line-height:1.35;margin-bottom:8px;">Centre of an approximate 2.5° (~280 km) cell: an area to investigate, not a certified site.</div>
        </div>
      `;
      if (m.published !== false && onOpenProfileRef.current) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = 'View Full Profile →';
        btn.style.cssText = 'display:block;width:calc(100% - 28px);margin:0 14px 14px;padding:8px 10px;background:#0B5ED7;color:#FFFFFF;border:none;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;';
        btn.onclick = () => onOpenProfileRef.current?.(m.id);
        popupEl.appendChild(btn);
      }
      const maxW = Math.min(300, Math.max(220, window.innerWidth - 56));
      marker.bindPopup(popupEl, { maxWidth: maxW, minWidth: Math.min(250, maxW), autoPan: true, keepInView: true, autoPanPaddingTopLeft: [16, 64], autoPanPaddingBottomRight: [16, 16], className: 'an-popup' });
      marker.on('click', () => onSelectRef.current(m.id));
      marker.addTo(layer);
      markerByIdRef.current.set(m.id, marker);
    }

    if (selectedId && prevSelectedRef.current !== null && prevSelectedRef.current !== selectedId && mapRef.current) {
      const t = markers.find((m) => m.id === selectedId);
      if (t) {
        const zoom = Math.max(mapRef.current.getZoom(), 4);
        const mk = markerByIdRef.current.get(t.id);
        // open the location's popup right on the map once the view has moved there
        if (reduceMotion) {
          mapRef.current.setView([t.lat, t.lon], zoom, { animate: false });
          mk?.openPopup();
        } else {
          const openIt = () => {
            if (mk && !mk.isPopupOpen()) mk.openPopup();
          };
          mapRef.current.once('moveend', openIt);
          window.setTimeout(openIt, 1300);
          mapRef.current.flyTo([t.lat, t.lon], zoom, { duration: 0.9 });
        }
      }
    }
    if (reopenId) markerByIdRef.current.get(reopenId)?.openPopup();
    prevSelectedRef.current = selectedId;
  }, [markers, selectedId, bodyTheme]);

  // Documented analog sites and research hypotheses: a separate layer, never mixed up with model output.
  useEffect(() => {
    const layer = refLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showRef) return;
    const LABEL = { documented: 'Documented analog site', incomplete: 'Documented, evidence incomplete', hypothesis: 'Research hypothesis (unverified)' } as const;
    for (const r of referenceSites) {
      const common = 'transform:rotate(45deg);width:13px;height:13px;box-sizing:border-box;';
      const html =
        r.kind === 'documented'
          ? `<div style="${common}background:#142B50;border:2px solid #FFFFFF;box-shadow:0 1px 5px rgba(20,43,80,.5);"></div>`
          : r.kind === 'incomplete'
          ? `<div style="${common}background:#FFFFFF;border:2px solid #A15C00;box-shadow:0 1px 5px rgba(20,43,80,.35);"></div>`
          : `<div style="width:15px;height:15px;box-sizing:border-box;border-radius:50%;border:2px dashed #A15C00;background:rgba(255,244,229,.9);"></div>`;
      const icon = L.divIcon({ className: '', html, iconSize: [16, 16], iconAnchor: [8, 8], popupAnchor: [0, -8] });
      const mk = L.marker([r.lat, r.lon], { icon, title: r.name, keyboard: true, zIndexOffset: -500 });
      mk.bindTooltip(`${r.name} · ${LABEL[r.kind]}`, { direction: 'top', offset: [0, -8] });
      const el = document.createElement('div');
      el.className = 'p-3 min-w-[220px] max-w-[260px] font-sans';
      el.innerHTML = `
        <div style="font-size:11px;color:#68788F;margin-bottom:2px;">${escapeHtml(r.country)} · ${escapeHtml(LABEL[r.kind])}</div>
        <div style="font-family:Montserrat,sans-serif;font-weight:700;font-size:13px;color:#142B50;margin-bottom:6px;">${escapeHtml(r.name)}</div>
        ${r.targets.length ? `<div style="font-size:11px;color:#142B50;margin-bottom:4px;">Analog for: ${escapeHtml(r.targets.join(', ').replace(/_/g, ' '))}</div>` : ''}
        <div style="font-size:11px;color:#68788F;margin-bottom:6px;line-height:1.35;">${escapeHtml(r.note)}.</div>
        <div style="font-size:10px;color:#6B3F00;background:#FFF4E5;border-radius:6px;padding:4px 6px;line-height:1.35;">Shown for context from the literature or team research. Not scored by the engine; coordinates approximate.</div>
        ${r.source ? `<a href="${escapeHtml(r.source)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-top:6px;font-size:11px;color:#0B5ED7;">Source</a>` : ''}
      `;
      mk.bindPopup(el);
      mk.addTo(layer);
    }
  }, [referenceSites, showRef]);

  // Footprint of the selected grid cell: the marker is a cell centre, not a point-sized site.
  useEffect(() => {
    const layer = footprintLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    const sel = markers.find((m) => m.id === selectedId);
    if (!sel || !cellSizeDeg) return;
    const h = cellSizeDeg / 2;
    L.rectangle(
      [
        [Math.max(-90, sel.lat - h), sel.lon - h],
        [Math.min(90, sel.lat + h), sel.lon + h],
      ],
      { color: '#142B50', weight: 1.5, dashArray: '5 4', fillColor: '#0B5ED7', fillOpacity: 0.08, interactive: false }
    ).addTo(layer);
  }, [markers, selectedId, cellSizeDeg]);

  const activeBasemapBg = BASEMAP_CONFIGS[basemapStyle].backgroundColor;

  return (
    <div
      className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-[#E1E8F0]`}
      style={{ backgroundColor: activeBasemapBg }}
    >
      <div
        ref={containerRef}
        className="w-full h-full z-0"
        data-testid="analog-leaflet-map"
        data-basemap={basemapStyle}
        aria-label="Interactive global Earth analog Leaflet map"
      />

      {/* Top HUD Bar: Live Coordinates Telemetry + Basemap Layer Switcher + Solar Zones */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-start justify-between gap-2 pointer-events-none">
        <div className="glass-dark-hud text-[#FFFFFF] rounded-lg px-3 py-1.5 font-mono text-[11px] tabular-nums">
          {formatCursorTelemetry(cursorCoords)}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
          <div
            role="group"
            aria-label="Map layer style"
            className="inline-flex items-center glass-light-hud rounded-lg p-0.5"
          >
            <Layers className="w-3.5 h-3.5 text-[#68788F] ml-2 mr-1 hidden sm:block" />
            {BASEMAP_OPTIONS.map((opt) => {
              const active = basemapStyle === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBasemapStyle(opt.id)}
                  aria-pressed={active}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-[#0B5ED7] text-[#FFFFFF] shadow-xs'
                      : 'text-[#142B50] hover:bg-[#EDF3FA]/90 hover:text-[#0B5ED7]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowSolarZones((v) => !v)}
            aria-pressed={showSolarZones}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-sm transition-all duration-150 hover:-translate-y-0.5 ${
              showSolarZones
                ? 'bg-[#0B5ED7]/95 backdrop-blur-md border-[#0B5ED7] text-[#FFFFFF]'
                : 'glass-light-hud border-transparent text-[#142B50] hover:text-[#0B5ED7]'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Solar Zones</span>
          </button>
        </div>
      </div>

      {/* Zoom & Reset Controls positioned cleanly above bottom-right scale/attribution */}
      <div className="absolute bottom-14 right-3 z-[400] flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn(1, { animate: false })}
          aria-label="Zoom in map"
          className="w-9 h-9 glass-light-hud rounded-lg flex items-center justify-center text-[#142B50] hover:text-[#0B5ED7] hover:scale-105 active:scale-95 transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut(1, { animate: false })}
          aria-label="Zoom out map"
          className="w-9 h-9 glass-light-hud rounded-lg flex items-center justify-center text-[#142B50] hover:text-[#0B5ED7] hover:scale-105 active:scale-95 transition-all duration-150"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.setView([16, 8], 2, { animate: false })}
          aria-label="Reset map view"
          className="w-9 h-9 glass-light-hud rounded-lg flex items-center justify-center text-[#142B50] hover:text-[#0B5ED7] hover:scale-105 active:scale-95 transition-all duration-150"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Legend (collapsible so it never hides the map) */}
      <div className="absolute bottom-3 left-3 z-[400] glass-light-hud rounded-xl px-3 py-2 text-[11px] space-y-1.5 max-w-[230px]">
        <button type="button" onClick={() => setLegendOpen((v) => !v)} aria-expanded={legendOpen} className="flex w-full items-center justify-between gap-3 font-semibold text-[#142B50] text-xs">
          <span>Legend</span>
          <span className="text-[10px] text-[#0B5ED7]">{legendOpen ? 'Hide' : 'Show'}</span>
        </button>
        {legendOpen && (
          <>
            <div className="flex items-center gap-2 text-[#142B50]">
              <span className="w-4 h-4 shrink-0 rounded-full bg-[#0EA5E9] border-2 border-[#FFFFFF] shadow text-[8px] font-bold text-[#FFFFFF] flex items-center justify-center">1</span>
              <span>Recommended region (rank)</span>
            </div>
            <div className="flex items-center gap-2 text-[#68788F]">
              <span className="w-4 h-4 shrink-0 rounded-full bg-[#0B5ED7] ring-2 ring-[#142B50]" />
              <span>Selected · dashed box = cell (~280 km)</span>
            </div>
            {referenceSites.length > 0 && (
              <div className="pt-1.5 border-t border-[#E6ECF3] space-y-1">
                <label className="flex items-center gap-1.5 font-semibold text-[#142B50] cursor-pointer">
                  <input type="checkbox" checked={showRef} onChange={(e) => setShowRef(e.target.checked)} className="accent-[#0B5ED7]" />
                  Documented analog sites
                </label>
                <div className="flex items-center gap-2 text-[#68788F]">
                  <span className="w-2.5 h-2.5 shrink-0 rotate-45 bg-[#142B50] border border-[#FFFFFF]" />
                  <span>Literature-documented</span>
                </div>
                <div className="flex items-center gap-2 text-[#68788F]">
                  <span className="w-2.5 h-2.5 shrink-0 rotate-45 bg-[#FFFFFF] border-2 border-[#A15C00]" />
                  <span>Evidence incomplete</span>
                </div>
                <div className="flex items-center gap-2 text-[#68788F]">
                  <span className="w-3 h-3 shrink-0 rounded-full border-2 border-dashed border-[#A15C00] bg-[#FFF4E5]" />
                  <span>Research hypothesis (unverified)</span>
                </div>
              </div>
            )}
            {showSolarZones && <div className="pt-1 border-t border-[#E6ECF3] text-[10px] text-[#0B5ED7] font-medium">Cyan: polar ≥66.5° · Amber: 30°–60° belt</div>}
          </>
        )}
      </div>
    </div>
  );
}
