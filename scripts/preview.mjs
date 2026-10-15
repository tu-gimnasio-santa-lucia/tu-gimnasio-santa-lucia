/** Read-only local preview. Serves public artifacts only, never source files or .git. */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, buildSite } from './build.mjs';

export async function startPreview(port = 4173) {
  const manifest = await buildSite();
  let allowed = new Set([...manifest.files.map((f) => f.name), 'build-manifest.json']);
  const mime = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.txt': 'text/plain',
  };
  const server = createServer(async (request, response) => {
    try {
      const name =
        decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname).slice(1) ||
        'index.html';
      if (name === 'index.html') {
        const current = await buildSite();
        allowed = new Set([...current.files.map((f) => f.name), 'build-manifest.json']);
      }
      if (!allowed.has(name)) {
        response.writeHead(404).end('Not found');
        return;
      }
      const bytes = await readFile(path.join(ROOT, 'dist', name));
      response
        .writeHead(200, {
          'Content-Type': mime[path.extname(name)] || 'text/plain',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'no-store',
        })
        .end(bytes);
    } catch {
      response.writeHead(500).end('Read error');
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const { server, url } = await startPreview(Number(process.env.PORT || 4173));
  console.log(`Vista local: ${url}`);
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.once(signal, () => server.close(() => process.exit(0)));
}
