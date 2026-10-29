import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const base = process.env.BASE_URL || 'http://127.0.0.1:3001';
const artifacts = process.env.QA_ARTIFACTS || '/tmp/nfte-navigation-results';
await fs.mkdir(artifacts, { recursive: true });
const results = [];
const canvas = page => page.locator('#globe-container canvas').first();
const details = page => page.getByTestId('country-details');
async function stop(page) {
  await page.waitForFunction(() => document.querySelector('#auto-tour-btn')?.disabled === false);
  if (await page.locator('#auto-tour-btn').getAttribute('aria-pressed') === 'true') await page.locator('#auto-tour-btn').click();
  if (await details(page).count()) await page.getByRole('button', { name: 'Close country details' }).click();
}
async function selected(page, name) {
  await page.selectOption('#country-select', name);
  await page.getByRole('heading', { name, exact: true }).waitFor();
  await page.waitForTimeout(350);
}
async function imageDifference(a, b) {
  const x = await sharp(a).removeAlpha().raw().toBuffer();
  const y = await sharp(b).removeAlpha().raw().toBuffer();
  assert.equal(x.length, y.length);
  let changed = 0;
  for (let i = 0; i < x.length; i += 3) if (Math.abs(x[i] - y[i]) + Math.abs(x[i+1] - y[i+1]) + Math.abs(x[i+2] - y[i+2]) > 45) changed++;
  assert.ok(changed > 800, `Zoom must change rendered map pixels: ${changed}`);
  return changed;
}
for (const disabled of [true, false]) {
  const mode = disabled ? 'software' : 'webgl';
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox', ...(disabled ? ['--disable-webgl'] : ['--use-angle=swiftshader','--enable-unsafe-swiftshader'])] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference', hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    let releaseTexture;
    const textureGate = new Promise(resolve => { releaseTexture = resolve; });
    if (!disabled) await context.route('**/assets/earth-blue-marble.jpg', async route => {
      await textureGate;
      await route.continue();
    });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    if (!disabled) {
      await page.waitForFunction(() => {
        const map = document.querySelector('#globe-container canvas');
        return map && map.dataset.testid !== 'software-globe' && document.querySelector('#country-select')?.options.length === 178;
      });
      assert.equal(await page.locator('#country-select').isDisabled(), true, 'Country selection must wait while GPU textures are still loading');
      releaseTexture();
    }
    await page.waitForLoadState('networkidle');
    await stop(page);
    await page.getByRole('button', { name: 'Reset globe view', exact: true }).click();
    await selected(page, 'Belgium');
    assert.equal(await page.getByTestId('globe-flight').count(), 0, 'First selection only establishes a departure');
    await page.getByRole('button', { name: 'Close country details' }).click();
    await page.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await page.selectOption('#country-select', 'Thailand');
    assert.match(await page.getByTestId('globe-flight').textContent(), /Belgium.*Thailand/,
      'Changing the camera cannot change the departure country');
    await page.getByTestId('globe-flight').waitFor();
    const flightTarget = disabled ? 'canvas[data-testid="software-globe"]' : '#globe-container';
    await page.waitForFunction(selector => {
      const d = document.querySelector(selector)?.dataset;
      return d?.flightVisible === 'true' && Number(d.flightProgress) > .32 && Number(d.flightProgress) < .8;
    }, flightTarget);
    const position = await page.locator(flightTarget).evaluate(el => ({ x: +el.dataset.flightX, y: +el.dataset.flightY }));
    const buffer = await canvas(page).screenshot();
    await fs.writeFile(`${artifacts}/airplane-${mode}.png`, buffer);
    const { data, info } = await sharp(buffer).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const bounds = await canvas(page).boundingBox();
    const scale = info.width / bounds.width;
    let white = 0, red = 0;
    for (let y = Math.max(0, Math.floor((position.y-40)*scale)); y < Math.min(info.height,(position.y+40)*scale); y++) {
      for (let x = Math.max(0,Math.floor((position.x-40)*scale)); x < Math.min(info.width,(position.x+40)*scale); x++) {
        const i = (y*info.width+x)*info.channels;
        if (data[i] > 150 && data[i+1] > 150 && data[i+2] > 150) white++;
        if (data[i] > 90 && data[i] > data[i+1]*1.7 && data[i] > data[i+2]*1.7) red++;
      }
    }
    assert.ok(white > 10 && red > 2, `Aircraft needs visible white body and red tail/winglets, ${mode}: ${white}/${red}`);
    await page.getByRole('heading', { name: 'Thailand', exact: true }).waitFor();
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${artifacts}/country-${mode}-thailand.png` });
    const mapBounds = await canvas(page).boundingBox(), panel = await details(page).boundingBox();
    assert.ok(mapBounds.x + mapBounds.width <= panel.x + 2, 'Country panel must leave the map visible');
    const before = await canvas(page).screenshot();
    await page.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await page.waitForTimeout(500);
    const buttonPixels = await imageDifference(before, await canvas(page).screenshot());
    await page.mouse.move(mapBounds.x + mapBounds.width*.55, mapBounds.y+mapBounds.height*.5);
    const zoomed = await canvas(page).screenshot();
    await page.mouse.wheel(0,-200);
    await page.waitForTimeout(600);
    const wheelPixels = await imageDifference(zoomed,await canvas(page).screenshot());
    assert.ok(await details(page).isVisible());
    if (!disabled) {
      await page.waitForTimeout(900);
      const camera = () => page.locator('#globe-container').evaluate(el => [el.dataset.latitude, el.dataset.longitude, el.dataset.altitude].map(Number));
      const settled = await camera();
      await page.waitForTimeout(900);
      const later = await camera();
      assert.ok(settled.every((v, i) => Math.abs(v-later[i]) < .01), 'The camera must remain still after manual zoom stops autopilot');
    }
    await page.getByRole('button', { name: 'Close country details' }).click();
    await selected(page,'Belgium');
    const belgium = +(await page.locator(flightTarget).getAttribute(disabled ? 'data-zoom' : 'data-altitude'));
    await page.screenshot({ path: `${artifacts}/country-${mode}-belgium.png` });
    await page.getByRole('button', { name: 'Close country details' }).click();
    await selected(page,'Brazil');
    const brazil = +(await page.locator(flightTarget).getAttribute(disabled ? 'data-zoom' : 'data-altitude'));
    assert.ok(disabled ? belgium > brazil * 5 : belgium < brazil / 5, `Country fit must depend on country size: ${belgium}/${brazil}`);
    await page.getByRole('button', { name: 'Close country details' }).click();
    await page.selectOption('#country-select', 'Japan');
    await page.selectOption('#country-select', 'France');
    assert.match(await page.getByTestId('globe-flight').textContent(), /Brazil.*Japan.*Next: France/);
    await page.waitForFunction(() => document.querySelector('[data-testid="globe-flight"]')?.textContent.includes('Japan → France'), null, { timeout: 10000 });
    await page.getByRole('heading', { name: 'France', exact: true }).waitFor({ timeout: 16000 });
    await page.getByRole('button', { name: 'Close country details' }).click();
    await selected(page, 'France');
    assert.equal(await page.getByTestId('globe-flight').count(),0, 'Same-country selections must not launch a loop');
    await page.getByRole('button', { name: 'Close country details' }).click();
    // Rapid changes/cancellation cannot open stale destination details afterwards.
    // Dispatch in one browser task so protocol latency on a software GPU cannot
    // accidentally turn rapid input into commands issued after landing.
    await page.evaluate(() => {
      for (const name of ['Japan', 'Thailand']) {
        const select = document.querySelector('#country-select');
        select.value = name;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
      [...document.querySelectorAll('button')].find(button => button.textContent.includes('ANOPHELES')).click();
    });
    await page.waitForTimeout(7200);
    assert.equal(await details(page).count(),0);
    assert.equal(await page.getByTestId('globe-flight').count(),0);
    await page.setViewportSize({ width: 390, height: 844 });
    await selected(page,'Thailand');
    const mobileMap = await canvas(page).boundingBox(), mobilePanel = await details(page).boundingBox();
    assert.ok(mobileMap.height > 350 && mobileMap.y + mobileMap.height <= mobilePanel.y + 2, 'Mobile details must leave map usable above the sheet');
    await page.screenshot({ path: `${artifacts}/country-${mode}-mobile.png` });
    const prePinch = await canvas(page).screenshot();
    const session = await context.newCDPSession(page);
    const y = Math.round(mobileMap.height*.65);
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:165,y,id:1},{x:225,y,id:2}]});
    for(let i=1;i<=7;i++) await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:165-i*9,y,id:1},{x:225+i*9,y,id:2}]});
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await page.waitForTimeout(650);
    const pinchPixels = await imageDifference(prePinch,await canvas(page).screenshot());
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.getByRole('button',{name:'Reset globe view',exact:true}).click();
    await page.waitForTimeout(600);
    assert.equal(await details(page).count(),0,'Reset must close details and restore the world view in both renderers');
    assert.ok((await canvas(page).boundingBox()).height > 800);
    assert.deepEqual(errors,[]);
    results.push({mode,aircraftPixels:{white,red},buttonPixels,wheelPixels,pinchPixels,countryFit:{belgium,brazil},cancelledFlight:true});
    console.log(`PASS ${mode}: visible aircraft, country framing, buttons/wheel/pinch with open details, cancellation`);
    await context.close();
  } finally { await browser.close(); }
}
await fs.writeFile(`${artifacts}/results.json`,JSON.stringify(results,null,2));
