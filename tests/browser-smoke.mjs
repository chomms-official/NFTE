import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import { chromium } from 'playwright';

const base = process.env.BASE_URL || 'http://127.0.0.1:3001';
const artifacts = process.env.QA_ARTIFACTS || '/tmp/nfte-browser-results';
await fs.mkdir(artifacts, { recursive: true });
const executablePath = process.env.CHROMIUM_PATH;
const results = [];
const pixelEvidence = [];
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

const globeCanvas = page => page.locator('#globe-container canvas').first();
async function assertNoProductPage(page) {
  assert.equal(await page.locator('main[data-app="mozziemap"]').count(), 1);
  assert.equal(await page.locator('.ch-root, .ch-card, .ch-static-scene, img[src*="hero-product"], img[src*="asset_bottle"]').count(), 0);
  assert.equal(/Chomm.?s House|Small film\. Big protection|Natural Protection/.test(await page.locator('body').innerText()), false);
}
async function ready(page) {
  await page.waitForFunction(() => document.querySelector('#auto-tour-btn')?.disabled === false);
  // An already-running tour can open details immediately in software mode.
  // Stop it before looking for the select, which is intentionally hidden there.
  await stopAutopilot(page);
  await page.waitForFunction(() => document.querySelector('#country-select')?.options.length === 178);
  await globeCanvas(page).waitFor();
}
async function stopAutopilot(page) {
  const control = page.locator('#auto-tour-btn');
  if (await control.getAttribute('aria-pressed') === 'true') await control.click();
  await page.waitForTimeout(300);
  const close = page.getByRole('button', { name: 'Close country details' });
  if (await close.count()) await close.click();
}
async function rawImage(buffer) {
  return sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
}
async function sphereEvidence(page, name) {
  const buffer = await globeCanvas(page).screenshot();
  await fs.writeFile(`${artifacts}/${name}.png`, buffer);
  await page.screenshot({ path: `${artifacts}/${name}-fullpage.png`, fullPage: true });
  const { data, info } = await rawImage(buffer);
  const { width, height, channels } = info;
  assert.ok(width >= 300 && height >= 400, 'The globe must occupy a useful viewport, not a small fallback thumbnail');
  let colorful = 0;
  const colors = new Set();
  // The middle area excludes navigation/legends. A blank canvas or text-only
  // fallback cannot pass this rendered-pixel check.
  for (let y = Math.floor(height * .22); y < height * .75; y++) {
    for (let x = Math.floor(width * .25); x < width * .75; x++) {
      const offset = (y * width + x) * channels;
      const r = data[offset], g = data[offset + 1], b = data[offset + 2];
      if (Math.max(r, g, b) > 55 && Math.max(r, g, b) - Math.min(r, g, b) > 25) {
        colorful++;
        colors.add(`${r >> 4}:${g >> 4}:${b >> 4}`);
      }
    }
  }
  assert.ok(colorful > 3500, `Expected a visibly rendered globe; found only ${colorful} colored center pixels`);
  assert.ok(colors.size >= 16, `Expected rendered land/ocean/edges, not a flat placeholder (${colors.size} color bins)`);
  pixelEvidence.push({ name, width, height, colorfulPixels: colorful, colorBins: colors.size });
  return buffer;
}
async function assertSceneChanged(before, after, label) {
  const a = await rawImage(before), b = await rawImage(after);
  assert.equal(a.info.width, b.info.width);
  assert.equal(a.info.height, b.info.height);
  const { width, height, channels } = a.info;
  let changed = 0, sampled = 0;
  for (let y = Math.floor(height * .25); y < height * .72; y++) {
    for (let x = Math.floor(width * .25); x < width * .75; x++) {
      const offset = (y * width + x) * channels;
      const difference = Math.abs(a.data[offset] - b.data[offset]) + Math.abs(a.data[offset + 1] - b.data[offset + 1]) + Math.abs(a.data[offset + 2] - b.data[offset + 2]);
      if (difference > 35) changed++;
      sampled++;
    }
  }
  assert.ok(changed / sampled > .005, `${label} must visibly change globe pixels (${changed}/${sampled})`);
  pixelEvidence.push({ name: label, changedPixels: changed, sampledPixels: sampled });
}
async function dragAndZoom(page, mode) {
  const canvas = globeCanvas(page);
  const box = await canvas.boundingBox();
  // Pointer start stops idle rotation, so subsequent differences exercise input.
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .515, box.y + box.height * .5, { steps: 2 });
  await page.mouse.up();
  await page.waitForTimeout(600);
  const before = await canvas.screenshot();
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * .65, box.y + box.height * .55, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(700);
  const dragged = await canvas.screenshot();
  await assertSceneChanged(before, dragged, `${mode}: drag rotates visible globe`);
  await page.mouse.move(box.x + box.width * .5, box.y + box.height * .5);
  await page.mouse.wheel(0, -450);
  await page.waitForTimeout(700);
  const zoomed = await canvas.screenshot();
  await assertSceneChanged(dragged, zoomed, `${mode}: wheel zoom changes visible globe`);
  await fs.writeFile(`${artifacts}/globe-${mode}-dragged-zoomed.png`, zoomed);
}
async function selectCountry(page, name) {
  await page.selectOption('#country-select', name);
  await page.getByRole('heading', { name, exact: true }).waitFor({ timeout: 15000 });
}
async function closeCountry(page) {
  await page.getByRole('button', { name: 'Close country details' }).click();
}
async function assertReadableChartUnits(page) {
  const units = page.getByText(/^simulated cases?$/, { exact: true });
  let checked = 0;
  for (const unit of await units.all()) {
    const dimensions = await unit.evaluate(element => {
      if (element.closest('[aria-hidden="true"]')) return null;
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return null;
      const row = element.parentElement;
      return { width: row.clientWidth, content: row.scrollWidth };
    });
    if (!dimensions) continue;
    assert.ok(dimensions.content <= dimensions.width + 1,
      `Chart units and value must fit or wrap, not clip (${dimensions.content}/${dimensions.width})`);
    checked++;
  }
  assert.ok(checked > 0, 'The chart must show at least one readable simulated-case unit');
}

