import { BookOpen, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useEffect, useState } from 'react';
import { API_BASE } from '../api/client';

interface Measurement {
  id: string;
  quantity: string;
  value: string;
  units: string;
  location: string;
  evidence_class: string;
  scope: string;
  retrieval: string;
  evidence_quality?: string;
  instrument_or_method: string;
  spatial_resolution: string;
  source_url: string;
  notes: string;
}
interface EvidenceResponse {
  measurements: Measurement[];
  counts: Record<string, number>;
  note: string;
}

const CLASS_STYLE: Record<string, string> = {
  observed: 'bg-[#EAF7EE] text-[#177A3C]',
  derived: 'bg-[#E8F0FE] text-[#0B5ED7]',
  inferred: 'bg-[#FFF4E5] text-[#A15C00]',
};

/** Numerical planetary measurements for the chosen reference site, each with class, scope and retrieval quality. */
export function ReferenceEvidence({ targetId, targetName }: { targetId: string; targetName: string }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<EvidenceResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    setData(null);
    setErr(null);
    fetch(`${API_BASE}/evidence/${encodeURIComponent(targetId)}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`evidence request failed (${r.status})`))))
      .then(setData)
      .catch((e: Error) => e.name !== 'AbortError' && setErr(e.message));
    return () => ac.abort();
  }, [targetId]);

  const c = data?.counts;
  return (
    <div className="bg-[#FFFFFF] border border-[#E1E8F0] rounded-xl">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#142B50]">
          <BookOpen className="w-4 h-4 text-[#0B5ED7]" />
          Planetary measurements for {targetName}
          {c && (
            <span className="text-[11px] font-normal text-[#68788F]">
              {c.measurements_site} site · {c.measurements_region} regional · {c.measurements_body_generic} generic
            </span>
          )}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#E6ECF3] pt-3 space-y-2">
          {err && <p className="text-xs text-[#B42318]">{err}</p>}
          {!data && !err && <p className="text-xs text-[#68788F]">Loading...</p>}
          {data && data.measurements.length === 0 && (
            <p className="text-xs text-[#68788F]">No numerical measurement has been retrieved for this site yet; see the manual evidence checklist.</p>
          )}
          {data?.measurements.map((m) => (
            <div key={m.id} className="rounded-lg border border-[#E1E8F0] bg-[#F4F8FF] px-3 py-2 text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-[#142B50]">
                  {m.quantity}: <span className="font-mono">{m.value} {m.units}</span>
                </span>
                <span className="flex gap-1.5 text-[10px] font-semibold">
                  <span className={`px-2 py-0.5 rounded-full ${CLASS_STYLE[m.evidence_class] ?? 'bg-[#EDF3FA]'}`}>{m.evidence_class}</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#EDF3FA] text-[#142B50]">{m.scope === 'body' ? 'generic body property' : m.scope === 'region' ? 'regional' : 'site'}</span>
                  {m.evidence_quality && m.evidence_quality !== 'unverified' && <span className="px-2 py-0.5 rounded-full bg-[#F4F8FF] text-[#142B50]">{m.evidence_quality.replace(/_/g, ' ')}</span>}
                  {m.retrieval === 'search_summary' && <span className="px-2 py-0.5 rounded-full bg-[#FDECEC] text-[#B42318]">unverified: re-verify</span>}
                </span>
              </div>
              <div className="text-[#68788F]">
                {m.location} · {m.instrument_or_method}
                {m.spatial_resolution && m.spatial_resolution !== 'n/s' ? ` · resolution ${m.spatial_resolution}` : ''}
              </div>
              {m.notes && <div className="text-[#68788F]">{m.notes}</div>}
              <a href={m.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#0B5ED7] font-semibold hover:underline">
                Source <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ))}
          {data && <p className="text-[11px] text-[#68788F]">{data.note}</p>}
        </div>
      )}
    </div>
  );
}
