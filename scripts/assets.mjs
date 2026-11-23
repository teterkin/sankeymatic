import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const PIN = 'a6d8053e766c45336ec3a0b7fb778d71eef8245c';
export const D3_VERSION = '7.9.2';
export const CANVG_VERSION = '3.0.11';

const RAW = `https://raw.githubusercontent.com/nowthis/sankeymatic/${PIN}/build/`;

export const ASSETS = new Map([
  ['index.source.html', {
    url: `${RAW}index.html`,
    sha256: '7a7658a455041a10652765243703682b7e876aa6d223e3fd6757159ff3b67405',
  }],
  ['build.css', {
    url: `${RAW}build.css`,
    sha256: '8ba0e8467aae6ea3a249ee2417e69b6b196ed2b13e0fce1bac6c900c663ad37c',
  }],
  ['constants.js', {
    url: `${RAW}constants.js`,
    sha256: '00c96d4c89d572f020efff3e9245c12a7e49b2c2e44aed7d0fcc78eccc05d4d6',
  }],
  ['sankey.js', {
    url: `${RAW}sankey.js`,
    sha256: '02a0cfa4a8b7056214a96b92d81fb834e46b0157f945d9d3d24e7fb973bbdc84',
  }],
  ['sankeymatic.js', {
    url: `${RAW}sankeymatic.js`,
    sha256: '644d56c4093563bac943009e9950bedf61fff30ef27a2847bf8deba45c304133',
  }],
  ['lz-string.min.js', {
    url: `${RAW}lz-string.min.js`,
    sha256: 'bee2462e3e5b7f30ac0eb3a235a19cf0a7403028592443aa36a0a4aa30f25c70',
  }],
  ['i/SKM-trsp-300.png', {
    url: `${RAW}i/SKM-trsp-300.png`,
    sha256: 'f188c2e5d4563fdbc8c1b3b11e0c5767dffb61ea708027301d1eb58f764eb606',
  }],
  ['transparent_bg.png', {
    url: `${RAW}transparent_bg.png`,
    sha256: 'bf6dc5181f129a17ddb75a1eed2b5d958c2238d872a82ec86ea9fdd76d27c530',
  }],
  ['d3.min.js', {
    url: `https://cdn.jsdelivr.net/npm/d3@${D3_VERSION}/dist/d3.min.js`,
    sha256: '912111098ea99503a6f4967361d2bbdc9dbf58cf9c678c8e27e5b02d1a07f0c1',
  }],
  ['canvg.umd.js', {
    url: `https://cdn.jsdelivr.net/npm/canvg@${CANVG_VERSION}/lib/umd.js`,
    sha256: 'bbe9cd7a639b2290ab076aaf02852cb889e1614b5bf6a8b4ac7406a1e41fecae',
  }],
]);

const D3_TAG =
  /<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\/d3[^"]*"[^>]*><\/script>/;
const CANVG_TAG =
  /<script[^>]*src="https:\/\/cdn\.jsdelivr\.net\/npm\/canvg[^"]*"[^>]*><\/script>/;

export function patchHtml(html) {
  if (!D3_TAG.test(html)) {
    throw new Error('не удалось заменить d3: не найдена строка скрипта в исходной странице');
  }
  if (!CANVG_TAG.test(html)) {
    throw new Error('не удалось заменить canvg: не найдена строка скрипта в исходной странице');
  }
  return html
    .replace(D3_TAG, '<script defer src="d3.min.js"></script>')
    .replace(CANVG_TAG, '<script defer src="canvg.umd.js"></script>');
}

export function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

export function cacheDir() {
  const base = process.env.XDG_CACHE_HOME || join(homedir(), '.cache');
  return join(base, 'sankeymatic-skill', PIN);
}

export async function ensureAssets({ fetchImpl = fetch, log = () => {} } = {}) {
  const dir = cacheDir();
  mkdirSync(dir, { recursive: true });

  for (const [name, asset] of ASSETS) {
    const target = join(dir, name);
    if (existsSync(target) && sha256(readFileSync(target)) === asset.sha256) {
      continue;
    }

    log(`скачиваю ${name}`);
    const response = await fetchImpl(asset.url);
    if (!response.ok) {
      throw new Error(`не удалось скачать ${name}: HTTP ${response.status}`);
    }
    const body = Buffer.from(await response.arrayBuffer());
    const digest = sha256(body);
    if (digest !== asset.sha256) {
      throw new Error(
        `несовпадение контрольной суммы для ${name}: ожидалось ${asset.sha256}, получено ${digest}`
      );
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
  }

  writeFileSync(
    join(dir, 'index.html'),
    patchHtml(readFileSync(join(dir, 'index.source.html'), 'utf8'))
  );

  return dir;
}
