import snapshot from "../data/country-evidence.json";
import type { CountryFeature, MosquitoType } from "./simulator";

export type EvidenceSourceId = "population" | "malaria" | "dengue" | "je";
export type CountryObservation = {value: number | string; year: number; sourceId: EvidenceSourceId; url: string; scope?: string};
export type CountryEvidence = {name: string} & Record<EvidenceSourceId, CountryObservation | null>;
export const evidenceSources = snapshot.sources;
export const evidenceRetrievedAt = snapshot.retrievedAt;
export function getCountryEvidence(feature: CountryFeature): CountryEvidence | undefined {
  return (snapshot.countries as Record<string, CountryEvidence>)[String(feature.properties.ADM0_A3)];
}
export const speciesMetric: Record<MosquitoType, EvidenceSourceId> = {aedes:"dengue", anopheles:"malaria", culex:"je"};
export const metricDetails: Record<EvidenceSourceId, {label: string; unit: string; note: string}> = {
  population: {label:"Population", unit:"people", note:"Latest available year in the saved World Bank dataset."},
  dengue: {label:"Reported dengue cases", unit:"reported cases", note:"Annual reports to WHO, including clinical and laboratory-confirmed cases. Reporting coverage varies; this is not an estimate of all infections."},
  malaria: {label:"Estimated malaria incidence", unit:"cases per 1,000 people at risk", note:"An annual estimated rate, not a patient count or an individual risk score."},
  je: {label:"JE transmission season", unit:"CDC reference · 2026 edition", note:"Applies to the areas listed by CDC, not uniformly across the country. Surveillance is incomplete and seasonal patterns can change."},
};
