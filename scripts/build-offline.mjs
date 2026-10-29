import { readFile, writeFile, readdir, mkdir, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
const hash = data => createHash('sha256').update(data).digest('hex');
async function files(root) {
  const result=[];
  for(const item of await readdir(root,{withFileTypes:true})) {
    const name=path.join(root,item.name);
    if(item.isDirectory()) result.push(...await files(name)); else result.push(name);
  }
  return result.sort();
}
// Each release carries exact HTML plus every lazy chunk, font and local image.
// Never construct the offline page from a potentially newer deployment's HTML.
const assets=[];
for(const file of await files('.next/static')) if(!file.endsWith('.map'))
  assets.push({url:'/_next/static/'+path.relative('.next/static',file).split(path.sep).join('/'),sha256:hash(await readFile(file))});
for(const file of await files('public')) if(!file.startsWith('public/offline-pages/') && !['public/sw.js','public/offline-manifest.json'].includes(file))
  assets.push({url:'/'+path.relative('public',file).split(path.sep).join('/'),sha256:hash(await readFile(file))});
const pages=await Promise.all(['index','simulator','sent-scent'].map(name=>readFile(`.next/server/app/${name}.html`)));
const version=hash(JSON.stringify(assets)+pages.map(hash).join('')).slice(0,20);
// This directory contains only generated release snapshots, never user data.
await rm('public/offline-pages',{recursive:true,force:true});
await mkdir(`public/offline-pages/${version}`,{recursive:true});
for(const [i,name] of ['index','simulator','sent-scent'].entries()) {
  const source=`/offline-pages/${version}/${name}.html`;
  await writeFile('public'+source,pages[i]);
  assets.push({url:i===0?'/':'/'+name,source,sha256:hash(pages[i])});
}
const manifest={version,assets};
const template=await readFile('src/service-worker/worker.js','utf8');
await writeFile('public/sw.js',template.replace('/* OFFLINE_MANIFEST */ null',JSON.stringify(manifest)));
await writeFile('public/offline-manifest.json',JSON.stringify({version,files:assets.length}));
console.log(`Offline release ${version}: ${assets.length} verified resources (including lazy modules).`);
