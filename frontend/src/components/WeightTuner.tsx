import { RotateCcw, Sliders } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMission } from '../state/MissionContext';
import { dimLabel } from '../utils/mission';

/** Lets the user scale each dimension's weight (x0 to x3). The FastAPI engine re-runs with the factors; nothing is scored in the browser. */
export function WeightTuner() {
  const m = useMission();
  const dims = m.result ? Object.keys(m.result.target_info.rules) : [];
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => setDraft(m.customWeights), [m.customWeights, m.targetId, m.experimentId]);

  if (!m.result || dims.length === 0) return null;
  const tuned = Object.keys(m.customWeights).length > 0;
  const effective = m.result.weights_used;

  return (
    <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-xl">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#142B50]">
          <Sliders className="w-4 h-4 text-[#0B5ED7]" />
          Calibrate dimension weights
          {tuned && <span className="px-2 py-0.5 rounded-full bg-[#FFF4E5] border border-[#A15C00]/30 text-[10px] text-[#A15C00]">custom weights active</span>}
        </span>
        <span className="text-[11px] text-[#68788F]">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 border-t border-[#E6ECF3] pt-3">
          <p className="text-[11px] text-[#68788F]">
            Factors multiply the mission profile&apos;s weights (1.0 = default, 0 = ignore). The engine re-ranks with your factors; results are then
            your hypothesis, not the default experiment profile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {dims.map((d) => {
              const v = draft[d] ?? 1;
              return (
                <div key={d}>
                  <label htmlFor={`w-${d}`} className="flex justify-between text-xs font-semibold text-[#142B50]">
                    <span>{dimLabel(d)}</span>
                    <span className="font-mono tabular-nums text-[#0B5ED7]">
                      ×{v.toFixed(1)}
                      {effective[d] !== undefined && <span className="text-[#68788F]"> (weight {effective[d]})</span>}
                    </span>
                  </label>
                  <input
                    id={`w-${d}`}
                    type="range"
                    min={0}
                    max={3}
                    step={0.1}
                    value={v}
                    onChange={(e) => setDraft({ ...draft, [d]: Number(e.target.value) })}
                    className="astranovus-slider w-full"
                  />
                </div>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => m.setCustomWeights(draft)}
              className="px-4 py-2 rounded-lg bg-[#0B5ED7] hover:bg-[#094DB3] text-[#FFFFFF] text-xs font-semibold"
            >
              Re-rank with these weights
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft({});
                m.setCustomWeights({});
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#E1E8F0] bg-[#FFFFFF] text-xs font-semibold text-[#142B50] hover:border-[#0B5ED7]"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset to profile
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
