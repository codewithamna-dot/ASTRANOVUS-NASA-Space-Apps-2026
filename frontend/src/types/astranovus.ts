/**
 * Types mirroring the ASTRANOVUS FastAPI contract (backend/main.py + backend/mission_api.py).
 * Values the backend marks as missing are `null` here and must never be coerced to 0.
 */

export type Body = 'moon' | 'mars';
export type BodyLabel = 'Moon' | 'Mars';
export type TargetId = string;

export type DataStatusKind = 'derived' | 'proxy' | 'missing';
export type DataState = 'ready' | 'partial' | 'unavailable';
export type Confidence = 'high' | 'medium' | 'low';
export type DocLevel = 'direct' | 'related' | 'indirect';

export interface HealthResponse {
  ok: boolean;
  cells: number;
  targets: number;
  data_source: string;
  is_synthetic_sample: boolean;
}

export interface DimensionStatus {
  id: string;
  name: string;
  description: string;
  status: DataStatusKind;
  cell_coverage: number;
  provenance: string;
  temporal: string;
  intended_earth_source: string;
  planetary_source: string;
}

export interface GridInfo {
  file: string;
  is_synthetic_sample: boolean;
  cells: number;
  step_deg: number | null;
  lat_range: [number, number];
}

export interface DataStatusResponse {
  grid: GridInfo;
  dimensions: DimensionStatus[];
  n_dimensions_with_data: number;
  n_dimensions: number;
  values_are: string;
  disclaimer: string;
  build: {
    built_utc: string;
    temporal_coverage: { MODIS_GPM_months: string[]; note: string };
    products: Record<string, string>;
    cross_checks: Record<string, { n: number; spearman: number }>;
  } | null;
}

export interface TargetRule {
  rule: 'high' | 'low' | 'band';
  weight: number;
  lo?: number;
  hi?: number;
}

export interface Readiness {
  state: DataState;
  max_coverage: number;
  missing_dimensions: string[];
  proxy_dimensions: string[];
  sparse_dimensions?: string[];
  gate_dimensions_missing: string[];
  notes: string[];
}

export interface TargetCard {
  id: TargetId;
  body: Body;
  name: string;
  description: string;
  status: string;
  rules: Record<string, TargetRule>;
  _note?: string;
  is_draft: boolean;
  evidence: { grounded: number; total: number };
  readiness: Readiness;
  screening?: TargetScreening | null;
}

export interface TargetScreening {
  screening_scope: string;
  geology_defined: boolean;
  requires_exposed_surface: boolean;
  defining_properties: { property: string; status: string; dimension: string | null; note: string }[];
  critical_missing: string[];
  summary: string;
}

export interface Suitability {
  status: string;
  status_basis: string;
  screening_scope: string | null;
  categories: Record<string, { similarity: number | null; dimensions: string[]; data_available: string; basis: string }>;
  supported: string[];
  partially_supported: string[];
  unsupported: string[];
}

export interface RankingStability {
  weights_top1_within_5deg: number;
  weights_mean_jaccard_top5: number;
  missing_20pct_top1_within_5deg: number;
  missing_20pct_mean_jaccard_top5: number;
  note: string;
}

export interface V3Metrics {
  n_pairs: number;
  n_sites: number;
  median_percentile?: number;
  median_ci95_site_cluster?: [number, number] | null;
  top10_hit?: number;
  top25_hit?: number;
  auc_vs_all_controls_by_target?: number | null;
  auc_vs_hard_controls_by_target?: number | null;
  reliable?: boolean;
}

export interface ValidationV3 {
  available: boolean;
  note?: string;
  provenance: { git_commit: string; scoring_files_modified_since_commit: boolean | null; inclusion: string };
  adopted_variant: string;
  dataset: {
    positive_sites: number; eligible_sites: number; exploratory_sites: number; rejected_candidates: number; controls: number; hard_controls: number;
    cohorts: Record<string, number>;
  };
  variants: { id: string; label: string; 'dev_A+B': V3Metrics; frozen_C: V3Metrics }[];
  ablations: { id: string; label: string; 'dev_A+B': V3Metrics }[];
  frozen_pairs: { site_id: string; target: string; percentile: number; exploratory: boolean }[];
  ranking_stability: Record<string, Record<string, number>>;
  experiment_matrix: { pairs: number; pass: number; pass_with_warnings: number; fail: number };
  statements: string[];
}

export interface EvidenceTier {
  tier: string;
  label: string;
  note: string;
}

export interface SourceLink {
  id: string;
  label: string;
  url: string;
}

export interface Gate {
  dim: string;
  op: string;
  value: number;
  why: string;
}

