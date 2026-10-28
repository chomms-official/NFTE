import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/lib/software-globe-projection.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleSource = compiled.replaceAll('"d3-geo"', JSON.stringify(import.meta.resolve('d3-geo')));
const helpers = import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
const countries = JSON.parse(fs.readFileSync(new URL('../public/assets/countries.geojson', import.meta.url), 'utf8')).features;
const name = f => f?.properties.ADMIN;

test('orthographic globe default centre selects Thailand from the actual country dataset', async () => {
  const { createGlobeProjection, countryAtGlobePoint } = await helpers;
  const projection = createGlobeProjection().translate([500, 400]).scale(250);
  assert.equal(name(countryAtGlobePoint(projection, countries, [500, 400])), 'Thailand');
  assert.deepEqual(projection.invert([500, 400]).map(Math.round), [100, 15]);
});
test('opposite hemisphere is hidden and coordinates outside the spherical disc cannot select a country', async () => {
  const { createGlobeProjection, isVisibleOnGlobe, countryAtGlobePoint } = await helpers;
  const projection = createGlobeProjection().translate([500, 400]).scale(250);
  assert.equal(isVisibleOnGlobe(projection, [100, 15]), true);
  assert.equal(isVisibleOnGlobe(projection, [-80, -15]), false);
  assert.equal(countryAtGlobePoint(projection, countries, [751, 400]), undefined);
  assert.equal(countryAtGlobePoint(projection, countries, [0, 0]), undefined);
});
test('rotating the sphere changes projected continent positions and centre country selection', async () => {
  const { createGlobeProjection, countryAtGlobePoint, isVisibleOnGlobe } = await helpers;
  const projection = createGlobeProjection().translate([500, 400]).scale(250);
  const before = projection([100, 15]);
  projection.rotate([55, 10, 0]);
  const after = projection([100, 15]);
  assert.ok(Math.hypot(before[0] - after[0], before[1] - after[1]) > 100);
  assert.equal(name(countryAtGlobePoint(projection, countries, [500, 400])), 'Brazil');
  assert.equal(isVisibleOnGlobe(projection, [100, 15]), false);
  assert.equal(isVisibleOnGlobe(projection, [-55, -10]), true);
});
test('zoom expands projected distances while respecting spherical hit boundaries', async () => {
  const { createGlobeProjection, countryAtGlobePoint } = await helpers;
  const projection = createGlobeProjection().translate([500, 400]).scale(200);
  const initial = projection([120, 15]);
  projection.scale(400);
  const zoomed = projection([120, 15]);
  assert.ok(Math.abs((zoomed[0] - 500) / (initial[0] - 500) - 2) < 1e-10);
  assert.equal(name(countryAtGlobePoint(projection, countries, [500, 400])), 'Thailand');
  assert.equal(countryAtGlobePoint(projection, countries, [901, 400]), undefined);
});
test('country rings use the correct D3 spherical winding instead of filling the whole globe', async () => {
  const { asGeoFeature } = await helpers;
  const { geoArea } = await import('d3-geo');
  for (const country of countries) {
    const area = geoArea(asGeoFeature(country));
    assert.ok(area > 0 && area < Math.PI * 2, `${name(country)} area ${area}`);
  }
});

test('country holes keep Lesotho distinct from surrounding South Africa on the globe', async () => {
  const { createGlobeProjection, countryAtGlobePoint, asGeoFeature } = await helpers;
  const { geoContains } = await import('d3-geo');
  const southAfrica = countries.find(country => name(country) === 'South Africa');
  const lesotho = countries.find(country => name(country) === 'Lesotho');
  const lesothoPoint = [28.2336, -29.61];
  const southAfricaPoint = [27, -29.61];
  assert.equal(geoContains(asGeoFeature(lesotho), lesothoPoint), true);
  assert.equal(geoContains(asGeoFeature(southAfrica), lesothoPoint), false,
    'South Africa must retain its interior ring instead of painting over Lesotho');
  const projection = createGlobeProjection([-28.2336, 29.61, 0]).translate([500, 400]).scale(1500);
  assert.equal(name(countryAtGlobePoint(projection, countries, projection(lesothoPoint))), 'Lesotho');
  assert.equal(name(countryAtGlobePoint(projection, countries, projection(southAfricaPoint))), 'South Africa');
});
