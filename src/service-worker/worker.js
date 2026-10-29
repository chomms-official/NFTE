/* Generated into public/sw.js after next build. */
const RELEASE = /* OFFLINE_MANIFEST */ null;
const CACHE_NAME = `mozziemap-offline-${RELEASE.version}`;
const META = '/__mozziemap_offline_ready__';
const DEMO = '/__mozziemap_demo_mode__';
const origin = self.location.origin;
const entries = RELEASE.assets.map(entry => {
  // The presentation's separate host rewrites its homepage.
  if(entry.url === '/' && self.location.hostname.includes('sentscent')) {
    const presentation = RELEASE.assets.find(item => item.url === '/sent-scent');
    return {...presentation,url:'/'};
  }
  return entry;
});
const urlFor = path => new URL(path,origin).href;
const known = new Set(entries.map(entry=>entry.url));
const pages = new Set(['/','/simulator','/sent-scent']);
async function notify(data) {
  for(const client of await self.clients.matchAll({type:'window',includeUncontrolled:true})) client.postMessage(data);
}
async function readiness() {
  const cache=await caches.open(CACHE_NAME);
  const keys=new Set((await cache.keys()).map(request=>request.url));
  const ready=keys.has(urlFor(META)) && entries.every(entry=>keys.has(urlFor(entry.url)));
  return {type:'OFFLINE_STATUS',ready,version:RELEASE.version,total:entries.length,
    completed:entries.filter(entry=>keys.has(urlFor(entry.url))).length,demo:!!await cache.match(urlFor(DEMO))};
}
async function installRelease() {
  const cache=await caches.open(CACHE_NAME);
  let completed=0, next=0;
  await notify({type:'OFFLINE_PROGRESS',completed,total:entries.length});
  // Bound concurrency and timeout: a bad connection must not wait indefinitely.
  await Promise.all(Array.from({length:4},async()=>{
    while(next<entries.length) {
      const entry=entries[next++];
      const controller=new AbortController();
      const timer=setTimeout(()=>controller.abort(),20000);
      try {
        const response=await fetch(new Request(urlFor(entry.source || entry.url),{cache:'reload',signal:controller.signal}));
        if(!response.ok || response.redirected || /(?:private|no-store)/i.test(response.headers.get('Cache-Control')||'')) throw new Error(`Cannot save ${entry.url}`);
        const bytes=await response.clone().arrayBuffer();
        const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
        if(digest!==entry.sha256) throw new Error(`Release mismatch: ${entry.url}`);
        await cache.put(urlFor(entry.url),response);
        await notify({type:'OFFLINE_PROGRESS',completed:++completed,total:entries.length});
      } finally {clearTimeout(timer);}
    }
  }));
  await cache.put(urlFor(META),new Response(RELEASE.version));
  // No skipWaiting here: keep the current presentation stable during updates.
}
self.addEventListener('install',event=>event.waitUntil(installRelease().catch(async error=>{
  await notify({type:'OFFLINE_ERROR',message:'Download incomplete. Reconnect and retry.'});
  throw error;
})));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  // Preserve old releases, other apps and user storage. Existing tabs may need them.
  await self.clients.claim();
  await notify(await readiness());
})()));
self.addEventListener('message',event=>{
  const reply=data=>event.ports?.[0]?.postMessage(data);
  event.waitUntil((async()=>{
    try {
      if(event.data?.type==='APPLY_UPDATE') {await self.skipWaiting();reply({ok:true});return;}
      if(event.data?.type==='SET_DEMO') {
        const status=await readiness();
        if(event.data.enabled && !status.ready) {reply({...status,error:'Offline files are incomplete.'});return;}
        const cache=await caches.open(CACHE_NAME);
        if(event.data.enabled) await cache.put(urlFor(DEMO),new Response('1'));
        else await cache.delete(urlFor(DEMO));
      }
      if(['STATUS','SET_DEMO'].includes(event.data?.type)) reply(await readiness());
    } catch {reply({type:'OFFLINE_STATUS',ready:false,error:'Offline storage is unavailable.'});}
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET' || url.origin!==origin || request.headers.has('Authorization') || request.cache==='no-store') return;
  const pathname=url.pathname.replace(/\/$/,'')||'/';
  // Next's RSC traffic is never confused with an HTML document.
  const deploymentQuery = url.pathname.startsWith('/_next/static/') && [...url.searchParams.keys()].every(key=>key==='dpl');
  if(request.headers.has('RSC') || request.headers.has('Next-Router-State-Tree') || request.headers.has('Next-Router-Prefetch') ||
    (request.headers.get('accept')||'').includes('text/x-component') || (url.search && !deploymentQuery)) return;
  const navigation=request.mode==='navigate' && pages.has(pathname);
  if(!navigation && !known.has(url.pathname)) return;
  event.respondWith((async()=>{
    try {
      const cache=await caches.open(CACHE_NAME);
      const cached=await cache.match(urlFor(navigation?pathname:url.pathname));
      // A coherent, immutable release works instantly even on a hanging network.
      if(cached) return cached;
      if(await cache.match(urlFor(DEMO))) return unavailable();
    } catch { /* Storage unavailable: still allow the live site to work. */ }
    try {return await fetch(request);} catch {return unavailable();}
  })());
});
function unavailable() {
  return new Response('This file is not saved for offline use. Reconnect and prepare the offline demo again.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
