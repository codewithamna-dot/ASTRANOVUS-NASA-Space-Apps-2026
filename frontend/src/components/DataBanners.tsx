import { AlertTriangle, Database } from 'lucide-react';
import { useMission } from '../state/MissionContext';
import { dimLabel } from '../utils/mission';
import { InfoNote } from './StatusViews';

/** Loud warning when the backend fell back to the synthetic placeholder grid. */
export function SyntheticDataWarning() {
  const { health, dataStatus } = useMission();
  const synthetic = health?.is_synthetic_sample || dataStatus?.grid.is_synthetic_sample;
  if (!synthetic) return null;
  return (
    <div role="alert" className="bg-[#FDECEC] border-2 border-[#B42318] rounded-xl px-4 py-3 flex gap-3 text-sm text-[#7A1A12]">
      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
      <div>
        <strong>The backend is running on the SYNTHETIC placeholder grid, not NASA-derived data.</strong> Every score and
        location shown is fake and must not be presented as an observation. Build{' '}
        <code className="font-mono">data/processed/earth_grid.csv</code> and restart the API.
      </div>
    </div>
  );
}

/** Compact "what data stands behind these numbers" strip. */
export function DataCoverageStrip() {
  const { dataStatus } = useMission();
  if (!dataStatus) return null;
  const withData = dataStatus.dimensions.filter((d) => d.status !== 'missing');
  const missing = dataStatus.dimensions.filter((d) => d.status === 'missing');
  const g = dataStatus.grid;
  return (
    <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-xl px-4 py-3 text-xs text-[#68788F] flex flex-wrap items-start gap-x-6 gap-y-2">
      <span className="inline-flex items-center gap-1.5 font-semibold text-[#142B50]">
        <Database className="w-3.5 h-3.5 text-[#0B5ED7]" />
        Earth grid: {g.cells} land cells{g.step_deg ? ` at ${g.step_deg}° spacing` : ''}
      </span>
      <span>
        <strong className="text-[#177A3C]">{withData.length}/{dataStatus.n_dimensions} dimensions with data:</strong>{' '}
        {withData.map((d) => `${dimLabel(d.id)}${d.cell_coverage < 0.9 ? ` (${Math.round(d.cell_coverage * 100)}% of cells)` : ''}`).join(', ') || 'none'}
      </span>
      {missing.length > 0 && (
        <span>
          <strong className="text-[#B42318]">Awaiting real NASA data:</strong> {missing.map((d) => dimLabel(d.id)).join(', ')}
        </span>
      )}
    </div>
  );
}

export function EarthLimitsNote({ limits }: { limits: string[] }) {
  return (
    <InfoNote>
      <strong>Earth is an imperfect stand-in.</strong> A high score means similarity on the listed environmental
      dimensions for this purpose only. It does not reproduce:
      <ul className="list-disc pl-5 mt-1.5 space-y-0.5">
        {limits.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ul>
    </InfoNote>
  );
}
