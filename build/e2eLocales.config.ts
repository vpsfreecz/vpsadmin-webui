import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));

// Separate CLI process: catalog compilation must not change the dev server's NODE_ENV.
export default defineConfig({
  root,
  logLevel: 'warn',
  build: {
    outDir: 'node_modules/.cache/webui-e2e-locales',
    emptyOutDir: true,
    minify: false,
    reportCompressedSize: false,
    lib: {
      entry: { en: `${root}src/i18n/en.ts`, cs: `${root}src/i18n/cs.ts` },
      formats: ['es'],
      fileName: (_format, name) => `${name}.mjs`,
    },
  },
});
