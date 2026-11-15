import {
  Building2,
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Microscope,
  Navigation,
  Pickaxe,
  Snowflake,
  Sun,
  Users,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { DataState, Experiment } from '../types/astranovus';
import { DOC_LEVEL_LABEL, DOC_LEVEL_STYLE } from '../utils/mission';
import { StateChip } from './StatusViews';

const ICONS: Record<string, LucideIcon> = {
  MOON_WATER_ICE: Snowflake,
  MARS_SUBSURFACE_ICE: Snowflake,
  MOON_ROVER_MOBILITY: Navigation,
  MARS_ROVER_MOBILITY: Navigation,
  MOON_REGOLITH_DUST: Wind,
  MARS_DUST_THERMAL: Wind,
  MOON_POWER_THERMAL: Sun,
  MOON_HABITAT_OPS: Building2,
  MARS_CREW_OPS: Users,
  MOON_GEO_FIELDWORK: Pickaxe,
  MARS_GEOLOGY_SAMPLING: Pickaxe,
  MARS_ASTROBIOLOGY: Microscope,
};

const ORDER: DataState[] = ['ready', 'partial', 'unavailable'];

/** Best data state across the experiment's compatible reference sites. */
export function bestState(e: Experiment): DataState {
  const states = e.allowed_targets.map((t) => t.readiness.state);
  return ORDER.find((s) => states.includes(s)) ?? 'unavailable';
}

interface Props {
  experiment: Experiment;
  selected: boolean;
  onSelect: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <h4 className="text-[10px] font-bold uppercase tracking-wide text-[#68788F]">{title}</h4>
      {children}
    </div>
  );
}

/** Accordion card: icon, name and a one-line summary; click selects it and expands the details, click again collapses. */
export function ExperimentCard({ experiment: e, selected, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[e.id] ?? FlaskConical;
  const accent = e.body === 'mars' ? '#F28B45' : '#0B5ED7';
  const panelId = `exp-panel-${e.id}`;

  // Selecting another experiment collapses this one.
  useEffect(() => {
    if (!selected) setOpen(false);
  }, [selected]);

  const toggle = () => {
    if (!selected) {
      onSelect();
      setOpen(true);
    } else {
      setOpen((v) => !v);
    }
  };

  const oneLine = e.what_is_tested.split(/(?<=\.)\s/)[0];

  return (
    <div
      className={`rounded-xl border bg-[#FFFFFF] transition-all duration-200 flex flex-col self-start w-full ${selected ? 'shadow-md' : 'hover:border-[#0B5ED7]/60 hover:shadow-sm'}`}
      style={{ borderColor: selected ? accent : '#E1E8F0', borderWidth: selected ? 2 : 1 }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-controls={panelId}
        aria-pressed={selected}
        className="text-left p-4 flex items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5ED7] rounded-xl"
      >
        <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[#FFFFFF]" style={{ backgroundColor: accent }} aria-hidden="true">
          <Icon className="w-5 h-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display font-bold text-sm text-[#142B50] leading-snug">{e.name}</span>
          <span className={`block text-xs text-[#68788F] leading-relaxed mt-0.5 ${open ? '' : 'line-clamp-1'}`}>{oneLine}</span>
        </span>
        <ChevronDown className={`w-4 h-4 mt-1 shrink-0 text-[#68788F] transition-transform duration-300 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      <div id={panelId} role="region" className={`grid transition-[grid-template-rows] duration-300 ease-out ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className={`px-4 pb-4 text-xs text-[#142B50] leading-relaxed border-t border-[#E6ECF3] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}>
            <div className="pt-3.5 space-y-3.5">
              <Section title="What it tests">
                <p>{e.what_is_tested}</p>
              </Section>

              <Section title="Environmental requirements">
                <div className="flex flex-wrap gap-1.5">
                  {e.environment_requirements.map((r) => (
                    <span key={r} className="px-2 py-0.5 rounded bg-[#EDF3FA] text-[10px] font-medium text-[#142B50]">
                      {r}
                    </span>
                  ))}
                </div>
              </Section>

              <Section title="NASA relevance">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${DOC_LEVEL_STYLE[e.nasa_documented.level]}`}>{DOC_LEVEL_LABEL[e.nasa_documented.level]}</span>
                </div>
                <p className="text-[#68788F]">{e.nasa_documented.summary}</p>
                <ul className="space-y-0.5">
                  {e.nasa_documented.sources.map((s) => (
                    <li key={s.id}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0B5ED7] font-semibold hover:underline">
                        {s.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Data availability">
                <ul className="space-y-1">
                  {e.allowed_targets.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2">
                      <span className="truncate">{t.name}</span>
                      <span className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-[10px] text-[#68788F]">{Math.round(t.readiness.max_coverage * 100)}% of criteria</span>
                        <StateChip state={t.readiness.state} />
                      </span>
                    </li>
                  ))}
                </ul>
              </Section>

              <Section title="Testing suitability">
                <p>
                  <strong>Why it matters:</strong> {e.why}
                </p>
                <ul className="list-disc pl-5 text-[#142B50] space-y-0.5">
                  {e.applications.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </Section>

              <Section title="Limitations">
                {e.draft_assumption && (
                  <p className="bg-[#FFF4E5] border border-[#A15C00]/30 rounded-lg px-3 py-2 text-[#6B3F00]">
                    <strong>Draft assumption:</strong> {e.draft_assumption}
                  </p>
                )}
                {e.shares_profile_note && <p className="text-[#68788F]">{e.shares_profile_note}</p>}
                <p className="text-[#68788F]">Earth cannot reproduce:</p>
                <ul className="list-disc pl-5 text-[#68788F] space-y-0.5">
                  {e.cannot_reproduce.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
