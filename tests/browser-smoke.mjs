import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:3001';
const artifacts = process.env.QA_ARTIFACTS || '/tmp/nfte-browser-results';
await fs.mkdir(artifacts, { recursive: true });
const executablePath = process.env.CHROMIUM_PATH;
const results = [];
async function run(name, test) {
  await test();
  results.push(name);
  console.log(`PASS ${name}`);
}
const launch = disabled => chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', ...(disabled ? ['--disable-webgl'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])],
});
let checks = 0;
for (const disabled of [true, false]) {
  const browser = await launch(disabled);
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const mode = disabled ? 'no-webgl' : 'webgl';
    await run(`home ${mode}: hydration, all 11 steps, images and scroll progress`, async () => {
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('.ch-loader-done'));
      await page.locator('.ch-loader').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: 'Pause auto-scroll' }).click();
      if (disabled) assert.equal(await page.locator('.ch-static-scene').count(), 1);
      else await page.waitForSelector('canvas');
      const boundaries = [0, .055, .145, .235, .325, .425, .515, .635, .715, .805, .915, 1];
      for (let i = 0; i < 11; i++) {
        await page.evaluate(p => {
          const root = document.querySelector('.ch-root');
          window.scrollTo(0, p * (root.offsetHeight - innerHeight));
        }, (boundaries[i] + boundaries[i + 1]) / 2);
        await page.waitForFunction(index => document.querySelector('.ch-card-active .ch-card-num strong')?.textContent === String(index + 1).padStart(2, '0'), i);
      }
      assert.ok(await page.locator('.ch-progress-fill').evaluate(el => el.getBoundingClientRect().width > 0));
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${artifacts}/home-${mode}.png` });
      assert.deepEqual(errors, []);
    });
    if (!disabled) {
      await run('home: loss of an existing WebGL context recovers to product view', async () => {
        await page.evaluate(() => {
          const canvas = document.querySelector('canvas');
          canvas.getContext('webgl2').getExtension('WEBGL_lose_context').loseContext();
        });
        await page.waitForSelector('.ch-static-scene');
        assert.equal(await page.locator('h1').innerText(), "Chomm's House\nNatural Protection");
        assert.deepEqual(errors, []);
      });
    }
    await run(`simulator ${mode}: country details, species, chart controls and revisit`, async () => {
      await page.goto(`${base}/simulator`, { waitUntil: 'networkidle' });
      if (disabled) {
        await page.waitForFunction(() => document.querySelector('#fallback-country')?.options.length === 178);
        await page.selectOption('#fallback-country', 'Thailand');
      } else {
        await page.waitForFunction(() => !document.querySelector('#auto-tour-btn')?.disabled, { timeout: 30000 });
        // The existing tour selects a high-risk country after its first flight.
        await page.waitForSelector('button[aria-label="Close country details"]', { timeout: 15000 });
        await page.locator('#auto-tour-btn').click();
        // Stop tour closes its panel; inject context loss to test simulator recovery too.
        await page.evaluate(() => document.querySelector('#globe-container canvas').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext());
        await page.waitForSelector('#fallback-country');
        await page.selectOption('#fallback-country', 'Thailand');
      }
      await page.getByRole('heading', { name: 'Thailand', exact: true }).waitFor();
      const risk = await page.getByText(/^Risk Level:/).innerText();
      await page.getByRole('button', { name: 'Flat heat map', exact: true }).click();
      await page.getByRole('button', { name: '3D skyline', exact: true }).click();
      await page.getByRole('button', { name: /ANOPHELES/ }).click();
      await page.getByRole('button', { name: /AEDES/ }).click();
      assert.equal(await page.getByText(/^Risk Level:/).innerText(), risk);
      await page.getByRole('button', { name: 'Close country details' }).click();
      await page.selectOption('#fallback-country', 'Thailand');
      assert.equal(await page.getByText(/^Risk Level:/).innerText(), risk);
      await page.screenshot({ path: `${artifacts}/simulator-${mode}.png` });
      assert.deepEqual(errors, []);
    });
    if (disabled) {
      await run('simulator: failed GeoJSON request shows retry and recovers', async () => {
        await context.route('**/assets/countries.geojson', route => route.fulfill({ status: 503, body: 'Unavailable' }));
        // Bypass the worker so this specifically tests the application error path.
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.setBypassServiceWorker', { bypass: true });
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Retry country data' }).waitFor();
        await context.unroute('**/assets/countries.geojson');
        await page.getByRole('button', { name: 'Retry country data' }).click();
        await page.waitForFunction(() => document.querySelector('#fallback-country')?.options.length === 178);
        await cdp.send('Network.setBypassServiceWorker', { bypass: false });
        // Intentional 503 is expected; no JavaScript exception is allowed.
        errors.splice(0, errors.length, ...errors.filter(error => !error.includes('503')));
      });
      await run('mobile: usable no-WebGL country selection and close control', async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.selectOption('#fallback-country', 'Japan');
        await page.getByRole('heading', { name: 'Japan', exact: true }).waitFor();
        await page.screenshot({ path: `${artifacts}/simulator-mobile.png` });
        await page.getByRole('button', { name: 'Close country details' }).click();
        assert.ok(await page.locator('#fallback-country').isVisible());
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.waitForFunction(() => document.querySelector('.ch-loader-done'));
      await page.locator('.ch-loader').waitFor({ state: 'hidden' });
        const cardBounds = await page.locator('.ch-card-active').boundingBox();
        const buttonBounds = await page.locator('.ch-autoplay').boundingBox();
        assert.ok(buttonBounds.y >= cardBounds.y + cardBounds.height, 'Autoplay control must not cover mobile content');
        await page.screenshot({ path: `${artifacts}/home-mobile.png` });
        assert.ok(await page.locator('.ch-static-scene img').evaluate(img => img.complete && img.naturalWidth > 0));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      });
      await run('presentation: keyboard, forward/back looping, wheel, touch coordinate zero, reduced motion', async () => {
        await page.goto(`${base}/sent-scent`, { waitUntil: 'networkidle' });
        await page.getByAltText('Earl Grey Garden', { exact: true }).waitFor();
        for (const name of ['Natural Shell', 'Stable Powder', 'Dissolve & Pour', 'Ready to Use', 'Earl Grey Garden']) {
          await page.keyboard.press('ArrowRight');
          await page.getByAltText(name, { exact: true }).waitFor();
        }
        await page.keyboard.press('ArrowLeft');
        await page.getByAltText('Ready to Use', { exact: true }).waitFor();
        await page.keyboard.press('Home');
        await page.getByAltText('Earl Grey Garden', { exact: true }).waitFor();
        await page.mouse.wheel(0, 2800);
        await page.getByAltText('Natural Shell', { exact: true }).waitFor();
        // A touch starting at y=0 must not be mistaken for "no touch".
        await page.evaluate(() => {
          dispatchEvent(new TouchEvent('touchstart', { touches: [new Touch({ identifier: 1, target: document.body, clientY: 0 })] }));
          dispatchEvent(new TouchEvent('touchmove', { touches: [new Touch({ identifier: 1, target: document.body, clientY: 400 })], cancelable: true }));
          dispatchEvent(new TouchEvent('touchend', { touches: [] }));
        });
        await page.getByAltText('Earl Grey Garden', { exact: true }).waitFor();
        await page.keyboard.press('Home');
        await page.waitForTimeout(5500);
        assert.equal(await page.getByAltText('Earl Grey Garden', { exact: true }).count(), 1);
        await page.screenshot({ path: `${artifacts}/presentation-mobile.png` });
        assert.deepEqual(errors, []);
      });
      await run('service worker: activation preserves user storage and supports offline reload', async () => {
        await page.goto(`${base}/manifest.json`);
        await page.evaluate(async () => {
          localStorage.setItem('qa-user-draft', 'keep this draft');
          const cache = await caches.open('unrelated-user-cache');
          await cache.put('/qa-user-entry', new Response('user cache stays'));
        });
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.evaluate(() => navigator.serviceWorker.register('/sw.js?qa=preserve'));
        await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('?qa=preserve'));
        await page.reload({ waitUntil: 'networkidle' });
        assert.equal(await page.evaluate(() => localStorage.getItem('qa-user-draft')), 'keep this draft');
        assert.equal(await page.evaluate(async () => (await (await caches.open('unrelated-user-cache')).match('/qa-user-entry')).text()), 'user cache stays');
        await context.setOffline(true);
        const response = await page.reload({ waitUntil: 'load' });
        assert.equal(response.status(), 200);
        await page.waitForFunction(() => document.querySelector('.ch-loader-done'));
      await page.locator('.ch-loader').waitFor({ state: 'hidden' });
        await context.setOffline(false);
        // Some requests intentionally bypass offline caching (e.g. RSC).
        assert.deepEqual(errors.filter(error => !error.includes('net::ERR_INTERNET_DISCONNECTED')), []);
        errors.length = 0;
      });
    }
    checks += 1;
    await context.close();
  } finally { await browser.close(); }
}
await fs.writeFile(`${artifacts}/results.json`, JSON.stringify({ groups: checks, passed: results }, null, 2));
console.log(`Completed ${results.length} browser scenarios. Screenshots: ${artifacts}`);
