import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { fetchDataStatus, fetchExperiments, fetchHealth, fetchMissionRecommend } from '../api/client';
import type {
  Body,
  DataStatusResponse,
  Experiment,
  ExperimentsResponse,
  HealthResponse,
  MissionResult,
  Region,
  TargetCard,
  TargetId,
} from '../types/astranovus';

type BootStatus = 'loading' | 'ready' | 'error';
type ResultStatus = 'idle' | 'loading' | 'ready' | 'error';

interface MissionContextValue {
  boot: BootStatus;
  bootError: string | null;
  retryBoot: () => void;
  health: HealthResponse | null;
  dataStatus: DataStatusResponse | null;
  experimentsMeta: ExperimentsResponse | null;
  experiments: Experiment[];

  body: Body | null;
  experimentId: string | null;
  targetId: TargetId | null;
  experiment: Experiment | null;
  setBody: (b: Body | null) => void;
  setExperiment: (id: string | null) => void;
  setTarget: (id: TargetId) => void;
  resetMission: () => void;

  result: MissionResult | null;
  resultStatus: ResultStatus;
  resultError: string | null;
  allowUnverified: boolean;
  setAllowUnverified: (v: boolean) => void;
  customWeights: Record<string, number>;
  setCustomWeights: (w: Record<string, number>) => void;

  selectedRegionId: string | null;
  selectedRegion: Region | null;
  selectRegion: (id: string | null) => void;
  compareIds: string[];
  toggleCompare: (id: string) => void;
  clearCompare: () => void;
}

const Ctx = createContext<MissionContextValue | null>(null);

const STATE_RANK = { ready: 0, partial: 1, unavailable: 2 } as const;

/** Prefer the compatible reference site whose data is most complete (never hides the others). */
export function bestTarget(targets: TargetCard[]): TargetCard | undefined {
  return [...targets].sort(
    (a, b) =>
      STATE_RANK[a.readiness.state] - STATE_RANK[b.readiness.state] ||
      b.readiness.max_coverage - a.readiness.max_coverage
  )[0];
}

function readInitial() {
  const p = new URLSearchParams(window.location.search);
  const body = p.get('body');
  return {
    body: body === 'moon' || body === 'mars' ? (body as Body) : null,
    exp: p.get('exp'),
    target: p.get('target'),
  };
}

export function MissionProvider({ children }: { children: ReactNode }) {
  const initial = useRef(readInitial()).current;

  const [boot, setBoot] = useState<BootStatus>('loading');
  const [bootError, setBootError] = useState<string | null>(null);
  const [bootTick, setBootTick] = useState(0);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [dataStatus, setDataStatus] = useState<DataStatusResponse | null>(null);
  const [experimentsMeta, setExperimentsMeta] = useState<ExperimentsResponse | null>(null);

  const [body, setBodyState] = useState<Body | null>(initial.body);
  const [experimentId, setExperimentId] = useState<string | null>(initial.exp);
  const [targetId, setTargetId] = useState<TargetId | null>(initial.target);

  const [result, setResult] = useState<MissionResult | null>(null);
  const [resultStatus, setResultStatus] = useState<ResultStatus>('idle');
  const [resultError, setResultError] = useState<string | null>(null);
  const [allowUnverified, setAllowUnverified] = useState(false);
  const [customWeights, setCustomWeights] = useState<Record<string, number>>({});

  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // ---- boot: health + data status + experiments (all from FastAPI) -----------------------
  useEffect(() => {
    const ac = new AbortController();
    setBoot('loading');
    setBootError(null);
    Promise.all([fetchHealth(ac.signal), fetchDataStatus(ac.signal), fetchExperiments(ac.signal)])
      .then(([h, ds, ex]) => {
        setHealth(h);
        setDataStatus(ds);
        setExperimentsMeta(ex);
        setBoot('ready');
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setBootError(err.message);
        setBoot('error');
      });
    return () => ac.abort();
  }, [bootTick]);

  const experiments = experimentsMeta?.experiments ?? [];
  const experiment = useMemo(
    () => experiments.find((e) => e.id === experimentId) ?? null,
    [experiments, experimentId]
  );

  // Validate / complete selection once experiments are known (e.g. after a page reload with URL params).
  useEffect(() => {
    if (boot !== 'ready') return;
    if (experimentId && !experiment) {
      setExperimentId(null);
      setTargetId(null);
      return;
    }
    if (experiment) {
      if (body !== experiment.body) setBodyState(experiment.body);
      const valid = experiment.allowed_targets.some((t) => t.id === targetId);
      if (!valid) setTargetId(bestTarget(experiment.allowed_targets)?.id ?? null);
    }
  }, [boot, experiment, experimentId, targetId, body]);

  // ---- recommendation request: driven by experiment + reference site -----------------------
  useEffect(() => {
    if (!experimentId || !targetId || !experiment) {
      setResult(null);
      setResultStatus('idle');
      return;
    }
    if (!experiment.allowed_targets.some((t) => t.id === targetId)) return;
    const ac = new AbortController();
    setResultStatus('loading');
    setResultError(null);
    fetchMissionRecommend({ experiment: experimentId, target: targetId, allowUnverified, weights: customWeights }, ac.signal)
      .then((res) => {
        setResult(res);
        setResultStatus('ready');
        setSelectedRegionId(res.regions[0]?.id ?? null);
        setCompareIds(res.regions.slice(0, 2).map((r) => r.id));
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setResult(null);
        setResultError(err.message);
        setResultStatus('error');
      });
    return () => ac.abort();
  }, [experimentId, targetId, allowUnverified, experiment, customWeights]);

  const setBody = useCallback((b: Body | null) => {
    setCustomWeights({});
    setBodyState(b);
    setExperimentId(null);
    setTargetId(null);
    setAllowUnverified(false);
  }, []);

  const setExperiment = useCallback(
    (id: string | null) => {
      setCustomWeights({});
      setAllowUnverified(false);
      setExperimentId(id);
      const ex = experiments.find((e) => e.id === id);
      if (ex) {
        setBodyState(ex.body);
        setTargetId(bestTarget(ex.allowed_targets)?.id ?? ex.default_target);
      } else {
        setTargetId(null);
      }
    },
    [experiments]
  );

  const setTarget = useCallback((id: TargetId) => {
    setCustomWeights({});
    setAllowUnverified(false);
    setTargetId(id);
  }, []);

  const resetMission = useCallback(() => {
    setBodyState(null);
    setExperimentId(null);
    setTargetId(null);
    setAllowUnverified(false);
  }, []);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-3)));
  }, []);

  const selectedRegion = useMemo(
    () => result?.regions.find((r) => r.id === selectedRegionId) ?? null,
    [result, selectedRegionId]
  );

  const value: MissionContextValue = {
    boot,
    bootError,
    retryBoot: () => setBootTick((t) => t + 1),
    health,
    dataStatus,
    experimentsMeta,
    experiments,
    body,
    experimentId,
    targetId,
    experiment,
    setBody,
    setExperiment,
    setTarget,
    resetMission,
    result,
    resultStatus,
    resultError,
    allowUnverified,
    setAllowUnverified,
    customWeights,
    setCustomWeights,
    selectedRegionId,
    selectedRegion,
    selectRegion: setSelectedRegionId,
    compareIds,
    toggleCompare,
    clearCompare: () => setCompareIds([]),
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMission(): MissionContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useMission must be used inside <MissionProvider>');
  return v;
}
