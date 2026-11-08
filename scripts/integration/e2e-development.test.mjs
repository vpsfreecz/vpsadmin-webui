import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { PassThrough } from 'node:stream';
import { test } from 'node:test';
import ts from 'typescript';

const root = process.cwd();

test('prepared CI application shares development React and serves only generated assets', async () => {
  const output = await mkdtemp(join(tmpdir(), 'webui-e2e-development-'));
  const previous = process.env.NODE_ENV;
  try {
    execFileSync(
      process.execPath,
      [
        'node_modules/vite/bin/vite.js',
        'build',
        '--config',
        'build/e2eDevelopment.config.ts',
        '--mode',
        'development',
        '--outDir',
        output,
      ],
      {
        cwd: root,
        env: { ...process.env, NODE_ENV: 'development', VITE_RUNTIME_MODE: 'legacy' },
        stdio: 'pipe',
      }
    );
    assert.equal(process.env.NODE_ENV, previous);
    const manifest = JSON.parse(await readFile(join(output, '.vite/manifest.json'), 'utf8'));
    const probe = manifest['scripts/fixtures/e2eReactProbe.mjs'];
    const application = manifest['index.html'];
    assert.ok(probe?.isEntry && application?.isEntry);
    const react = Object.keys(manifest).filter((key) => manifest[key].file.includes('vendor-react'));
    assert.equal(react.length, 1);
    const reachable = new Set();
    function visit(key) {
      if (reachable.has(key)) return;
      reachable.add(key);
      const entry = manifest[key];
      assert.ok(entry, key);
      for (const dependency of [...(entry.imports ?? []), ...(entry.dynamicImports ?? [])]) visit(dependency);
    }
    visit('index.html');
    assert.ok(probe.imports.includes(react[0]) && reachable.has(react[0]));
    const probeCode = await readFile(join(output, probe.file), 'utf8');
    assert.match(probeCode, /development: true/);
    assert.match(probeCode, /production: false/);
    assert.match(probeCode, /mode: "development"/);
    const source = await readFile(resolve('build/e2eAppPlugin.ts'), 'utf8');
    const compiled = ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    });
    const { e2eAppPlugin } = await import(
      `data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`
    );
    const plugin = e2eAppPlugin(root, output);
    const html = plugin.transformIndexHtml.handler();
    assert.equal(html, await readFile(join(output, 'index.html'), 'utf8'));
    assert.equal(plugin.config().server.preTransformRequests, false);
    let handler;
    plugin.configureServer({
      middlewares: {
        use(callback) {
          handler = callback;
        },
      },
    });
    async function request(url) {
      const response = new PassThrough();
      const chunks = [];
      const headers = {};
      response.on('data', (chunk) => chunks.push(chunk));
      response.setHeader = (key, value) => {
        headers[key] = value;
      };
      let fallback = false;
      handler({ url }, response, () => {
        fallback = true;
        response.end();
      });
      await once(response, 'finish');
      return { body: Buffer.concat(chunks), headers, fallback };
    }
    const script = await request('/' + probe.file);
    assert.equal(script.fallback, false);
    assert.equal(script.headers['Content-Type'], 'text/javascript');
    assert.equal(script.body.toString(), probeCode);
    assert.equal((await request('/assets/../../package.json')).fallback, true);
    assert.equal((await request('/api/v7.0/users/current')).fallback, true);
    const page = await request('/__e2e-react-probe');
    assert.ok(page.body.toString().includes('/' + probe.file));
  } finally {
    await rm(output, { recursive: true, force: true });
  }
});

test('CI preparation leaves normal development and production plugin selection unchanged', () => {
  for (const command of ['serve', 'build']) {
    const program = `import assert from 'node:assert/strict';import{resolveConfig}from'vite';const c=await resolveConfig({configFile:'vite.config.ts'},'${command}','${command === 'build' ? 'production' : 'development'}');assert(!c.plugins.some(p=>p.name==='webui:e2e-development'));assert(!String(c.build.outDir).includes('webui-e2e'));`;
    execFileSync(process.execPath, ['--input-type=module', '-e', program], {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: command === 'build' ? 'production' : 'development',
        VITE_RUNTIME_MODE: 'bff',
        VPSADMIN_E2E_APP_BUNDLE: command === 'build' ? '1' : '',
        VPSADMIN_E2E_LOCALE_BUNDLES: '',
      },
      stdio: 'pipe',
    });
  }
});
