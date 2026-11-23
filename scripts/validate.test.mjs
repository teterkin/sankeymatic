import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { validate } from './validate.mjs';

const fixture = readFileSync(
  new URL('../tests/fixtures/pl-1800.expected.txt', import.meta.url),
  'utf8'
);

test('принимает финансовую фикстуру и считает узлы и потоки', () => {
  const report = validate(fixture);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.stats.flows, 10);
  assert.equal(report.stats.nodes, 11);
});

test('отклоняет некорректные и неположительные суммы', () => {
  const cases = [
    ['A [abc] B', /некорректная строка потока/i],
    ['A [] B', /некорректная строка потока/i],
    ['A [-5] B', /некорректная строка потока/i],
    ['A [0] B', /больше нуля/i],
  ];
  for (const [line, pattern] of cases) {
    const report = validate(line);
    assert.equal(report.errors.length, 1, line);
    assert.equal(report.errors[0].line, 1, line);
    assert.match(report.errors[0].message, pattern, line);
  }
});

test('отклоняет неизвестные настройки и недопустимые значения', () => {
  const cases = [
    ['node themee b', /неизвестная настройка/i],
    ['node theme z', /недопустимое значение/i],
    ['node h 120', /недопустимое значение/i],
    ['flow opacity 1.5', /недопустимое значение/i],
    ['labelname size abc', /недопустимое значение/i],
  ];
  for (const [line, pattern] of cases) {
    const report = validate(line);
    assert.equal(report.errors.length, 1, line);
    assert.equal(report.errors[0].line, 1, line);
    assert.match(report.errors[0].message, pattern, line);
  }
});

test('принимает единицы измерения в кавычках', () => {
  const report = validate("value suffix ' у.е.'\nvalue prefix '$'\nA [1] B");
  assert.deepEqual(report.errors, []);
});

test('предупреждает о несбалансированном узле', () => {
  const report = validate('A [900] X\nX [800] Y');
  assert.deepEqual(report.errors, []);
  assert.equal(report.warnings.length, 1);
  assert.match(report.warnings[0].message, /"X": вход 900, выход 800/);
  assert.equal(report.warnings[0].line, 2);
});

test('отклоняет циклы и потоки узла в себя', () => {
  const loop = validate('A [1] B\nB [1] A');
  assert.equal(loop.errors.length, 1);
  assert.match(loop.errors[0].message, /цикл/i);

  const self = validate('A [1] A');
  assert.equal(self.errors.length, 1);
  assert.match(self.errors[0].message, /цикл/i);
});

test('не падает на длинной цепочке узлов', () => {
  const text = Array.from({ length: 20000 }, (_, i) => `n${i} [1] n${i + 1}`)
    .join('\n');

  const report = validate(text);

  assert.deepEqual(report.errors, []);
  assert.equal(report.stats.nodes, 20001);
  assert.equal(report.stats.flows, 20000);
});

test('CLI: код 0 на чистом файле и 1 на ошибках', () => {
  const script = new URL('./validate.mjs', import.meta.url).pathname;
  const goodPath = new URL('../tests/fixtures/pl-1800.expected.txt', import.meta.url)
    .pathname;
  const badPath = new URL('../tests/fixtures/invalid.txt', import.meta.url).pathname;

  const good = spawnSync(process.execPath, [script, goodPath], { encoding: 'utf8' });
  assert.equal(good.status, 0);
  assert.match(good.stdout, /11 узлов, 10 потоков/);

  const bad = spawnSync(process.execPath, [script, badPath], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout + bad.stderr, /строка 1: некорректная строка потока/i);
});
