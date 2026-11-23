import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { plural, validate } from './validate.mjs';

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

function rawPayload(link) {
  return new URL(link).search.slice(3);
}

function fingerprint(payload) {
  return createHash('sha256').update(payload).digest('hex').slice(0, 8);
}

export function fingerprintOf(link) {
  return fingerprint(rawPayload(link));
}

function firstDifference(left, right) {
  const limit = Math.min(left.length, right.length);
  for (let index = 0; index < limit; index += 1) {
    if (left[index] !== right[index]) {
      return index;
    }
  }
  return limit;
}

export function checkLink(link, expected) {
  let text;
  try {
    text = decodeLink(link);
  } catch {
    text = null;
  }
  if (typeof text !== 'string' || text.length === 0) {
    return { ok: false, reason: 'payload не распаковывается' };
  }
  const report = validate(text);
  if (expected !== undefined && text !== expected) {
    const at = firstDifference(text, expected);
    return {
      ok: false,
      report,
      reason: `текст не совпадает с файлом: первое различие на символе ${at + 1} `
        + `(${text.length} против ${expected.length})`,
    };
  }
  return { ok: true, report };
}

export function buildLink(text, base = DEFAULT_BASE, decode = decodeLink) {
  const compressed = LZString.compressToEncodedURIComponent(text);
  const link = `${base}?i=${encodeURIComponent(compressed).replaceAll('-', '%2D')}`;
  if (decode(link) !== text) {
    throw new Error('ссылка не совпадает с исходным текстом');
  }
  return link;
}

export function decodeLink(link) {
  return LZString.decompressFromEncodedURIComponent(
    new URL(link).searchParams.get('i')
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const usage = 'использование: node link.mjs <файл> [--base URL] | '
    + "node link.mjs --check '<ссылка>' [--expect <файл>]";
  const checkIndex = args.indexOf('--check');
  const expectIndex = args.indexOf('--expect');

  if (checkIndex !== -1) {
    const link = args[checkIndex + 1];
    if (!link || link.startsWith('--')) {
      console.error(usage);
      process.exit(2);
    }
    let expected;
    if (expectIndex !== -1) {
      const expectFile = args[expectIndex + 1];
      if (!expectFile) {
        console.error(usage);
        process.exit(2);
      }
      expected = readFileSync(expectFile, 'utf8');
    }
    const result = checkLink(link, expected);
    if (!result.ok) {
      console.error(`битая ссылка: ${result.reason}`);
      process.exit(1);
    }
    const { nodes, flows, imbalances } = result.report.stats;
    const summary = `${nodes} ${plural(nodes, 'узел', 'узла', 'узлов')}, `
      + `${flows} ${plural(flows, 'поток', 'потока', 'потоков')}, `
      + `${imbalances} ${plural(imbalances, 'дисбаланс', 'дисбаланса', 'дисбалансов')}`;
    const match = expected === undefined ? '' : ', совпадает с файлом';
    console.log(`ok: ${summary}${match} · отпечаток ${fingerprintOf(link)}`);
    process.exit(0);
  }

  const file = args.find((arg) => !arg.startsWith('--'));
  const baseIndex = args.indexOf('--base');
  if (!file) {
    console.error(usage);
    process.exit(2);
  }
  const base = baseIndex === -1 ? DEFAULT_BASE : args[baseIndex + 1];
  const link = buildLink(readFileSync(file, 'utf8'), base);
  console.log(link);
  console.error(`${rawPayload(link).length} символов, отпечаток ${fingerprintOf(link)}`);
}
