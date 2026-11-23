import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { layoutSource, parseFlows, planLayout, wrapLabel } from './layout.mjs';
import { validate } from './validate.mjs';

const SCRIPT = new URL('./layout.mjs', import.meta.url).pathname;

function tempChart(text) {
  const file = join(mkdtempSync(join(tmpdir(), 'skm-layout-')), 'chart.txt');
  writeFileSync(file, text);
  return file;
}

const RU = readFileSync(
  new URL('../tests/fixtures/pl-1800-ru.txt', import.meta.url),
  'utf8'
);

test('переносит длинное имя по словам', () => {
  assert.equal(
    wrapLabel('коммерческие, общие и административные расходы', 20),
    'коммерческие, общие\\nи административные\\nрасходы'
  );
});

test('не рвёт имя, которое уже перенесено', () => {
  const once = wrapLabel('очень длинное название узла', 10);
  assert.equal(once, 'очень\\nдлинное\\nназвание\\nузла');
  assert.equal(wrapLabel(once, 10), once);
});

test('считает стадии и подбирает полотно для русского P&L', () => {
  const plan = planLayout(parseFlows(RU), {
    labelSize: 18, nodeW: 9, nodeHF: 0.5, spacing: 0.3,
  });
  assert.equal(plan.stages, 5);
  assert.equal(plan.width, 850);
  assert.equal(plan.height, 850);

  const out = layoutSource(RU);
  const expected = validate(out);
  assert.equal(expected.errors.length, 0);
  assert.equal(expected.stats.flows, 10);
  assert.equal(expected.stats.nodes, 11);

  assert.match(out, /^labelvalue position below$/m);
  assert.match(out, /^labelposition scheme auto$/m);
  assert.match(out, /^layout order exact$/m);
  assert.match(out, /^labels relativesize 100$/m);
  assert.match(out, /^size w 850$/m);
  assert.match(out, /^size h 850$/m);

  const lines = out.split('\n');
  const netLine = lines.findIndex((line) => line === 'операционная прибыль [260] чистая прибыль');
  const taxLine = lines.findIndex((line) => line === 'операционная прибыль [90] налоги');
  assert.ok(netLine !== -1 && taxLine !== -1);
  assert.ok(netLine < taxLine, 'крупный сток должен быть выше мелкого');

  for (const name of Object.keys(expected.stats.nodesByName)) {
    for (const part of name.split('\\n')) {
      assert.ok(part.length <= 22, part);
    }
  }
});

test('сохраняет выбранные настройки и суммы', () => {
  const out = layoutSource(RU);
  assert.match(out, /^labelname size 18$/m);
  assert.match(out, /^node h 50$/m);
  assert.match(out, /^node spacing 30$/m);
  assert.match(out, /^node theme a$/m);
  assert.match(out, /^value prefix '\$'$/m);
  assert.match(out, /^A \[900\] выручка$/m);
  assert.match(out, /^операционная прибыль \[260\] чистая прибыль$/m);
});

test('повторный запуск не меняет результат', () => {
  const once = layoutSource(RU);
  assert.equal(layoutSource(once), once);
});

test('CLI: отклоняет нечисловой --label-size и не трогает файл', () => {
  const file = tempChart('A [1] B\n');

  const result = spawnSync(
    process.execPath,
    [SCRIPT, file, '--in-place', '--label-size', 'abc'],
    { encoding: 'utf8' }
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /label-size/);
  assert.equal(readFileSync(file, 'utf8'), 'A [1] B\n');
});

test('CLI: сообщает о цикле без стека', () => {
  const file = tempChart('A [1] B\nB [1] A\n');

  const result = spawnSync(process.execPath, [SCRIPT, file], { encoding: 'utf8' });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /в потоках есть цикл/);
  assert.doesNotMatch(result.stderr, /at computeStages/);
});
