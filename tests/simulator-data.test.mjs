import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const globeSource = await readFile(new URL('../src/components/ui/outbreak-globe.tsx', import.meta.url), 'utf8');
const globeAst = ts.createSourceFile('globe.tsx', globeSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const dataDeclaration = globeAst.statements.flatMap(node => node.declarationList?.declarations ?? [])
  .find(node => node.name.getText(globeAst) === 'MOSQUITO_DATA');
assert.ok(dataDeclaration, 'The simulator data declaration must exist');
// Read the actual configuration without importing a WebGL renderer or stubbing
// Next.js. Icons have no bearing on geography or the numeric simulation inputs.
const data = new Function('DropletsIcon', 'BugIcon', 'WindIcon',
  `return (${dataDeclaration.initializer.getText(globeAst)});`)(null, null, null);
const countries = JSON.parse(await readFile(new URL('../public/assets/countries.geojson', import.meta.url), 'utf8')).features;
const names = countries.map(feature => feature.properties.ADMIN || feature.properties.NAME);

const simulatorCode = ts.transpileModule(await readFile(new URL('../src/lib/simulator.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const simulator = {};
new Function('exports', simulatorCode)(simulator);

// Exercise the real date/seed generator while leaving the canvas component out
// of this data test. Its numeric timestamp convention must be UTC throughout.
const skylineSource = await readFile(new URL('../src/components/ui/contribution-skyline.tsx', import.meta.url), 'utf8');
const skylineAst = ts.createSourceFile('skyline.tsx', skylineSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const generatorNames = new Set(['DAY_MS', 'toKey', 'dayMs', 'rng', 'generateContributions']);
const generatorSource = skylineAst.statements.filter(node =>
  ts.isVariableStatement(node) && node.declarationList.declarations.some(declaration => generatorNames.has(declaration.name.getText(skylineAst))))
  .map(node => node.getText(skylineAst)).join('\n');
const generator = {};
new Function('exports', ts.transpileModule(generatorSource, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText)(generator);

for (const [species, config] of Object.entries(data)) {
  test(`${species} scores match every bundled country exactly and remain within the simulation scale`, () => {
    assert.equal(new Set(names).size, countries.length);
    assert.deepEqual(Object.keys(config.riskMap).sort(), [...names].sort());
    for (const country of countries) {
      const name = country.properties.ADMIN || country.properties.NAME;
      const score = config.riskMap[name];
      assert.ok(Number.isFinite(score) && score >= 0 && score <= 10, `${species}: ${name}`);
      assert.equal(simulator.countryRisk(country, species, config.riskMap), score,
        `The displayed ${species} country score must preserve the configured value for ${name}`);
    }
  });

  test(`${species} illustrative hotspots have unique labels, valid coordinates and bounded weights`, () => {
    assert.equal(new Set(config.hotspots.map(spot => spot.city)).size, config.hotspots.length);
    for (const spot of config.hotspots) {
      assert.ok(spot.city.trim());
      assert.ok(Number.isFinite(spot.lat) && Math.abs(spot.lat) <= 90, spot.city);
      assert.ok(Number.isFinite(spot.lng) && Math.abs(spot.lng) <= 180, spot.city);
      assert.ok(Number.isFinite(spot.weight) && spot.weight >= 0 && spot.weight <= 10, spot.city);
    }
  });

  test(`${species} background citation uses an HTTPS official disease-information host`, () => {
    const source = new URL(config.sourceUrl);
    assert.equal(source.protocol, 'https:');
    assert.ok(['www.who.int', 'www.cdc.gov'].includes(source.hostname));
    assert.ok(config.sourceName.trim());
  });
}

test('generated daily history is reproducible and contains exactly 365 consecutive UTC dates', () => {
  const end = Date.parse('2026-10-27T23:59:59Z');
  const sameInstant = Date.parse('2026-10-28T06:59:59+07:00');
  assert.equal(end, sameInstant);
  const history = generator.generateContributions(end, 12345, 365);
  assert.deepEqual(history, generator.generateContributions(sameInstant, 12345, 365));
  assert.equal(history.length, 365);
  assert.equal(new Set(history.map(day => day.date)).size, 365);
  assert.equal(history.at(-1).date, '2026-10-27');
  for (let i = 0; i < history.length; i++) {
    assert.ok(Number.isInteger(history[i].count) && history[i].count >= 0);
    if (i) assert.equal(generator.dayMs(history[i].date) - generator.dayMs(history[i - 1].date), 86400000);
  }
});

test('actual configured zero-risk countries retain zero simulated counts and repeat selections remain stable', () => {
  const end = Date.parse('2026-10-27T00:00:00Z');
  for (const [species, config] of Object.entries(data)) {
    for (const country of countries) {
      const score = simulator.countryRisk(country, species, config.riskMap);
      const seed = simulator.simulationSeed(country, species);
      const raw = generator.generateContributions(end, seed, 365);
      const scaled = simulator.scaleSimulatedHistory(country, species, score, raw);
      assert.deepEqual(scaled, simulator.scaleSimulatedHistory(country, species, score, raw));
      assert.equal(scaled.length, 365);
      assert.deepEqual(scaled.map(day => day.date), raw.map(day => day.date));
      for (const day of scaled) assert.ok(Number.isInteger(day.count) && day.count >= 0);
      if (score === 0) assert.ok(scaled.every(day => day.count === 0));
    }
  }
});
