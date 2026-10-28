import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://example.test';
const currentCache = 'mozziemap-cache-v7';
const GLOBE_HTML = '<main data-app="mozziemap">online</main>';

function bootWorker({ fetcher = async () => new Response(GLOBE_HTML), storageFailure = false, workerOrigin = origin } = {}) {
  const listeners = new Map();
  const stores = new Map();
  const calls = { fetched: [], deleted: [], claimed: 0, skipped: 0 };
  const key = (request) => typeof request === 'string' ? request : request.url;
  const caches = {
    keys: async () => [...stores.keys()],
    delete: async (name) => { calls.deleted.push(name); return stores.delete(name); },
    open: async (name) => {
      if (storageFailure) throw new Error('Storage unavailable');
      if (!stores.has(name)) stores.set(name, new Map());
      const cache = stores.get(name);
      return {
        match: async (request) => cache.get(key(request))?.clone(),
        put: async (request, response) => { cache.set(key(request), response.clone()); },
      };
    },
  };
  vm.runInNewContext(source, {
    URL, Request, Response, Set,
    caches,
    fetch: async (request) => { calls.fetched.push(key(request)); return fetcher(request); },
    self: {
      location: { origin: workerOrigin },
      addEventListener: (type, listener) => listeners.set(type, listener),
      skipWaiting: async () => { calls.skipped++; },
      clients: { claim: async () => { calls.claimed++; } },
    },
  });
  function dispatch(type, request) {
    const lifetime = [];
    let response;
    listeners.get(type)({
      request,
      waitUntil: (promise) => lifetime.push(promise),
      respondWith: (promise) => { response = promise; },
    });
    return { response, lifetime, done: () => Promise.all(lifetime) };
  }
  const request = (path, { headers, mode = 'navigate', method = 'GET', cache = 'default' } = {}) => ({
    url: path.startsWith('https://') ? path : workerOrigin + path,
    headers: new Headers(headers), mode, method, cache,
  });
  return { dispatch, request, stores, calls };
}

test('activation preserves unrelated user caches and previous app bundles', async () => {
  const worker = bootWorker();
  worker.stores.set('user-offline-documents', new Map([['draft', new Response('saved work')]]));
  worker.stores.set('mozziemap-cache-v5', new Map([['old-bundle', new Response('v5')]]));
  await worker.dispatch('activate').done();
  assert.equal(worker.calls.claimed, 1);
  assert.deepEqual(worker.calls.deleted, []);
  assert.equal(await worker.stores.get('user-offline-documents').get('draft').text(), 'saved work');
  assert.ok(worker.stores.has('mozziemap-cache-v5'));
});

test('installation tolerates one unavailable asset and awaits successful cache writes', async () => {
  const worker = bootWorker({ fetcher: async (request) => {
    if (request.url.endsWith('/og-image.png')) throw new Error('offline');
    if (request.url.endsWith('/icon-512x512.png')) return new Response('missing', { status: 404 });
    return new Response('asset');
  } });
  await worker.dispatch('install').done();
  assert.equal(worker.calls.skipped, 1);
  const cached = worker.stores.get(currentCache);
  assert.ok(cached.has(origin + '/sent-scent'));
  assert.ok(cached.has(origin + '/assets/countries.geojson'));
  assert.equal(cached.has(origin + '/og-image.png'), false);
  assert.equal(cached.has(origin + '/icon-512x512.png'), false);
});

test('navigation serves fresh HTML and registers the cache write lifetime synchronously', async () => {
  const worker = bootWorker();
  worker.stores.set(currentCache, new Map([[origin + '/', new Response('old HTML')]]));
  const event = worker.dispatch('fetch', worker.request('/'));
  assert.equal(event.lifetime.length, 1);
  assert.equal(await (await event.response).text(), GLOBE_HTML);
  await event.done();
  assert.equal(await worker.stores.get(currentCache).get(origin + '/').text(), GLOBE_HTML);
});

