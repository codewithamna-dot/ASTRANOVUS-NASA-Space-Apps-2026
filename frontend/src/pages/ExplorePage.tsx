import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { MEDIA, getTargetImage } from '../assets/media';
import { DataCoverageStrip, SyntheticDataWarning } from '../components/DataBanners';
import { ExperimentCard } from '../components/ExperimentCard';
import { ResultsPanel } from '../components/ResultsPanel';
import { ErrorPanel, InfoNote, LoadingPanel, StateChip } from '../components/StatusViews';
import { useMission } from '../state/MissionContext';
import type { Body } from '../types/astranovus';
import { BODY_ACCENT, bodyLabel } from '../utils/mission';

const BODY_COPY: Record<Body, { title: string; text: string; img: string }> = {
  moon: {
    title: 'Moon',
    text: 'Polar ice, lava tubes, regolith, long shadows and extreme temperature swings.',
    img: MEDIA.moonSurface,
  },
  mars: {
    title: 'Mars',
    text: 'Ancient sediments, subsurface ice, dust, thin cold atmosphere and crewed-mission rehearsal.',
    img: MEDIA.marsSurface,
  },
};

export function ExplorePage({ onOpenProfile }: { onOpenProfile: () => void }) {
  const m = useMission();
  const expRef = useRef<HTMLDivElement>(null);
  const siteRef = useRef<HTMLDivElement>(null);
  const resRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (m.body && !m.experimentId) expRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [m.body, m.experimentId]);
  useEffect(() => {
    if (m.experimentId) siteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [m.experimentId]);

  if (m.boot === 'loading') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <LoadingPanel message="Connecting to the ASTRANOVUS FastAPI engine..." />
      </div>
    );
  }
  if (m.boot === 'error') {
    return (
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-12">
        <ErrorPanel message={m.bootError ?? 'Backend unreachable.'} onRetry={m.retryBoot} />
      </div>
    );
  }

  const list = m.experiments.filter((e) => !m.body || e.body === m.body);
  const steps = [
    { n: 1, label: 'Destination', done: !!m.body },
    { n: 2, label: 'Test objective', done: !!m.experimentId },
    { n: 3, label: 'Planetary reference', done: !!m.targetId && !!m.experimentId },
    { n: 4, label: 'Earth analogs', done: m.resultStatus === 'ready' },
  ];
  const accent = m.body ? BODY_ACCENT[m.body] : '#0B5ED7';

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div className="space-y-3">
        <h1 className="font-display font-extrabold text-3xl text-[#142B50]">Find Earth analogs for your mission</h1>
        <p className="text-sm text-[#68788F] max-w-3xl leading-relaxed">
          Choose a destination and what you want to test. ASTRANOVUS ranks Earth regions for that objective and shows the data behind each answer.
        </p>
        <SyntheticDataWarning />
        <DataCoverageStrip />
        {m.experimentsMeta && <InfoNote>{m.experimentsMeta.notice}</InfoNote>}
      </div>

      <ol className="flex flex-wrap gap-2" aria-label="Workflow progress">
        {steps.map((s) => (
          <li
            key={s.n}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              s.done ? 'bg-[#EAF7EE] border-[#177A3C]/30 text-[#177A3C]' : 'bg-[#FFFFFF] border-[#E1E8F0] text-[#68788F]'
            }`}
          >
            <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-[#FFFFFF] border border-current">
              {s.done ? <Check className="w-3 h-3" /> : s.n}
            </span>
            {s.label}
          </li>
        ))}
        {m.body && (
          <li>
            <button type="button" onClick={m.resetMission} className="px-3 py-1.5 text-xs font-semibold text-[#0B5ED7] hover:underline">
              Start over
            </button>
          </li>
        )}
      </ol>

      {/* Step 1 */}
      <section aria-labelledby="step1" className="space-y-3">
        <h2 id="step1" className="font-display font-bold text-lg text-[#142B50]">
          1. Choose a destination
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
          {(['moon', 'mars'] as Body[]).map((b) => {
            const c = BODY_COPY[b];
            const on = m.body === b;
            return (
              <button
                key={b}
                type="button"
                onClick={() => m.setBody(b)}
                aria-pressed={on}
                className="relative overflow-hidden rounded-2xl text-left h-40 border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5ED7]"
                style={{ borderColor: on ? BODY_ACCENT[b] : '#E1E8F0' }}
              >
                <img src={c.img} alt="" className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#142B50]/90 via-[#142B50]/40 to-transparent" />
                <div className="relative h-full flex flex-col justify-end p-4 text-[#FFFFFF]">
                  <div className="font-display font-extrabold text-2xl">{c.title}</div>
                  <div className="text-xs text-[#E1E8F0]">{c.text}</div>
                </div>
                {on && (
                  <span className="absolute top-3 right-3 w-6 h-6 rounded-full bg-[#FFFFFF] flex items-center justify-center" style={{ color: BODY_ACCENT[b] }}>
                    <Check className="w-4 h-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2 */}
      {m.body && (
        <section ref={expRef} aria-labelledby="step2" className="space-y-3 scroll-mt-24">
          <div>
            <h2 id="step2" className="font-display font-bold text-lg text-[#142B50]">
              2. What do you want to test on {bodyLabel(m.body)}?
            </h2>
            <p className="text-xs text-[#68788F]">Click an objective to open its details; the experiment is selected at the same time.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
            {list.map((e) => (
              <ExperimentCard key={e.id} experiment={e} selected={m.experimentId === e.id} onSelect={() => m.setExperiment(e.id)} />
            ))}
          </div>
        </section>
      )}

      {/* Step 3 */}
      {m.experiment && (
        <section ref={siteRef} aria-labelledby="step3" className="space-y-3 scroll-mt-24">
          <div>
            <h2 id="step3" className="font-display font-bold text-lg text-[#142B50]">
              3. Which {bodyLabel(m.experiment.body)} environment should Earth imitate?
            </h2>
            <p className="text-xs text-[#68788F]">
              Only reference sites that the mission profile <span className="font-mono">{m.experiment.purpose.id}</span> defines for the{' '}
              {bodyLabel(m.experiment.body)} are listed. Your choice changes the request sent to the engine.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {m.experiment.allowed_targets.map((t) => {
              const on = m.targetId === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    m.setTarget(t.id);
                    resRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  aria-pressed={on}
                  className="text-left rounded-xl bg-[#FFFFFF] overflow-hidden border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B5ED7]"
                  style={{ borderColor: on ? accent : '#E1E8F0' }}
                >
                  <div className="relative h-28">
                    <img src={getTargetImage(t.id)} alt="" className="w-full h-full object-cover" />
                    <span className="absolute bottom-1 right-2 text-[9px] text-[#FFFFFF]/80">Illustrative image</span>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-bold text-sm text-[#142B50]">{t.name}</h3>
                      <StateChip state={t.readiness.state} />
                    </div>
                    <p className="text-xs text-[#68788F] leading-relaxed">{t.description}</p>
                    <div className="flex flex-wrap gap-1.5 text-[10px] font-semibold">
                      {t.is_draft && <span className="px-2 py-0.5 rounded-full bg-[#FFF4E5] text-[#A15C00] border border-[#A15C00]/30">draft profile</span>}
                      <span className="px-2 py-0.5 rounded-full bg-[#EDF3FA] text-[#142B50]">{t.status}</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#EDF3FA] text-[#142B50]" title="Rules whose direction is backed by a retrieved NASA/planetary source (qualitative)">
                        evidence {t.evidence.grounded}/{t.evidence.total} rules
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-[#EDF3FA] text-[#142B50]">
                        {Math.round(t.readiness.max_coverage * 100)}% of criteria have data
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Step 4 */}
      {m.experimentId && m.targetId && (
        <div ref={resRef} className="scroll-mt-24">
          <ResultsPanel onOpenProfile={onOpenProfile} />
        </div>
      )}
    </div>
  );
}
