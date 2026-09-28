import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(root, 'tsconfig.e2e.json');
const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
assert.equal(configFile.error, undefined);
const config = ts.parseJsonConfigFileContent(configFile.config, ts.sys, root, undefined, configPath);
assert.deepEqual(config.errors, []);

function diagnosticsFor(name) {
  const filename = path.join(root, 'scripts/fixtures/e2e-types', name);
  // TypeScript compiles fixture declarations only; it never imports a spec or starts Playwright.
  const program = ts.createProgram([filename], config.options);
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

const validDiagnostics = diagnosticsFor('valid.ts');

test('both mock installation overloads and an unknown JSON result compile', () => {
  assert.deepEqual(validDiagnostics, []);
});

for (const [name, expected] of [
  ['invalid-user.ts', [{ code: 2353, line: 4, message: /inventedField/ }]],
  ['invalid-option.ts', [{ code: 2353, line: 4, message: /inventedOption/ }]],
  ['invalid-body.ts', [{ code: 2339, line: 4, message: /Property 'body' does not exist/ }]],
  ['invalid-identity.ts', [{ code: 2353, line: 4, message: /'identity' does not exist/ }]],
  ['invalid-handler.ts', [{ code: 2345, line: 4, message: /number.*string/ }]],
  ['invalid-request.ts', [{ code: 2769, line: 3, message: /No overload matches this call/ }]],
  ['invalid-json.ts', [{ code: 2571, line: 4, message: /unknown/ }]],
  [
    'invalid-strictness.ts',
    [
      { code: 2322, line: 2, message: /undefined.*string/ },
      { code: 4111, line: 5, message: /index signature/ },
    ],
  ],
]) {
  test(`${name} fails at its intended type boundary`, () => {
    assert.deepEqual(validDiagnostics, []);
    const diagnostics = diagnosticsFor(name);
    assert.equal(diagnostics.length, expected.length);
    for (const [index, diagnostic] of diagnostics.entries()) {
      const wanted = expected[index];
      assert.equal(diagnostic.code, wanted.code);
      assert.equal(diagnostic.line, wanted.line);
      assert.equal(diagnostic.file, path.join(root, 'scripts/fixtures/e2e-types', name));
      assert.match(diagnostic.text, wanted.message);
    }
  });
}
