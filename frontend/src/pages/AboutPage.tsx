import { AstranovusLogo } from '../components/AstranovusLogo';
import { MEDIA } from '../assets/media';

export function AboutPage() {
  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-6">
      <div className="relative overflow-hidden glass-panel rounded-2xl p-6 sm:p-10">
        <img src={MEDIA.aboutMarsHorizon} alt="" className="absolute inset-0 w-full h-full object-cover object-right select-none pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#FFFFFF] via-[#FFFFFF]/92 via-55% to-transparent pointer-events-none" aria-hidden="true" />
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 space-y-4">
            <div className="inline-flex px-3 py-1 rounded-full bg-[#EDF3FA]/85 border border-[#0B5ED7]/15 text-xs font-semibold text-[#0B5ED7]">
              Team Astravant · NASA Space Apps Challenge 2026
            </div>
            <h1 className="font-display font-bold text-3xl text-[#142B50]">About ASTRANOVUS</h1>
            <p className="text-sm text-[#142B50]/85 leading-relaxed max-w-2xl">
              Challenge: <em>Identify Earth Locations that Analog the Permanent Moon Base Locations and Mars.</em> ASTRANOVUS starts from what a team
              wants to test (for example water-ice prospecting, rover mobility or astrobiology instruments) and recommends Earth regions whose
              measured environment best fits that purpose, with the data behind each answer made visible.
            </p>
          </div>
          <div className="lg:col-span-4 flex justify-center lg:justify-end">
            <div className="bg-[#000000] rounded-2xl p-4 border border-[#FFFFFF]/25 max-w-[230px] w-full flex flex-col items-center">
              <AstranovusLogo variant="full" className="w-full h-auto" />
              <div className="text-[11px] text-[#C7D2E0] mt-1">Team Astravant</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          ['Problem', 'Choosing a terrestrial field site for planetary hardware or science usually relies on scattered literature. Analog suitability depends on the purpose, and limits are rarely stated.'],
          ['Approach', 'An explainable, rule-and-weight similarity engine in Python. Each experiment adjusts weights and adds must-have gates. Results show reasons, weak points, coverage and confidence.'],
          ['Principles', 'No invented numbers. Missing data stays missing. Proxies are labelled. Scores are team estimates, not NASA ratings or landing-site certification.'],
        ].map(([t, d]) => (
          <div key={t} className="glass-panel rounded-2xl p-6 space-y-2">
            <h2 className="font-display font-bold text-lg text-[#142B50]">{t}</h2>
            <p className="text-sm text-[#68788F] leading-relaxed">{d}</p>
          </div>
        ))}
      </div>

      <div className="glass-panel rounded-2xl p-6 space-y-2">
        <h2 className="font-display font-bold text-lg text-[#142B50]">Technology</h2>
        <p className="text-sm text-[#68788F] leading-relaxed">
          Frontend: React, TypeScript, Vite, Tailwind CSS, Leaflet, react-globe.gl, Recharts. Backend: Python FastAPI with pandas and numpy; scoring in
          model/scoring_core.py and model/recommend.py. Earth data: NASA POWER climatology (supporting), with NASA Earthdata MODIS and GPM products
          downloaded and awaiting integration.
        </p>
      </div>
    </div>
  );
}