export interface Experiment {
  id: string;
  body: Body;
  name: string;
  short_name: string;
  purpose_id: string;
  what_is_tested: string;
  why: string;
  environment_requirements: string[];
  applications: string[];
  nasa_documented: { level: DocLevel; summary: string; sources: SourceLink[] };
  cannot_reproduce: string[];
  draft_assumption?: string;
  shares_profile_note?: string;
  purpose: {
    id: string;
    name: string;
    question: string;
    nasa_basis: string;
    multipliers: Record<string, number>;
    gates: Gate[];
  };
  allowed_targets: TargetCard[];
  default_target: TargetId | null;
  key_dimensions: string[];
}

export interface ExperimentsResponse {
  notice: string;
  classification: Record<DocLevel, string>;
  sources_verified_on: string;
  experiments: Experiment[];
}

export interface Reason {
  dimension: string;
  percentile: number;
  similarity: number;
  weight: number;
  rule: string;
  source: string;
}

export interface RegionDimension {
  dimension: string;
  name: string;
  percentile: number | null;
  rule: 'high' | 'low' | 'band';
  weight: number;
  similarity: number | null;
  data_status: DataStatusKind;
  temporal?: string;
  missing_reason?: string | null;
  source: string;
}

export interface Region {
  id: string;
  rank: number;
  lat: number;
  lon: number;
  best_cell: { lat: number; lon: number };
  centroid?: { lat: number; lon: number };
  n_cells: number;
  best_score: number;
  evidence_adjusted_score?: number;
  suitability?: Suitability;
  evidence_tier?: EvidenceTier;
  mean_score: number;
  coverage: number;
  confidence: Confidence;
  why_match: Reason[];
  weak_points: Reason[];
  missing_data: string[];
  notes: string[];
  location_label: string;
  region_name: string | null;
  country?: string | null;
  label_basis: string;
  dimensions: RegionDimension[];
  applications: string[];
  surface: {
    perennial_snow_ice: boolean | null;
    snow_mean_valid_pct: number | null;
    elevation_mean_m: number | null;
    relief_1km_m: number | null;
    slope_1km_deg: number | null;
    dem_source: string | null;
  } | null;
  terrain: {
    state: 'verified_local' | 'outside_coverage' | 'not_checked';
    note?: string;
    terrain_class?: string;
    slope_mean_deg?: number;
    slope_p95_deg?: number;
    relief_m?: number;
    roughness_std_m?: number;
    elevation_mean_m?: number;
  };
}

export interface MissionResult {
  experiment: Omit<Experiment, 'allowed_targets'>;
  target_info: TargetCard;
  allowed_targets: TargetCard[];
  assessment: Readiness;
  data_state: DataState;
  provisional: boolean;
  custom_weights: Record<string, number>;
  grid: GridInfo;
  dimension_status: DimensionStatus[];
  limits_on_earth: string[];
  disclaimer: string;
  regions: Region[];
  n_cells_passed: number;
  ranking_basis?: string;
  ranking_stability?: RankingStability | null;
  n_cells_excluded_unverified?: number;
  weights_used: Record<string, number>;
}

/** Generic per-cell score from GET /score (target default weights, not mission-specific). */
export interface ScoredCell {
  cell_id: number;
  lat: number;
  lon: number;
  score: number;
  coverage: number;
}

export interface BackendTarget {
  id: TargetId;
  body: Body;
  name: string;
  description: string;
  status: string;
}

export interface CompareResponse {
  cell_id: number;
  lat: number;
  lon: number;
  scores: Array<{ target: TargetId; name: string; score: number | null }>;
}

// ---- map adapter types (what the globe / Leaflet components consume) ----------------------

export interface MapSite {
  id: string;
  name: string;
  country: string;
  region: string;
  lat: number;
  lon: number;
  role: string;
  classification: string;
  overall_score: number;
  data_coverage: number;
}

export interface GlobeTargetRef {
  id: TargetId;
  body: BodyLabel;
}

export interface HeatmapPoint {
  lat: number;
  lon: number;
  intensity: number;
  region_name: string;
  cluster_id: string;
}

export interface ValidationStats {
  n_pairs: number;
  n_sites: number;
  median_percentile: number;
  median_ci95: [number, number] | null;
  top25_hit_rate: number;
  top50_hit_rate: number;
  auc_vs_all_controls: number | null;
  auc_vs_hard_controls: number | null;
  controls_median_percentile: number | null;
  hard_controls_median_percentile: number | null;
}

export interface ValidationRow {
  kind: string;
  split: string;
  site: string;
  target: string;
  score: number | null;
  percentile: number | null;
  dist_deg: number;
  in_grid: boolean;
  cell_lat: number;
  cell_lon: number;
}

export interface ValidationResponse {
  available: boolean;
  note?: string;
  grid_built_utc?: string;
  heldout?: ValidationStats | null;
  tuning?: ValidationStats | null;
  all?: ValidationStats | null;
  temporal_coverage?: string[];
  dimensions_missing?: string[];
  rows?: ValidationRow[];
  hypotheses?: ValidationRow[];
  diagnostics?: Array<{ site: string; target: string; percentile: number; coverage: number; missing: Record<string, string> }>;
  grid_step_deg?: number;
}
