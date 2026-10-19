import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseOptions, candidateProvenance } from './test-haveapi-package.mjs';

test('package pilot requires an absolute tarball and a full optional source ref', () => {
  assert.deepEqual(parseOptions(['--package', '/tmp/candidate.tgz']), {
    packagePath: '/tmp/candidate.tgz',
    webuiRef: 'HEAD',
  });
  for (const args of [
    [],
    ['--package', 'relative.tgz'],
    ['--package', '/tmp/a'],
    ['--wat'],
    ['--package', '/tmp/a.tgz', '--haveapi-ref', 'abc'],
    ['--package', '/tmp/a.tgz', '--package', '/tmp/b.tgz'],
  ]) {
    assert.throws(() => parseOptions(args));
  }
});

test('source provenance is explicit and conflicting claims fail closed', () => {
  const ref = 'a'.repeat(40);
  assert.deepEqual(candidateProvenance(ref), { haveapiRef: ref, provenance: 'pack-owner assertion' });
  assert.deepEqual(candidateProvenance(undefined, ref), { haveapiRef: ref, provenance: 'package gitHead metadata' });
  assert.throws(() => candidateProvenance());
  assert.throws(() => candidateProvenance(ref, 'b'.repeat(40)));
  assert.throws(() => candidateProvenance(undefined, 'bad'));
});

import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runPilot, run } from './test-haveapi-package.mjs';

test('actual browser config starts its preview command from the snapshot root', async () => {
  const configUrl = new URL('./haveapi-package/playwright.config.ts', import.meta.url);
  const { default: config } = await import(configUrl.href);
  const server = config.webServer;
  const effectiveCwd = server.cwd ?? path.dirname(fileURLToPath(configUrl));
  const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)));
  assert.equal(path.resolve(effectiveCwd), root);
  const args = server.command.split(/\s+/);
  assert.equal(args[0], 'node');
  assert.equal((await stat(path.resolve(effectiveCwd, args[1]))).isFile(), true);
  const configArgument = args.indexOf('--config');
  assert.notEqual(configArgument, -1);
  assert.equal((await stat(path.resolve(effectiveCwd, args[configArgument + 1]))).isFile(), true);
});

test('actual package fixture config selects the required production BFF runtime mode', async () => {
  const { default: config } = await import('./haveapi-package/vite.config.ts');
  const { resolveRuntimeMode } = await import('../src/app/runtimeMode.ts');
  const mode = JSON.parse(config.define['import.meta.env.VITE_RUNTIME_MODE']);
  assert.equal(resolveRuntimeMode(mode, false), 'bff');
});

