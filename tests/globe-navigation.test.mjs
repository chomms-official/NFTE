import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { geoArea, geoDistance, geoOrthographic } from 'd3-geo';

const source = fs.readFileSync(new URL('../src/lib/globe-navigation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
const moduleSource = compiled.replaceAll('"d3-geo"', JSON.stringify(import.meta.resolve('d3-geo')));
const helpers = await import(`data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`);
const countries = JSON.parse(fs.readFileSync(new URL('../public/assets/countries.geojson', import.meta.url), 'utf8')).features;
const country = name => countries.find(feature => feature.properties.ADMIN === name);
const pair = coordinate => [coordinate.lng, coordinate.lat];

test('great-circle flights reach their endpoints and cross the date line by the short route', () => {
  const from = { lat: 15, lng: 170 }, to = { lat: 15, lng: -170 };
  assert.deepEqual(helpers.interpolateFlightPosition(from, to, -1), from);
  assert.deepEqual(helpers.interpolateFlightPosition(from, to, 2), to);
  const midpoint = helpers.interpolateFlightPosition(from, to, 0.5);
  assert.ok(Math.abs(midpoint.lng) > 179.99, 'The route must cross the Pacific, not Greenwich');
  assert.ok(midpoint.lat > 15, 'A great-circle route bends toward the pole');
  assert.ok(Math.abs(geoDistance(pair(from), pair(midpoint)) * 2 - geoDistance(pair(from), pair(to))) < 1e-9);
});

test('antipodal and coincident flights remain finite and progress at a stable angular speed', () => {
  for (const [from, to] of [
    [{ lat: 0, lng: 0 }, { lat: 0, lng: 180 }],
    [{ lat: 90, lng: 0 }, { lat: -90, lng: 0 }],
    [{ lat: 45, lng: 80 }, { lat: -45, lng: -100 }],
  ]) {
    let previous = from;
    for (const t of [0.25, 0.5, 0.75, 1]) {
      const point = helpers.interpolateFlightPosition(from, to, t);
      assert.ok(Number.isFinite(point.lat) && Number.isFinite(point.lng));
      assert.ok(Math.abs(geoDistance(pair(previous), pair(point)) - Math.PI / 4) < 1e-7);
      previous = point;
    }
  }
  assert.deepEqual(helpers.interpolateFlightPosition({ lat: 12, lng: 80 }, { lat: 12, lng: 80 }, 0.5), { lat: 12, lng: 80 });
});

test('headings follow the nose forward along the route, including a date-line crossing', () => {
  assert.ok(Math.abs(helpers.flightBearing({ lat: 0, lng: 0 }, { lat: 20, lng: 0 })) < 1e-7);
  assert.ok(Math.abs(helpers.flightBearing({ lat: 0, lng: 170 }, { lat: 0, lng: -170 }) - 90) < 1e-7);
  assert.ok(Math.abs(helpers.flightBearing({ lat: 20, lng: 0 }, { lat: 0, lng: 0 }) - 180) < 1e-7);
  assert.ok(Math.abs(helpers.flightBearing({ lat: 0, lng: -170 }, { lat: 0, lng: 170 }, 1) - 270) < 1e-7);
});

test('country selection keeps the same overview for small and large countries', () => {
  const thailand = helpers.countryFraming(country('Thailand'));
  const belgium = helpers.countryFraming(country('Belgium'));
  const brazil = helpers.countryFraming(country('Brazil'));
  assert.equal(belgium.softwareZoom, thailand.softwareZoom);
  assert.equal(thailand.softwareZoom, brazil.softwareZoom);
  assert.equal(belgium.webglAltitude, brazil.webglAltitude);
  assert.ok(thailand.webglAltitude > 1.6 && thailand.webglAltitude < 1.8);
  assert.ok(Math.abs(thailand.center.lat - 15) < 1 && Math.abs(thailand.center.lng - 101) < 1);
  assert.ok(Math.abs(brazil.center.lat + 11) < 2 && Math.abs(brazil.center.lng + 53) < 2);
});

test('mainland framing handles overseas territories, date-line islands, Russia and polar geometry', () => {
  const france = helpers.countryFraming(country('France'));
  const fiji = helpers.countryFraming(country('Fiji'));
  const russia = helpers.countryFraming(country('Russia'));
  const antarctica = helpers.countryFraming(country('Antarctica'));
  assert.ok(france.center.lat > 45 && france.center.lat < 48 && Math.abs(france.center.lng) < 5, 'France focuses Europe, not French Guiana');
  assert.ok(fiji.center.lng > 177 && fiji.center.lng < 180 && fiji.center.lat < -17);
  assert.ok(russia.center.lat > 60 && russia.center.lng > 75 && russia.center.lng < 120);
  assert.ok(antarctica.center.lat < -80, 'Antarctica centres near the South Pole, not a planar longitude average');
});

test('archipelagos frame all their nearby islands, including Fiji across the date line', () => {
  for (const name of ['Fiji', 'Indonesia', 'Japan', 'New Zealand']) {
    const feature = country(name);
    const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];
    for (const aspect of [0.75, 1, 1.5]) {
      const frame = helpers.countryFraming(feature, aspect);
      const projection = geoOrthographic().rotate([-frame.center.lng, -frame.center.lat, 0])
        .translate([0, 0]).scale(Math.min(aspect * 0.43, 0.35) * frame.softwareZoom);
      for (const polygon of polygons) for (const ring of polygon) for (const point of ring) {
        const distance = geoDistance(pair(frame.center), point);
        assert.ok(distance < Math.PI / 2, `${name}: every island must be in the visible hemisphere`);
        const [x, y] = projection(point);
        assert.ok(Math.hypot(x, y) <= Math.min(aspect, 1) * 0.431,
          `${name}: every island must fit the selected-country viewport`);
      }
    }
  }
  assert.ok(helpers.countryFraming(country('Indonesia')).center.lng > 110,
    'Indonesia must focus the island group rather than Sumatra alone');
  assert.ok(helpers.countryFraming(country('Fiji')).softwareZoom < 40,
    'Fiji must zoom out enough to include Vanua Levu and the date-line island');
});

test('every country fits its largest land polygon in the software viewport without mutating data', () => {
  const before = JSON.stringify(countries);
  for (const feature of countries) {
    const candidates = feature.geometry.type === 'MultiPolygon'
      ? feature.geometry.coordinates.map(coordinates => ({ type: 'Polygon', coordinates })) : [feature.geometry];
    const mainland = candidates.sort((a, b) => geoArea(b) - geoArea(a))[0];
    for (const aspect of [0.75, 1, 1.5, 2]) {
      const frame = helpers.countryFraming(feature, aspect);
      assert.ok(Object.values(frame.center).every(Number.isFinite));
      assert.ok(frame.softwareZoom >= 0.65 && frame.softwareZoom <= 80);
      assert.ok(frame.webglAltitude >= 1.6 && frame.webglAltitude <= 15);
      const projection = geoOrthographic().rotate([-frame.center.lng, -frame.center.lat, 0])
        .translate([0, 0]).scale(Math.min(aspect * 0.43, 0.35) * frame.softwareZoom);
      for (const ring of mainland.coordinates) for (const point of ring) {
        const [x, y] = projection(point);
        assert.ok(Math.hypot(x, y) <= Math.min(aspect, 1) * 0.431,
          `${feature.properties.ADMIN} must fit the visible map at aspect ${aspect}`);
      }
    }
  }
  assert.equal(JSON.stringify(countries), before);
});

test('framing remains finite when a country lacks usable geometry or the viewport has not measured yet', () => {
  for (const aspect of [0, -1, NaN, Infinity]) {
    const frame = helpers.countryFraming({ properties: {}, geometry: { type: 'Polygon', coordinates: [] } }, aspect);
    assert.ok(Object.values(frame.center).every(Number.isFinite));
    assert.ok(Number.isFinite(frame.angularRadius) && Number.isFinite(frame.softwareZoom) && Number.isFinite(frame.webglAltitude));
  }
});

// Desktop side panels leave a narrow map on portrait tablets. Verify actual
// perspective projection rather than assuming a square camera viewport.
test('wide countries fit the WebGL camera beside details on portrait tablets', () => {
  for (const feature of countries) for (const aspect of [0.35, 0.4, 0.75, 1, 2]) {
    const frame = helpers.countryFraming(feature, aspect);
    const rad = Math.PI / 180, lat0 = frame.center.lat * rad;
    const candidates = feature.geometry.type === 'MultiPolygon'
      ? feature.geometry.coordinates.map(coordinates => ({ type: 'Polygon', coordinates })) : [feature.geometry];
    const largest = [...candidates].sort((a,b) => geoArea(b)-geoArea(a))[0];
    // The largest polygon is guaranteed to be part of the framing cluster.
    for (const ring of largest.coordinates) for (const [lng,lat] of ring) {
      const phi = lat * rad, delta = (lng-frame.center.lng) * rad;
      const x = Math.cos(phi) * Math.sin(delta);
      const y = Math.cos(lat0)*Math.sin(phi)-Math.sin(lat0)*Math.cos(phi)*Math.cos(delta);
      const z = Math.sin(lat0)*Math.sin(phi)+Math.cos(lat0)*Math.cos(phi)*Math.cos(delta);
      const distance = 1 + frame.webglAltitude - z;
      const ndcX = x / (distance * Math.tan(25*rad) * aspect);
      const ndcY = y / (distance * Math.tan(25*rad));
      assert.ok(Math.abs(ndcX) < 1 && Math.abs(ndcY) < 1, `${feature.properties.ADMIN} must fit at aspect ${aspect}`);
    }
  }
});

test('flight timing accelerates smoothly, cruises steadily and decelerates into the destination', () => {
  const route = { from: {lat:15,lng:101}, to: {lat:36,lng:138} };
  const start = helpers.flightSample(route,0), end = helpers.flightSample(route,1);
  assert.equal(start.lat,15);assert.equal(start.lng,101);
  assert.equal(end.lat,36);assert.equal(end.lng,138);
  assert.equal(start.altitude,0.009);assert.equal(end.altitude,0.009);
  let previous = start;
  for(let i=1;i<=1000;i++) {
    const next=helpers.flightSample(route,i/1000);
    assert.ok(next.progress>previous.progress);
    assert.ok(next.altitude>=0.009 && next.altitude<=0.054000001);
    assert.ok(Math.abs(next.bank)<=25*Math.PI/180);
    previous=next;
  }
  const advance=t=>helpers.flightSample(route,t+0.001).progress-helpers.flightSample(route,t).progress;
  assert.ok(advance(0)<advance(0.08) && advance(0.08)<advance(0.3));
  assert.ok(Math.abs(advance(0.3)-advance(0.6))<1e-12);
  assert.ok(advance(0.99)<advance(0.9));
  assert.equal(helpers.flightSample(route,0.5).phase,'Cruising');
  assert.equal(helpers.flightSample(route,0.9).phase,'Descending');
});

test('short routes climb gently and every route has stable endpoint tangents', () => {
  for(const route of [
    {from:{lat:50,lng:4},to:{lat:51,lng:5}},
    {from:{lat:0,lng:170},to:{lat:0,lng:-170}},
    {from:{lat:0,lng:0},to:{lat:0,lng:180}},
  ]) {
    const distance=geoDistance(pair(route.from),pair(route.to));
    for(let i=0;i<=100;i++) {
      const t=i/100;
      const a=helpers.flightSample(route,Math.max(0,t-0.002));
      const b=helpers.flightSample(route,Math.min(1,t+0.002));
      const pitch=Math.atan2(b.altitude-a.altitude, distance*(b.progress-a.progress));
      assert.ok(Number.isFinite(pitch) && Math.abs(pitch)<0.18, `Pitch should remain airliner-like: ${pitch}`);
    }
  }
  const near=helpers.flightDuration({lat:50,lng:4},{lat:51,lng:5});
  const far=helpers.flightDuration({lat:50,lng:4},{lat:-50,lng:-176});
  assert.ok(near<far && near>=5200 && far<=9400);
});

test('selected-country views keep the entire horizon inside desktop, mobile and tablet viewports', () => {
  for (const aspect of [0.3, 0.35, 0.75, 1, 1.35, 2]) {
    const frame = helpers.countryFraming(country('Cambodia'), aspect);
    const radius = Math.min(aspect * 0.43, 0.35) * frame.softwareZoom;
    assert.ok(Math.abs(radius / Math.min(aspect, 1) - 0.43) < 1e-12);
    const distance = 1 + frame.webglAltitude;
    const silhouette = 1 / (Math.tan(25 * Math.PI / 180) * Math.sqrt(distance ** 2 - 1));
    assert.ok(Math.abs(silhouette / Math.min(aspect, 1) - 0.86) < 1e-12);
  }
});

test('departure and arrival bend off the cruise line, meet it smoothly and level their wings', () => {
  for (const route of [
    {from:{lat:15,lng:101},to:{lat:36,lng:138}},
    {from:{lat:50,lng:4},to:{lat:51,lng:5}},
    {from:{lat:15,lng:170},to:{lat:15,lng:-170}},
    {from:{lat:0,lng:0},to:{lat:0,lng:180}},
    {from:{lat:90,lng:0},to:{lat:-90,lng:0}},
  ]) {
    for (const p of [0.1, 0.9]) {
      const curved=helpers.flightRouteSample(route,p), straight=helpers.interpolateFlightPosition(route.from,route.to,p);
      assert.ok(geoDistance(pair(curved),pair(straight))>0.0001,'terminal turns must change the actual position');
    }
    for (const p of [0,0.28,0.5,0.72,1]) {
      const curved=helpers.flightRouteSample(route,p), straight=helpers.interpolateFlightPosition(route.from,route.to,p);
      assert.ok(geoDistance(pair(curved),pair(straight))<1e-9);
      assert.ok(Math.abs(curved.bank)<1e-9);
    }
    for (const p of [0.28,0.72]) {
      const a=helpers.flightRouteSample(route,p-1e-7), b=helpers.flightRouteSample(route,p+1e-7);
      assert.ok(Math.abs(a.bank-b.bank)<0.0001,'roll must not snap at the cruise join');
    }
    let previous=helpers.flightRouteSample(route,0), travelled=0;
    for(let i=1;i<=500;i++) {
      const sample=helpers.flightRouteSample(route,i/500);
      assert.ok(Object.values(sample).every(Number.isFinite));
      assert.ok(Math.abs(sample.bank)<=25*Math.PI/180);
      travelled+=geoDistance(pair(previous),pair(sample));previous=sample;
    }
    assert.ok(travelled<geoDistance(pair(route.from),pair(route.to))*1.06,'no loops or sideways teleporting');
  }
  const same={from:{lat:15,lng:101},to:{lat:15,lng:101}};
  assert.equal(helpers.flightRouteSample(same,0.1).bank,0);
});

test('bank direction agrees with the actual spherical turn, rather than a decorative oscillation', () => {
  const vec = p => {const lat=p.lat*Math.PI/180,lng=p.lng*Math.PI/180;return [Math.cos(lat)*Math.cos(lng),Math.cos(lat)*Math.sin(lng),Math.sin(lat)];};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const dot=(a,b)=>a.reduce((sum,x,i)=>sum+x*b[i],0);
  const subtract=(a,b)=>a.map((x,i)=>x-b[i]);
  const route={from:{lat:15,lng:101},to:{lat:36,lng:138}};
  for(const p of [0.03,0.08,0.14,0.20,0.25,0.75,0.8,0.86,0.92,0.97]) {
    const sample=helpers.flightRouteSample(route,p), a=vec(helpers.flightRouteSample(route,p-.0001));
    const b=vec(sample),c=vec(helpers.flightRouteSample(route,p+.0001));
    const steering=dot(b,cross(subtract(b,a),subtract(c,b)));
    assert.equal(Math.sign(sample.bank),Math.sign(steering),`bank must lean into the turn at ${p}`);
  }
});
