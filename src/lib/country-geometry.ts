import type { CountryFeature } from "./simulator";
import type { Position, Polygon, MultiPolygon } from "geojson";

// At the old 5° resolution, Greenland cap facets dipped below the earth mesh.
export const COUNTRY_CAP_RESOLUTION = 2;
export const COUNTRY_ALTITUDE = 0.005;

/** Remove a retraced map-cut seam, not a real coastline or an interior hole. */
function removePoleSeam(ring: Position[]): Position[] {
  const points = ring.slice(0, -1);
  const removed = new Set<number>();
  for (let i = 0; i < points.length; i++) {
    const indices = [0, 1, 2, 3].map(offset => (i + offset) % points.length);
    const [a, poleA, poleB, b] = indices.map(index => points[index]);
    if (Math.abs(a[0]) === 180 && a[0] === poleA[0]
      && poleA[1] === poleB[1] && Math.abs(poleA[1]) === 90
      && b[0] === poleB[0] && a[0] === -b[0] && a[1] === b[1]) {
      indices.slice(1).forEach(index => removed.add(index));
    }
  }
  if (!removed.size) return ring;
  const coast = points.filter((_, index) => !removed.has(index));
  return [...coast, coast[0]];
}

export function prepareCountryGeometry<T extends CountryFeature>(country: T): T {
  const geometry = country.geometry as Polygon | MultiPolygon;
  if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") return country;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const cleaned = polygons.map(polygon => polygon.map(removePoleSeam));
  if (cleaned.every((polygon, i) => polygon.every((ring, j) => ring === polygons[i][j]))) return country;
  return { ...country, geometry: { ...geometry, coordinates: geometry.type === "Polygon" ? cleaned[0] : cleaned } };
}
