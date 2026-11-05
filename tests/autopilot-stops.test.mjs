import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const source=fs.readFileSync(new URL('../src/lib/autopilot-stops.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {createAutopilotStops}=await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function scenario() {
  let now=0, id=0, visits=0;const jobs=new Map();
  const clock={setTimeout(callback,ms){const key=++id;jobs.set(key,{callback,at:now+ms});return key;},clearTimeout(key){jobs.delete(key);}};
  const stops=createAutopilotStops(()=>visits++,clock);
  return {stops,get visits(){return visits;},tick(ms){now+=ms;for(const [key,job] of jobs)if(job.at<=now){jobs.delete(key);job.callback();}}};
}
test('every country waits exactly five seconds after arrival, regardless of flight duration',()=>{
  const s=scenario();
  for(const flight of [0,5300,9400,20000]) {
    const before=s.visits;s.stops.depart();s.tick(flight);assert.equal(s.visits,before,'never advance mid-flight');
    s.stops.arrive();s.tick(4999);assert.equal(s.visits,before);s.tick(1);assert.equal(s.visits,before+1);
  }
});
test('manual departure, replacement arrival and disabling autopilot cancel stale timers',()=>{
  const s=scenario();s.stops.arrive();s.tick(4500);s.stops.depart();s.tick(3000);assert.equal(s.visits,0);
  s.stops.arrive();s.tick(3000);s.stops.arrive();s.tick(4999);assert.equal(s.visits,0);s.tick(1);assert.equal(s.visits,1);
  s.stops.arrive();s.stops.stop();s.tick(20000);s.stops.arrive();s.tick(20000);assert.equal(s.visits,1);
});
test('native browser timers keep their global receiver',()=>{
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;let scheduled=0,cleared=0;
  try {
    globalThis.setTimeout=function(callback,ms){assert.equal(this,globalThis);assert.equal(ms,5000);scheduled++;return 123;};
    globalThis.clearTimeout=function(id){assert.equal(this,globalThis);assert.equal(id,123);cleared++;};
    const stops=createAutopilotStops(()=>{});stops.arrive();stops.stop();assert.equal(scheduled,1);assert.equal(cleared,1);
  } finally {globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
