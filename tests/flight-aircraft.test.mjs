import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import { Matrix4, Vector3, PerspectiveCamera } from 'three';

const modules = new Map([['three',import.meta.resolve('three')],['d3-geo',import.meta.resolve('d3-geo')]]);
for (const name of ['airliner','globe-navigation','flight-aircraft']) {
  const source=fs.readFileSync(new URL(`../src/lib/${name}.ts`,import.meta.url),'utf8');
  let code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText;
  for(const [specifier,url] of modules)code=code.replaceAll(JSON.stringify(specifier),JSON.stringify(url));
  modules.set('./'+name,'data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
}
const {flightSample,countryFraming}=await import(modules.get('./globe-navigation'));
const {aircraftAttitude,earthOccludes,orthographicAircraftView,createAircraftPainter}=await import(modules.get('./flight-aircraft'));
const countries=JSON.parse(fs.readFileSync(new URL('../public/assets/countries.geojson',import.meta.url),'utf8')).features;
const centre=name=>countryFraming(countries.find(f=>f.properties.ADMIN===name)).center;
const radial=p=>new Vector3(Math.cos(p.lat*Math.PI/180)*Math.sin(p.lng*Math.PI/180),Math.sin(p.lat*Math.PI/180),Math.cos(p.lat*Math.PI/180)*Math.cos(p.lng*Math.PI/180));

test('the model stays above the country and follows its heading with level wings on the reported routes',()=>{
  for(const [a,b] of [['Russia','Canada'],['Canada','Philippines']]){
    const route={from:centre(a),to:centre(b)};
    for(let i=0;i<=100;i++){
      const point=flightSample(route,i/100),up=radial(point),attitude=aircraftAttitude(route,point);
      const nose=new Vector3(0,0,-1).applyMatrix4(attitude),wing=new Vector3(1,0,0).applyMatrix4(attitude);
      assert.ok(Math.abs(nose.dot(up)-Math.sin(point.pitch))<1e-9);
      assert.ok(Math.abs(wing.dot(up))<1e-8);
      if(i===0||i===100)assert.ok(Math.abs(nose.dot(up))<1e-9,'takeoff and arrival must be level');
      const heading=radial(flightSample(route,Math.min(1,i/100+.001))).sub(radial(flightSample(route,Math.max(0,i/100-.001)))).projectOnPlane(up);
      if(heading.lengthSq()>1e-20)assert.ok(heading.normalize().dot(nose)>.994);
      assert.ok(up.clone().multiplyScalar(1+point.altitude).addScaledVector(nose,.18).length()>1.005);
    }
  }
});

test('foreground aircraft respects earth occlusion and both cameras agree on local orientation',()=>{
  const eye=new Vector3(0,0,3);
  assert.equal(earthOccludes(eye,new Vector3(0,0,1.075),1),false);
  assert.equal(earthOccludes(eye,new Vector3(0,0,-1.075),1),true);
  assert.equal(earthOccludes(eye,new Vector3(1.38,0,0),1),false);
  for(const p of [{lat:0,lng:0},{lat:30,lng:-160},{lat:-80,lng:60}]){
    const cam=new PerspectiveCamera(50,1,.1,100);
    cam.position.copy(radial(p)).multiplyScalar(3);cam.lookAt(0,0,0);cam.updateMatrixWorld();
    const gpu=new Matrix4().extractRotation(cam.matrixWorldInverse),cpu=orthographicAircraftView(p.lat,p.lng);
    for(let i=0;i<16;i++)assert.ok(Math.abs(cpu.elements[i]-gpu.elements[i])<1e-12);
  }
});

test('the offline 3D airframe has shaded silver surfaces, a red tail and visible depth at oblique angles',()=>{
  const painter=createAircraftPainter();
  const summarize=view=>{
    painter.paint(view,42,500);let area=0,red=0;const shades=new Set();
    for(let i=0;i<painter.pixels.length;i+=4){
      const [r,g,b,a]=painter.pixels.subarray(i,i+4);
      if(!a)continue; area++;
      if(r>90&&r>1.7*g&&r>1.7*b)red++;
      if(Math.min(r,g,b)>80&&Math.max(r,g,b)-Math.min(r,g,b)<38)shades.add(r);
    }
    assert.ok(red>2 && shades.size>12);
    return area;
  };
  const dorsal=summarize(new Matrix4().makeRotationX(Math.PI/2));
  const side=summarize(new Matrix4().makeRotationY(Math.PI/2));
  assert.ok(dorsal>side*1.5,'different views must foreshorten different parts of the 3D model');
});

test('the active globe render drives exactly one aircraft update for its own camera and detaches on cancellation', async () => {
  const { bindFlightToScene } = await import(modules.get('./flight-aircraft'));
  const { Scene } = await import('three');
  const scene=new Scene(),camera=new PerspectiveCamera(),other=new PerspectiveCamera();
  const calls=[];
  const previous=function(){assert.equal(this,scene);calls.push('original')};
  scene.onBeforeRender=previous;
  const cancel=bindFlightToScene(scene,camera,time=>{assert.ok(Number.isFinite(time));calls.push('aircraft')});
  scene.onBeforeRender(null,scene,camera,null);
  scene.onBeforeRender(null,scene,other,null);
  cancel();cancel();
  assert.equal(scene.onBeforeRender,previous);
  scene.onBeforeRender(null,scene,camera,null);
  assert.deepEqual(calls,['original','aircraft','original','original']);
});

test('moving a shaded aircraft reuses its pixels until its angle, apparent size, beacon or target changes', () => {
  const originalImageData=globalThis.ImageData;
  try{
    globalThis.ImageData=class {constructor(data){this.data=data;}};
    const painter=createAircraftPainter(), view=new Matrix4(),uploads=[];
    const ctx={putImageData:image=>uploads.push(image)};
    painter.drawTo(ctx,view,38,500);
    painter.drawTo(ctx,view.clone().makeRotationY(.001),38.01,580);
    assert.equal(uploads.length,1,'subpixel motion does not upload another 128px tile');
    painter.drawTo(ctx,view.clone().makeRotationY(.1),38,650);
    painter.drawTo(ctx,view,45,760);
    painter.drawTo(ctx,view,45,1601);
    painter.drawTo({putImageData:ctx.putImageData},view,45,1605);
    assert.equal(uploads.length,5);
    assert.equal(new Set(uploads).size,1,'one ImageData buffer serves all paints');
  }finally{if(originalImageData===undefined)delete globalThis.ImageData;else globalThis.ImageData=originalImageData;}
});
