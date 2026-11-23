import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildLink, decodeLink, loadLzString } from './link.mjs';

const fixture = readFileSync(
  new URL('../tests/fixtures/pl-1800.expected.txt', import.meta.url),
  'utf8'
);

const SCRIPT = new URL('./link.mjs', import.meta.url).pathname;

function run(...args) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });
}

function tempText(text) {
  const file = join(mkdtempSync(join(tmpdir(), 'skm-link-')), 'chart.txt');
  writeFileSync(file, text);
  return file;
}

test('собирает ссылку, которая декодируется обратно в исходный текст', () => {
  const link = buildLink(fixture);
  const url = new URL(link);
  assert.equal(`${url.origin}${url.pathname}`, 'https://sankeymatic.com/build/');
  assert.equal(decodeLink(link), fixture);
  assert.match(url.search, /^\?i=/);
});

test('отказывается исполнять вендорный файл с несовпавшим хэшем', () => {
  assert.throws(
    () => loadLzString('var LZString = 1;', '0'.repeat(64)),
    /контрольной суммы для lz-string/
  );
});

test('payload совпадает с эталоном, снятым с копии сайта', () => {
  const golden = readFileSync(
    new URL('../tests/fixtures/pl-1800.payload.txt', import.meta.url),
    'utf8'
  ).trim();
  assert.equal(new URL(buildLink(fixture)).search.slice(3), golden);
});

test('CLI --check принимает корректную ссылку', () => {
  const result = run('--check', buildLink(fixture));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /ok: 11 узлов, 10 потоков, 0 дисбалансов/);
  assert.match(result.stdout, /отпечаток [0-9a-f]{8}/);
});

test('CLI --check видит вставленный символ', () => {
  const link = buildLink(fixture);
  const payload = new URL(link).search.slice(3);
  const at = Math.floor(payload.length / 2);
  const broken = `${link.slice(0, link.length - payload.length)}`
    + `${payload.slice(0, at)}C${payload.slice(at)}`;

  const result = run('--check', broken);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /битая ссылка/);
});

test('CLI --check видит обрезанный хвост', () => {
  const result = run('--check', buildLink(fixture).slice(0, -40));

  assert.equal(result.status, 1);
  assert.match(result.stderr, /битая ссылка/);
});

test('CLI --check --expect сверяет с файлом', () => {
  const file = tempText(fixture);

  const result = run('--check', buildLink(fixture), '--expect', file);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /совпадает с/);
});

test('CLI --check --expect сообщает о расхождении с файлом', () => {
  const file = tempText('A [1] B\n');

  const result = run('--check', buildLink(fixture), '--expect', file);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /не совпадает/);
});

test('CLI печатает URL в stdout, отпечаток — в stderr', () => {
  const result = run(tempText(fixture));

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^https:\/\/sankeymatic\.com\/build\/\?i=\S+\n$/);
  assert.match(result.stderr, /символов, отпечаток [0-9a-f]{8}/);
});

test('buildLink сверяет свой вывод с исходным текстом', () => {
  assert.throws(
    () => buildLink('A [1] B', 'https://sankeymatic.com/build/', () => 'другой текст'),
    /не совпадает с исходным текстом/
  );
});

test('учитывает свой базовый URL', () => {
  const link = buildLink('A [1] B', 'http://127.0.0.1:8000/');
  assert.equal(new URL(link).origin, 'http://127.0.0.1:8000');
  assert.equal(decodeLink(link), 'A [1] B');
});
