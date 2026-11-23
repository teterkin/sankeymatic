import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { layoutSource, parseFlows, planLayout, wrapLabel } from './layout.mjs';
import { validate } from './validate.mjs';

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
  const plan = planLayout(parseFlows(RU), { labelSize: 18, nodeW: 9 });
  assert.equal(plan.stages, 5);
  assert.equal(plan.width, 850);
  assert.equal(plan.height, 600);

  const out = layoutSource(RU);
  const expected = validate(out);
  assert.equal(expected.errors.length, 0);
  assert.equal(expected.stats.flows, 10);
  assert.equal(expected.stats.nodes, 11);

  assert.match(out, /^labelvalue position below$/m);
  assert.match(out, /^labelposition scheme auto$/m);
  assert.match(out, /^labels relativesize 100$/m);
  assert.match(out, /^size w 850$/m);
  assert.match(out, /^size h 600$/m);

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
