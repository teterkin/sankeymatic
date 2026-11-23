import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openCommand, resolveAsset, staticHandler } from './local.mjs';

test('отдаёт index.html на / и 404 на отсутствующий файл', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'skm-'));
  writeFileSync(join(dir, 'index.html'), '<h1>ok</h1>');
  const server = createServer(staticHandler(dir));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;

  try {
    const index = await fetch(`${base}/`);
    assert.equal(index.status, 200);
    assert.match(await index.text(), /ok/);

    const missing = await fetch(`${base}/nope.js`);
    assert.equal(missing.status, 404);
  } finally {
    server.close();
  }
});

test('не отдаёт файлы за пределами каталога ассетов', () => {
  assert.equal(
    resolveAsset('/tmp/assets', '/..%2f..%2fetc%2fpasswd'),
    null
  );
  assert.equal(resolveAsset('/tmp/assets', '/build.css'), '/tmp/assets/build.css');
});

test('выбирает команду открытия по платформе', () => {
  assert.deepEqual(openCommand('http://x', 'darwin'), ['open', ['http://x']]);
  assert.deepEqual(openCommand('http://x', 'linux'), ['xdg-open', ['http://x']]);
  assert.deepEqual(openCommand('http://x', 'win32'), [
    'cmd',
    ['/c', 'start', '', 'http://x'],
  ]);
});
