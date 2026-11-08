import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/** Immutable CI-only development output; the production and ordinary HMR paths stay separate. */
export function e2eAppPlugin(
  root: string,
  directory = path.join(root, 'node_modules/.cache/webui-e2e-development')
): Plugin {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, '.vite/manifest.json'), 'utf8')) as Record<
    string,
    { file: string }
  >;
  const probe = manifest['scripts/fixtures/e2eReactProbe.mjs']?.file;
  if (!probe) throw new Error('Missing development React probe');
  const assets = new Map<string, string>();
  function collect(directory: string, prefix: string): void {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) collect(file, `${prefix}${entry.name}/`);
      else if (entry.isFile()) assets.set(`${prefix}${entry.name}`, file);
    }
  }
  collect(path.join(directory, 'assets'), '/assets/');
  const mime: Record<string, string> = {
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.map': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
  };
  return {
    name: 'webui:e2e-development',
    config: () => ({ server: { preTransformRequests: false } }),
    transformIndexHtml: { order: 'pre', handler: () => fs.readFileSync(path.join(directory, 'index.html'), 'utf8') },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url?.split('?')[0];
        if (url === '/__e2e-react-probe') {
          response.setHeader('Content-Type', 'text/html');
          response.end(
            `<html><body><div id="root"></div><script type="module" src="/${probe}"></script></body></html>`
          );
          return;
        }
        const file = url ? assets.get(url) : undefined;
        if (!file) return next();
        response.setHeader('Content-Type', mime[path.extname(file)] ?? 'application/octet-stream');
        response.setHeader('Cache-Control', 'no-store');
        fs.createReadStream(file).pipe(response);
      });
    },
  };
}
