import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validate } from './validate.mjs';

const source = readFileSync(
  new URL('../tests/fixtures/pl-1800.expected.txt', import.meta.url),
  'utf8'
);

const SETTINGS = [
  'labelname size 18',
  'node h 20',
  'node spacing 30',
  'node theme a',
  'flow inheritfrom source',
  'flow opacity 0.45',
];

const BALANCES = [
  ['A', 0, 900],
  ['B', 0, 750],
  ['C', 0, 150],
  ['Revenue', 1800, 1800],
  ['Cost of Sales', 800, 0],
  ['Gross Profit', 1000, 1000],
  ['SG&A', 640, 0],
  ['Amortization', 10, 0],
  ['Operating Profit', 350, 350],
  ['Tax', 90, 0],
  ['Net Profit', 260, 0],
];

test('финансовая фикстура — чистый сбалансированный P&L', () => {
  const report = validate(source);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.warnings, []);
  assert.equal(report.stats.flows, 10);
  assert.equal(report.stats.nodes, 11);

  for (const [name, incoming, outgoing] of BALANCES) {
    assert.equal(report.stats.nodesByName[name].in, incoming, `${name} in`);
    assert.equal(report.stats.nodesByName[name].out, outgoing, `${name} out`);
  }
});

test('финансовая фикстура содержит согласованные настройки', () => {
  const lines = source.split('\n').map((line) => line.trim());
  for (const setting of SETTINGS) {
    assert.ok(lines.includes(setting), setting);
  }
});
