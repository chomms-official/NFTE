/** Pure helpers for the illustrative simulator. No user data or storage access. */
export type CountryFeature = {
  properties: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
};
export type MosquitoType = "aedes" | "anopheles" | "culex";
export type SimulationDay = { date: string; count: number };

export function countryName(feature: CountryFeature): string {
  return String(feature.properties.ADMIN || feature.properties.NAME || "Unknown");
}

const number = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};
const longitude = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;

/** Representative centre of the largest land polygon, with antimeridian unwrapping. */
export function countryCenter(feature: CountryFeature): { lat: number; lng: number } {
  for (const [x, y] of [["LABEL_X", "LABEL_Y"], ["LON", "LAT"]]) {
    const lng = number(feature.properties[x]);
    const lat = number(feature.properties[y]);
    if (lng !== undefined && lat !== undefined && Math.abs(lat) <= 90) return { lat, lng: longitude(lng) };
  }
  const coordinates = feature.geometry.coordinates;
  const rings = feature.geometry.type === "Polygon"
    ? [Array.isArray(coordinates) ? coordinates[0] : null]
    : feature.geometry.type === "MultiPolygon" && Array.isArray(coordinates)
      ? coordinates.map(polygon => Array.isArray(polygon) ? polygon[0] : null) : [];
  let best: { weight: number; lat: number; lng: number } | undefined;
  for (const ring of rings) {
    if (!Array.isArray(ring)) continue;
    const points: [number, number][] = [];
    for (const point of ring) {
      if (!Array.isArray(point)) continue;
      let lng = number(point[0]);
      const lat = number(point[1]);
      if (lng === undefined || lat === undefined || Math.abs(lat) > 90) continue;
      if (points.length) {
        const previous = points[points.length - 1][0];
        while (lng - previous > 180) lng -= 360;
        while (lng - previous < -180) lng += 360;
      }
      points.push([lng, lat]);
    }
    if (!points.length) continue;
    let area = 0, cx = 0, cy = 0;
    for (let i = 0; i < points.length; i++) {
      const a = points[i], b = points[(i + 1) % points.length];
      const cross = a[0] * b[1] - b[0] * a[1];
      area += cross;
      cx += (a[0] + b[0]) * cross;
      cy += (a[1] + b[1]) * cross;
    }
    const lng = Math.abs(area) > 1e-8 ? cx / (3 * area) : points[0][0];
    const lat = Math.abs(area) > 1e-8 ? cy / (3 * area) : points[0][1];
    const weight = Math.abs(area) * Math.cos(lat * Math.PI / 180);
    if (!best || weight > best.weight) best = { weight, lat, lng };
  }
  return best ? { lat: Math.max(-90, Math.min(90, best.lat)), lng: longitude(best.lng) } : { lat: 0, lng: 0 };
}

/** The map, tooltip and detail panel must use exactly the same illustrative score. */
export function countryRisk(feature: CountryFeature, mosquito: MosquitoType, riskMap: Record<string, number>): number {
  const explicit = riskMap[countryName(feature)];
  if (Number.isFinite(explicit)) return Math.max(0, Math.min(10, explicit));
  const lat = Math.abs(countryCenter(feature).lat);
  const base = lat < 15 ? 4.5 : lat < 30 ? 3 : lat < 45 ? 1.5 : 0.5;
  if (mosquito === "aedes") return lat >= 45 ? 0.2 : base + 0.3;
  if (mosquito === "anopheles") return lat >= 45 ? 0.1 : base;
  return lat >= 45 ? 1.8 : base + 0.1;
}

export function simulationSeed(feature: CountryFeature, mosquito: MosquitoType): number {
  let seed = 2166136261;
  for (const character of `${countryName(feature)}:${mosquito}`) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

/** Seeded scaling keeps a country's chart stable when it is selected again. */
export function scaleSimulatedHistory(feature: CountryFeature, mosquito: MosquitoType, risk: number, raw: SimulationDay[]): SimulationDay[] {
  let seed = simulationSeed(feature, mosquito);
  const population = number(feature.properties.POP_EST ?? feature.properties.POP_EST_) ?? 1000000;
  const target = population <= 0 || risk <= 0 ? 0 : Math.max(50, population * Math.pow(risk / 10, 1.8) * 0.08);
  const rawTotal = raw.reduce((sum, day) => sum + day.count, 0);
  const multiplier = rawTotal ? target / rawTotal : 0;
  return raw.map(day => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return { date: day.date, count: Math.max(0, Math.floor(day.count * multiplier * (0.8 + (seed / 4294967296) * 0.4))) };
  });
}
