import { Matrix3, Matrix4, Mesh, MeshPhongMaterial, Vector3 } from "three";
import { createAirliner } from "./airliner";
import { FLIGHT_CLEARANCE, interpolateFlightPosition, type GlobeCoordinate, type GlobeFlight } from "./globe-navigation";

type Route = Pick<GlobeFlight, "from" | "to">;
type FlightPoint = GlobeCoordinate & { progress: number; pitch: number; altitude: number; opacity: number };
export type AircraftFrame = {
  flight: GlobeFlight;
  point: FlightPoint;
  x: number; y: number;
  view: Matrix4;
  shadow: [number, number] | null;
};

const radians = Math.PI / 180;
const direction = ({ lat, lng }: GlobeCoordinate) => new Vector3(
  Math.cos(lat * radians) * Math.sin(lng * radians), Math.sin(lat * radians),
  Math.cos(lat * radians) * Math.cos(lng * radians),
);

/** Model axes are starboard +X, dorsal +Y and nose -Z. The ground heading is
 * independent of the steeper, deliberately exaggerated altitude parabola. */
export function aircraftAttitude(route: Route, point: FlightPoint) {
  const up = direction(point);
  const before = interpolateFlightPosition(route.from, route.to, Math.max(0, point.progress - 0.0001));
  const after = interpolateFlightPosition(route.from, route.to, Math.min(1, point.progress + 0.0001));
  const forward = direction(after).sub(direction(before)).projectOnPlane(up);
  if (forward.lengthSq() < 1e-22) forward.set(Math.cos(point.lng * radians), 0, -Math.sin(point.lng * radians));
  forward.normalize();
  const right = new Vector3().crossVectors(forward, up).normalize();
  forward.multiplyScalar(Math.cos(point.pitch)).addScaledVector(up, Math.sin(point.pitch));
  return new Matrix4().makeBasis(right, new Vector3().crossVectors(right, forward), forward.negate());
}

/** World-to-view rotation for the software globe's north-up orthographic projection. */
export function orthographicAircraftView(lat: number, lng: number) {
  const up = direction({ lat, lng });
  const east = new Vector3(Math.cos(lng * radians), 0, -Math.sin(lng * radians));
  return new Matrix4().makeBasis(east, new Vector3().crossVectors(up, east), up).transpose();
}

/** The foreground canvas still respects the earth between the camera and the aircraft. */
export function earthOccludes(eye: Vector3, point: Vector3, radius: number) {
  const ray = point.clone().sub(eye);
  const along = Math.max(0, Math.min(1, -eye.dot(ray) / (ray.lengthSq() || 1)));
  return ray.multiplyScalar(along).add(eye).lengthSq() < radius * radius;
}

export const AIRCRAFT_TILE = 64;
const resolution = AIRCRAFT_TILE * 2;

function readAirframe() {
  const model = createAirliner();
  model.updateMatrixWorld(true);
  const vertices: number[] = [], faces: number[] = [];
  const position = new Vector3(), normal = new Vector3();
  const normalMatrix = new Matrix3();
  let beaconStart = 0;
  const geometries = new Set<Mesh["geometry"]>(), materials = new Set<MeshPhongMaterial>();
  model.traverse(child => {
    if (!(child instanceof Mesh)) return;
    const geometry = child.geometry, material = child.material as MeshPhongMaterial;
    const start = vertices.length / 10;
    const rgb = material.color.getHex();
    const unlit = material.type === "MeshBasicMaterial" ? 1 : 0;
    if (child.name === "beacon") beaconStart = faces.length;
    normalMatrix.getNormalMatrix(child.matrixWorld);
    for (let i = 0; i < geometry.attributes.position.count; i++) {
      position.fromBufferAttribute(geometry.attributes.position, i).applyMatrix4(child.matrixWorld);
      normal.fromBufferAttribute(geometry.attributes.normal, i).applyNormalMatrix(normalMatrix);
      vertices.push(position.x, position.y, position.z, normal.x, normal.y, normal.z,
        rgb >> 16, (rgb >> 8) & 255, rgb & 255, unlit);
    }
    const count = geometry.index?.count ?? geometry.attributes.position.count;
    for (let i = 0; i < count; i++) faces.push(start + (geometry.index ? geometry.index.getX(i) : i));
    geometries.add(geometry); materials.add(material);
  });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
  return { vertices: new Float32Array(vertices), faces: new Uint32Array(faces), beaconStart };
}

/** Render the existing 3D airframe into one small transparent tile. A depth buffer
 * orders the wings, fuselage and engines without requiring a second WebGL context. */
