import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { extname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ensureAssets } from './assets.mjs';
import { buildLink } from './link.mjs';

const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
]);

export function openCommand(url, platform = process.platform) {
  if (platform === 'darwin') {
    return ['open', [url]];
  }
  if (platform === 'win32') {
    return ['cmd', ['/c', 'start', '', url]];
  }
  return ['xdg-open', [url]];
}

export function resolveAsset(root, pathname) {
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const base = resolve(root);
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const full = resolve(base, relative);
  if (full !== base && !full.startsWith(base + sep)) {
    return null;
  }
  return full;
}

export function staticHandler(root) {
  return (req, res) => {
    let pathname;
    try {
      pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    } catch {
      res.writeHead(400);
      res.end('bad request');
      return;
    }

    const file = resolveAsset(root, pathname);
    if (!file || !existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    res.writeHead(200, {
      'content-type': TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    });
    res.end(readFileSync(file));
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const file = args.find((arg) => !arg.startsWith('--'));
  const checkOnly = args.includes('--check');
  const shouldOpen = args.includes('--open');

  try {
    const dir = await ensureAssets({
      log: (message) => console.error(message),
      allowDownload: !checkOnly,
    });
    const page = readFileSync(resolve(dir, 'index.html'), 'utf8');
    if (page.includes('cdn.jsdelivr')) {
      throw new Error('страница всё ещё ссылается на CDN');
    }

    if (checkOnly) {
      console.log(`ок: ${dir}`);
      process.exit(0);
    }

    if (!file) {
      console.error('использование: node local.mjs <файл> [--open] | node local.mjs --check');
      process.exit(2);
    }

    const text = readFileSync(file, 'utf8');
    const server = createServer(staticHandler(dir));
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const link = buildLink(text, `http://127.0.0.1:${port}/`);
      console.log(link);
      if (shouldOpen) {
        const [command, commandArgs] = openCommand(link);
        spawn(command, commandArgs, { stdio: 'ignore', detached: true }).unref();
      }
    });
  } catch (error) {
    console.error(error.message);
    process.exit(checkOnly ? 2 : 1);
  }
}
