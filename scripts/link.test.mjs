import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildLink, decodeLink } from './link.mjs';

const fixture = readFileSync(
  new URL('../tests/fixtures/pl-1800.expected.txt', import.meta.url),
  'utf8'
);

test('builds a share link that decodes back to the source text', () => {
  const link = buildLink(fixture);
  const url = new URL(link);
  assert.equal(`${url.origin}${url.pathname}`, 'https://sankeymatic.com/build/');
  assert.equal(decodeLink(link), fixture);
  assert.match(url.search, /^\?i=/);
});

test('respects a custom base URL', () => {
  const link = buildLink('A [1] B', 'http://127.0.0.1:8000/');
  assert.equal(new URL(link).origin, 'http://127.0.0.1:8000');
  assert.equal(decodeLink(link), 'A [1] B');
});
