import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {webcrypto,createHash} from 'node:crypto';
import vm from 'node:vm';
const origin='https://example.test';
const fixtures={'/':'<main data-app="mozziemap">globe</main>','/simulator':'simulator html','/sent-scent':'presentation html','/_next/static/lazy.js':'lazy globe code','/assets/countries.geojson':'{"countries":true}'};
const release={version:'test123',assets:Object.entries(fixtures).map(([url,text])=>({url,source:url.startsWith('/_next')||url.startsWith('/assets')?url:`/offline-pages/test123${url==='/'?'/index':url}.html`,sha256:createHash('sha256').update(text).digest('hex')}))};
const source=(await readFile(new URL('../src/service-worker/worker.js',import.meta.url),'utf8')).replace('/* OFFLINE_MANIFEST */ null',JSON.stringify(release));
const current='mozziemap-offline-test123';
function boot({failure='',storageFailure=false,hostname='example.test'}={}) {
 const stores=new Map(),listeners=new Map(),messages=[],calls={fetch:0,skip:0,claim:0};let offline=false;
 const key=r=>typeof r==='string'?r:r.url;
 const caches={open:async name=>{
  if(storageFailure)throw Error('quota');if(!stores.has(name))stores.set(name,new Map());const store=stores.get(name);
  return {put:async(k,v)=>store.set(key(k),v.clone()),match:async k=>store.get(key(k))?.clone(),keys:async()=>[...store.keys()].map(url=>({url})),delete:async k=>store.delete(key(k))};
 }};
 vm.runInNewContext(source,{URL,Request,Response,Set,Uint8Array,crypto:webcrypto,AbortController,setTimeout,clearTimeout,caches,fetch:async r=>{
  calls.fetch++;if(offline)throw Error('offline');const path=new URL(key(r)).pathname;
  if(path===failure)return new Response('wrong deployment');
  const entry=release.assets.find(item=>item.source===path);
  return new Response(fixtures[entry?.url||path]??'network');
 },self:{location:{origin,hostname},addEventListener:(type,f)=>listeners.set(type,f),skipWaiting:async()=>calls.skip++,clients:{claim:async()=>calls.claim++,matchAll:async()=>[{postMessage:m=>messages.push(m)}]}}});
 function dispatch(type,extra={}){const life=[];let response;listeners.get(type)({...extra,waitUntil:p=>life.push(p),respondWith:p=>response=p});return {done:()=>Promise.all(life),response};}
 const req=(path,extra={})=>({url:origin+path,method:'GET',mode:'navigate',cache:'default',headers:new Headers(),...extra});
 async function message(data){let reply;await dispatch('message',{data,ports:[{postMessage:m=>reply=m}]}).done();return reply;}
 return {stores,calls,messages,dispatch,req,message,setOffline:()=>offline=true};
}
test('installation precaches lazy modules and pages atomically, without forcing an update',async()=>{
 const w=boot();await w.dispatch('install').done();const state=await w.message({type:'STATUS'});
 assert.equal(state.ready,true);assert.equal(state.completed,5);assert.equal(w.calls.skip,0);
 assert.ok(w.messages.some(m=>m.completed===5));
});
test('every prepared route and lazy module works after connectivity is removed and without visiting it first',async()=>{
 const w=boot();await w.dispatch('install').done();w.setOffline();const before=w.calls.fetch;
 for(const [path,text] of Object.entries(fixtures))assert.equal(await (await w.dispatch('fetch',{request:w.req(path)}).response).text(),text);
 assert.equal(w.calls.fetch,before,'offline hits never wait for the network');
});
test('partial and mixed-release downloads cannot claim offline readiness',async()=>{
 const w=boot({failure:'/_next/static/lazy.js'});await assert.rejects(w.dispatch('install').done());
 assert.equal((await w.message({type:'STATUS'})).ready,false);
 assert.ok(w.messages.some(m=>m.type==='OFFLINE_ERROR'));
});
test('storage eviction is detected before enabling the saved demo',async()=>{
 const w=boot();await w.dispatch('install').done();w.stores.get(current).delete(origin+'/_next/static/lazy.js');
 const state=await w.message({type:'SET_DEMO',enabled:true});assert.equal(state.ready,false);assert.ok(state.error);
});
test('retry repairs evicted files without needing a new deployment or clearing user data',async()=>{
 const w=boot();await w.dispatch('install').done();w.stores.get(current).delete(origin+'/_next/static/lazy.js');
 w.stores.set('unrelated-drafts',new Map([['draft','keep']]));
 assert.equal((await w.message({type:'STATUS'})).ready,false);
 const repaired=await w.message({type:'PREPARE'});assert.equal(repaired.ready,true);
 assert.equal(w.stores.get('unrelated-drafts').get('draft'),'keep');
 w.setOffline();assert.equal(await(await w.dispatch('fetch',{request:w.req('/_next/static/lazy.js')}).response).text(),'lazy globe code');
});
test('demo mode refuses network fallback and survives subsequent status checks',async()=>{
 const w=boot();await w.dispatch('install').done();assert.equal((await w.message({type:'SET_DEMO',enabled:true})).demo,true);
 w.stores.get(current).delete(origin+'/assets/countries.geojson');const before=w.calls.fetch;
 assert.equal((await w.dispatch('fetch',{request:w.req('/assets/countries.geojson')}).response).status,503);
 assert.equal(w.calls.fetch,before);
 assert.equal((await w.message({type:'SET_DEMO',enabled:false})).demo,false,'can exit demo even after eviction');
});
test('activation and explicit update preserve old releases and user data',async()=>{
 const w=boot();w.stores.set('unrelated-drafts',new Map([['draft','keep']]));w.stores.set('mozziemap-cache-v7',new Map());
 await w.dispatch('activate').done();assert.equal(w.calls.claim,1);assert.equal(w.calls.skip,0);
 await w.message({type:'APPLY_UPDATE'});assert.equal(w.calls.skip,1);assert.equal(w.stores.get('unrelated-drafts').get('draft'),'keep');assert.ok(w.stores.has('mozziemap-cache-v7'));
});
test('RSC, authenticated, API and private queries never use HTML snapshots',()=>{
 const w=boot();for(const req of [w.req('/?_rsc=abc'),w.req('/?private=1'),w.req('/api/data'),w.req('/',{method:'POST'}),w.req('/',{headers:new Headers({RSC:'1'})}),w.req('/',{headers:new Headers({Authorization:'token'})})])assert.equal(w.dispatch('fetch',{request:req}).response,undefined);
});
test('deployment queries on immutable chunks remain available offline',async()=>{
 const w=boot();await w.dispatch('install').done();w.setOffline();assert.equal(await(await w.dispatch('fetch',{request:w.req('/_next/static/lazy.js?dpl=release')}).response).text(),'lazy globe code');
});
test('storage failures preserve online functionality and do not report ready',async()=>{
 const w=boot({storageFailure:true});assert.equal(await(await w.dispatch('fetch',{request:w.req('/')}).response).text(),fixtures['/']);assert.equal((await w.message({type:'STATUS'})).ready,false);
});
test('the SENT SCENT host keeps its presentation homepage',async()=>{
 const w=boot({hostname:'sentscent.example.test'});await w.dispatch('install').done();w.setOffline();assert.equal(await(await w.dispatch('fetch',{request:w.req('/')}).response).text(),'presentation html');
});
