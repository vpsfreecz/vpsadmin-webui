import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'tsconfig.bff.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(configFile.error, undefined);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root, undefined, configPath);
assert.deepEqual(config.errors, []);

function relative(filename) {
  return path.relative(root, filename).replaceAll(path.sep, '/');
}

function sourcePaths(program) {
  return program
    .getSourceFiles()
    .map((file) => relative(file.fileName))
    .filter((filename) => filename.startsWith('bff/') && !filename.startsWith('bff/node_modules/'))
    .sort();
}

function diagnosticsFor(name) {
  const filename = path.join(root, 'scripts/fixtures/bff-types', name);
  // Compile declarations only: no BFF module executes and no listener starts.
  const program = ts.createProgram([filename, path.join(root, 'bff/types/cookie-signature.d.ts')], config.options);
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
    code: diagnostic.code,
    file: diagnostic.file?.fileName,
    line:
      diagnostic.file && diagnostic.start !== undefined
        ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1
        : undefined,
    text: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
  }));
}

test('the strict CommonJS project checks only the queue and its signature contract', () => {
  for (const flag of [
    'allowJs',
    'checkJs',
    'strict',
    'noUncheckedIndexedAccess',
    'noPropertyAccessFromIndexSignature',
    'noImplicitOverride',
    'noEmit',
  ]) {
    assert.equal(config.options[flag], true, flag);
  }
  assert.equal(config.options.module, ts.ModuleKind.Node16);
  assert.equal(config.options.moduleResolution, ts.ModuleResolutionKind.Node16);
  assert.deepEqual(config.options.types, ['node']);
  assert.deepEqual(config.options.lib, ['lib.es2022.d.ts']);
  assert.deepEqual(configFile.config.include, []);
  const expected = ['bff/session-queue.js', 'bff/types/cookie-signature.d.ts'];
  assert.deepEqual(config.fileNames.map(relative).sort(), expected);
  const program = ts.createProgram(config.fileNames, config.options);
  assert.deepEqual(sourcePaths(program), expected);
  assert.deepEqual(ts.getPreEmitDiagnostics(program), []);
});

const validDiagnostics = diagnosticsFor('valid.cts');
test('a correctly typed queue, request and middleware callback compile', () => {
  assert.deepEqual(validDiagnostics, []);
});

for (const [name, wanted] of [
  ['invalid-secret.cts', { code: 2322, line: 3, message: /number.*string/ }],
  ['invalid-pending.cts', { code: 2322, line: 3, message: /string.*number/ }],
  ['invalid-next.cts', { code: 2345, line: 5, message: /string.*unknown/ }],
  ['invalid-cookie.cts', { code: 2322, line: 5, message: /number.*string/ }],
]) {
  test(`${name} fails at its intended queue contract`, () => {
    assert.deepEqual(validDiagnostics, []);
    const diagnostics = diagnosticsFor(name);
    assert.equal(diagnostics.length, 1);
    assert.equal(diagnostics[0].code, wanted.code);
    assert.equal(diagnostics[0].line, wanted.line);
    assert.equal(diagnostics[0].file, path.join(root, 'scripts/fixtures/bff-types', name));
    assert.match(diagnostics[0].text, wanted.message);
  });
}
