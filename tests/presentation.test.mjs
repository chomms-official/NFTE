import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

// Execute the actual helper without requiring a separate TS test runner.
const source = fs.readFileSync(new URL('../src/lib/presentation.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
const helpers = {};
new Function('exports', compiled)(helpers);
const { advancePresentation } = helpers;

test('crossing the forward boundary advances exactly one slide', () => {
  assert.deepEqual(advancePresentation({ index: 1, progress: 1.79 }, 0.02, 5), {
    index: 2, progress: 0,
  });
});

test('replaying a Strict Mode update cannot increment the slide twice or mutate state', () => {
  const previous = Object.freeze({ index: 1, progress: 1.79 });
  const first = advancePresentation(previous, 0.02, 5);
  const replay = advancePresentation(previous, 0.02, 5);
  assert.deepEqual(first, { index: 2, progress: 0 });
  assert.deepEqual(replay, first);
  assert.deepEqual(previous, { index: 1, progress: 1.79 });
});

test('the final slide loops to the first and reverse scroll loops to the last', () => {
  assert.deepEqual(advancePresentation({ index: 4, progress: 1.79 }, 0.02, 5), {
    index: 0, progress: 0,
  });
  assert.deepEqual(advancePresentation({ index: 0, progress: 0 }, -0.01, 5), {
    index: 4, progress: 1.8,
  });
});

test('scrolling within a slide preserves its selection and updates expansion', () => {
  assert.deepEqual(advancePresentation({ index: 2, progress: 0.4 }, 0.1, 5), {
    index: 2, progress: 0.5,
  });
  assert.deepEqual(advancePresentation({ index: 2, progress: 1 }, -0.25, 5), {
    index: 2, progress: 0.75,
  });
});

test('one-slide and empty presentations never produce invalid indexes', () => {
  assert.deepEqual(advancePresentation({ index: 0, progress: 1.79 }, 0.02, 1), {
    index: 0, progress: 0,
  });
  const previous = { index: 0, progress: 0 };
  assert.equal(advancePresentation(previous, 1, 0), previous);
});
