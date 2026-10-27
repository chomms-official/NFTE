import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import * as THREE from 'three';

// Execute the component's real animation callbacks with Three.js objects. This
// catches state that accidentally depends on having scrolled through an earlier
// stage, without requiring a GPU or copying the animation implementation here.
const source = await readFile(new URL('../src/components/ui/chomms-house-3d-hero.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('hero.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function declaration(name) {
  const node = ast.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === name);
  assert.ok(node, `Missing animation component/helper: ${name}`);
  return node;
}
const clampDeclaration = ast.statements.find(node => ts.isVariableStatement(node) &&
  node.declarationList.declarations.some(item => item.name.getText(ast) === 'clamp'));
assert.ok(clampDeclaration);
const helpers = ts.transpileModule([
  clampDeclaration.getText(ast),
  declaration('easeInOutCubic').getText(ast),
  declaration('mapRange').getText(ast),
].join('\n'), {}).outputText;
const mapRange = new Function(`${helpers}; return mapRange;`)();

function group() { return { current: new THREE.Group() }; }
function material() { return { current: new THREE.MeshToonMaterial() }; }
function setup() {
  return {
    ref: group(), matRef: material(), waterRef: material(),
    waterMeshRef: group(), pumpRef: group(), topSealRef: group(),
  };
}
const refNames = ['ref', 'matRef', 'waterRef', 'waterMeshRef', 'pumpRef', 'topSealRef'];
function callback(name, hook = 'useFrame', parameters = refNames) {
  const statement = declaration(name).body.statements.find(statement =>
    ts.isExpressionStatement(statement) && ts.isCallExpression(statement.expression) &&
    statement.expression.expression.getText(ast) === hook);
  assert.ok(statement, `Missing ${hook} callback in ${name}`);
  const compiled = ts.transpileModule(`const update = ${statement.expression.arguments[0].getText(ast)}`, {}).outputText;
  return new Function(...parameters, 'progress', 'mapRange', 'THREE', `${compiled}; update();`);
}
function updateFor(name) {
  const run = callback(name);
  return (state, progress) => run(...refNames.map(key => state[key]), progress, mapRange, THREE);
}
function fingerprint(state) {
  return Object.fromEntries(Object.entries(state).map(([key, { current }]) => [key,
    current.isMaterial ? { color: current.color.toArray(), opacity: current.opacity } : {
      position: current.position.toArray(), rotation: current.rotation.toArray(),
      scale: current.scale.toArray(), visible: current.visible,
    },
  ]));
}
function dispose(state) {
  for (const { current } of Object.values(state)) if (current.isMaterial) current.dispose();
}
const history = [0.98, 0.63, 0.15, 0.88, 0.36, 0.02, 0.9, 0.57, 0.2, 0.32];
for (const [name, targets] of Object.entries({
  Pouch: [0.02, 0.1, 0.18, 0.4, 0.95],
  Film: [0.16, 0.25, 0.38],
  Glass: [0.26, 0.42, 0.6],
  Bottle: [0.45, 0.6, 0.68, 0.76, 0.85, 0.97],
})) {
  test(`${name} poses match after direct jumps and forward/reverse scrolling`, () => {
    const update = updateFor(name);
    for (const progress of targets) {
      const direct = setup(), replay = setup();
      try {
        update(direct, progress);
        for (const previous of history) update(replay, previous);
        update(replay, progress);
        assert.deepEqual(fingerprint(replay), fingerprint(direct), `${name} at ${progress} depends on scroll history`);
      } finally {
        dispose(direct);
        dispose(replay);
      }
    }
  });
}

test('product camera keeps the scene origin centered on desktop and mobile', () => {
  const update = callback('CameraAdjuster', 'useEffect', ['camera', 'size']);
  for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const camera = new THREE.PerspectiveCamera(30, size.width / size.height, 0.1, 1000);
    update(camera, size, 0, mapRange, THREE);
    camera.updateMatrixWorld();
    const productCenter = new THREE.Vector3().project(camera);
    assert.ok(Math.abs(productCenter.x) < 1e-10);
    assert.ok(Math.abs(productCenter.y) < 1e-10);
    assert.ok(productCenter.z > -1 && productCenter.z < 1);
  }
});