test('offline navigation retains access to prior app pages without reading unrelated user caches', async () => {
  const worker = bootWorker({ fetcher: async () => { throw new Error('offline'); } });
  worker.stores.set('unrelated-cache', new Map([[origin + '/', new Response('private document')]]));
  worker.stores.set('mozziemap-cache-v5', new Map([[origin + '/simulator', new Response('old offline simulator')]]));
  const hit = worker.dispatch('fetch', worker.request('/simulator'));
  assert.equal(await (await hit.response).text(), 'old offline simulator');
  await hit.done();
  const miss = worker.dispatch('fetch', worker.request('/'));
  const redirect = await miss.response;
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('Location'), origin + '/simulator');
  await miss.done();
});

test('offline static asset misses return a Response rather than undefined', async () => {
  const worker = bootWorker({ fetcher: async () => { throw new Error('offline'); } });
  const event = worker.dispatch('fetch', worker.request('/hero-product.jpg', { mode: 'cors' }));
  const response = await event.response;
  assert.equal(response.status, 503);
  assert.match(await response.text(), /unavailable offline/);
  await event.done();
});

test('RSC, external, authenticated, query, API and mutation requests bypass worker caching', async () => {
  const worker = bootWorker();
  const requests = [
    worker.request('/', { headers: { RSC: '1' } }),
    worker.request('/', { headers: { 'Next-Router-Prefetch': '1' } }),
    worker.request('/', { headers: { 'Next-Router-State-Tree': 'tree' } }),
    worker.request('/', { headers: { accept: 'text/x-component' } }),
    worker.request('/?_rsc=state'),
    worker.request('/?private=information'),
    worker.request('https://other.test/hero-product.jpg'),
    worker.request('/hero-product.jpg', { headers: { Authorization: 'placeholder' } }),
    worker.request('/hero-product.jpg', { cache: 'no-store' }),
    worker.request('/api/photo.png'),
    worker.request('/profile/avatar.png'),
    worker.request('/api/data'),
    worker.request('/', { method: 'POST' }),
  ];
  for (const request of requests) {
    const event = worker.dispatch('fetch', request);
    assert.equal(event.response, undefined, request.url);
    assert.equal(event.lifetime.length, 0, request.url);
  }
  assert.equal(worker.calls.fetched.length, 0);
});

test('HTTP failures never replace a successful offline page', async () => {
  const worker = bootWorker({ fetcher: async () => new Response('server error', { status: 500 }) });
  worker.stores.set(currentCache, new Map([[origin + '/', new Response('last good page')]]));
  const event = worker.dispatch('fetch', worker.request('/'));
  assert.equal((await event.response).status, 500);
  await event.done();
  assert.equal(await worker.stores.get(currentCache).get(origin + '/').text(), 'last good page');
});

test('private, no-store and RSC responses never enter the offline cache', async () => {
  for (const headers of [
    { 'Cache-Control': 'private, max-age=0' },
    { 'Cache-Control': 'no-store' },
    { 'Content-Type': 'text/x-component' },
  ]) {
    const worker = bootWorker({ fetcher: async () => new Response('sensitive', { headers }) });
    const event = worker.dispatch('fetch', worker.request('/'));
    assert.equal(await (await event.response).text(), 'sensitive');
    await event.done();
    assert.equal(worker.stores.has(currentCache), false);
  }
});

test('storage failure does not prevent online navigation', async () => {
  const worker = bootWorker({ storageFailure: true });
  const event = worker.dispatch('fetch', worker.request('/'));
  assert.equal(await (await event.response).text(), GLOBE_HTML);
  await event.done();
});

test('a legacy RSC response cannot be used as an offline HTML document', async () => {
  const worker = bootWorker({ fetcher: async () => { throw new Error('offline'); } });
  worker.stores.set('mozziemap-cache-v5', new Map([[origin + '/', new Response('RSC payload', {
    headers: { 'Content-Type': 'text/x-component' },
  })]]));
  const event = worker.dispatch('fetch', worker.request('/'));
  assert.equal((await event.response).status, 503);
  await event.done();
  assert.ok(worker.stores.has('mozziemap-cache-v5'));
});

