import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import * as THREE from 'three';
const source=fs.readFileSync(new URL('../src/lib/airliner.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2020}}).outputText.replaceAll('"three"',JSON.stringify(import.meta.resolve('three')));
const {createAirliner}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('airliner has balanced swept wings, twin engines, windows and correctly oriented tail',()=>{
  const plane=createAirliner();
  const bounds=new THREE.Box3().setFromObject(plane),size=bounds.getSize(new THREE.Vector3());
  assert.ok(size.z>12 && size.z<13 && size.x>11 && size.x<12);
  const body=new THREE.Box3().setFromObject(plane.getObjectByName('fuselage'));
  assert.ok(body.min.z < -6 && body.max.z>5 && body.max.y<0.6);
  const tail=new THREE.Box3().setFromObject(plane.getObjectByName('vertical-tail'));
  assert.ok(tail.min.z>2 && tail.max.y>2 && Math.abs(tail.min.x+tail.max.x)<1e-5);
  const left=new THREE.Box3().setFromObject(plane.getObjectByName('port-swept-wing'));
  const right=new THREE.Box3().setFromObject(plane.getObjectByName('starboard-swept-wing'));
  assert.ok(Math.abs(left.min.x+right.max.x)<1e-5);
  for(const side of ['port','starboard']) {
    const engine=plane.getObjectByName(`${side}-engine`);
    assert.ok(engine.position.y<0 && Math.abs(engine.position.x)>1);
    assert.ok(plane.getObjectByName(`${side}-cockpit`).position.z< -4);
    assert.ok(plane.getObjectByName(`${side}-navigation-light`));
  }
  plane.traverse(mesh=>{
    if(!mesh.isMesh)return;
    assert.ok([...mesh.geometry.attributes.position.array].every(Number.isFinite));
    mesh.geometry.dispose();
  });
});
