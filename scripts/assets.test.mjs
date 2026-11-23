import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureAssets, patchHtml, PIN } from './assets.mjs';

function tempCache(t) {
  const root = mkdtempSync(join(tmpdir(), 'skm-cache-'));
  const previous = process.env.XDG_CACHE_HOME;
  process.env.XDG_CACHE_HOME = root;
  t.after(() => {
    if (previous === undefined) {
      delete process.env.XDG_CACHE_HOME;
    } else {
      process.env.XDG_CACHE_HOME = previous;
    }
  });
  return join(root, 'sankeymatic-skill', PIN);
}

const HTML = `<!doctype html>
<html>
<head>
<script defer src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/canvg@3/lib/umd.js" crossorigin="anonymous"></script>
</head>
<body></body>
</html>`;

test('переписывает CDN-скрипты на локальные файлы', () => {
  const patched = patchHtml(HTML);
  assert.equal(patched.match(/cdn\.jsdelivr/g), null);
  assert.match(patched, /src="d3\.min\.js"/);
  assert.match(patched, /src="canvg\.umd\.js"/);
});

test('явно падает, если исходных тегов нет', () => {
  assert.throws(() => patchHtml('<html></html>'), /d3/i);
});

test('не читает и не пишет через симлинк в кэше', async (t) => {
  const dir = tempCache(t);
  mkdirSync(dir, { recursive: true });
  const victim = join(dir, 'жертва.txt');
  writeFileSync(victim, 'оригинал');
  symlinkSync(victim, join(dir, 'index.source.html'));

  await assert.rejects(
    () => ensureAssets({ fetchImpl: () => {
      throw new Error('загрузка не должна начаться');
    } }),
    /не обычный файл/
  );
  assert.equal(readFileSync(victim, 'utf8'), 'оригинал');
});

test('отклоняет ответ больше лимита до проверки хэша', async (t) => {
  const dir = tempCache(t);
  mkdirSync(dir, { recursive: true });

  await assert.rejects(
    () => ensureAssets({ fetchImpl: async () => new Response('x'.repeat(2 * 1024 * 1024 + 1)) }),
    /слишком большой/
  );
  assert.equal(statSync(dir).isDirectory(), true);
});

test('без разрешения на загрузку не ходит в сеть', async (t) => {
  const dir = tempCache(t);

  await assert.rejects(
    () => ensureAssets({ allowDownload: false, fetchImpl: () => {
      throw new Error('сеть не нужна');
    } }),
    /кэш/
  );
  assert.equal(existsSync(dir), false);
});

test('ставит 0700 на каталог кэша', async (t) => {
  const dir = tempCache(t);

  await assert.rejects(
    () => ensureAssets({ fetchImpl: async () => {
      throw new Error('нет сети');
    } }),
    /нет сети/
  );
  assert.equal(statSync(dir).mode & 0o777, 0o700);
});
