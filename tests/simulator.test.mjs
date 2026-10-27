import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source = fs.readFileSync(new URL('../src/lib/simulator.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const helper = {};
new Function('exports', compiled.outputText)(helper);
const { countryCenter, countryRisk, simulationSeed, scaleSimulatedHistory } = helper;
const feature = (coordinates, properties = {}) => ({ properties: { ADMIN: 'Testland', ...properties }, geometry: { type: 'Polygon', coordinates: [coordinates] } });

test('country centre uses polygon centroid rather than first boundary vertex', () => {
  const center = countryCenter(feature([[90, 10], [110, 10], [110, 30], [90, 30], [90, 10]]));
  assert.deepEqual(center, { lat: 20, lng: 100 });
});
test('longitude and latitude zero in metadata are valid', () => {
  assert.deepEqual(countryCenter(feature([], { LABEL_X: 0, LABEL_Y: 0 })), { lat: 0, lng: 0 });
});
test('country centres unwrap antimeridian and use largest land polygon', () => {
  const dateline = countryCenter(feature([[179, 10], [-179, 10], [-179, 12], [179, 12], [179, 10]]));
  assert.equal(Math.abs(dateline.lng), 180);
  assert.equal(dateline.lat, 11);
  const multi = { properties: {}, geometry: { type: 'MultiPolygon', coordinates: [
    [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    [[[10, 10], [20, 10], [20, 20], [10, 20], [10, 10]]],
  ] } };
  assert.deepEqual(countryCenter(multi), { lat: 15, lng: 15 });
});
test('explicit zero risk is preserved; fallback score is stable and species-specific', () => {
  const country = feature([[0, 55], [10, 55], [10, 65], [0, 65], [0, 55]]);
  assert.equal(countryRisk(country, 'aedes', { Testland: 0 }), 0);
  assert.equal(countryRisk(country, 'aedes', {}), 0.2);
  assert.equal(countryRisk(country, 'culex', {}), 1.8);
  assert.equal(countryRisk(country, 'culex', {}), countryRisk(country, 'culex', {}));
});
test('all bundled GeoJSON countries produce finite centres and scores', () => {
  const countries = JSON.parse(fs.readFileSync(new URL('../public/assets/countries.geojson', import.meta.url), 'utf8')).features;
  assert.equal(countries.length, 177);
  for (const country of countries) {
    const center = countryCenter(country);
    assert.ok(Number.isFinite(center.lat) && Math.abs(center.lat) <= 90, country.properties.ADMIN);
    assert.ok(Number.isFinite(center.lng) && Math.abs(center.lng) <= 180, country.properties.ADMIN);
    for (const mosquito of ['aedes', 'anopheles', 'culex']) {
      const risk = countryRisk(country, mosquito, {});
      assert.ok(Number.isFinite(risk) && risk >= 0 && risk <= 10);
    }
  }
});
test('generated counts are stable on revisit and zero risk/population stays zero', () => {
  const raw = [{ date: '2026-10-26', count: 10 }, { date: '2026-10-27', count: 20 }];
  const country = feature([], { POP_EST: 100000 });
  assert.deepEqual(scaleSimulatedHistory(country, 'aedes', 5, raw), scaleSimulatedHistory(country, 'aedes', 5, raw));
  assert.ok(scaleSimulatedHistory(country, 'aedes', 5, raw).some(day => day.count > 0));
  assert.ok(scaleSimulatedHistory(country, 'aedes', 0, raw).every(day => day.count === 0));
  assert.ok(scaleSimulatedHistory(feature([], { POP_EST: 0 }), 'aedes', 5, raw).every(day => day.count === 0));
  assert.notEqual(simulationSeed(country, 'aedes'), simulationSeed(feature([], { ADMIN: 'Bestland' }), 'aedes'));
  assert.notEqual(simulationSeed(country, 'aedes'), simulationSeed(country, 'culex'));
  assert.deepEqual(scaleSimulatedHistory(country, 'aedes', 5, []), []);
});
