import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'tsconfig.tooling.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(configFile.error, undefined);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root, undefined, configPath);
assert.deepEqual(config.errors, []);

function buildTypeScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory()
      ? buildTypeScriptFiles(filename)
      : entry.isFile() && entry.name.endsWith('.ts')
        ? [filename]
        : [];
  });
}

test('the tooling gate includes both configs and every build TypeScript file', () => {
  const checked = new Set(config.fileNames.map((file) => path.relative(root, file).replaceAll(path.sep, '/')));
  assert(checked.has('vite.config.ts'));
  assert(checked.has('playwright.config.ts'));
  for (const filename of buildTypeScriptFiles(path.join(root, 'build'))) {
    assert(checked.has(path.relative(root, filename).replaceAll(path.sep, '/')));
  }
  assert(![...checked].some((file) => file.startsWith('e2e/')));
});

function diagnosticsFor(name) {
  const filename = path.join(root, 'scripts/fixtures/tooling-types', name);
  // TypeScript reads declarations and fixtures; it does not import executable configs or launch Playwright.
  const program = ts.createProgram([filename], config.options);
  return ts.getPreEmitDiagnostics(program).map((diagnostic) => ({
    code: diagnostic.code,
    file: diagnostic.file?.fileName,
    text: ts.flattenDiagnosticMessageText(diagnostic.messageText, ' '),
  }));
}

test('the tooling types accept valid build metadata and Playwright options', () => {
  assert.deepEqual(diagnosticsFor('valid.ts'), []);
});

test('the tooling types reject a non-schema-1 build metadata object', () => {
  const diagnostics = diagnosticsFor('invalid-build-info.ts');
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, 2322);
  assert.match(diagnostics[0]?.file ?? '', /invalid-build-info\.ts$/);
  assert.match(diagnostics[0]?.text ?? '', /Type '2' is not assignable to type '1'/);
});

test('the tooling types reject a nonnumeric Playwright retry option', () => {
  const diagnostics = diagnosticsFor('invalid-playwright.ts');
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0]?.code, 2322);
  assert.match(diagnostics[0]?.file ?? '', /invalid-playwright\.ts$/);
  assert.match(diagnostics[0]?.text ?? '', /Type 'string' is not assignable to type 'number'/);
});
