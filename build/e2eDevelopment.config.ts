import { fileURLToPath } from 'node:url';
import { defineConfig, mergeConfig } from 'vite';
import configuration from '../vite.config';

const root = fileURLToPath(new URL('../', import.meta.url));

export default defineConfig(async (environment) => {
  if (process.env['NODE_ENV'] !== 'development') throw new Error('E2E preparation requires React development mode');
  const original = typeof configuration === 'function' ? await configuration(environment) : await configuration;
  return mergeConfig(original, {
    root,
    logLevel: 'warn',
    build: {
      outDir: 'node_modules/.cache/webui-e2e-development',
      emptyOutDir: true,
      minify: false,
      sourcemap: true,
      manifest: true,
      reportCompressedSize: false,
      rollupOptions: {
        output: { experimentalMinChunkSize: 150_000 },
        input: { application: `${root}index.html`, probe: `${root}scripts/fixtures/e2eReactProbe.mjs` },
      },
    },
  });
});
