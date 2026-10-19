import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  define: { 'import.meta.env.VITE_RUNTIME_MODE': JSON.stringify('bff') },
  build: { outDir: 'dist', emptyOutDir: true },
});
