import type { CountryFeature, MosquitoType } from "@/lib/simulator";
import {evidenceRetrievedAt, evidenceSources, getCountryEvidence, metricDetails, speciesMetric, type CountryObservation, type EvidenceSourceId} from "@/lib/country-evidence";

function EvidenceCard({metric, observation}: {metric: EvidenceSourceId; observation?: CountryObservation | null}) {
  const detail = metricDetails[metric];
  const source = observation ? evidenceSources[observation.sourceId] : null;
  return <div className="min-w-0 rounded-xl border border-white/10 bg-black/25 p-4">
    <div className="flex items-start justify-between gap-2">
      <h4 className="text-xs font-medium text-zinc-300">{detail.label}</h4>
      {observation && <span className="shrink-0 rounded bg-white/5 px-2 py-0.5 text-[11px] text-zinc-400">{observation.year}</span>}
    </div>
    {observation ? <>
      <p className={`${typeof observation.value === 'number' ? 'text-2xl' : 'text-lg'} mt-2 font-semibold leading-snug text-white tabular-nums`}>
        {typeof observation.value === 'number' ? observation.value.toLocaleString('en-US', {maximumFractionDigits: metric === 'malaria' ? 2 : 0}) : observation.value}
      </p>
      <p className="mt-1 text-[11px] text-zinc-400">{detail.unit}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">{detail.note} {observation.scope}</p>
      <a href={observation.url} target="_blank" rel="noopener noreferrer" className="mt-3 block text-xs text-emerald-300 underline decoration-emerald-800 underline-offset-4 hover:text-emerald-200">
        Source: {source?.name} ↗
      </a>
    </> : <>
      <p className="mt-3 text-2xl text-zinc-500" aria-label="No verified data">—</p>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">No verified data in this snapshot. A blank value does not mean zero cases or no transmission.</p>
    </>}
  </div>;
}

export function CountryEvidencePanel({country, mosquito}: {country: CountryFeature; mosquito: MosquitoType}) {
  const evidence = getCountryEvidence(country);
  const metric = speciesMetric[mosquito];
  return <section aria-label="Published country data" className="mb-7 rounded-2xl border border-emerald-400/20 bg-emerald-950/10 p-4 sm:p-5 font-sans">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-emerald-200">Published country data</h3>
      <span className="text-[10px] text-zinc-400">Saved {evidenceRetrievedAt} · available offline</span>
    </div>
    <div className="grid grid-cols-1 min-[1200px]:grid-cols-2 gap-3">
      <EvidenceCard metric="population" observation={evidence?.population} />
      <EvidenceCard metric={metric} observation={evidence?.[metric]} />
    </div>
    <p className="mt-3 text-[11px] leading-relaxed text-zinc-400">Each item has its own year and source. These published figures do not generate the simulated scores or daily chart below. Reference websites require internet.</p>
    <details className="mt-3 text-[11px] text-zinc-400">
      <summary className="cursor-pointer hover:text-white">Data definitions &amp; attribution</summary>
      <div className="mt-2 space-y-2 leading-relaxed">
        {[evidence?.population, evidence?.[metric]].filter((o): o is CountryObservation => !!o).map(o => <p key={o.sourceId}>{evidenceSources[o.sourceId].attribution}</p>)}
        {metric === 'dengue' && evidence?.dengue && <p>WHO report published 26 Dec 2025; 2024 data reported by 10 Dec 2025. Country and territory rows are kept separate.</p>}
      </div>
    </details>
  </section>;
}