test('an old product homepage is never restored offline and its cached data remains intact', async () => {
  const worker = bootWorker({ fetcher: async () => { throw new Error('offline'); } });
  const oldProduct = '<main>Chomm’s House product presentation</main>';
  worker.stores.set('mozziemap-cache-v6', new Map([[origin + '/', new Response(oldProduct)]]));
  const event = worker.dispatch('fetch', worker.request('/'));
  assert.equal((await event.response).status, 503);
  await event.done();
  assert.equal(await worker.stores.get('mozziemap-cache-v6').get(origin + '/').text(), oldProduct);
  assert.deepEqual(worker.calls.deleted, []);
});

test('a cached globe homepage is restored offline ahead of the legacy product screen', async () => {
  const worker = bootWorker({ fetcher: async () => { throw new Error('offline'); } });
  worker.stores.set('mozziemap-cache-v6', new Map([[origin + '/', new Response('old product screen')]]));
  worker.stores.set(currentCache, new Map([[origin + '/', new Response(GLOBE_HTML)]]));
  const event = worker.dispatch('fetch', worker.request('/'));
  assert.equal(await (await event.response).text(), GLOBE_HTML);
  await event.done();
  assert.equal(worker.stores.size, 2);
});

test('a legacy cached simulator supplies a safe offline route when the globe homepage is not cached yet', async () => {
  const worker = bootWorker({ fetcher: async () => { throw new Error('offline'); } });
  worker.stores.set('mozziemap-cache-v6', new Map([
    [origin + '/', new Response('old product screen')],
    [origin + '/simulator', new Response('cached mosquito globe')],
  ]));
  const rootEvent = worker.dispatch('fetch', worker.request('/'));
  const redirect = await rootEvent.response;
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.get('Location'), origin + '/simulator');
  await rootEvent.done();
  const simulatorEvent = worker.dispatch('fetch', worker.request('/simulator'));
  assert.equal(await (await simulatorEvent.response).text(), 'cached mosquito globe');
  await simulatorEvent.done();
  assert.equal(await worker.stores.get('mozziemap-cache-v6').get(origin + '/').text(), 'old product screen');
});

test('an outdated online root response cannot seed the new globe homepage cache', async () => {
  const worker = bootWorker({ fetcher: async () => new Response('<main>old product screen</main>') });
  const event = worker.dispatch('fetch', worker.request('/'));
  assert.equal((await event.response).status, 200);
  await event.done();
  assert.equal(worker.stores.has(currentCache), false);
});

test('installing v7 stores the marked globe homepage before offline use', async () => {
  let online = true;
  const worker = bootWorker({ fetcher: async () => {
    if (!online) throw new Error('offline');
    return new Response(GLOBE_HTML);
  } });
  await worker.dispatch('install').done();
  online = false;
  const event = worker.dispatch('fetch', worker.request('/'));
  assert.equal(await (await event.response).text(), GLOBE_HTML);
  await event.done();
});

test('the separate SENT SCENT host keeps its intended offline presentation at root', async () => {
  const presentationOrigin = 'https://sentscent.example.test';
  const presentation = '<main>Earl Grey Garden</main>';
  let online = true;
  const worker = bootWorker({ workerOrigin: presentationOrigin, fetcher: async () => {
    if (!online) throw new Error('offline');
    return new Response(presentation);
  } });
  const firstVisit = worker.dispatch('fetch', worker.request('/'));
  assert.equal(await (await firstVisit.response).text(), presentation);
  await firstVisit.done();
  online = false;
  const offlineVisit = worker.dispatch('fetch', worker.request('/'));
  assert.equal(await (await offlineVisit.response).text(), presentation);
  await offlineVisit.done();
});
