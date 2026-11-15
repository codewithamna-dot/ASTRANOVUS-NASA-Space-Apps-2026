import type {
  BackendTarget,
  CompareResponse,
  DataStatusResponse,
  ExperimentsResponse,
  HealthResponse,
  MissionResult,
  ScoredCell,
  TargetId,
  ValidationResponse,
  ValidationV3,
} from '../types/astranovus';

/** Base URL of the FastAPI service. Configure with VITE_API_URL (see .env.example). */
export const API_BASE: string = ((import.meta.env.VITE_API_URL as string | undefined) ?? '/api').replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { headers: { Accept: 'application/json' }, signal });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') throw err;
    throw new ApiError(
      `Cannot reach the ASTRANOVUS API at ${API_BASE}. Start the backend (uvicorn backend.main:app --port 8000) and retry.`,
      0
    );
  }
  if (!res.ok) {
    let detail = res.status >= 500 ? `The ASTRANOVUS API returned an error (${res.status}). Check that the backend is running and healthy, then retry.` : `API request failed (${res.status})`;
    try {
      const body = await res.json();
      if (typeof body?.detail === 'string') detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(detail, res.status);
  }
  return (await res.json()) as T;
}

export const fetchHealth = (signal?: AbortSignal) => getJson<HealthResponse>('/health', signal);
export const fetchDataStatus = (signal?: AbortSignal) => getJson<DataStatusResponse>('/data_status', signal);
export const fetchExperiments = (signal?: AbortSignal) => getJson<ExperimentsResponse>('/experiments', signal);
export const fetchTargets = (signal?: AbortSignal) => getJson<BackendTarget[]>('/targets', signal);

export function fetchMissionRecommend(
  params: { experiment: string; target?: TargetId; allowUnverified?: boolean; top?: number; minCoverage?: number; weights?: Record<string, number> },
  signal?: AbortSignal
) {
  const qs = new URLSearchParams({ experiment: params.experiment, top: String(params.top ?? 10) });
  if (params.target) qs.set('target', params.target);
  if (params.allowUnverified) qs.set('allow_unverified', 'true');
  if (params.minCoverage !== undefined) qs.set('min_coverage', String(params.minCoverage));
  const w = Object.entries(params.weights ?? {}).filter(([, v]) => Math.abs(v - 1) > 1e-9);
  if (w.length) qs.set('weights', w.map(([k, v]) => `${k}:${v}`).join(','));
  return getJson<MissionResult>(`/mission/recommend?${qs.toString()}`, signal);
}

/** Generic, target-level similarity per grid cell (existing /score endpoint, default weights). */
export function fetchScoredCells(target: TargetId, limit = 5000, signal?: AbortSignal) {
  return getJson<ScoredCell[]>(`/score?target=${encodeURIComponent(target)}&limit=${limit}`, signal);
}

export function fetchCompare(lat: number, lon: number, signal?: AbortSignal) {
  return getJson<CompareResponse>(`/compare?lat=${lat}&lon=${lon}`, signal);
}

export const fetchValidationV3 = (signal?: AbortSignal) => getJson<ValidationV3>('/validation/v3', signal);
export const fetchValidation = (signal?: AbortSignal) => getJson<ValidationResponse>('/validation', signal);
