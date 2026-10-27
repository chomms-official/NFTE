const CACHE_NAME = 'mozziemap-cache-v6';
const APP_CACHE_PATTERN = /^mozziemap-cache-v\d+$/;
const PAGE_PATHS = new Set(['/', '/simulator', '/sent-scent']);

const ASSETS_TO_CACHE = [
  '/',
  '/simulator',
  '/sent-scent',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
  '/og-image.png',
  '/assets/countries.geojson',
  '/assets/earth-blue-marble.jpg',
  '/assets/night-sky.png'
];

function canCacheResponse(response) {
  return response.ok &&
    !/(?:private|no-store)/i.test(response.headers.get('Cache-Control') || '') &&
    !(response.headers.get('Content-Type') || '').includes('text/x-component');
}

// Cache storage can be unavailable or full. It must never break an online page.
async function storeResponse(request, response) {
  if (!canCacheResponse(response)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch {
    // The network response remains usable even when offline storage is unavailable.
  }
}

async function findCachedResponse(request) {
  try {
    // Keep previous app versions available for already-open/offline tabs, and
    // never read or delete another application's caches or user data.
    const names = (await caches.keys()).filter((name) => APP_CACHE_PATTERN.test(name));
    names.sort((a, b) => Number(b.split('-v').pop()) - Number(a.split('-v').pop()));
    for (const name of [CACHE_NAME, ...names.filter((name) => name !== CACHE_NAME)]) {
      const cache = await caches.open(name);
      const response = await cache.match(request);
      if (response && canCacheResponse(response)) return response;
    }
  } catch {
    // An unavailable cache is equivalent to an offline cache miss.
  }
  return undefined;
}

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    // One unavailable asset must not prevent the safer worker from installing.
    await Promise.all(ASSETS_TO_CACHE.map(async (path) => {
      try {
        const request = new Request(new URL(path, self.location.origin), { cache: 'reload' });
        const response = await fetch(request);
        if (response.ok) await storeResponse(request, response);
      } catch {
        // Previously cached assets remain available when installation is offline.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  // Do not clear caches, localStorage, IndexedDB, or any other user storage.
  // Old hashed bundles can still be needed by tabs opened before an update.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // React Server Component responses are not HTML. Let Next.js manage them;
  // caching them as an ordinary page can mix deployments and break hydration.
  if (
    url.origin !== self.location.origin ||
    url.search ||
    request.cache === 'no-store' ||
    request.headers.has('Authorization') ||
    request.headers.has('RSC') ||
    request.headers.has('Next-Router-Prefetch') ||
    request.headers.has('Next-Router-State-Tree') ||
    (request.headers.get('accept') || '').includes('text/x-component')
  ) return;

  const pathname = url.pathname.replace(/\/$/, '') || '/';
  const isPage = request.mode === 'navigate' && PAGE_PATHS.has(pathname);
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname === '/manifest.json' ||
    url.pathname === '/assets/countries.geojson' ||
    /^\/(?:assets\/|presentation\/|storyboard\/|product-frames\/)?[^/]+\.(?:png|jpe?g|webp|avif|gif|svg|ico|woff2?|ttf|otf)$/.test(url.pathname);
  if (!isPage && !isStaticAsset) return;

  // Network first keeps HTML and non-hashed assets current across deployments.
  const result = (async () => {
    try {
      const response = await fetch(request);
      return { response, cacheCopy: response.ok ? response.clone() : null };
    } catch {
      const cached = await findCachedResponse(request);
      return {
        response: cached || new Response('This content is unavailable offline. Please reconnect and try again.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        }),
        cacheCopy: null
      };
    }
  })();

  event.respondWith(result.then(({ response }) => response));
  // Register this synchronously and await the actual write, so the worker is
  // kept alive until caching completes rather than losing writes on shutdown.
  event.waitUntil(result.then(({ cacheCopy }) => {
    if (cacheCopy) return storeResponse(request, cacheCopy);
  }));
});
