import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { normalizePath, type Plugin } from 'vite';

/** Serve the same catalog exports in two modules in an immutable CI fixture server. */
export function e2eLocalePlugin(root: string): Plugin {
  const modules = new Map(
    ['en', 'cs'].map((language) => [
      normalizePath(resolve(root, 'src/i18n', `${language}.ts`)),
      resolve(root, 'node_modules/.cache/webui-e2e-locales', `${language}.mjs`),
    ])
  );
  return {
    name: 'webui:e2e-locales',
    apply: 'serve',
    enforce: 'pre',
    load(id) {
      const bundled = modules.get(normalizePath(id.split('?')[0] ?? id));
      if (bundled) return readFileSync(bundled, 'utf8');
      return undefined;
    },
  };
}