let groups = 0;
for (const disabled of [true, false]) {
  const browser = await launch(disabled);
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const mode = disabled ? 'software' : 'webgl';
    await run(`homepage ${mode}: MozzieMap globe, rendered pixels, no product hero, drag and zoom`, async () => {
      await page.goto(base, { waitUntil: 'networkidle' });
      await ready(page);
      await stopAutopilot(page);
      await assertNoProductPage(page);
      if (disabled) {
        await page.locator('canvas[data-testid="software-globe"]').waitFor();
        assert.equal(await globeCanvas(page).evaluate(canvas => !!canvas.getContext('2d')), true);
        const shape = await globeCanvas(page).evaluate(canvas => {
          const { width, height } = canvas;
          const data = canvas.getContext('2d').getImageData(0, 0, width, height).data;
          const radius = Math.min(width, height) * .47;
          let inside = 0, outside = 0;
          for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
            const offset = (y * width + x) * 4;
            // Land heatmap colors are warm; sky/ocean are blue. Land must stay
            // inside a circular globe, rather than filling a rectangular map.
            if (data[offset] > 55 && data[offset] > data[offset + 2] * 1.5 && data[offset + 1] > 20) {
              if (Math.hypot(x - width / 2, y - height / 2) < radius) inside++;
              else outside++;
            }
          }
          return { inside, outside };
        });
        assert.ok(shape.inside > 1000 && shape.outside < 20, `Expected a circular projected globe: ${JSON.stringify(shape)}`);
        pixelEvidence.push({ name: 'software spherical silhouette', ...shape });
      } else {
        assert.equal(await globeCanvas(page).evaluate(canvas => !!canvas.getContext('webgl2')), true);
        assert.equal(await page.locator('canvas[data-testid="software-globe"]').count(), 0);
      }
      await page.waitForTimeout(900);
      await sphereEvidence(page, `home-${mode}-globe`);
      if (disabled) {
        // Verify polygon hit-testing itself, independently of the select control.
        await page.getByRole('button', { name: 'Reset globe view' }).click();
        const box = await globeCanvas(page).boundingBox();
        await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
        await page.getByRole('heading', { name: 'Thailand', exact: true }).waitFor();
        await closeCountry(page);
      }
      await dragAndZoom(page, mode);
      assert.deepEqual(errors, []);
    });
    await run(`homepage ${mode}: country pick, species, chart controls, repeatable risk and autopilot`, async () => {
      await selectCountry(page, 'Thailand');
      const risk = await page.getByText(/^Risk Level:/).innerText();
      await page.getByRole('button', { name: 'Flat heat map', exact: true }).click();
      await page.getByRole('button', { name: '3D skyline', exact: true }).click();
      await page.getByRole('button', { name: /ANOPHELES/ }).click();
      await page.getByRole('button', { name: /AEDES/ }).click();
      assert.equal(await page.getByText(/^Risk Level:/).innerText(), risk);
      await page.waitForTimeout(500);
      await assertReadableChartUnits(page);
      await page.screenshot({ path: `${artifacts}/country-${mode}-thailand.png` });
      await closeCountry(page);
      await selectCountry(page, 'Thailand');
      assert.equal(await page.getByText(/^Risk Level:/).innerText(), risk);
      await closeCountry(page);
      await page.locator('#auto-tour-btn').click();
      assert.equal(await page.locator('#auto-tour-btn').getAttribute('aria-pressed'), 'true');
      await page.getByRole('button', { name: 'Close country details' }).waitFor({ timeout: 15000 });
      await stopAutopilot(page);
      assert.equal(await page.locator('#auto-tour-btn').getAttribute('aria-pressed'), 'false');
      assert.deepEqual(errors, []);
    });
    if (!disabled) {
      await run('homepage: losing an existing GPU context recovers to an interactive software sphere', async () => {
        await page.evaluate(() => {
          const canvas = document.querySelector('#globe-container canvas');
          const extension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
          if (!extension) throw new Error('Context-loss extension unavailable for this test');
          extension.loseContext();
        });
        await page.locator('canvas[data-testid="software-globe"]').waitFor();
        await ready(page);
        await stopAutopilot(page);
        await assertNoProductPage(page);
        await sphereEvidence(page, 'home-context-loss-software-globe');
        await selectCountry(page, 'Japan');
        await closeCountry(page);
        await dragAndZoom(page, 'context-loss');
        assert.deepEqual(errors, []);
      });
    }
    await run(`/simulator ${mode}: preserved globe route and same country workflow`, async () => {
      await page.goto(`${base}/simulator`, { waitUntil: 'networkidle' });
      await ready(page);
      await stopAutopilot(page);
      await assertNoProductPage(page);
      await sphereEvidence(page, `simulator-${mode}-globe`);
      await selectCountry(page, 'Brazil');
      await page.getByText(/Simulated History/).waitFor();
      await closeCountry(page);
      assert.deepEqual(errors, []);
    });
    if (disabled) {
      await run('homepage: failed GeoJSON shows retry and recovers without JavaScript exceptions', async () => {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.setBypassServiceWorker', { bypass: true });
        await context.route('**/assets/countries.geojson', route => route.fulfill({ status: 503, body: 'Unavailable' }));
        await page.goto(base, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: 'Retry country data' }).waitFor();
        await context.unroute('**/assets/countries.geojson');
        await page.getByRole('button', { name: 'Retry country data' }).click();
        await ready(page);
        await stopAutopilot(page);
        await cdp.send('Network.setBypassServiceWorker', { bypass: false });
        errors.splice(0, errors.length, ...errors.filter(error => !error.includes('503')));
        assert.deepEqual(errors, []);
      });
      await run('mobile homepage: full software globe, country details and no horizontal overflow', async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(500);
        await assertNoProductPage(page);
        await sphereEvidence(page, 'home-mobile-software-globe');
        await selectCountry(page, 'Japan');
        await page.waitForTimeout(500);
        await assertReadableChartUnits(page);
        await page.screenshot({ path: `${artifacts}/country-mobile-japan.png` });
        await closeCountry(page);
        assert.ok(await page.locator('#country-select').isVisible());
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        assert.deepEqual(errors, []);
      });
      await run('presentation: keyboard, looping, wheel, touch y=0 and reduced motion remain intact', async () => {
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
      await run('service worker: activation preserves user storage and offline root still shows a globe', async () => {
        await page.goto(`${base}/manifest.json`);
        await page.evaluate(async () => {
          localStorage.setItem('qa-user-draft', 'keep this draft');
          const cache = await caches.open('unrelated-user-cache');
          await cache.put('/qa-user-entry', new Response('user cache stays'));
        });
        await page.goto(base, { waitUntil: 'networkidle' });
        await ready(page);
        await stopAutopilot(page);
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.evaluate(() => navigator.serviceWorker.register('/sw.js?qa=preserve'));
        await page.waitForFunction(() => navigator.serviceWorker.controller?.scriptURL.endsWith('?qa=preserve'));
        await page.reload({ waitUntil: 'networkidle' });
        await ready(page);
        await stopAutopilot(page);
        assert.equal(await page.evaluate(() => localStorage.getItem('qa-user-draft')), 'keep this draft');
        assert.equal(await page.evaluate(async () => (await (await caches.open('unrelated-user-cache')).match('/qa-user-entry')).text()), 'user cache stays');
        await context.setOffline(true);
        const response = await page.reload({ waitUntil: 'load' });
        assert.equal(response.status(), 200);
        await ready(page);
        await stopAutopilot(page);
        await assertNoProductPage(page);
        await sphereEvidence(page, 'home-offline-software-globe');
        await selectCountry(page, 'Thailand');
        await context.setOffline(false);
        assert.deepEqual(errors.filter(error => !error.includes('net::ERR_INTERNET_DISCONNECTED')), []);
        errors.length = 0;
      });
    }
    groups++;
    await context.close();
  } finally { await browser.close(); }
}
await fs.writeFile(`${artifacts}/results.json`, JSON.stringify({ groups, passed: results, renderedPixelEvidence: pixelEvidence }, null, 2));
console.log(`Completed ${results.length} browser scenarios. Screenshots: ${artifacts}`);
