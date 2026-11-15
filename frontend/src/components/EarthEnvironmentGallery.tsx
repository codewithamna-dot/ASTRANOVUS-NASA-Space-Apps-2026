import { useState } from 'react';
import { EARTH_PHOTOS, type EarthPhoto } from '../data/earthPhotos';

const ORDER = ['antarctic_dry_valley', 'arctic_polar_desert', 'lava_tube', 'iceland_askja', 'hawaii_kilauea', 'atacama', 'death_valley', 'tibetan_plateau', 'gobi_dunes', 'karakoram'];

function Card({ p }: { p: EarthPhoto }) {
  const [open, setOpen] = useState(false);
  return (
    <figure className="an-card bg-[#FFFFFF] border border-[#E1E8F0] rounded-xl overflow-hidden flex flex-col">
      <div className="relative">
        <img src={p.src} alt={p.title} loading="lazy" decoding="async" className="w-full h-40 object-cover" />
        <span
          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
            p.match === 'site' ? 'bg-[#142B50]/90 text-[#FFFFFF]' : 'bg-[#FFFFFF]/92 text-[#142B50] border border-[#E1E8F0]'
          }`}
        >
          {p.match === 'site' ? 'Documented analog place' : 'Representative landscape'}
        </span>
      </div>
      <figcaption className="p-3.5 space-y-2 flex-1 flex flex-col">
        <div>
          <div className="text-[10px] font-semibold text-[#0B5ED7]">{p.type}</div>
          <div className="font-display font-bold text-[13px] text-[#142B50] leading-snug">{p.title}</div>
          <div className="text-[11px] text-[#68788F]">Relevant to: {p.relevance}</div>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="self-start text-[11px] font-semibold text-[#0B5ED7] hover:underline"
        >
          {open ? 'Hide eligibility' : 'Why it qualifies'}
        </button>
        {open && (
          <div className="text-[11px] text-[#142B50] space-y-1 bg-[#F4F8FF] border border-[#E1E8F0] rounded-lg p-2.5">
            <div>
              <strong>Eligibility:</strong> {p.eligibility}
            </div>
            <div className="text-[#6B3F00]">
              <strong>Limit:</strong> {p.limitation}
            </div>
          </div>
        )}
        <div className="mt-auto text-[9px] text-[#68788F]">
          Photo: {p.credit.author} · {p.credit.license} ·{' '}
          <a href={p.credit.page} target="_blank" rel="noopener noreferrer" className="text-[#0B5ED7] underline">
            source
          </a>
        </div>
      </figcaption>
    </figure>
  );
}

/** Photographs of the kinds of Earth environments used as planetary analogs, with licence credits. Context only: not recommendations. */
export function EarthEnvironmentGallery() {
  return (
    <section className="max-w-[1440px] mx-auto px-4 sm:px-8" aria-labelledby="gallery-h">
      <div className="mb-4">
        <h2 id="gallery-h" className="font-display font-bold text-2xl text-[#142B50]">Earth environments that stand in for the Moon and Mars</h2>
        <p className="text-sm text-[#68788F] mt-1">
          Examples of terrain researchers use as analogs. Photos show environment types, not ASTRANOVUS recommendations or measurements.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {ORDER.map((k) => (
          <Card key={k} p={EARTH_PHOTOS[k]} />
        ))}
      </div>
    </section>
  );
}
