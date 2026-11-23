import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validate } from './validate.mjs';

const fixture = readFileSync(
  new URL('../tests/fixtures/pl-1800.expected.txt', import.meta.url),
  'utf8'
);

test('accepts the financial fixture and counts nodes and flows', () => {
  const report = validate(fixture);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.stats.flows, 10);
  assert.equal(report.stats.nodes, 11);
});

test('rejects malformed and non-positive flow amounts', () => {
  const cases = [
    ['A [abc] B', /malformed flow/i],
    ['A [] B', /malformed flow/i],
    ['A [-5] B', /malformed flow/i],
    ['A [0] B', /greater than zero/i],
  ];
  for (const [line, pattern] of cases) {
    const report = validate(line);
    assert.equal(report.errors.length, 1, line);
    assert.equal(report.errors[0].line, 1, line);
    assert.match(report.errors[0].message, pattern, line);
  }
});

test('rejects unknown settings and invalid setting values', () => {
  const cases = [
    ['node themee b', /unknown setting/i],
    ['node theme z', /invalid value/i],
    ['node h 120', /invalid value/i],
    ['flow opacity 1.5', /invalid value/i],
    ['labelname size abc', /invalid value/i],
  ];
  for (const [line, pattern] of cases) {
    const report = validate(line);
    assert.equal(report.errors.length, 1, line);
    assert.equal(report.errors[0].line, 1, line);
    assert.match(report.errors[0].message, pattern, line);
  }
});

test('accepts quoted unit settings', () => {
  const report = validate("value suffix ' у.е.'\nvalue prefix '$'\nA [1] B");
  assert.deepEqual(report.errors, []);
});

test('warns when a node does not balance its inputs and outputs', () => {
  const report = validate('A [900] X\nX [800] Y');
  assert.deepEqual(report.errors, []);
  assert.equal(report.warnings.length, 1);
  assert.match(report.warnings[0].message, /"X": in 900, out 800/);
  assert.equal(report.warnings[0].line, 2);
});

test('rejects cycles and self-flows', () => {
  const loop = validate('A [1] B\nB [1] A');
  assert.equal(loop.errors.length, 1);
  assert.match(loop.errors[0].message, /cycle/i);

  const self = validate('A [1] A');
  assert.equal(self.errors.length, 1);
  assert.match(self.errors[0].message, /cycle/i);
});

test('CLI exits 0 on a clean file and 1 on errors', () => {
  const script = new URL('./validate.mjs', import.meta.url).pathname;
  const goodPath = new URL('../tests/fixtures/pl-1800.expected.txt', import.meta.url)
    .pathname;
  const badPath = new URL('../tests/fixtures/invalid.txt', import.meta.url).pathname;

  const good = spawnSync(process.execPath, [script, goodPath], { encoding: 'utf8' });
  assert.equal(good.status, 0);
  assert.match(good.stdout, /11 nodes, 10 flows/);

  const bad = spawnSync(process.execPath, [script, badPath], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout + bad.stderr, /line 1: malformed flow/i);
});