export function createAircraftPainter() {
  const { vertices, faces, beaconStart } = readAirframe();
  const projected = new Float32Array(vertices.length / 10 * 6);
  const pixels = new Uint8ClampedArray(resolution * resolution * 4);
  const depth = new Float32Array(resolution * resolution);
  const light = new Vector3(-0.45, 0.65, 0.68).normalize();
  const half = light.clone().add(new Vector3(0, 0, 1)).normalize();
  return { resolution, pixels, paint(view: Matrix4, lengthPx: number, time: number) {
    pixels.fill(0); depth.fill(-Infinity);
    const e = view.elements, scale = lengthPx * 2 / 12.2;
    for (let i = 0, j = 0; i < vertices.length; i += 10, j += 6) {
      const x = vertices[i], y = vertices[i + 1], z = vertices[i + 2];
      projected[j] = resolution / 2 + scale * (e[0] * x + e[4] * y + e[8] * z);
      projected[j + 1] = resolution / 2 - scale * (e[1] * x + e[5] * y + e[9] * z);
      projected[j + 2] = e[2] * x + e[6] * y + e[10] * z;
      const nx = vertices[i + 3], ny = vertices[i + 4], nz = vertices[i + 5];
      const vx = e[0]*nx + e[4]*ny + e[8]*nz, vy = e[1]*nx + e[5]*ny + e[9]*nz, vz = e[2]*nx + e[6]*ny + e[10]*nz;
      const diffuse = vertices[i + 9] ? 1 : 0.48 + 0.56 * Math.max(0, vx*light.x + vy*light.y + vz*light.z);
      const specular = vertices[i + 9] ? 0 : 42 * Math.max(0, vx*half.x + vy*half.y + vz*half.z) ** 22;
      for (let c = 0; c < 3; c++) projected[j + 3 + c] = vertices[i + 6 + c] * diffuse + specular;
    }
    const flash = time % 1600;
    const count = flash < 110 || (flash > 230 && flash < 310) ? faces.length : beaconStart;
    for (let i = 0; i < count; i += 3) {
      const a = faces[i]*6, b = faces[i + 1]*6, c = faces[i + 2]*6;
      const ax = projected[a], ay = projected[a + 1], bx = projected[b], by = projected[b + 1], cx = projected[c], cy = projected[c + 1];
      const area = (bx-ax)*(cy-ay) - (by-ay)*(cx-ax);
      if (area >= -1e-8) continue;
      const x0 = Math.max(0, Math.ceil(Math.min(ax,bx,cx)-0.5)), x1 = Math.min(resolution-1, Math.floor(Math.max(ax,bx,cx)-0.5));
      const y0 = Math.max(0, Math.ceil(Math.min(ay,by,cy)-0.5)), y1 = Math.min(resolution-1, Math.floor(Math.max(ay,by,cy)-0.5));
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5 - ax, py = y + 0.5 - ay;
        const wb = (px*(cy-ay) - py*(cx-ax))/area, wc = ((bx-ax)*py - (by-ay)*px)/area, wa = 1-wb-wc;
        if (wa < 0 || wb < 0 || wc < 0) continue;
        const index = y*resolution + x;
        const z = wa*projected[a+2] + wb*projected[b+2] + wc*projected[c+2];
        if (z <= depth[index]) continue;
        depth[index] = z;
        for (let channel = 0; channel < 3; channel++) {
          pixels[index*4+channel] = wa*projected[a+3+channel] + wb*projected[b+3+channel] + wc*projected[c+3+channel];
        }
        pixels[index*4+3] = 255;
      }
    }
  }};
}

export function paintFlightFrame(canvas: HTMLCanvasElement, painter: ReturnType<typeof createAircraftPainter>,
  frame: AircraftFrame, mobile: boolean) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const view = frame.view.clone().multiply(aircraftAttitude(frame.flight, frame.point));
  const rise = Math.max(0, Math.min(1, (frame.point.altitude - FLIGHT_CLEARANCE) / 0.38));
  painter.paint(view, (mobile ? 32 : 38) + 8 * rise, performance.now());
  ctx.putImageData(new ImageData(painter.pixels, painter.resolution, painter.resolution), 0, 0);
  canvas.style.transform = `translate3d(${frame.x - AIRCRAFT_TILE / 2}px,${frame.y - AIRCRAFT_TILE / 2}px,0)`;
  canvas.style.opacity = String(frame.point.opacity);
  canvas.hidden = false;
}
