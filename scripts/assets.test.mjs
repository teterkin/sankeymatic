import { test } from 'node:test';
import assert from 'node:assert/strict';
import { patchHtml } from './assets.mjs';

const HTML = `<!doctype html>
<html>
<head>
<script defer src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/canvg@3/lib/umd.js" crossorigin="anonymous"></script>
</head>
<body></body>
</html>`;

test('rewrites CDN script tags to local files', () => {
  const patched = patchHtml(HTML);
  assert.equal(patched.match(/cdn\.jsdelivr/g), null);
  assert.match(patched, /src="d3\.min\.js"/);
  assert.match(patched, /src="canvg\.umd\.js"/);
});

test('fails loudly when the upstream tags are missing', () => {
  assert.throws(() => patchHtml('<html></html>'), /d3/i);
});
