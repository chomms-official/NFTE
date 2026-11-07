import { geoArea, geoCentroid, geoDistance, geoInterpolate } from "d3-geo";
import type { Polygon } from "geojson";
import type { CountryFeature } from "./simulator";

export type GlobeCoordinate = { lat: number; lng: number };
export type GlobeFlight = {
  id: number;
  from: GlobeCoordinate;
  to: GlobeCoordinate;
  startedAt: number;
  duration: number;
  zoom: number;
};

export const smoothFlightStep = (value: number) => {
  const t = Math.max(0, Math.min(1, value));
  return Math.max(0, Math.min(1, t * t * t * (t * (t * 6 - 15) + 10)));
};

/** A short visual journey, scaled by distance rather than a real flight schedule. */
export function flightDuration(from: GlobeCoordinate, to: GlobeCoordinate): number {
  return 5200 + 4200 * Math.sqrt(geoDistance([from.lng, from.lat], [to.lng, to.lat]) / Math.PI);
}

/** Shared takeoff/cruise/approach timing for both globe renderers. */
export function flightSample(flight: Pick<GlobeFlight, "from" | "to">, elapsed: number) {
  const t = Math.max(0, Math.min(1, elapsed));
  // Accelerate/decelerate over the first/last 18%, with constant cruise speed.
  const ramp = 0.18;
  const integral = (u: number) => 2.5 * u ** 4 - 3 * u ** 5 + u ** 6;
  const progress = t < ramp ? ramp * integral(t / ramp) / (1 - ramp)
    : t > 1 - ramp ? 1 - ramp * integral((1 - t) / ramp) / (1 - ramp)
      : (t - ramp / 2) / (1 - ramp);
  return { ...flightRouteSample(flight, progress),
    phase: t < 0.24 ? "Climbing" : t < 0.72 ? "Cruising" : "Descending" };
}

const radians = Math.PI / 180;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const longitude = (value: number) => ((value + 180) % 360 + 360) % 360 - 180;
const coordinate = ({ lat, lng }: GlobeCoordinate): GlobeCoordinate => ({
  lat: clamp(Number.isFinite(lat) ? lat : 0, -90, 90),
  lng: longitude(Number.isFinite(lng) ? lng : 0),
});
const pair = ({ lat, lng }: GlobeCoordinate): [number, number] => [lng, lat];

const unitVector = ({ lat, lng }: GlobeCoordinate) => [
  Math.cos(lat * radians) * Math.cos(lng * radians),
  Math.cos(lat * radians) * Math.sin(lng * radians), Math.sin(lat * radians),
];

/** A parabolic arch above the sphere, with level wings throughout the flight. */
export function flightRouteSample(flight: Pick<GlobeFlight, "from" | "to">, value: number) {
  const progress = clamp(Number.isFinite(value) ? value : 0, 0, 1);
  const from = coordinate(flight.from), to = coordinate(flight.to);
  const distance = geoDistance(pair(from), pair(to));
  const base = interpolateFlightPosition(from, to, progress);
  const lift = Math.min(0.38, distance * 0.32);
  const altitude = 0.009 + lift * 4 * progress * (1 - progress);
  return { ...base, progress, altitude, bank: 0 };
}

export const FLIGHT_TRAIL_SEGMENTS = 128;

/** Fixed route samples keep the dashes anchored as the flown path grows. */
export function flightTrailSamples(flight: Pick<GlobeFlight, "from" | "to">, progress: number) {
  if (!Number.isFinite(progress) || progress <= 0 || progress >= 1) return [];
  const count = Math.ceil(progress * FLIGHT_TRAIL_SEGMENTS);
  return Array.from({ length: count + 1 }, (_, i) =>
    flightRouteSample(flight, Math.min(i / FLIGHT_TRAIL_SEGMENTS, progress)));
}

/** Look obliquely at the route so its height is visible, then return to the country. */
export function flightCameraSample(flight: Pick<GlobeFlight, "from" | "to">, progress: number) {
  const p = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const reveal = smoothFlightStep(p / 0.22) * (1 - smoothFlightStep((p - 0.78) / 0.22));
  const base = interpolateFlightPosition(flight.from, flight.to, p + (0.5 - p) * reveal);
  const a = unitVector(coordinate(flight.from));
  const b = unitVector(interpolateFlightPosition(flight.from, flight.to, 0.5));
  const normal = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const length = Math.hypot(...normal);
  if (length < 1e-8 || reveal === 0) return base;
  const angle = 55 * radians * reveal * (normal[2] >= 0 ? -1 : 1);
  const point = unitVector(base).map((component, i) => component * Math.cos(angle) + normal[i] / length * Math.sin(angle));
  return { lat: Math.atan2(point[2], Math.hypot(point[0], point[1])) / radians,
    lng: longitude(Math.atan2(point[1], point[0]) / radians) };
}

