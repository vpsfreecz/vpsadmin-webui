import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { createServer, resolveConfig } from 'vite';
import ts from 'typescript';

const root = process.cwd();

test('E2E catalog bundles preserve every canonical Czech and English key/value', async () => {
  const project = await mkdtemp(join(tmpdir(), 'webui-e2e-locales-'));
  const output = join(project, 'node_modules/.cache/webui-e2e-locales');
  const previousNodeEnv = process.env.NODE_ENV;
  let server;
  try {
    execFileSync(
      process.execPath,
      [resolve('node_modules/vite/bin/vite.js'), 'build', '--config', 'build/e2eLocales.config.ts', '--outDir', output],
      { cwd: root, stdio: 'pipe' }
    );
    assert.equal(process.env.NODE_ENV, previousNodeEnv);
    server = await createServer({
      configFile: false,
      root,
      appType: 'custom',
      server: { middlewareMode: true, hmr: false },
      optimizeDeps: { noDiscovery: true },
    });
    const { e2eLocalePlugin } = await server.ssrLoadModule('/build/e2eLocalePlugin.ts');
    const plugin = e2eLocalePlugin(project);
    assert.equal(plugin.load(join(project, 'src/app/i18n.tsx')), undefined);
    for (const language of ['en', 'cs']) {
      const source = await server.ssrLoadModule(`/src/i18n/${language}.ts`);
      const bundled = await import(pathToFileURL(join(output, `${language}.mjs`)).href);
      const entries = (dictionary) => Object.entries(dictionary).sort(([a], [b]) => a.localeCompare(b));
      const served = plugin.load(join(project, `src/i18n/${language}.ts`) + '?import');
      assert.equal(served, await (await import('node:fs/promises')).readFile(join(output, `${language}.mjs`), 'utf8'));
      const parsed = ts.createSourceFile('catalog.mjs', served, ts.ScriptTarget.ESNext, true, ts.ScriptKind.JS);
      const imports = [];
      const inspect = (node) => {
        if (
          ts.isImportDeclaration(node) ||
          (ts.isExportDeclaration(node) && node.moduleSpecifier) ||
          (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword)
        )
          imports.push(node);
        ts.forEachChild(node, inspect);
      };
      inspect(parsed);
      assert.equal(imports.length, 0, 'A catalog served at its original URL must be self-contained');
      assert.ok(Object.keys(source[language]).length > 1000);
      assert.deepEqual(entries(bundled[language]), entries(source[language]));
    }
  } finally {
    await server?.close();
    await rm(project, { recursive: true, force: true });
  }
});

test('catalog serving is opt-in for development and cannot alter a production build', async () => {
  const oldFlag = process.env.VPSADMIN_E2E_LOCALE_BUNDLES;
  const oldRuntime = process.env.VITE_RUNTIME_MODE;
  try {
    delete process.env.VPSADMIN_E2E_LOCALE_BUNDLES;
    const normal = await resolveConfig({ root }, 'serve');
    assert.ok(!normal.resolve.alias.some((alias) => alias.find === '../i18n/en'));
    process.env.VPSADMIN_E2E_LOCALE_BUNDLES = '1';
    const e2e = await resolveConfig({ root }, 'serve');
    assert.equal(e2e.isProduction, false);
    assert.equal(e2e.env.DEV, true);
    assert.ok(e2e.plugins.some((plugin) => plugin.name === 'vite:react-refresh'));
    assert.ok(e2e.plugins.some((plugin) => plugin.name === 'webui:e2e-locales'));
    process.env.VITE_RUNTIME_MODE = 'bff';
    const production = await resolveConfig({ root }, 'build');
    assert.ok(!production.resolve.alias.some((alias) => alias.find === '../i18n/en'));
  } finally {
    if (oldFlag === undefined) delete process.env.VPSADMIN_E2E_LOCALE_BUNDLES;
    else process.env.VPSADMIN_E2E_LOCALE_BUNDLES = oldFlag;
    if (oldRuntime === undefined) delete process.env.VITE_RUNTIME_MODE;
    else process.env.VITE_RUNTIME_MODE = oldRuntime;
  }
});
