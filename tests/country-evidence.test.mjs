import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const snapshot = JSON.parse(await read('../src/data/country-evidence.json'));
const features = JSON.parse(await read('../public/assets/countries.geojson')).features;
const metrics = ['population', 'malaria', 'dengue', 'je'];

test('every displayed observation has a dated official source and matches a real map feature', () => {
  assert.equal(Object.keys(snapshot.countries).length, features.length);
  for (const feature of features) {
    const record = snapshot.countries[feature.properties.ADM0_A3];
    assert.equal(record.name, feature.properties.ADMIN);
    for (const metric of metrics) {
      const observation = record[metric];
      if (observation === null) continue;
      assert.equal(observation.sourceId, metric);
      assert.ok(snapshot.sources[observation.sourceId].attribution);
      assert.ok(observation.year >= 2000 && observation.year <= Number(snapshot.retrievedAt.slice(0, 4)));
      const url = new URL(observation.url);
      assert.equal(url.protocol, 'https:');
      assert.ok(['data.worldbank.org', 'www.who.int', 'www.cdc.gov'].includes(url.hostname));
      if (metric !== 'je') assert.ok(Number.isFinite(observation.value) && observation.value >= 0);
      else assert.ok(typeof observation.value === 'string' && observation.value.length > 0);
    }
  }
});
test('known WHO table values retain their year and do not become simulated daily counts', () => {
  assert.equal(snapshot.countries.BRA.dengue.value, 10266017);
  assert.equal(snapshot.countries.THA.dengue.value, 104681);
  assert.equal(snapshot.countries.IND.dengue.value, 232425);
  assert.equal(snapshot.countries.BRA.dengue.year, 2024);
  assert.match(snapshot.countries.FRA.dengue.scope, /overseas/);
  assert.equal(snapshot.countries.BRA.malaria.value, 3.75);
});
test('missing coverage remains null, while a published zero rate remains a zero', () => {
  for (const key of metrics) assert.equal(snapshot.countries.ATA[key], null);
  assert.equal(snapshot.countries.JPN.dengue, null);
  assert.equal(snapshot.countries.PHL.dengue, null, 'not present in this WHO report; never borrow a nearby country');
  assert.equal(snapshot.countries.BTN.je, null, 'CDC says unknown');
  assert.equal(snapshot.countries.TLS.je, null, 'CDC says no data');
  assert.ok(Object.values(snapshot.countries).some(c => c.malaria?.value === 0));
  assert.match(snapshot.countries.RUS.je.value, /Primorsky Krai/);
});
test('identifier differences do not drop France, Norway, Kosovo or assign Somalia data to Somaliland', () => {
  for (const code of ['FRA', 'NOR', 'KOS', 'COD', 'ROU', 'TLS', 'PSX']) assert.ok(snapshot.countries[code].population);
  for (const key of metrics) assert.equal(snapshot.countries.SOL[key], null);
  assert.match(snapshot.countries.KOS.population.url, /locations=XK$/);
});
