import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'node_modules/.cache');
fs.mkdirSync(cache, { recursive: true });
const modules = fs.mkdtempSync(path.join(cache, 'e2e-router-test-'));

function writeTranspiled(name) {
  const source = fs.readFileSync(path.join(root, 'e2e/fixtures', `${name}.ts`), 'utf8');
  const output = ts
    .transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    })
    .outputText.replaceAll("'./bootstrap'", "'./bootstrap.mjs'")
    .replaceAll("'./haveapi'", "'./haveapi.mjs'");
  fs.writeFileSync(path.join(modules, `${name}.mjs`), output);
}

writeTranspiled('bootstrap');
writeTranspiled('haveapi');
const { installHaveApiMock } = await import(pathToFileURL(path.join(modules, 'haveapi.mjs')).href);
test.after(() => fs.rmSync(modules, { recursive: true, force: true }));

function fakePage() {
  let handler;
  const initScripts = [];
  return {
    initScripts,
    async route(_pattern, nextHandler) {
      handler = nextHandler;
    },
    async addInitScript(fn, args) {
      initScripts.push({ fn, args });
    },
    async request(pathname, { method = 'GET', body = null } = {}) {
      assert.equal(typeof handler, 'function');
      const result = { fulfilled: null, fallback: false };
      const request = {
        url: () => `https://fixture.test${pathname}`,
        method: () => method,
        postData: () => body,
      };
      const route = {
        request: () => request,
        async fulfill(options) {
          result.fulfilled = options;
          return options;
        },
        async fallback() {
          result.fallback = true;
        },
      };
      await handler(route);
      return result;
    },
  };
}

function json(result) {
  assert(result.fulfilled);
  return JSON.parse(result.fulfilled.body);
}

test('both call forms retain bootstrap and complete user-seed precedence', async () => {
  const direct = fakePage();
  await installHaveApiMock(direct);
  assert.equal(direct.initScripts.length, 0);
  assert.deepEqual(json(await direct.request('/api/v7.0/users/current')).response.user, {
    id: 1,
    login: 'e2e',
    level: 1,
  });

  const options = fakePage();
  await installHaveApiMock({
    page: options,
    authorize: { user: { id: 3, login: 'authorize', level: 21 } },
    authorizeUser: { user: { login: 'authorizeUser' } },
    user: { id: 9, login: 'direct', level: 90 },
  });
  assert.equal(options.initScripts.length, 1);
  assert.equal(options.initScripts[0].args.sessionToken, 'TEST_SESSION');
  assert.deepEqual(json(await options.request('/api/v7.0/users/current')).response.user, {
    id: 9,
    login: 'direct',
    level: 90,
  });
});

test('the standalone bootstrap getter preserves auth and merges later window config', async () => {
  const page = fakePage();
  await installHaveApiMock({ page });
  const { fn, args } = page.initScripts[0];
  const previousWindow = globalThis.window;
  try {
    globalThis.window = {};
    fn(args);
    const initialApi = globalThis.window.vpsAdmin.api;
    assert.equal(globalThis.window.vpsAdmin.sessionToken, 'TEST_SESSION');
    globalThis.window.vpsAdmin = { webuiNext: { enableDesignSandbox: true } };
    assert.deepEqual(globalThis.window.vpsAdmin.api, initialApi);
    assert.equal(globalThis.window.vpsAdmin.sessionToken, 'TEST_SESSION');
    assert.equal(globalThis.window.vpsAdmin.webuiNext.enableDesignSandbox, true);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test('handler selection keeps query/body aliases and fallback responses', async () => {
  const page = fakePage();
  let observed;
  const mock = await installHaveApiMock(page, {
    fallbackResponse: { missing: true },
    handlers: { items: () => ({ wrong: true }) },
  });
  mock.addHandler('POST items', (ctx) => {
    observed = ctx;
    return { items: [ctx.params['item']] };
  });
  const response = await page.request('/api/v7.0/items?filter=query', {
    method: 'POST',
    body: '{"filter":"body","item":{"id":7}}',
  });
  assert.deepEqual(json(response), { status: true, response: { items: [{ id: 7 }] } });
  assert.equal(observed.request.postData(), '{"filter":"body","item":{"id":7}}');
  assert.deepEqual(observed.request.postDataJSON(), observed.reqJson);
  assert.deepEqual(observed.json, observed.reqJson);
  assert.equal(observed.searchParams.get('filter'), 'query');
  assert.equal(observed.params.filter, 'body');
  assert.equal(observed.pathname, '/api/v7.0/items');
  assert.equal(observed.relPath, 'items');
  assert.deepEqual(json(await page.request('/api/v7.0/unknown')), { status: true, response: { missing: true } });
  assert.equal((await page.request('/elsewhere')).fallback, true);
});

test('description, direct fulfill and envelope branches keep their response shape', async () => {
  const page = fakePage();
  await installHaveApiMock(page, {
    handlers: {
      'GET raw': () => ({ status: 201, contentType: 'text/plain', body: 'created' }),
      'GET envelope': () => ({ status: false, message: 'denied', response: null }),
    },
  });
  assert.equal(json(await page.request('/api')).meta.namespace, '_meta');
  assert.deepEqual((await page.request('/api/v7.0/raw')).fulfilled, {
    status: 201,
    contentType: 'text/plain',
    body: 'created',
  });
  assert.deepEqual(json(await page.request('/api/v7.0/envelope')), {
    status: false,
    message: 'denied',
    response: null,
  });
});

test('malformed JSON request bodies still reject before handler invocation', async () => {
  const page = fakePage();
  let called = false;
  await installHaveApiMock(page, {
    handlers: {
      'POST items': () => {
        called = true;
        return {};
      },
    },
  });
  await assert.rejects(page.request('/api/v7.0/items', { method: 'POST', body: '{broken' }), SyntaxError);
  assert.equal(called, false);
});
