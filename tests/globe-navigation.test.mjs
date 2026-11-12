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
  assert.ok(start.altitude >= 0.07 && end.altitude === start.altitude);
  let previous = start;
  for(let i=1;i<=1000;i++) {
    const next=helpers.flightSample(route,i/1000);
    assert.ok(next.progress>previous.progress);
    assert.ok(next.altitude>=start.altitude && next.altitude<=start.altitude+0.380000001);
    assert.equal(next.bank,0);
    previous=next;
  }
  const advance=t=>helpers.flightSample(route,t+0.001).progress-helpers.flightSample(route,t).progress;
  assert.ok(advance(0)<advance(0.08) && advance(0.08)<advance(0.3));
  assert.ok(Math.abs(advance(0.3)-advance(0.6))<1e-12);
  assert.ok(advance(0.99)<advance(0.9));
  assert.equal(helpers.flightSample(route,0.5).phase,'Cruising');
  assert.equal(helpers.flightSample(route,0.9).phase,'Descending');
});

test('parabolic routes have finite climb and descent tangents', () => {
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
      assert.ok(Number.isFinite(pitch) && Math.abs(pitch)<0.91, `Climb and descent must stay finite: ${pitch}`);
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

test('flights rise in one symmetric parabola, descend exactly to the destination and never bank', () => {
  for (const route of [
    {from:{lat:15,lng:101},to:{lat:36,lng:138}},
    {from:{lat:50,lng:4},to:{lat:51,lng:5}},
    {from:{lat:15,lng:170},to:{lat:15,lng:-170}},
    {from:{lat:0,lng:0},to:{lat:0,lng:180}},
    {from:{lat:90,lng:0},to:{lat:-90,lng:0}},
  ]) {
    const peak=helpers.flightRouteSample(route,0.5).altitude;
    const floor=helpers.flightRouteSample(route,0).altitude;
    assert.ok(floor >= 0.07 && peak>floor && peak<=floor+0.38);
    let previous=helpers.flightRouteSample(route,0);
    for (let i=1;i<=128;i++) {
      const p=i/128, sample=helpers.flightRouteSample(route,p);
      const ground=helpers.interpolateFlightPosition(route.from,route.to,p);
      assert.ok(Object.values(sample).every(Number.isFinite));
      assert.ok(geoDistance(pair(sample),pair(ground))<1e-10,'no lateral turns');
      assert.equal(sample.bank,0);
      assert.ok(p<=0.5 ? sample.altitude>previous.altitude : sample.altitude<previous.altitude);
      assert.ok(Math.abs(sample.altitude-helpers.flightRouteSample(route,1-p).altitude)<1e-12);
      previous=sample;
    }
    const quarter=helpers.flightRouteSample(route,0.25);
    assert.ok(Math.abs((quarter.altitude-floor)/(peak-floor)-.75)<1e-12,'quadratic arch');
    assert.equal(previous.altitude,floor);
  }
  const same={from:{lat:15,lng:101},to:{lat:15,lng:101}};
  assert.equal(helpers.flightRouteSample(same,.5).altitude,helpers.FLIGHT_CLEARANCE);
});

test('dashed trails retain the origin and flown path, meet the plane and clear at landing', () => {
  const route={from:{lat:15,lng:170},to:{lat:36,lng:-138}};
  let previous=[];
  for(const p of [.001,.2,.5,.8,.999999]) {
    const trail=helpers.flightTrailSamples(route,p);
    assert.ok(trail.length>previous.length && trail.length<=helpers.FLIGHT_TRAIL_SEGMENTS+1);
    assert.deepEqual(trail[0],helpers.flightRouteSample(route,0));
    assert.deepEqual(trail.at(-1),helpers.flightRouteSample(route,p));
    for(let i=0;i<previous.length-1;i++)assert.deepEqual(trail[i],previous[i],'old samples stay anchored');
    previous=trail;
  }
  for(const p of [-1,0,1,2,NaN,Infinity])assert.deepEqual(helpers.flightTrailSamples(route,p),[]);
});

test('flight camera reveals altitude and returns exactly to both countries without polar singularities', () => {
  for(const route of [
    {from:{lat:15,lng:101},to:{lat:36,lng:138}},
    {from:{lat:90,lng:0},to:{lat:-90,lng:0}},
    {from:{lat:0,lng:0},to:{lat:0,lng:180}},
    {from:{lat:12,lng:80},to:{lat:12,lng:80}},
  ]) {
    for(const p of [0,.001,.1,.3,.5,.7,.9,.999,1]) {
      const camera=helpers.flightCameraSample(route,p);
      assert.ok(Object.values(camera).every(Number.isFinite));
    }
    for(const p of [0,1])assert.deepEqual(helpers.flightCameraSample(route,p),helpers.interpolateFlightPosition(route.from,route.to,p));
    const distance=geoDistance(pair(route.from),pair(route.to));
    if(distance>0) {
      const angle=geoDistance(pair(helpers.flightCameraSample(route,.5)),pair(helpers.flightRouteSample(route,.5)));
      assert.ok(Math.abs(angle-55*Math.PI/180)<1e-9,'view must show the raised arch from the side');
    }
  }
});

test('takeoff and arrival fade above land with level noses and a bounded pitch', () => {
  for (const [a,b] of [['Russia','Canada'],['Canada','Philippines'],['Belgium','Netherlands']]) {
    const route={from:helpers.countryFraming(country(a)).center,to:helpers.countryFraming(country(b)).center};
    for (let i=0;i<=100;i++) {
      const p=i/100, point=helpers.flightSample(route,p);
      assert.ok(point.altitude>=.07 && Math.abs(point.pitch)<=6*Math.PI/180+1e-12);
      assert.ok(point.opacity>=0 && point.opacity<=1);
      if(i===0||i===100){assert.equal(Math.abs(point.pitch),0);assert.equal(point.opacity,0);}
      if(i>=8&&i<=92)assert.ok(point.opacity>.999);
      if(i<=8||i>=92)assert.ok(Math.abs(point.pitch)<Math.PI/180,'nearly level throughout the fade');
    }
  }
});

test('the incremental GPU line matches the full dashed path across partial, skipped and reversed frames', () => {
  const route={from:{lat:33,lng:170},to:{lat:46,lng:-150}};
  let projections=0;
  const project=p=>({x:p.lat,y:p.lng,z:p.altitude});
  const line=helpers.createFlightTrailBuffer(route,p=>{projections++;return project(p);});
  const anchors=helpers.flightTrailAnchors(route);
  for(const progress of [.002,.003,.20,.5,.501,.493,.499,.75,.999,1,0]){
    const tip=helpers.flightRouteSample(route,progress);
    const before=projections;
    const {count,firstChanged}=line.advance(progress,project(tip));
    const full=helpers.flightTrailSamples(route,progress);
    assert.deepEqual(helpers.flightTrailSamples(route,progress,anchors,tip),full);
    assert.equal(count,full.length);
    if(progress===.003){assert.equal(projections,before);assert.equal(firstChanged,1);}
    let length=0;
    full.forEach((p,i)=>{
      const expected=[p.lat,p.lng,p.altitude];
      expected.forEach((n,j)=>assert.ok(Math.abs(line.positions[i*3+j]-n)<1e-5));
      if(i){const prev=full[i-1];length+=Math.hypot(p.lat-prev.lat,p.lng-prev.lng,p.altitude-prev.altitude);}
      assert.ok(Math.abs(length-line.distances[i])<3e-4);
    });
  }
});
