import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

const artifacts = process.env.QA_ARTIFACTS || '/tmp/nfte-tablet-results';
await fs.mkdir(artifacts,{recursive:true});
const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try {
  const page = await browser.newPage({viewport:{width:768,height:1024},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error') errors.push(message.text());});
  await page.goto(process.env.BASE_URL||'http://127.0.0.1:3001',{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#auto-tour-btn')?.disabled===false);
  if(await page.locator('#auto-tour-btn').getAttribute('aria-pressed')==='true') await page.locator('#auto-tour-btn').click();
  if(await page.getByTestId('country-details').count()) await page.getByRole('button',{name:'Close country details'}).click();
  const results=[];
  for(const name of ['Russia','Canada']) {
    await page.selectOption('#country-select',name);
    await page.getByRole('heading',{name,exact:true}).waitFor();
    await page.waitForTimeout(500);
    const canvas=page.locator('#globe-container canvas').first();
    assert.equal(await canvas.evaluate(el=>!!el.getContext('webgl2')),true);
    const map=await canvas.boundingBox(),panel=await page.getByTestId('country-details').boundingBox();
    assert.ok(map.width<410 && map.height===1024 && map.x+map.width<=panel.x+1);
    const altitude=+(await page.locator('#globe-container').getAttribute('data-altitude'));
    assert.ok(altitude>2.2 && altitude<=6,`${name} must zoom out enough for a narrow tablet viewport: ${altitude}`);
    for (const cell of await page.getByTestId('chart-statistics').locator(':scope > div').all()) {
      const size = await cell.evaluate(el => ({ width: el.clientWidth, content: el.scrollWidth }));
      assert.ok(size.content <= size.width + 1, `Statistics must fit their chart column: ${size.content}/${size.width}`);
    }
    const species = await page.getByRole('button',{name:/CULEX/}).boundingBox();
    assert.ok(species.x + species.width <= panel.x, 'Species controls must fit beside country details');
    const buffer=await canvas.screenshot();
    const {data,info}=await sharp(buffer).removeAlpha().raw().toBuffer({resolveWithObject:true});
    let white=0,edge=0;
    for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
      const i=(y*info.width+x)*info.channels;
      if(data[i]>190 && data[i+1]>190 && data[i+2]>190 && Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])<20) {
        white++;
        if(x<8 || x>=info.width-8 || y<8 || y>=info.height-8) edge++;
      }
    }
    assert.ok(white>1000 && edge<white*.02,`${name}'s selected white land must fit without clipping viewport edges: ${white}/${edge}`);
    await page.screenshot({path:`${artifacts}/tablet-${name.toLowerCase()}.png`});
    results.push({name,altitude,whitePixels:white,edgePixels:edge});
    await page.getByRole('button',{name:'Close country details'}).click();
  }
  // Container-dependent chart columns must remain readable when the same
  // country panel moves between desktop and mobile layouts.
  await page.setViewportSize({width:1440,height:900});
  await page.selectOption('#country-select','Thailand');
  await page.getByRole('heading',{name:'Thailand',exact:true}).waitFor();
  for (const viewport of [{width:1440,height:900},{width:390,height:844}]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(600);
    for (const cell of await page.getByTestId('chart-statistics').locator(':scope > div').all()) {
      const size=await cell.evaluate(el=>({width:el.clientWidth,content:el.scrollWidth}));
      assert.ok(size.content<=size.width+1, `Responsive statistics must fit at ${viewport.width}px: ${size.content}/${size.width}`);
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.screenshot({path:`${artifacts}/responsive-chart-${viewport.width}.png`});
  }
  assert.deepEqual(errors,[]);
  await fs.writeFile(`${artifacts}/results.json`,JSON.stringify(results,null,2));
  console.log('PASS portrait tablet: Russia and Canada fit beside details without clipped country pixels');
} finally {await browser.close();}