test('synthetic fixture binding satisfies the real BFF auth guard without replacing runtime identity', async () => {
  const { createServer } = await import('vite');
  const { JSDOM } = await import('jsdom');
  const root = fileURLToPath(new URL('../', import.meta.url));
  const dom = new JSDOM('', { url: 'http://fixture.example.test' });
  const previousWindow = globalThis.window;
  globalThis.window = dom.window;
  let server;
  try {
    server = await createServer({
      configFile: path.join(root, 'scripts/haveapi-package/vite.config.ts'),
      server: { middlewareMode: true, hmr: false },
      // This gate loads only the session module, without the candidate HTML entry.
      optimizeDeps: { noDiscovery: true, include: [] },
    });
    const { getRuntimeConfig } = await server.ssrLoadModule(path.join(root, 'src/app/config.ts'));
    const { bindSyntheticBffSession } = await server.ssrLoadModule('/syntheticSession.ts');
    const runtime = { api: { url: '/api', version: '7.0' }, accessToken: 'old' };
    window.vpsAdmin = runtime;
    assert.deepEqual(getRuntimeConfig().auth, { kind: 'none' });
    const key = 'a'.repeat(64);
    assert.deepEqual(bindSyntheticBffSession(key, 'old'), {
      auth: { kind: 'oauth2', accessToken: 'old' },
      boundKey: key,
      rememberedKey: key,
      sameRuntime: true,
    });
    assert.equal(window.vpsAdmin, runtime);
  } finally {
    await server?.close();
    dom.window.close();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

const baselinePackages = ['typescript', 'vite', '@playwright/test', 'locked-dependency'];
const lockedVersion = '1.0.0';
async function writePackage(root, name, version = lockedVersion) {
  const directory = path.join(root, 'node_modules', name);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, 'package.json'), JSON.stringify({ name, version }));
}

async function withPilotFixture(check, { mutateInstall = async () => {}, mutateBaseline = async () => {} } = {}) {
  const repository = await mkdtemp(path.join(os.tmpdir(), 'webui-package-script-test-'));
  let artifact;
  try {
    const git = (args) => execFileSync('git', args, { cwd: repository, stdio: 'pipe' });
    git(['init']);
    const lock = {
      lockfileVersion: 3,
      packages: {
        '': { name: 'fixture' },
        ...Object.fromEntries(baselinePackages.map((name) => ['node_modules/' + name, { version: lockedVersion }])),
        'node_modules/platform-optional': { version: lockedVersion, optional: true },
      },
    };
    const lockBytes = JSON.stringify(lock);
    const manifestBytes = JSON.stringify({ name: 'fixture' });
    await writeFile(path.join(repository, 'package.json'), manifestBytes);
    await writeFile(path.join(repository, 'package-lock.json'), lockBytes);
    git(['add', 'package.json', 'package-lock.json']);
    git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-m', 'fixture']);
    const sha = git(['rev-parse', 'HEAD']).toString().trim();
    await writeFile(path.join(repository, 'package-lock.json'), 'uncommitted lock\n');
    const candidate = path.join(repository, 'candidate.tgz');
    await writeFile(candidate, 'candidate bytes');
    const calls = [];
    const execute = () =>
      runPilot(
        { packagePath: candidate, webuiRef: 'HEAD', haveapiRef: 'a'.repeat(40) },
        {
          cwd: repository,
          async runCommand(command, args, cwd) {
            calls.push({ command, args, cwd });
            if (command === 'git' || command === 'tar') return run(command, args, cwd);
            assert.notEqual(cwd, repository);
            artifact = path.dirname(cwd);
            if (command === 'npm' && args[0] === 'ci') {
              assert.equal(await readFile(path.join(cwd, 'package-lock.json'), 'utf8'), lockBytes);
              for (const name of baselinePackages) await writePackage(cwd, name);
              await mutateBaseline(cwd);
              await writeFile(candidate, 'later replacement');
            }
            if (command === 'npm' && args[0] === 'install') {
              assert.deepEqual(args, [
                'install',
                '--ignore-scripts',
                '--no-save',
                '--package-lock=true',
                path.join(artifact, 'candidate.tgz'),
              ]);
              assert.equal(await readFile(args[4], 'utf8'), 'candidate bytes');
              await writePackage(cwd, 'haveapi-client');
              await writePackage(cwd, 'candidate-added-dependency');
              await mutateInstall(cwd);
            }
          },
        }
      );
    await check({ execute, calls, sha, directory: () => artifact });
    assert.equal(await readFile(path.join(repository, 'package-lock.json'), 'utf8'), 'uncommitted lock\n');
    assert.equal(await readFile(path.join(repository, 'package.json'), 'utf8'), manifestBytes);
  } finally {
    await rm(repository, { recursive: true, force: true });
    if (artifact) await rm(artifact, { recursive: true, force: true });
  }
}

test('pilot snapshots committed source, freezes tar bytes and preserves the installed locked graph', async () => {
  await withPilotFixture(async ({ execute, calls, sha, directory }) => {
    const result = await execute();
    assert.equal(result.webuiRef, sha);
    assert.equal(result.status, 'passed');
    assert.equal(result.lockedGraph.packageCount, baselinePackages.length);
    assert.equal(calls.filter((call) => call.command === 'node').length, 3);
    const baseline = JSON.parse(await readFile(path.join(directory(), 'dependency-baseline.json'), 'utf8'));
    assert.equal(
      baseline.packages.some((entry) => entry.path.endsWith('platform-optional')),
      false
    );
    assert.equal(
      baseline.packages.some((entry) => entry.name === 'candidate-added-dependency'),
      false
    );
    assert.equal(
      JSON.parse(await readFile(path.join(directory(), 'result.json'), 'utf8')).provenance,
      'pack-owner assertion'
    );
  });
});

for (const filename of ['package.json', 'package-lock.json']) {
  test(`candidate mutation of ${filename} fails before any consumer tool`, async () => {
    await withPilotFixture(
      async ({ execute, calls, directory }) => {
        await assert.rejects(execute(), new RegExp('Candidate install changed ' + filename.replaceAll('.', '\\.')));
        assert.equal(calls.filter((call) => call.command === 'node').length, 0);
        assert.equal(JSON.parse(await readFile(path.join(directory(), 'result.json'), 'utf8')).status, 'failed');
      },
      { mutateInstall: (cwd) => writeFile(path.join(cwd, filename), 'tampered') }
    );
  });
}

for (const mode of ['version', 'name', 'removed']) {
  test(`candidate locked-package ${mode} drift fails before any consumer tool`, async () => {
    await withPilotFixture(
      async ({ execute, calls }) => {
        await assert.rejects(
          execute(),
          /Candidate install (changed|removed) locked package: node_modules\/locked-dependency/
        );
        assert.equal(calls.filter((call) => call.command === 'node').length, 0);
      },
      {
        mutateInstall: async (cwd) => {
          const directory = path.join(cwd, 'node_modules/locked-dependency');
          if (mode === 'removed') await rm(directory, { recursive: true });
          else
            await writeFile(
              path.join(directory, 'package.json'),
              JSON.stringify({
                name: mode === 'name' ? 'replacement' : 'locked-dependency',
                version: mode === 'version' ? '2.0.0' : lockedVersion,
              })
            );
        },
      }
    );
  });
}

test('baseline disagreement with the lock fails before candidate install', async () => {
  await withPilotFixture(
    async ({ execute, calls }) => {
      await assert.rejects(execute(), /Installed baseline disagrees with lock/);
      assert.equal(
        calls.some((call) => call.command === 'npm' && call.args[0] === 'install'),
        false
      );
      assert.equal(
        calls.some((call) => call.command === 'node'),
        false
      );
    },
    { mutateBaseline: (cwd) => writePackage(cwd, 'locked-dependency', '2.0.0') }
  );
});
