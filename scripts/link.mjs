import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_BASE = 'https://sankeymatic.com/build/';
const VENDOR_SHA256 = '9d1a0ef07a2ea5faa8cd4afb60a0518075e6771e341e5ff4e0e481cefedeecbf';

export function loadLzString(code, expected = VENDOR_SHA256) {
  const digest = createHash('sha256').update(code).digest('hex');
  if (digest !== expected) {
    throw new Error(
      `несовпадение контрольной суммы для lz-string: ожидалось ${expected}, получено ${digest}`
    );
  }
  return new Function(`${code}; return LZString;`)();
}

const LZString = loadLzString(
  readFileSync(new URL('./vendor/lz-string.min.js', import.meta.url), 'utf8')
);

export function buildLink(text, base = DEFAULT_BASE) {
  const compressed = LZString.compressToEncodedURIComponent(text);
  return `${base}?i=${encodeURIComponent(compressed).replaceAll('-', '%2D')}`;
}

export function decodeLink(link) {
  return LZString.decompressFromEncodedURIComponent(
    new URL(link).searchParams.get('i')
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--'));
  const baseIndex = args.indexOf('--base');
  if (!file) {
    console.error('использование: node link.mjs <файл> [--base URL]');
    process.exit(2);
  }
  const base = baseIndex === -1 ? DEFAULT_BASE : args[baseIndex + 1];
  console.log(buildLink(readFileSync(file, 'utf8'), base));
}
