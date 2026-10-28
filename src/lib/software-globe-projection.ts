import { geoContains, geoDistance, geoOrthographic, type GeoProjection } from "d3-geo";
import type { Feature, Geometry } from "geojson";
import type { CountryFeature } from "./simulator";

export function asGeoFeature(feature: CountryFeature): Feature<Geometry> {
  return { type: "Feature", properties: feature.properties, geometry: feature.geometry as Geometry };
}

export function createGlobeProjection(rotation: [number, number, number] = [-100, -15, 0]) {
  return geoOrthographic().rotate(rotation).clipAngle(90).precision(0.5);
}

export function isVisibleOnGlobe(projection: GeoProjection, location: [number, number]): boolean {
  const centre = projection.invert?.(projection.translate());
  return !!centre && geoDistance(centre, location) <= Math.PI / 2;
}

/** Guard the circle before inversion: the rear hemisphere is never clickable. */
export function countryAtGlobePoint(
  projection: GeoProjection,
  countries: CountryFeature[],
  point: [number, number],
  geometryFor: (feature: CountryFeature) => Feature<Geometry> = asGeoFeature,
): CountryFeature | undefined {
  const [cx, cy] = projection.translate();
  if (Math.hypot(point[0] - cx, point[1] - cy) > projection.scale()) return;
  const location = projection.invert?.(point);
  if (!location) return;
  return countries.find(country => geoContains(geometryFor(country), location));
}
