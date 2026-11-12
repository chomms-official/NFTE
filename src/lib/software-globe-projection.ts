import { geoBounds, geoContains, geoDistance, geoInterpolate, geoOrthographic, type GeoProjection } from "d3-geo";
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

/** Project the same radial altitude as WebGL, including points beyond the limb. */
export function projectElevatedPoint(projection: GeoProjection, location: [number, number], altitude: number): [number, number] | null {
  const surface = projection(location);
  const centre = projection.invert?.(projection.translate());
  if (!surface || !centre) return null;
  const [cx, cy] = projection.translate();
  const x = (surface[0] - cx) * (1 + altitude), y = (surface[1] - cy) * (1 + altitude);
  if (geoDistance(centre, location) > Math.PI / 2 && Math.hypot(x, y) <= projection.scale()) return null;
  return [cx + x, cy + y];
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

const rad = Math.PI / 180;
const vector = (lng: number, lat: number) => [
  Math.cos(lat * rad) * Math.sin(lng * rad), Math.sin(lat * rad), Math.cos(lat * rad) * Math.cos(lng * rad),
];

/** A conservative spherical cap classifies compact countries without clipping.
 * Wide or polar shapes always use the original D3 path. */
export function prepareCountryOutline(feature: Feature<Geometry>) {
  if (feature.geometry.type !== "Polygon" && feature.geometry.type !== "MultiPolygon") return null;
  const [[west, south], [east, north]] = geoBounds(feature);
  const span = east >= west ? east - west : east + 360 - west;
  const radius = (north - south + span) * rad / 2;
  if (!Number.isFinite(radius) || radius >= Math.PI / 2) return null;
  const centre = vector(west + span / 2, (south + north) / 2);
  const polygons = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const rings: Float64Array[] = [];
  for (const polygon of polygons) for (const ring of polygon) {
    const points: number[] = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i] as [number, number], b = ring[i + 1] as [number, number];
      points.push(...vector(a[0], a[1]));
      // A 3-degree great-circle chord deviates by <0.25px at our maximum scale.
      const segments = Math.ceil(geoDistance(a, b) / (3 * rad));
      if (segments > 1) {
        const along = geoInterpolate(a, b);
        for (let j = 1; j < segments; j++) points.push(...vector(...along(j / segments)));
      }
    }
    rings.push(new Float64Array(points));
  }
  return { centre, limit: Math.sin(radius) + 1e-10, rings };
}

/** Project cached vertices only when the entire outline is in the front hemisphere. */
export function traceCountryOutline(ctx: CanvasRenderingContext2D, outline: ReturnType<typeof prepareCountryOutline>,
  view: readonly number[], cx: number, cy: number, scale: number): "drawn" | "hidden" | "clip" {
  if (!outline) return "clip";
  const [x, y, z] = outline.centre;
  const centreDepth = view[2]*x + view[6]*y + view[10]*z;
  if (centreDepth < -outline.limit) return "hidden";
  if (centreDepth <= outline.limit || scale > 700) return "clip";
  for (const ring of outline.rings) {
    for (let i = 0; i < ring.length; i += 3) {
      const px = cx + scale * (view[0]*ring[i] + view[4]*ring[i+1] + view[8]*ring[i+2]);
      const py = cy - scale * (view[1]*ring[i] + view[5]*ring[i+1] + view[9]*ring[i+2]);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  return "drawn";
}
