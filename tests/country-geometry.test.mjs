import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {geoArea,geoContains} from 'd3-geo';
import {Triangle,Vector3,Mesh,MeshBasicMaterial,DoubleSide,Raycaster} from 'three';
const source=fs.readFileSync(new URL('../src/lib/country-geometry.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {prepareCountryGeometry,COUNTRY_CAP_RESOLUTION,COUNTRY_ALTITUDE}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
// The renderer dependency reads window.THREE at import time; no browser needed
// to build its actual production mesh and raycast its surface.
globalThis.window={};
const {default:ConicPolygonGeometry}=await import('three-conic-polygon-geometry');
const countries=JSON.parse(fs.readFileSync(new URL('../public/assets/countries.geojson',import.meta.url),'utf8')).features;
const country=name=>countries.find(f=>f.properties.ADMIN===name);
const polygons=f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;

test('Antarctica loses the retraced pole seam while retaining its area, pole and coastline',()=>{
  const original=country('Antarctica'), before=JSON.stringify(original),fixed=prepareCountryGeometry(original);
  assert.ok(Math.abs(geoArea(original)-geoArea(fixed))<1e-12);
  assert.equal(geoContains(fixed,[180,-88]),true);
  assert.equal(geoContains(fixed,[-180,-88]),true);
  assert.equal(geoContains(fixed,[0,-90]),true);
  assert.equal(geoContains(fixed,[0,-45]),false);
  assert.ok(!polygons(fixed).flat(2).some(point=>Math.abs(point[1])===90),'no artificial line to the pole');
  for(const p of polygons(fixed))for(const ring of p)assert.deepEqual(ring[0],ring.at(-1));
  assert.equal(JSON.stringify(original),before);
  assert.deepEqual(prepareCountryGeometry(fixed),fixed,'preparation is idempotent');
});

test('nonpolar countries and genuine enclave holes remain unchanged',()=>{
  for(const f of countries)if(f.properties.ADMIN!=='Antarctica')assert.equal(prepareCountryGeometry(f),f);
  assert.equal(geoContains(prepareCountryGeometry(country('South Africa')),[28.2336,-29.61]),false);
  assert.equal(geoContains(prepareCountryGeometry(country('Lesotho')),[28.2336,-29.61]),true);
});

test('Greenland and Antarctica cap facets stay above the earth even at their lowest point',()=>{
  const triangle=new Triangle(),nearest=new Vector3(),origin=new Vector3();
  for(const name of ['Greenland','Antarctica'])for(const p of polygons(prepareCountryGeometry(country(name)))) {
    const geometry=new ConicPolygonGeometry(p,100,100*(1+COUNTRY_ALTITUDE),false,true,false,COUNTRY_CAP_RESOLUTION);
    const positions=geometry.attributes.position;
    for(let i=0;i<geometry.index.count;i+=3) {
      triangle.a.fromBufferAttribute(positions,geometry.index.getX(i));
      triangle.b.fromBufferAttribute(positions,geometry.index.getX(i+1));
      triangle.c.fromBufferAttribute(positions,geometry.index.getX(i+2));
      triangle.closestPointToPoint(origin,nearest);
      assert.ok(nearest.length()>100.2,`${name}: a face must not expose the earth texture underneath`);
    }
    geometry.dispose();
  }
});

function checkInteriorCaps(name, points) {
  const feature = prepareCountryGeometry(country(name));
  const material = new MeshBasicMaterial({ side: DoubleSide });
  const meshes = polygons(feature).map(polygon => new Mesh(
    new ConicPolygonGeometry(polygon, 100, 100 * (1 + COUNTRY_ALTITUDE), false, true, false, COUNTRY_CAP_RESOLUTION), material
  ));
  const ray = new Raycaster();
  const rad = Math.PI / 180;
  for (const [lng, lat] of points) {
    assert.equal(geoContains(feature, [lng, lat]), true);
    const normal = new Vector3(Math.sin(lng * rad) * Math.cos(lat * rad), Math.sin(lat * rad), Math.cos(lng * rad) * Math.cos(lat * rad));
    ray.set(normal.clone().multiplyScalar(200), normal.clone().negate());
    const hit = ray.intersectObjects(meshes)[0];
    assert.ok(hit && hit.distance < 100 && hit.point.length() > 100.2, `${name} cap missing at ${lng}, ${lat}`);
  }
  meshes.forEach(mesh => mesh.geometry.dispose());
  material.dispose();
}

test('Greenland interior raycasts hit its cap above the white ice texture', () => {
  const points = [];
  for (let lat = 70; lat <= 77; lat += 0.5) {
    for (let lng = -48; lng <= -32; lng += 0.5) points.push([lng, lat]);
  }
  checkInteriorCaps('Greenland', points);
});

test('Antarctica remains filled across its removed seam and at the pole', () => {
  const points = [[0, -90]];
  for (const lat of [-89, -88, -87]) {
    for (const lng of [-180, -179.9, -90, 0, 90, 179.9, 180]) points.push([lng, lat]);
  }
  checkInteriorCaps('Antarctica', points);
});
