import { execFileSync } from 'node:child_process';
import { createServer } from 'vite';

execFileSync(process.execPath, ['scripts/check-node-version.mjs'], { stdio: 'inherit' });

const host = process.argv[2];
const port = Number(process.argv[3]);
if (!host || !Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Expected fixture host and port');

// Prepare immutable application modules while keeping the real React DEV runtime.
execFileSync(
  process.execPath,
  ['node_modules/vite/bin/vite.js', 'build', '--config', 'build/e2eDevelopment.config.ts', '--mode', 'development'],
  {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'development', VITE_RUNTIME_MODE: process.env.VITE_RUNTIME_MODE ?? 'legacy' },
  }
);
process.env.VPSADMIN_E2E_APP_BUNDLE = '1';
let ready = false;
const server = await createServer({
  server: { host, port, strictPort: true },
  plugins: [
    {
      name: 'webui:e2e-readiness',
      configureServer(vite) {
        vite.middlewares.use('/__e2e-ready', (_request, response) => {
          response.statusCode = ready ? 200 : 503;
          response.setHeader('Content-Type', 'text/plain');
          response.end(ready ? 'ready' : 'warming');
        });
      },
    },
  ],
});
const stop = () => {
  void server.close().finally(() => process.exit(0));
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
try {
  await server.listen();
  await server.environments.client.warmupRequest('/@vite/client');
  await server.waitForRequestsIdle();
  ready = true;
  console.log('Fixture Vite DEV ready; prepared development modules, StrictMode unchanged.');
} catch (error) {
  await server.close();
  throw error;
}
