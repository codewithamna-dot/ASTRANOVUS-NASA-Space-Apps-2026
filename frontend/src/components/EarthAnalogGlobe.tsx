import { Compass, Grid, Pause, Play, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Globe, { type GlobeMethods } from 'react-globe.gl';
import * as THREE from 'three';
import earthBlueMarble from '../assets/textures/earth-blue-marble.jpg';
import earthTopology from '../assets/textures/earth-topology.png';
import earthWater from '../assets/textures/earth-water.png';
import type { GlobeTargetRef, MapSite } from '../types/astranovus';
import {
  buildGlobeArcs,
  buildGlobePoints,
  buildGlobeRings,
  formatCoordPair,
  type GlobeAnalogPoint,
  type GlobeArcLink,
  normalizeLongitude,
} from '../utils/globeUtils';

interface EarthAnalogGlobeProps {
  sites: MapSite[];
  selectedTarget: GlobeTargetRef | undefined;
  selectedSiteId: string | null;
  onSelectSite: (siteId: string) => void;
  onOpenProfile: (siteId: string) => void;
  heightClass?: string;
}

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function buildCloudLayerTexture(): THREE.CanvasTexture {
  const w = 1024;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.clearRect(0, 0, w, h);

    // Deterministic orbital cloud bands (ITCZ, mid-latitude storm tracks, polar eddies)
    let seed = 4219;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let i = 0; i < 240; i++) {
      const bandBias = i % 3 === 0 ? 0.5 : i % 3 === 1 ? 0.28 : 0.72;
      const cx = rand() * w;
      const cy = Math.max(24, Math.min(h - 24, (bandBias + (rand() - 0.5) * 0.26) * h));
      const rx = 28 + rand() * 88;
      const ry = 8 + rand() * 22;
      const alpha = 0.06 + rand() * 0.14;

      const grad = ctx.createRadialGradient(cx, cy, ry * 0.2, cx, cy, rx);
      grad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(0.55, `rgba(236, 245, 255, ${alpha * 0.55})`);
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((rand() - 0.5) * 0.35);
      ctx.scale(1, ry / rx);
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function EarthAnalogGlobe({
  sites,
  selectedTarget,
  selectedSiteId,
  onSelectSite,
  onOpenProfile,
  heightClass = 'h-[440px] lg:h-[490px]',
}: EarthAnalogGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lastHudUpdateRef = useRef<number>(0);
  const cleanupFnsRef = useRef<Array<() => void>>([]);
  const sceneDecoratedRef = useRef<boolean>(false);

  const isSoftwareGl = useMemo(() => detectSoftwareWebGL(), []);

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 680,
    height: 460,
  });
  const [autoRotate, setAutoRotate] = useState<boolean>(() => !isSoftwareGl);
  const [showGraticules, setShowGraticules] = useState<boolean>(false);
  const [hoveredSite, setHoveredSite] = useState<GlobeAnalogPoint | null>(null);
  const [pov, setPov] = useState<{ lat: number; lng: number; altitude: number }>({
    lat: 18,
    lng: 12,
    altitude: 2.05,
  });

  const bodyTheme = selectedTarget?.body ?? 'Mars';

  const pointsData = useMemo(
    () => buildGlobePoints(sites, selectedSiteId, bodyTheme),
    [sites, selectedSiteId, bodyTheme]
  );

  const arcsData = useMemo(
    () =>
      selectedTarget
        ? buildGlobeArcs(sites, selectedTarget.id, selectedTarget.body)
        : [],
    [sites, selectedTarget]
  );

  const ringsData = useMemo(
    () => buildGlobeRings(sites, selectedSiteId),
    [sites, selectedSiteId]
  );

  // Clean up Three.js procedural cloud, starfield, and specular textures on unmount
  useEffect(() => {
    return () => {
      cleanupFnsRef.current.forEach((fn) => fn());
      cleanupFnsRef.current = [];
      sceneDecoratedRef.current = false;
    };
  }, []);

  // Keep canvas responsively sized to container without scrollbars
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

  const syncControls = useCallback(() => {
    const globe = globeRef.current;
    if (!globe) return;
    try {
      const controls = globe.controls();
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.55;
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.08;
      controls.minDistance = 155;
      controls.maxDistance = 420;

      const renderer = globe.renderer();
      renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
    } catch {
      // Globe initializing
    }
  }, [autoRotate, isSoftwareGl]);

  useEffect(() => {
    syncControls();
  }, [syncControls]);

  // Enhance globe surface with real NASA ocean specular map, orbital lighting, cloud shell & starfield
  const decorateOrbitalEarth = useCallback(() => {
    const globe = globeRef.current;
    if (!globe || sceneDecoratedRef.current) return;
    sceneDecoratedRef.current = true;

    try {
      const scene = globe.scene();
      const renderer = globe.renderer();
      const radius = globe.getGlobeRadius();

      // 1. Real ocean specular reflection map on MeshPhongMaterial
      const mat = (globe as unknown as { globeMaterial: () => THREE.MeshPhongMaterial }).globeMaterial?.();
      if (mat) {
        const loader = new THREE.TextureLoader();
        const waterTex = loader.load(earthWater, (tex) => {
          tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
          mat.specularMap = tex;
          mat.specular = new THREE.Color('#6db8ff');
          mat.shininess = 18;
          mat.bumpScale = 0.08;
          mat.needsUpdate = true;
        });
        cleanupFnsRef.current.push(() => waterTex.dispose());
      }

      // 2. Balanced 360-degree orbital lighting so every continent stays clearly illuminated while retaining 3D relief
      const ambient = new THREE.AmbientLight('#dbeafe', 1.15);
      const hemi = new THREE.HemisphereLight('#eef6ff', '#1e3a6d', 0.95);
      const sunKey = new THREE.DirectionalLight('#fff6e8', 1.65);
      sunKey.position.set(220, 120, 260);
      const westFill = new THREE.DirectionalLight('#bfe0ff', 1.25);
      westFill.position.set(-240, 80, -180);
      globe.lights([ambient, hemi, sunKey, westFill]);

      // 3. Soft translucent atmospheric cloud shell
      const cloudTex = buildCloudLayerTexture();
      const cloudGeo = new THREE.SphereGeometry(radius * 1.012, 48, 36);
      const cloudMat = new THREE.MeshPhongMaterial({
        map: cloudTex,
        transparent: true,
        opacity: 0.72,
        depthWrite: false,
      });
      const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
      cloudMesh.name = 'astranovus-clouds';
      scene.add(cloudMesh);

      // 4. Deep-space starfield around outer orbital sphere
      const starCount = 360;
      const starPositions = new Float32Array(starCount * 3);
      let starSeed = 9187;
      const nextStar = () => {
        starSeed = (starSeed * 16807) % 2147483647;
        return (starSeed - 1) / 2147483646;
      };
      for (let i = 0; i < starCount; i++) {
        const u = nextStar();
        const v = nextStar();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const r = 480 + nextStar() * 140;
        starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i * 3 + 2] = r * Math.cos(phi);
      }
      const starGeo = new THREE.BufferGeometry();
      starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      const starMat = new THREE.PointsMaterial({
        color: '#DCEBFF',
        size: 1.55,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0.78,
      });
      const stars = new THREE.Points(starGeo, starMat);
      stars.name = 'astranovus-starfield';
      scene.add(stars);

      let cloudRaf = 0;
      if (!isSoftwareGl) {
        const driftClouds = () => {
          cloudMesh.rotation.y += 0.00032;
          cloudRaf = requestAnimationFrame(driftClouds);
        };
        cloudRaf = requestAnimationFrame(driftClouds);
      }

      cleanupFnsRef.current.push(() => {
        if (cloudRaf) cancelAnimationFrame(cloudRaf);
        scene.remove(cloudMesh);
        scene.remove(stars);
        cloudGeo.dispose();
        cloudMat.dispose();
        cloudTex.dispose();
        starGeo.dispose();
        starMat.dispose();
      });
    } catch {
      // Non-fatal fallback if scene API differs
    }
  }, [isSoftwareGl]);

  // Smoothly focus 3D globe onto selected site or #1 analog when target changes
  useEffect(() => {
    const globe = globeRef.current;
    if (!globe) return;
    const focus = sites.find((s) => s.id === selectedSiteId) ?? sites[0];
    if (!focus) return;

    globe.pointOfView(
      { lat: focus.lat, lng: focus.lon, altitude: 1.88 },
      isSoftwareGl ? 0 : 750
    );
    setPov({
      lat: Number(focus.lat.toFixed(2)),
      lng: normalizeLongitude(focus.lon),
      altitude: 1.88,
    });
  }, [selectedSiteId, selectedTarget?.id, sites, isSoftwareGl]);

  const handleZoomOrRotate = useCallback(
    (nextPov: { lat: number; lng: number; altitude: number }) => {
      const now = performance.now();
      if (now - lastHudUpdateRef.current < 120) return;
      lastHudUpdateRef.current = now;
      setPov({
        lat: Number(nextPov.lat.toFixed(2)),
        lng: normalizeLongitude(nextPov.lng),
        altitude: Number(nextPov.altitude.toFixed(2)),
      });
    },
    []
  );

  const handleResetView = () => {
    const globe = globeRef.current;
    const topSite = sites[0];
    const targetLat = topSite?.lat ?? 18;
    const targetLng = topSite?.lon ?? 12;
    if (globe) {
      globe.pointOfView(
        { lat: targetLat, lng: targetLng, altitude: 2.05 },
        isSoftwareGl ? 0 : 700
      );
    }
    setPov({
      lat: Number(targetLat.toFixed(2)),
      lng: normalizeLongitude(targetLng),
      altitude: 2.05,
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
      data-lat={pov.lat}
      data-lng={pov.lng}
      data-target={selectedTarget?.id ?? ''}
      className={`relative w-full ${heightClass} rounded-xl overflow-hidden bg-[#060F20] border border-[#1E3B68]`}
      aria-label="Interactive 3D Blue Marble Earth analog globe visualization"
    >
      <Globe
        ref={globeRef}
        width={dimensions.width}
        height={dimensions.height}
        backgroundColor="rgba(6, 15, 32, 1)"
        globeImageUrl={earthBlueMarble}
        bumpImageUrl={earthTopology}
        showGraticules={showGraticules}
        showAtmosphere={true}
        atmosphereColor={bodyTheme === 'Mars' ? '#F28B45' : '#4BA8FF'}
        atmosphereAltitude={0.19}
        animateIn={!isSoftwareGl}
        rendererConfig={{
          antialias: !isSoftwareGl,
          powerPreference: 'high-performance',
        }}
        onGlobeReady={() => {
          syncControls();
          decorateOrbitalEarth();
          const focus = sites.find((s) => s.id === selectedSiteId) ?? sites[0];
          if (focus && globeRef.current) {
            globeRef.current.pointOfView({ lat: focus.lat, lng: focus.lon, altitude: 1.88 }, 0);
            setPov({
              lat: Number(focus.lat.toFixed(2)),
              lng: normalizeLongitude(focus.lon),
              altitude: 1.88,
            });
          }
        }}
        onZoom={handleZoomOrRotate}
        pointsData={pointsData}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointAltitude="altitude"
        pointRadius="radius"
        pointResolution={14}
        pointsTransitionDuration={isSoftwareGl ? 0 : 450}
        onPointHover={(pt) => {
          setHoveredSite((pt as GlobeAnalogPoint | null) ?? null);
        }}
        onPointClick={(pt) => {
          const site = pt as GlobeAnalogPoint;
          onSelectSite(site.id);
          globeRef.current?.pointOfView(
            { lat: site.lat, lng: site.lng, altitude: 1.65 },
            isSoftwareGl ? 0 : 700
          );
        }}
        arcsData={arcsData}
        arcStartLat="startLat"
        arcStartLng="startLng"
        arcEndLat="endLat"
        arcEndLng="endLng"
        arcColor={(d: object) => (d as GlobeArcLink).color}
        arcAltitudeAutoScale={0.32}
        arcStroke={0.55}
        arcDashLength={0.42}
        arcDashGap={0.22}
        arcDashAnimateTime={isSoftwareGl ? 0 : 2800}
        arcsTransitionDuration={isSoftwareGl ? 0 : 450}
        ringsData={ringsData}
        ringLat="lat"
        ringLng="lng"
        ringMaxRadius="maxRadius"
        ringPropagationSpeed="propagationSpeed"
        ringRepeatPeriod="repeatPeriod"
        ringColor={() =>
          bodyTheme === 'Mars'
            ? (t: number) => `rgba(242, 139, 69, ${1 - t})`
            : (t: number) => `rgba(84, 185, 245, ${1 - t})`
        }
      />

      {/* Top-Left Live Rotating Coordinates Telemetry HUD */}
      <div className="absolute top-3 left-3 z-10 bg-[#0D1E3A]/90 border border-[#2A4A7F] rounded-lg px-3 py-2 text-[#FFFFFF] pointer-events-none space-y-0.5">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wide text-[#54B9F5]">
          <Compass className="w-3 h-3" />
          <span>3D EARTH ORBITAL POV · {selectedTarget?.id ?? 'TARGET'}</span>
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
              ? 'bg-[#0B5ED7] border-[#54B9F5] text-[#FFFFFF]'
              : 'bg-[#0D1E3A]/90 border-[#2A4A7F] text-[#FFFFFF] hover:border-[#54B9F5]'
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
              ? 'bg-[#0B5ED7] border-[#54B9F5] text-[#FFFFFF]'
              : 'bg-[#0D1E3A]/90 border-[#2A4A7F] text-[#FFFFFF] hover:border-[#54B9F5]'
          }`}
        >
          {autoRotate ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          <span>{autoRotate ? 'Rotating' : 'Rotate'}</span>
        </button>

        <button
          type="button"
          onClick={handleResetView}
          aria-label="Reset 3D globe camera"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-[#0D1E3A]/90 border border-[#2A4A7F] text-[#FFFFFF] hover:border-[#54B9F5] transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom-Left Active Analog Site Readout Card */}
      {activeSite && (
        <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-sm z-10 bg-[#0D1E3A]/92 border border-[#2A4A7F] rounded-xl p-3 text-[#FFFFFF] flex items-center justify-between gap-3">
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
