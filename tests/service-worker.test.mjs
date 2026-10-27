import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
const origin = 'https://example.test';
const currentCache = 'mozziemap-cache-v6';

function bootWorker({ fetcher = async () => new Response('online'), storageFailure = false } = {}) {
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
      location: { origin },
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
    url: path.startsWith('https://') ? path : origin + path,
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
  assert.equal(await (await event.response).text(), 'online');
  await event.done();
  assert.equal(await worker.stores.get(currentCache).get(origin + '/').text(), 'online');
});

test('offline navigation retains access to prior app pages without reading unrelated user caches', async () => {
  const worker = bootWorker({ fetcher: async () => { throw new Error('offline'); } });
  worker.stores.set('unrelated-cache', new Map([[origin + '/', new Response('private document')]]));
  worker.stores.set('mozziemap-cache-v5', new Map([[origin + '/simulator', new Response('old offline simulator')]]));
  const hit = worker.dispatch('fetch', worker.request('/simulator'));
  assert.equal(await (await hit.response).text(), 'old offline simulator');
  await hit.done();
  const miss = worker.dispatch('fetch', worker.request('/'));
  assert.equal((await miss.response).status, 503);
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
  assert.equal(await (await event.response).text(), 'online');
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