/** Great-circle routing takes the short path across the date line. */
export function interpolateFlightPosition(from: GlobeCoordinate, to: GlobeCoordinate, progress: number): GlobeCoordinate {
  const start = coordinate(from), end = coordinate(to);
  const t = Number.isNaN(progress) ? 0 : clamp(progress, 0, 1);
  if (t === 0) return start;
  if (t === 1) return end;
  const distance = geoDistance(pair(start), pair(end));
  if (distance < 1e-10) return start;
  // Antipodal endpoints have infinitely many routes. Choose a deterministic
  // perpendicular direction instead of dividing by sin(PI), which is unstable.
  if (Math.PI - distance < 1e-7) {
    const lat = start.lat * radians, lng = start.lng * radians;
    const a = [Math.cos(lat) * Math.cos(lng), Math.cos(lat) * Math.sin(lng), Math.sin(lat)];
    const reference = Math.abs(a[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const dot = a.reduce((sum, value, i) => sum + value * reference[i], 0);
    const tangent = reference.map((value, i) => value - dot * a[i]);
    const magnitude = Math.hypot(...tangent);
    const position = a.map((value, i) => value * Math.cos(Math.PI * t) + tangent[i] / magnitude * Math.sin(Math.PI * t));
    return { lat: Math.atan2(position[2], Math.hypot(position[0], position[1])) / radians,
      lng: longitude(Math.atan2(position[1], position[0]) / radians) };
  }
  const [lng, lat] = geoInterpolate(pair(start), pair(end))(t);
  return { lat, lng: longitude(lng) };
}

/** Heading in degrees clockwise from geographic north along the route. */
export function flightBearing(from: GlobeCoordinate, to: GlobeCoordinate, progress = 0): number {
  const t = clamp(Number.isFinite(progress) ? progress : 0, 0, 1);
  const a = flightRouteSample({ from, to }, Math.max(0, t - 0.000001));
  const b = flightRouteSample({ from, to }, Math.min(1, t + 0.000001));
  const delta = longitude(b.lng - a.lng) * radians;
  const lat1 = a.lat * radians, lat2 = b.lat * radians;
  const heading = Math.atan2(Math.sin(delta) * Math.cos(lat2),
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(delta));
  return (heading / radians + 360) % 360;
}

/** Frame the main land cluster, including nearby islands but not distant territories. */
export function countryFraming(feature: CountryFeature, aspect = 1) {
  const coordinates = feature.geometry.coordinates;
  const candidates: Polygon[] = feature.geometry.type === "Polygon" && Array.isArray(coordinates)
    ? [{ type: "Polygon", coordinates: coordinates as Polygon["coordinates"] }]
    : feature.geometry.type === "MultiPolygon" && Array.isArray(coordinates)
      ? coordinates.map(rings => ({ type: "Polygon", coordinates: rings as Polygon["coordinates"] })) : [];
  let mainland: Polygon | undefined;
  let largest = 0;
  for (const polygon of candidates) {
    const area = geoArea(polygon);
    if (Number.isFinite(area) && area > largest) { mainland = polygon; largest = area; }
  }
  const mainlandCenter: [number, number] = mainland ? geoCentroid(mainland) : [0, 0];
  // Use spherical distance so neighbouring islands across 180 degrees stay
  // together. Mainland France excludes French Guiana; Indonesia includes Papua.
  const cluster = mainland ? candidates.filter(polygon => polygon === mainland
    || geoDistance(mainlandCenter, geoCentroid(polygon)) <= Math.PI / 4) : [];
  const centroid = cluster.length ? geoCentroid({ type: "MultiPolygon", coordinates: cluster.map(polygon => polygon.coordinates) }) : [0, 0];
  const center = coordinate({ lat: centroid[1], lng: centroid[0] });
  let radius = 0;
  for (const ring of cluster.flatMap(polygon => polygon.coordinates)) {
    for (let i = 0; i < ring.length; i++) {
      const point = ring[i], next = ring[(i + 1) % ring.length];
      if (!point || !next || !point.every(Number.isFinite) || !next.every(Number.isFinite)) continue;
      // Include the interior of long great-circle edges, not only vertices.
      const edge = geoInterpolate([point[0], point[1]], [next[0], next[1]]);
      const segments = Math.max(1, Math.ceil(geoDistance([point[0], point[1]], [next[0], next[1]]) / (5 * radians)));
      for (let step = 0; step <= segments; step++) radius = Math.max(radius, geoDistance(pair(center), edge(step / segments)));
    }
  }
  const angularRadius = clamp(radius > 0 ? radius * 1.08 + 0.001 : 0.2, 0.004, Math.PI / 2);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  const smallerDimension = Math.min(safeAspect, 1);
  const baseRadius = Math.min(safeAspect * 0.43, 0.35);
  // Keep the globe's horizon visible: its diameter occupies 86% of the shorter
  // viewport dimension, even for a tiny country or a narrow tablet side panel.
  const softwareZoom = 0.43 * smallerDimension / baseRadius;
  // Perspective silhouette radius = 1 / (tan(FOV/2) * sqrt(distance² - 1)).
  const halfFovTangent = Math.tan(25 * radians) * smallerDimension;
  const webglAltitude = Math.sqrt(1 + (1 / (0.86 * halfFovTangent)) ** 2) - 1;
  return { center, angularRadius, softwareZoom, webglAltitude };
}
